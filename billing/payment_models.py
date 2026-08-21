from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from billing.models import PlatformBillingDocument, ZERO_MONEY, money, validate_json_object


class PlatformSubscriptionPayment(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    payment_reference = models.CharField(max_length=80, unique=True, db_index=True)
    idempotency_key = models.CharField(max_length=160, unique=True, db_index=True)

    subscription = models.ForeignKey(
        "subscriptions.CompanySubscription",
        on_delete=models.PROTECT,
        related_name="platform_subscription_payments",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="platform_subscription_payments",
    )
    invoice = models.ForeignKey(
        PlatformBillingDocument,
        on_delete=models.PROTECT,
        related_name="platform_subscription_payments",
    )
    receipt = models.ForeignKey(
        PlatformBillingDocument,
        on_delete=models.PROTECT,
        related_name="platform_subscription_payment_receipts",
        null=True,
        blank=True,
    )

    attempt_number = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    gateway = models.CharField(max_length=60, blank=True, db_index=True)
    payment_method = models.CharField(max_length=80, blank=True, db_index=True)
    gateway_payment_id = models.CharField(max_length=160, blank=True, db_index=True)
    transaction_reference = models.CharField(max_length=160, blank=True, db_index=True)
    billing_reference = models.CharField(max_length=160, blank=True, db_index=True)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency_code = models.CharField(max_length=10, default="SAR", db_index=True)

    failure_code = models.CharField(max_length=100, blank=True)
    failure_message = models.TextField(blank=True)
    cancellation_reason = models.TextField(blank=True)

    provider_request_snapshot = models.JSONField(default=dict, blank=True)
    provider_response_snapshot = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    initiated_at = models.DateTimeField(default=timezone.now, db_index=True)
    processing_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True, db_index=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_platform_subscription_payments",
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_platform_subscription_payments",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_platform_subscription_payments",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["subscription", "attempt_number"],
                name="billing_pay_sub_attempt_uniq",
            ),
            models.CheckConstraint(
                condition=Q(amount__gte=0),
                name="billing_pay_amount_gte_zero",
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"],
                name="billing_pay_company_status_idx",
            ),
            models.Index(
                fields=["subscription", "status"],
                name="billing_pay_sub_status_idx",
            ),
            models.Index(
                fields=["invoice", "status"],
                name="billing_pay_invoice_status_idx",
            ),
            models.Index(
                fields=["gateway", "gateway_payment_id"],
                name="billing_pay_gateway_id_idx",
            ),
        ]

    def __str__(self):
        return f"{self.payment_reference} - {self.status}"

    def clean(self):
        super().clean()

        self.payment_reference = str(self.payment_reference or "").strip().upper()
        self.idempotency_key = str(self.idempotency_key or "").strip()
        self.gateway = str(self.gateway or "").strip().upper()
        self.payment_method = str(self.payment_method or "").strip().upper()
        self.gateway_payment_id = str(self.gateway_payment_id or "").strip()
        self.transaction_reference = str(self.transaction_reference or "").strip()
        self.billing_reference = str(self.billing_reference or "").strip()
        self.currency_code = str(self.currency_code or "SAR").strip().upper()

        if not self.payment_reference:
            raise ValidationError({"payment_reference": "Payment reference is required."})

        if not self.idempotency_key:
            raise ValidationError({"idempotency_key": "Idempotency key is required."})

        if self.subscription_id and self.company_id:
            if self.subscription.company_id != self.company_id:
                raise ValidationError({"company": "Payment company does not match subscription."})

        if self.invoice_id and self.subscription_id:
            if self.invoice.subscription_id != self.subscription_id:
                raise ValidationError({"invoice": "Invoice does not match subscription."})

        if self.invoice_id and self.company_id:
            if self.invoice.company_id != self.company_id:
                raise ValidationError({"invoice": "Invoice does not match company."})

        if self.receipt_id:
            if self.receipt.subscription_id != self.subscription_id:
                raise ValidationError({"receipt": "Receipt does not match subscription."})

        if money(self.amount) < ZERO_MONEY:
            raise ValidationError({"amount": "Amount cannot be negative."})

        validate_json_object(self.provider_request_snapshot, "provider_request_snapshot")
        validate_json_object(self.provider_response_snapshot, "provider_response_snapshot")
        validate_json_object(self.metadata, "metadata")

        if self.status == self.Status.PAID:
            if not self.paid_at:
                raise ValidationError({"paid_at": "paid_at is required for PAID."})
            if self.failed_at or self.cancelled_at:
                raise ValidationError({"status": "PAID cannot also be FAILED or CANCELLED."})

        if self.status == self.Status.FAILED:
            if not self.failed_at:
                raise ValidationError({"failed_at": "failed_at is required for FAILED."})
            if self.paid_at:
                raise ValidationError({"status": "FAILED cannot contain paid_at."})

        if self.status == self.Status.CANCELLED:
            if not self.cancelled_at:
                raise ValidationError({"cancelled_at": "cancelled_at is required for CANCELLED."})
            if self.paid_at:
                raise ValidationError({"status": "CANCELLED cannot contain paid_at."})

    def save(self, *args, **kwargs):
        self.payment_reference = str(self.payment_reference or "").strip().upper()
        self.idempotency_key = str(self.idempotency_key or "").strip()
        self.gateway = str(self.gateway or "").strip().upper()
        self.payment_method = str(self.payment_method or "").strip().upper()
        self.currency_code = str(self.currency_code or "SAR").strip().upper()
        self.amount = money(self.amount)
        self.full_clean()
        return super().save(*args, **kwargs)


class PlatformSubscriptionPaymentEvent(models.Model):
    payment = models.ForeignKey(
        PlatformSubscriptionPayment,
        on_delete=models.PROTECT,
        related_name="events",
    )
    event_type = models.CharField(max_length=60, db_index=True)
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20, blank=True)
    message = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_subscription_payment_events",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["payment", "created_at"],
                name="billing_pay_event_time_idx",
            ),
            models.Index(
                fields=["event_type", "created_at"],
                name="billing_pay_event_type_idx",
            ),
        ]

    def __str__(self):
        return f"{self.payment.payment_reference} - {self.event_type}"

    def clean(self):
        super().clean()
        validate_json_object(self.payload, "payload")
