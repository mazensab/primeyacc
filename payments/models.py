# ============================================================
# 📂 payments/models.py
# 🧠 Mhamcloud | Company Payment Methods Foundation Models V1.1
# ------------------------------------------------------------
# ✅ Defines company-level payment methods
# ✅ Defines company-level payment gateways
# ✅ Defines company-level payment terminals
# ✅ Keeps platform subscription billing separated from company payments
# ✅ Hardens cross-company validation for gateways/methods/terminals
# ✅ Prevents negative fees
# ✅ Keeps one default gateway/method/terminal per scope
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه النماذج تخص طرق دفع الشركة داخل /company فقط
# - لا تستخدم هذه النماذج لدفع اشتراكات Mhamcloud الخاصة بمالك المنصة
# - Phase 19 سيستخدم نماذج/خدمات Platform Billing مستقلة
# - الربط المحاسبي هنا مبدئي عبر أكواد حسابات آمنة حتى نراجع accounting/models.py
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


ZERO_MONEY = Decimal("0.00")


class CompanyPaymentGateway(models.Model):
    """
    Company-specific payment gateway configuration.

    Examples:
    - Moyasar
    - HyperPay
    - PayTabs
    - Tap
    - Geidea
    - Stripe
    """

    class GatewayType(models.TextChoices):
        MOYASAR = "MOYASAR", "Moyasar"
        HYPERPAY = "HYPERPAY", "HyperPay"
        PAYTABS = "PAYTABS", "PayTabs"
        TAP = "TAP", "Tap"
        GEIDEA = "GEIDEA", "Geidea"
        STRIPE = "STRIPE", "Stripe"
        CUSTOM = "CUSTOM", "Custom"

    class Environment(models.TextChoices):
        SANDBOX = "SANDBOX", "Sandbox"
        LIVE = "LIVE", "Live"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="payment_gateways",
    )

    name = models.CharField(max_length=160)
    code = models.SlugField(max_length=80)
    gateway_type = models.CharField(
        max_length=30,
        choices=GatewayType.choices,
        default=GatewayType.CUSTOM,
    )
    environment = models.CharField(
        max_length=20,
        choices=Environment.choices,
        default=Environment.SANDBOX,
    )

    # Never expose this field directly in public APIs.
    settings = models.JSONField(default=dict, blank=True)

    public_key = models.CharField(max_length=255, blank=True)
    merchant_id = models.CharField(max_length=255, blank=True)

    settlement_account_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Accounting account code used for gateway settlements.",
    )
    fee_account_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Accounting account code used for gateway fees.",
    )

    supports_refunds = models.BooleanField(default=False)
    supports_partial_refunds = models.BooleanField(default=False)
    supports_webhooks = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Company Payment Gateway"
        verbose_name_plural = "Company Payment Gateways"
        ordering = ["company_id", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_payment_gateway_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "gateway_type"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "is_default"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.company_id})"

    def clean(self) -> None:
        super().clean()

        if self.settings is None:
            self.settings = {}

        if not isinstance(self.settings, dict):
            raise ValidationError({"settings": "Gateway settings must be a JSON object."})

    def save(self, *args, **kwargs):
        self.full_clean()

        if self.is_default and self.company_id:
            CompanyPaymentGateway.objects.filter(
                company_id=self.company_id,
                is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


class CompanyPaymentMethod(models.Model):
    """
    Company-specific payment method.

    This is what sales, invoices, POS, and checkout should use later.
    """

    class MethodType(models.TextChoices):
        CASH = "CASH", "Cash"
        BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
        CARD = "CARD", "Card"
        POS_TERMINAL = "POS_TERMINAL", "POS Terminal"
        ONLINE_GATEWAY = "ONLINE_GATEWAY", "Online Gateway"
        TAMARA = "TAMARA", "Tamara"
        TABBY = "TABBY", "Tabby"
        WALLET = "WALLET", "Wallet"
        OTHER = "OTHER", "Other"

    class SettlementBehavior(models.TextChoices):
        IMMEDIATE = "IMMEDIATE", "Immediate"
        NEEDS_SETTLEMENT = "NEEDS_SETTLEMENT", "Needs Settlement"
        EXTERNAL_CLEARING = "EXTERNAL_CLEARING", "External Clearing"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="payment_methods",
    )

    gateway = models.ForeignKey(
        CompanyPaymentGateway,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_methods",
    )

    name = models.CharField(max_length=160)
    code = models.SlugField(max_length=80)

    method_type = models.CharField(
        max_length=30,
        choices=MethodType.choices,
        default=MethodType.CASH,
    )
    settlement_behavior = models.CharField(
        max_length=30,
        choices=SettlementBehavior.choices,
        default=SettlementBehavior.IMMEDIATE,
    )

    cashbox_account_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Accounting account code for cashbox or direct cash receipt.",
    )
    bank_account_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Accounting account code for bank receipt.",
    )
    settlement_account_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Accounting account code for pending gateway/POS settlement.",
    )
    fee_account_code = models.CharField(
        max_length=50,
        blank=True,
        help_text="Accounting account code for payment fees.",
    )

    fee_percentage = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=ZERO_MONEY,
    )
    fixed_fee = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=ZERO_MONEY,
    )

    is_cash = models.BooleanField(default=False)
    is_bank_transfer = models.BooleanField(default=False)
    is_card = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    is_pos_terminal = models.BooleanField(default=False)

    requires_reference = models.BooleanField(default=False)
    requires_manual_confirmation = models.BooleanField(default=False)
    allow_customer_checkout = models.BooleanField(default=False)
    allow_pos = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    sort_order = models.PositiveIntegerField(default=100)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Company Payment Method"
        verbose_name_plural = "Company Payment Methods"
        ordering = ["company_id", "sort_order", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_payment_method_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "method_type"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "is_default"]),
            models.Index(fields=["company", "allow_pos"]),
            models.Index(fields=["company", "allow_customer_checkout"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.method_type})"

    def normalize_flags(self) -> None:
        """
        Keep boolean flags aligned with method_type.
        """

        self.is_cash = self.method_type == self.MethodType.CASH
        self.is_bank_transfer = self.method_type == self.MethodType.BANK_TRANSFER
        self.is_card = self.method_type in {
            self.MethodType.CARD,
            self.MethodType.POS_TERMINAL,
            self.MethodType.ONLINE_GATEWAY,
        }
        self.is_online = self.method_type in {
            self.MethodType.ONLINE_GATEWAY,
            self.MethodType.TAMARA,
            self.MethodType.TABBY,
            self.MethodType.WALLET,
        }
        self.is_pos_terminal = self.method_type == self.MethodType.POS_TERMINAL

    def clean(self) -> None:
        super().clean()

        if self.gateway_id and self.company_id:
            if self.gateway and self.gateway.company_id != self.company_id:
                raise ValidationError(
                    {
                        "gateway": (
                            "Payment gateway must belong to the same company."
                        )
                    }
                )

        if self.fee_percentage is not None and self.fee_percentage < 0:
            raise ValidationError(
                {
                    "fee_percentage": (
                        "Fee percentage cannot be less than zero."
                    )
                }
            )

        if self.fixed_fee is not None and self.fixed_fee < 0:
            raise ValidationError(
                {
                    "fixed_fee": (
                        "Fixed fee cannot be less than zero."
                    )
                }
            )

        if self.method_type == self.MethodType.ONLINE_GATEWAY and not self.gateway_id:
            raise ValidationError(
                {
                    "gateway": (
                        "Online gateway payment methods require a payment gateway."
                    )
                }
            )

        if self.method_type == self.MethodType.POS_TERMINAL and not self.allow_pos:
            raise ValidationError(
                {
                    "allow_pos": (
                        "POS terminal payment methods must be allowed for POS."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.normalize_flags()
        self.full_clean()

        if self.is_default and self.company_id:
            CompanyPaymentMethod.objects.filter(
                company_id=self.company_id,
                is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)

        super().save(*args, **kwargs)


class CompanyPaymentTerminal(models.Model):
    """
    Company payment terminal linked to a branch and optional gateway.

    Later this can be used by POS, cashier sessions, device binding,
    and settlement workflows.
    """

    class TerminalStatus(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        INACTIVE = "INACTIVE", "Inactive"
        MAINTENANCE = "MAINTENANCE", "Maintenance"
        RETIRED = "RETIRED", "Retired"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="payment_terminals",
    )

    branch = models.ForeignKey(
        "companies.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payment_terminals",
    )

    gateway = models.ForeignKey(
        CompanyPaymentGateway,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="terminals",
    )

    payment_method = models.ForeignKey(
        CompanyPaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="terminals",
    )

    name = models.CharField(max_length=160)
    terminal_code = models.SlugField(max_length=80)
    terminal_id = models.CharField(max_length=120, blank=True)
    serial_number = models.CharField(max_length=120, blank=True)

    provider_name = models.CharField(max_length=120, blank=True)
    location_note = models.CharField(max_length=255, blank=True)

    status = models.CharField(
        max_length=30,
        choices=TerminalStatus.choices,
        default=TerminalStatus.ACTIVE,
    )

    is_active = models.BooleanField(default=True)
    is_default_for_branch = models.BooleanField(default=False)

    settings = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True)

    last_seen_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Company Payment Terminal"
        verbose_name_plural = "Company Payment Terminals"
        ordering = ["company_id", "branch_id", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "terminal_code"],
                name="unique_payment_terminal_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "is_default_for_branch"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.terminal_code})"

    def clean(self) -> None:
        super().clean()

        if self.settings is None:
            self.settings = {}

        if not isinstance(self.settings, dict):
            raise ValidationError({"settings": "Terminal settings must be a JSON object."})

        if self.branch_id and self.company_id:
            if self.branch and self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch": (
                            "Payment terminal branch must belong to the same company."
                        )
                    }
                )

        if self.gateway_id and self.company_id:
            if self.gateway and self.gateway.company_id != self.company_id:
                raise ValidationError(
                    {
                        "gateway": (
                            "Payment terminal gateway must belong to the same company."
                        )
                    }
                )

        if self.payment_method_id and self.company_id:
            if self.payment_method and self.payment_method.company_id != self.company_id:
                raise ValidationError(
                    {
                        "payment_method": (
                            "Payment terminal method must belong to the same company."
                        )
                    }
                )

        if self.payment_method_id:
            if self.payment_method and not self.payment_method.is_pos_terminal:
                raise ValidationError(
                    {
                        "payment_method": (
                            "Payment terminal method must be a POS terminal method."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()

        if self.is_default_for_branch and self.company_id:
            default_scope = CompanyPaymentTerminal.objects.filter(
                company_id=self.company_id,
                branch_id=self.branch_id,
                is_default_for_branch=True,
            ).exclude(pk=self.pk)

            default_scope.update(is_default_for_branch=False)

        super().save(*args, **kwargs)


# ============================================================
# 🧠 Mhamcloud | Phase 23 Real Payment Integrations & Settlements Models
# ------------------------------------------------------------
# ✅ Checkout sessions for real gateway payment attempts
# ✅ Webhook event ledger with idempotency protection
# ✅ Settlement batches and settlement items
# ✅ Gateway fee / net settlement foundation
# ✅ Tenant isolation through company foreign keys
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه النماذج تبنى فوق طرق الدفع والبوابات الحالية ولا تستبدلها
# - لا يتم الاعتماد على company_id من الواجهة
# - كل سجل تشغيلي مرتبط بالشركة الحالية
# - أسرار البوابات تبقى داخل CompanyPaymentGateway.settings ولا تعرض في هذه النماذج
# ============================================================


class PaymentCheckoutSession(models.Model):
    """
    Company checkout session for real gateway payment attempts.

    This model is intentionally generic so it can support:
    - sales invoices
    - sales orders
    - POS orders
    - subscription payments
    - manual company payments
    """

    class SourceType(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        SALES_ORDER = "SALES_ORDER", "Sales Order"
        SALES_INVOICE = "SALES_INVOICE", "Sales Invoice"
        POS_ORDER = "POS_ORDER", "POS Order"
        SUBSCRIPTION = "SUBSCRIPTION", "Subscription"
        OTHER = "OTHER", "Other"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PROCESSING = "PROCESSING", "Processing"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        EXPIRED = "EXPIRED", "Expired"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="payment_checkout_sessions",
    )
    payment_method = models.ForeignKey(
        CompanyPaymentMethod,
        on_delete=models.PROTECT,
        related_name="checkout_sessions",
    )
    gateway = models.ForeignKey(
        CompanyPaymentGateway,
        on_delete=models.PROTECT,
        related_name="checkout_sessions",
    )
    terminal = models.ForeignKey(
        CompanyPaymentTerminal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checkout_sessions",
    )

    source_type = models.CharField(
        max_length=40,
        choices=SourceType.choices,
        default=SourceType.MANUAL,
    )
    source_id = models.PositiveIntegerField(null=True, blank=True)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    currency_code = models.CharField(max_length=10, default="SAR")

    description = models.CharField(max_length=255, blank=True)
    customer_email = models.EmailField(blank=True)
    customer_phone = models.CharField(max_length=40, blank=True)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.PENDING,
    )

    external_checkout_id = models.CharField(max_length=160, blank=True)
    external_payment_id = models.CharField(max_length=160, blank=True)
    checkout_url = models.URLField(max_length=1000, blank=True)
    idempotency_key = models.CharField(max_length=160, blank=True)

    gateway_fee_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
    )
    net_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
    )

    metadata = models.JSONField(default=dict, blank=True)
    failure_reason = models.TextField(blank=True)

    expires_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment Checkout Session"
        verbose_name_plural = "Payment Checkout Sessions"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "gateway"]),
            models.Index(fields=["company", "payment_method"]),
            models.Index(fields=["company", "source_type", "source_id"]),
            models.Index(fields=["company", "external_checkout_id"]),
            models.Index(fields=["company", "external_payment_id"]),
            models.Index(fields=["company", "idempotency_key"]),
        ]

    def __str__(self) -> str:
        return f"Checkout #{self.pk or 'new'} - {self.company_id} - {self.amount} {self.currency_code}"

    def clean(self) -> None:
        super().clean()

        if self.amount is None or self.amount <= 0:
            raise ValidationError({"amount": "Checkout amount must be greater than zero."})

        if self.gateway_id and self.company_id:
            if self.gateway and self.gateway.company_id != self.company_id:
                raise ValidationError({"gateway": "Payment gateway must belong to the same company."})

        if self.payment_method_id and self.company_id:
            if self.payment_method and self.payment_method.company_id != self.company_id:
                raise ValidationError({"payment_method": "Payment method must belong to the same company."})

        if self.terminal_id and self.company_id:
            if self.terminal and self.terminal.company_id != self.company_id:
                raise ValidationError({"terminal": "Payment terminal must belong to the same company."})

        if self.gateway_id and self.payment_method_id:
            if self.payment_method.gateway_id and self.payment_method.gateway_id != self.gateway_id:
                raise ValidationError({"payment_method": "Payment method gateway does not match checkout gateway."})

        if self.idempotency_key:
            duplicate = PaymentCheckoutSession.objects.filter(
                company_id=self.company_id,
                idempotency_key=self.idempotency_key,
            ).exclude(pk=self.pk).exists()
            if duplicate:
                raise ValidationError({"idempotency_key": "Checkout idempotency key already exists."})

        if self.metadata is None:
            self.metadata = {}

        if not isinstance(self.metadata, dict):
            raise ValidationError({"metadata": "Checkout metadata must be a JSON object."})

    def save(self, *args, **kwargs):
        if self.net_amount is None or self.net_amount == ZERO_MONEY:
            self.net_amount = (self.amount or ZERO_MONEY) - (self.gateway_fee_amount or ZERO_MONEY)

        self.full_clean()
        super().save(*args, **kwargs)


