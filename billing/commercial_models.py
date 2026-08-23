from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from billing.models import ZERO_MONEY, money, validate_json_object


class PlatformSubscriptionRefund(models.Model):
    """
    Immutable platform-subscription refund ledger.

    The original PlatformSubscriptionPayment remains PAID.
    Refunds are separate financial events so partial and multiple
    refunds remain auditable.
    """

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        SUCCEEDED = "SUCCEEDED", "Succeeded"
        FAILED = "FAILED", "Failed"
        CANCELLED = "CANCELLED", "Cancelled"

    refund_reference = models.CharField(
        max_length=80,
        unique=True,
        db_index=True,
    )
    idempotency_key = models.CharField(
        max_length=160,
        unique=True,
        db_index=True,
    )

    payment = models.ForeignKey(
        "billing.PlatformSubscriptionPayment",
        on_delete=models.PROTECT,
        related_name="refunds",
    )
    subscription = models.ForeignKey(
        "subscriptions.CompanySubscription",
        on_delete=models.PROTECT,
        related_name="platform_subscription_refunds",
    )
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="platform_subscription_refunds",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    gateway = models.CharField(
        max_length=60,
        blank=True,
        db_index=True,
    )
    provider_refund_id = models.CharField(
        max_length=160,
        blank=True,
        db_index=True,
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )
    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        db_index=True,
    )

    reason = models.TextField(blank=True)
    failure_code = models.CharField(
        max_length=100,
        blank=True,
    )
    failure_message = models.TextField(blank=True)

    provider_request_snapshot = models.JSONField(
        default=dict,
        blank=True,
    )
    provider_response_snapshot = models.JSONField(
        default=dict,
        blank=True,
    )
    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    initiated_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )
    processing_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    refunded_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )
    failed_at = models.DateTimeField(
        null=True,
        blank=True,
    )
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_platform_subscription_refunds",
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmed_platform_subscription_refunds",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="billing_refund_amount_gt_zero",
            ),
        ]
        indexes = [
            models.Index(
                fields=["payment", "status"],
                name="billing_refund_pay_status_idx",
            ),
            models.Index(
                fields=["company", "status"],
                name="billing_refund_company_idx",
            ),
            models.Index(
                fields=["gateway", "provider_refund_id"],
                name="billing_refund_provider_idx",
            ),
        ]

    def __str__(self):
        return f"{self.refund_reference} - {self.status}"

    def clean(self):
        super().clean()

        self.refund_reference = str(
            self.refund_reference or ""
        ).strip().upper()

        self.idempotency_key = str(
            self.idempotency_key or ""
        ).strip()

        self.gateway = str(
            self.gateway or ""
        ).strip().upper()

        self.provider_refund_id = str(
            self.provider_refund_id or ""
        ).strip()

        self.currency_code = str(
            self.currency_code or "SAR"
        ).strip().upper()

        self.amount = money(self.amount)

        if not self.refund_reference:
            raise ValidationError(
                {"refund_reference": "Refund reference is required."}
            )

        if not self.idempotency_key:
            raise ValidationError(
                {"idempotency_key": "Idempotency key is required."}
            )

        if self.amount <= ZERO_MONEY:
            raise ValidationError(
                {"amount": "Refund amount must be greater than zero."}
            )

        if self.payment_id:
            payment = self.payment

            if payment.status != payment.Status.PAID:
                raise ValidationError(
                    {"payment": "Only a PAID payment can be refunded."}
                )

            if (
                self.subscription_id
                and payment.subscription_id
                != self.subscription_id
            ):
                raise ValidationError(
                    {
                        "subscription": (
                            "Refund subscription does not match payment."
                        )
                    }
                )

            if (
                self.company_id
                and payment.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "company": (
                            "Refund company does not match payment."
                        )
                    }
                )

            if (
                self.currency_code
                != str(payment.currency_code or "SAR").upper()
            ):
                raise ValidationError(
                    {
                        "currency_code": (
                            "Refund currency does not match payment."
                        )
                    }
                )

        validate_json_object(
            self.provider_request_snapshot,
            "provider_request_snapshot",
        )
        validate_json_object(
            self.provider_response_snapshot,
            "provider_response_snapshot",
        )
        validate_json_object(
            self.metadata,
            "metadata",
        )

        if self.status == self.Status.SUCCEEDED:
            if not self.refunded_at:
                raise ValidationError(
                    {
                        "refunded_at": (
                            "refunded_at is required for "
                            "a successful refund."
                        )
                    }
                )

            if self.failed_at or self.cancelled_at:
                raise ValidationError(
                    {
                        "status": (
                            "A successful refund cannot also be "
                            "failed or cancelled."
                        )
                    }
                )

        if self.status == self.Status.FAILED:
            if not self.failed_at:
                raise ValidationError(
                    {
                        "failed_at": (
                            "failed_at is required for FAILED."
                        )
                    }
                )

            if self.refunded_at:
                raise ValidationError(
                    {
                        "status": (
                            "A failed refund cannot contain refunded_at."
                        )
                    }
                )

        if self.status == self.Status.CANCELLED:
            if not self.cancelled_at:
                raise ValidationError(
                    {
                        "cancelled_at": (
                            "cancelled_at is required for CANCELLED."
                        )
                    }
                )

            if self.refunded_at:
                raise ValidationError(
                    {
                        "status": (
                            "A cancelled refund cannot contain refunded_at."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        self.amount = money(self.amount)
        self.full_clean()
        return super().save(*args, **kwargs)


class PlatformSubscriptionRefundEvent(models.Model):
    refund = models.ForeignKey(
        PlatformSubscriptionRefund,
        on_delete=models.PROTECT,
        related_name="events",
    )
    event_type = models.CharField(
        max_length=60,
        db_index=True,
    )
    from_status = models.CharField(
        max_length=20,
        blank=True,
    )
    to_status = models.CharField(
        max_length=20,
        blank=True,
    )
    message = models.TextField(blank=True)
    payload = models.JSONField(
        default=dict,
        blank=True,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_subscription_refund_events",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["refund", "created_at"],
                name="billing_refund_event_idx",
            ),
        ]

    def clean(self):
        super().clean()
        validate_json_object(
            self.payload,
            "payload",
        )

    def save(self, *args, **kwargs):
        self.event_type = str(
            self.event_type or ""
        ).strip().upper()

        if not self.event_type:
            raise ValidationError(
                {"event_type": "Refund event type is required."}
            )

        self.full_clean()
        return super().save(*args, **kwargs)


# =====================================================================
# PHASE30_FINANCIAL_ADJUSTMENT_LEDGER
# Mhamcloud | Immutable-style platform financial adjustment history
# =====================================================================


class PlatformSubscriptionAdjustment(models.Model):
    """
    Platform-owned financial adjustment ledger.

    Important:
    - it does NOT rewrite the original payment;
    - it does NOT rewrite an issued invoice or receipt;
    - CREDIT / DEBIT adjustments remain separate financial history;
    - accounting_reference can link a future accounting/journal artifact;
    - reversal is explicit and auditable rather than deletion.
    """

    class AdjustmentType(models.TextChoices):
        CREDIT = "CREDIT", "Credit"
        DEBIT = "DEBIT", "Debit"

    class Status(models.TextChoices):
        POSTED = "POSTED", "Posted"
        REVERSED = "REVERSED", "Reversed"

    adjustment_reference = models.CharField(
        max_length=80,
        unique=True,
        db_index=True,
    )

    idempotency_key = models.CharField(
        max_length=160,
        unique=True,
        db_index=True,
    )

    payment = models.ForeignKey(
        "billing.PlatformSubscriptionPayment",
        on_delete=models.PROTECT,
        related_name="adjustments",
        null=True,
        blank=True,
    )

    subscription = models.ForeignKey(
        "subscriptions.CompanySubscription",
        on_delete=models.PROTECT,
        related_name="platform_subscription_adjustments",
    )

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.PROTECT,
        related_name="platform_subscription_adjustments",
    )

    adjustment_type = models.CharField(
        max_length=20,
        choices=AdjustmentType.choices,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.POSTED,
        db_index=True,
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
    )

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        db_index=True,
    )

    reason = models.TextField(blank=True)

    accounting_reference = models.CharField(
        max_length=160,
        blank=True,
        db_index=True,
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    posted_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
    )

    reversed_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_platform_subscription_adjustments",
    )

    reversed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reversed_platform_subscription_adjustments",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-posted_at", "-id"]

        constraints = [
            models.CheckConstraint(
                condition=Q(amount__gt=0),
                name="bill_adj_amount_gt_zero",
            ),
        ]

        indexes = [
            models.Index(
                fields=["payment", "status"],
                name="bill_adj_pay_status_idx",
            ),
            models.Index(
                fields=["company", "status"],
                name="bill_adj_company_idx",
            ),
            models.Index(
                fields=["subscription", "status"],
                name="bill_adj_sub_status_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.adjustment_reference} - "
            f"{self.adjustment_type} - {self.status}"
        )

    def clean(self):
        super().clean()

        self.adjustment_reference = str(
            self.adjustment_reference or ""
        ).strip().upper()

        self.idempotency_key = str(
            self.idempotency_key or ""
        ).strip()

        self.currency_code = str(
            self.currency_code or "SAR"
        ).strip().upper()

        self.accounting_reference = str(
            self.accounting_reference or ""
        ).strip()

        self.amount = money(self.amount)

        if not self.adjustment_reference:
            raise ValidationError(
                {
                    "adjustment_reference":
                        "Adjustment reference is required."
                }
            )

        if not self.idempotency_key:
            raise ValidationError(
                {
                    "idempotency_key":
                        "Adjustment idempotency key is required."
                }
            )

        if self.amount <= ZERO_MONEY:
            raise ValidationError(
                {
                    "amount":
                        "Adjustment amount must be greater than zero."
                }
            )

        if (
            self.subscription_id
            and self.company_id
            and self.subscription.company_id != self.company_id
        ):
            raise ValidationError(
                {
                    "company":
                        "Adjustment company does not match subscription."
                }
            )

        if self.payment_id:
            payment = self.payment

            if payment.subscription_id != self.subscription_id:
                raise ValidationError(
                    {
                        "payment":
                            "Adjustment payment does not match subscription."
                    }
                )

            if payment.company_id != self.company_id:
                raise ValidationError(
                    {
                        "payment":
                            "Adjustment payment does not match company."
                    }
                )

            payment_currency = str(
                payment.currency_code or "SAR"
            ).strip().upper()

            if payment_currency != self.currency_code:
                raise ValidationError(
                    {
                        "currency_code":
                            "Adjustment currency does not match payment."
                    }
                )

        validate_json_object(
            self.metadata,
            "metadata",
        )

        if self.status == self.Status.REVERSED:
            if not self.reversed_at:
                raise ValidationError(
                    {
                        "reversed_at":
                            "reversed_at is required for REVERSED."
                    }
                )

        elif self.reversed_at or self.reversed_by_id:
            raise ValidationError(
                {
                    "status":
                        "Only a REVERSED adjustment can contain reversal data."
                }
            )

    def save(self, *args, **kwargs):
        self.amount = money(self.amount)
        self.full_clean()
        return super().save(*args, **kwargs)


class PlatformSubscriptionAdjustmentEvent(models.Model):
    adjustment = models.ForeignKey(
        PlatformSubscriptionAdjustment,
        on_delete=models.PROTECT,
        related_name="events",
    )

    event_type = models.CharField(
        max_length=60,
        db_index=True,
    )

    message = models.TextField(blank=True)

    payload = models.JSONField(
        default=dict,
        blank=True,
    )

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="platform_subscription_adjustment_events",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["created_at", "id"]

    def clean(self):
        super().clean()

        self.event_type = str(
            self.event_type or ""
        ).strip().upper()

        if not self.event_type:
            raise ValidationError(
                {
                    "event_type":
                        "Adjustment event type is required."
                }
            )

        validate_json_object(
            self.payload,
            "payload",
        )

    def save(self, *args, **kwargs):
        self.event_type = str(
            self.event_type or ""
        ).strip().upper()

        self.full_clean()
        return super().save(*args, **kwargs)
