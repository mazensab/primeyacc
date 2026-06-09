# ============================================================
# 📂 payments/models.py
# 🧠 PrimeyAcc | Company Payment Methods Foundation Models
# ------------------------------------------------------------
# ✅ Defines company-level payment methods
# ✅ Defines company-level payment gateways
# ✅ Defines company-level payment terminals
# ✅ Keeps platform subscription billing separated from company payments
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه النماذج تخص طرق دفع الشركة داخل /company فقط
# - لا تستخدم هذه النماذج لدفع اشتراكات PrimeyAcc الخاصة بمالك المنصة
# - الربط المحاسبي هنا مبدئي عبر أكواد حسابات آمنة حتى نراجع accounting/models.py
# ============================================================

from __future__ import annotations

from django.db import models
from django.utils import timezone


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

    fee_percentage = models.DecimalField(max_digits=7, decimal_places=4, default=0)
    fixed_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)

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

    def save(self, *args, **kwargs):
        self.normalize_flags()
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