class PaymentWebhookEvent(models.Model):
    """
    Raw gateway webhook event ledger.

    This model is used for safe processing, replay diagnostics, and idempotency.
    """

    class Status(models.TextChoices):
        RECEIVED = "RECEIVED", "Received"
        PROCESSED = "PROCESSED", "Processed"
        FAILED = "FAILED", "Failed"
        IGNORED = "IGNORED", "Ignored"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="payment_webhook_events",
    )
    gateway = models.ForeignKey(
        CompanyPaymentGateway,
        on_delete=models.PROTECT,
        related_name="webhook_events",
    )
    checkout_session = models.ForeignKey(
        PaymentCheckoutSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="webhook_events",
    )

    event_type = models.CharField(max_length=120)
    external_event_id = models.CharField(max_length=180, blank=True)
    external_payment_id = models.CharField(max_length=180, blank=True)
    idempotency_key = models.CharField(max_length=180, blank=True)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.RECEIVED,
    )

    payload = models.JSONField(default=dict, blank=True)
    headers = models.JSONField(default=dict, blank=True)
    signature = models.CharField(max_length=500, blank=True)

    error_message = models.TextField(blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Payment Webhook Event"
        verbose_name_plural = "Payment Webhook Events"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["company", "gateway"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "event_type"]),
            models.Index(fields=["company", "external_event_id"]),
            models.Index(fields=["company", "external_payment_id"]),
            models.Index(fields=["company", "idempotency_key"]),
        ]

    def __str__(self) -> str:
        return f"{self.gateway_id} - {self.event_type} - {self.status}"

    def clean(self) -> None:
        super().clean()

        if self.gateway_id and self.company_id:
            if self.gateway and self.gateway.company_id != self.company_id:
                raise ValidationError({"gateway": "Payment gateway must belong to the same company."})

        if self.checkout_session_id and self.company_id:
            if self.checkout_session and self.checkout_session.company_id != self.company_id:
                raise ValidationError({"checkout_session": "Checkout session must belong to the same company."})

        if self.external_event_id:
            duplicate = PaymentWebhookEvent.objects.filter(
                company_id=self.company_id,
                gateway_id=self.gateway_id,
                external_event_id=self.external_event_id,
            ).exclude(pk=self.pk).exists()
            if duplicate:
                raise ValidationError({"external_event_id": "Webhook event was already recorded."})

        if self.idempotency_key:
            duplicate = PaymentWebhookEvent.objects.filter(
                company_id=self.company_id,
                gateway_id=self.gateway_id,
                idempotency_key=self.idempotency_key,
            ).exclude(pk=self.pk).exists()
            if duplicate:
                raise ValidationError({"idempotency_key": "Webhook idempotency key was already recorded."})

        if self.payload is None:
            self.payload = {}

        if self.headers is None:
            self.headers = {}

        if not isinstance(self.payload, dict):
            raise ValidationError({"payload": "Webhook payload must be a JSON object."})

        if not isinstance(self.headers, dict):
            raise ValidationError({"headers": "Webhook headers must be a JSON object."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class PaymentSettlementBatch(models.Model):
    """
    Settlement batch for gateway/POS clearing.

    It groups gateway payments and tracks gross, fees, and net amount.
    """

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        READY = "READY", "Ready"
        POSTED = "POSTED", "Posted"
        CANCELLED = "CANCELLED", "Cancelled"

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="payment_settlement_batches",
    )
    gateway = models.ForeignKey(
        CompanyPaymentGateway,
        on_delete=models.PROTECT,
        related_name="settlement_batches",
    )
    payment_method = models.ForeignKey(
        CompanyPaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settlement_batches",
    )

    settlement_reference = models.CharField(max_length=160)
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    currency_code = models.CharField(max_length=10, default="SAR")
    gross_amount = models.DecimalField(max_digits=14, decimal_places=2, default=ZERO_MONEY)
    fee_amount = models.DecimalField(max_digits=14, decimal_places=2, default=ZERO_MONEY)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2, default=ZERO_MONEY)

    settlement_date = models.DateField(null=True, blank=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Payment Settlement Batch"
        verbose_name_plural = "Payment Settlement Batches"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "settlement_reference"],
                name="unique_payment_settlement_reference_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "gateway"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "settlement_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.settlement_reference} - {self.status}"

    def clean(self) -> None:
        super().clean()

        if not self.settlement_reference:
            raise ValidationError({"settlement_reference": "Settlement reference is required."})

        if self.gateway_id and self.company_id:
            if self.gateway and self.gateway.company_id != self.company_id:
                raise ValidationError({"gateway": "Payment gateway must belong to the same company."})

        if self.payment_method_id and self.company_id:
            if self.payment_method and self.payment_method.company_id != self.company_id:
                raise ValidationError({"payment_method": "Payment method must belong to the same company."})

        for field_name in ["gross_amount", "fee_amount", "net_amount"]:
            value = getattr(self, field_name)
            if value is not None and value < 0:
                raise ValidationError({field_name: "Settlement amounts cannot be negative."})

        if self.metadata is None:
            self.metadata = {}

        if not isinstance(self.metadata, dict):
            raise ValidationError({"metadata": "Settlement metadata must be a JSON object."})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class PaymentSettlementItem(models.Model):
    """
    One payment line inside a settlement batch.
    """

    class Status(models.TextChoices):
        INCLUDED = "INCLUDED", "Included"
        EXCLUDED = "EXCLUDED", "Excluded"

    batch = models.ForeignKey(
        PaymentSettlementBatch,
        on_delete=models.CASCADE,
        related_name="items",
    )
    checkout_session = models.ForeignKey(
        PaymentCheckoutSession,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settlement_items",
    )
    webhook_event = models.ForeignKey(
        PaymentWebhookEvent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="settlement_items",
    )

    external_payment_id = models.CharField(max_length=180, blank=True)

    gross_amount = models.DecimalField(max_digits=14, decimal_places=2)
    fee_amount = models.DecimalField(max_digits=14, decimal_places=2, default=ZERO_MONEY)
    net_amount = models.DecimalField(max_digits=14, decimal_places=2, default=ZERO_MONEY)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.INCLUDED,
    )

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = "Payment Settlement Item"
        verbose_name_plural = "Payment Settlement Items"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["batch", "status"]),
            models.Index(fields=["external_payment_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.batch_id} - {self.gross_amount}"

    @property
    def company_id(self):
        return self.batch.company_id if self.batch_id else None

    def clean(self) -> None:
        super().clean()

        if self.gross_amount is None or self.gross_amount < 0:
            raise ValidationError({"gross_amount": "Settlement item gross amount cannot be negative."})

        if self.fee_amount is not None and self.fee_amount < 0:
            raise ValidationError({"fee_amount": "Settlement item fee amount cannot be negative."})

        if self.checkout_session_id and self.batch_id:
            if self.checkout_session and self.checkout_session.company_id != self.batch.company_id:
                raise ValidationError({"checkout_session": "Checkout session must belong to the same company."})

        if self.webhook_event_id and self.batch_id:
            if self.webhook_event and self.webhook_event.company_id != self.batch.company_id:
                raise ValidationError({"webhook_event": "Webhook event must belong to the same company."})

    def save(self, *args, **kwargs):
        self.net_amount = (self.gross_amount or ZERO_MONEY) - (self.fee_amount or ZERO_MONEY)
        self.full_clean()
        super().save(*args, **kwargs)
