# ============================================================
# ًں“‚ pos/models.py
# ًں§  PrimeyAcc | POS Models V1.0
# ------------------------------------------------------------
# âœ… POS Registers Foundation
# âœ… POS Cashier Sessions Foundation
# âœ… POS Checkout Orders Foundation
# âœ… POS Checkout Order Items Foundation
# âœ… POS Payments Foundation
# âœ… Branch / Warehouse / Treasury Account Linking
# âœ… Payment Method / Terminal Linking
# âœ… Sales Invoice Linking
# âœ… Customer Linking
# âœ… CatalogItem Snapshot at Checkout Time
# âœ… Company-level Tenant Isolation
# âœ… Audit Fields
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - POS ظٹط¹ظ…ظ„ ط¯ط§ط®ظ„ ظ…ط³ط§ط­ط© /company ظپظ‚ط·
# - ظ„ط§ طھظ‚ط¨ظ„ ظˆط§ط¬ظ‡ط§طھ /company ط£ظٹ company_id ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط©
# - ط£ظٹ API ط¯ط§ط®ظ„ /company ظٹط¬ط¨ ط£ظ† ظٹط³طھط®ط±ط¬ ط§ظ„ط´ط±ظƒط© ظ…ظ† ط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ط­ط§ظ„ظٹ
# - ظƒظ„ ط³ط¬ظ„ POS ظٹط¬ط¨ ط£ظ† ظٹط±طھط¨ط· ط¨ظ€ company
# - ظƒظ„ Register ظٹط±طھط¨ط· ط¨ط´ط±ظƒط© ظˆظپط±ط¹ ظˆظٹظ…ظƒظ† ط±ط¨ط·ظ‡ ط¨ظ…ط³طھظˆط¯ط¹ ظˆط­ط³ط§ط¨ ط®ط²ظٹظ†ط©
# - ظƒظ„ Session طھط±طھط¨ط· ط¨ظ€ Register ظˆط§ط­ط¯ ظˆطھظ…ظ†ط¹ ط§ظ„ط®ط¯ظ…ط§طھ ظپطھط­ ط£ظƒط«ط± ظ…ظ† ط¬ظ„ط³ط© ظ†ط´ط·ط©
# - ظƒظ„ POSOrder ظ‡ظˆ ظ…ط³طھظ†ط¯ checkout ظ‚ط¨ظ„/ط¨ط¹ط¯ ط¥ظ†ط´ط§ط، ظپط§طھظˆط±ط© ط§ظ„ط¨ظٹط¹
# - ظƒظ„ POSOrderItem ظٹط­طھظپط¸ ط¨ظ†ط³ط®ط© Snapshot ظ…ظ† ط¨ظٹط§ظ†ط§طھ CatalogItem ظˆظ‚طھ ط§ظ„ط¨ظٹط¹
# - ظƒظ„ POSPayment ظٹط­طھظپط¸ ط¨ط·ط±ظٹظ‚ط© ط§ظ„ط¯ظپط¹ ظˆط§ظ„ط¬ظ‡ط§ط² ظˆط­ط³ط§ط¨ ط§ظ„ط®ط²ظٹظ†ط© ظˆط­ط±ظƒط© ط§ظ„ط®ط²ظٹظ†ط© ط¹ظ†ط¯ ط§ظ„ط­ط§ط¬ط©
# - ظ„ط§ ظٹطھظ… طھظ†ظپظٹط° ط§ظ„ط¨ظٹط¹ ط£ظˆ ط®طµظ… ط§ظ„ظ…ط®ط²ظˆظ† ط£ظˆ ط§ظ„طھط±ط­ظٹظ„ ط§ظ„ظ…ط­ط§ط³ط¨ظٹ ط¯ط§ط®ظ„ models.py
# - ط§ظ„ط¹ظ…ظ„ظٹط§طھ ط§ظ„طھط´ط؛ظٹظ„ظٹط© طھطھظ… ط¯ط§ط®ظ„ pos/services.py ظپظ‚ط·
# - ظ„ط§ ظٹط¬ظˆط² ط±ط¨ط· ط£ظٹ ظپط±ط¹ ط£ظˆ ظ…ط³طھظˆط¯ط¹ ط£ظˆ ط­ط³ط§ط¨ ط®ط²ظٹظ†ط© ط£ظˆ ط·ط±ظٹظ‚ط© ط¯ظپط¹ ظ…ظ† ط´ط±ظƒط© ط£ط®ط±ظ‰
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


ZERO_MONEY = Decimal("0.00")
ZERO_QUANTITY = Decimal("0.0000")


class POSRegisterStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    MAINTENANCE = "MAINTENANCE", "Maintenance"


class POSSessionStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"
    CANCELLED = "CANCELLED", "Cancelled"


class POSOrderStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
    REFUNDED = "REFUNDED", "Refunded"


class POSPaymentStatus(models.TextChoices):
    UNPAID = "UNPAID", "Unpaid"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially paid"
    PAID = "PAID", "Paid"
    REFUNDED = "REFUNDED", "Refunded"


class POSPaymentLineStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CANCELLED = "CANCELLED", "Cancelled"
    REFUNDED = "REFUNDED", "Refunded"


class POSPaymentLineType(models.TextChoices):
    CASH = "CASH", "Cash"
    CARD = "CARD", "Card"
    BANK_TRANSFER = "BANK_TRANSFER", "Bank transfer"
    GATEWAY = "GATEWAY", "Gateway"
    WALLET = "WALLET", "Wallet"
    OTHER = "OTHER", "Other"



class POSReturnStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"
class POSRegister(models.Model):
    """
    POS register / cashier point.

    The register is the selling point inside one company branch.
    Services will use this model to open sessions and perform checkout.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_registers",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        "companies.Branch",
        on_delete=models.PROTECT,
        related_name="pos_registers",
        db_index=True,
        verbose_name="Branch",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="pos_registers",
        blank=True,
        null=True,
        verbose_name="Warehouse",
        help_text="Default warehouse used for POS stock issue.",
    )
    treasury_account = models.ForeignKey(
        "treasury.TreasuryAccount",
        on_delete=models.PROTECT,
        related_name="pos_registers",
        blank=True,
        null=True,
        verbose_name="Treasury account",
        help_text="Default treasury account used for POS cash and payment collections.",
    )
    default_payment_method = models.ForeignKey(
        "payments.CompanyPaymentMethod",
        on_delete=models.SET_NULL,
        related_name="default_pos_registers",
        blank=True,
        null=True,
        verbose_name="Default payment method",
    )
    default_payment_terminal = models.ForeignKey(
        "payments.CompanyPaymentTerminal",
        on_delete=models.SET_NULL,
        related_name="default_pos_registers",
        blank=True,
        null=True,
        verbose_name="Default payment terminal",
    )

    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Register name",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Register code",
        help_text="Unique inside the same company.",
    )
    status = models.CharField(
        max_length=30,
        choices=POSRegisterStatus.choices,
        default=POSRegisterStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    receipt_header = models.TextField(
        blank=True,
        verbose_name="Receipt header",
    )
    receipt_footer = models.TextField(
        blank=True,
        verbose_name="Receipt footer",
    )
    settings_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Register settings data",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_pos_registers",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_pos_registers",
        verbose_name="Updated by",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS register"
        verbose_name_plural = "POS registers"
        ordering = ["company_id", "branch_id", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_pos_register_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status", "is_active"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "treasury_account"]),
            models.Index(fields=["code"]),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.code}"

    @property
    def display_name(self) -> str:
        return self.name

    @property
    def is_available(self) -> bool:
        return self.status == POSRegisterStatus.ACTIVE and self.is_active

    def clean(self) -> None:
        super().clean()

        if self.branch_id and self.company_id and self.branch.company_id != self.company_id:
            raise ValidationError({"branch": "Branch must belong to the same company."})

        if self.warehouse_id and self.company_id and self.warehouse.company_id != self.company_id:
            raise ValidationError({"warehouse": "Warehouse must belong to the same company."})

        if (
            self.treasury_account_id
            and self.company_id
            and self.treasury_account.company_id != self.company_id
        ):
            raise ValidationError(
                {"treasury_account": "Treasury account must belong to the same company."}
            )

        if (
            self.default_payment_method_id
            and self.company_id
            and self.default_payment_method.company_id != self.company_id
        ):
            raise ValidationError(
                {"default_payment_method": "Payment method must belong to the same company."}
            )

        if (
            self.default_payment_terminal_id
            and self.company_id
            and self.default_payment_terminal.company_id != self.company_id
        ):
            raise ValidationError(
                {"default_payment_terminal": "Payment terminal must belong to the same company."}
            )

    def save(self, *args, **kwargs):
        if self.status in [POSRegisterStatus.INACTIVE, POSRegisterStatus.MAINTENANCE]:
            self.is_active = False

        if self.status == POSRegisterStatus.ACTIVE:
            self.is_active = True

        super().save(*args, **kwargs)

    def activate(self, user=None) -> None:
        self.status = POSRegisterStatus.ACTIVE
        self.is_active = True
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )

    def deactivate(self, user=None) -> None:
        self.status = POSRegisterStatus.INACTIVE
        self.is_active = False
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )


class POSSession(models.Model):
    """
    Cashier session for one POS register.

    Opening and closing rules are enforced in pos/services.py.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_sessions",
        db_index=True,
        verbose_name="Company",
    )
    register = models.ForeignKey(
        POSRegister,
        on_delete=models.PROTECT,
        related_name="sessions",
        db_index=True,
        verbose_name="Register",
    )
    branch = models.ForeignKey(
        "companies.Branch",
        on_delete=models.PROTECT,
        related_name="pos_sessions",
        db_index=True,
        verbose_name="Branch",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="pos_sessions",
        blank=True,
        null=True,
        verbose_name="Warehouse",
    )
    treasury_account = models.ForeignKey(
        "treasury.TreasuryAccount",
        on_delete=models.PROTECT,
        related_name="pos_sessions",
        blank=True,
        null=True,
        verbose_name="Treasury account",
    )

    session_number = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Session number",
        help_text="Unique inside the same company.",
    )
    status = models.CharField(
        max_length=30,
        choices=POSSessionStatus.choices,
        default=POSSessionStatus.OPEN,
        db_index=True,
        verbose_name="Status",
    )

    opening_cash_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Opening cash amount",
    )
    closing_cash_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Closing cash amount",
    )
    expected_cash_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Expected cash amount",
    )
    difference_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Difference amount",
    )

    opened_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="opened_pos_sessions",
        verbose_name="Opened by",
    )
    closed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="closed_pos_sessions",
        verbose_name="Closed by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_pos_sessions",
        verbose_name="Cancelled by",
    )

    opened_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name="Opened at",
    )
    closed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Closed at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Cancelled at",
    )
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name="Cancellation reason",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS session"
        verbose_name_plural = "POS sessions"
        ordering = ["-opened_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "session_number"],
                name="unique_pos_session_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "register", "status"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "treasury_account"]),
            models.Index(fields=["company", "opened_at"]),
            models.Index(fields=["session_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.session_number} - {self.status}"

    @property
    def is_open(self) -> bool:
        return self.status == POSSessionStatus.OPEN

    @property
    def is_closed(self) -> bool:
        return self.status == POSSessionStatus.CLOSED

    def clean(self) -> None:
        super().clean()

        if self.register_id and self.company_id and self.register.company_id != self.company_id:
            raise ValidationError({"register": "Register must belong to the same company."})

        if self.branch_id and self.company_id and self.branch.company_id != self.company_id:
            raise ValidationError({"branch": "Branch must belong to the same company."})

        if self.warehouse_id and self.company_id and self.warehouse.company_id != self.company_id:
            raise ValidationError({"warehouse": "Warehouse must belong to the same company."})

        if (
            self.treasury_account_id
            and self.company_id
            and self.treasury_account.company_id != self.company_id
        ):
            raise ValidationError(
                {"treasury_account": "Treasury account must belong to the same company."}
            )


class POSOrder(models.Model):
    """
    POS checkout order.

    This model is the checkout source document.
    Completing the order should be handled in pos/services.py.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_orders",
        db_index=True,
        verbose_name="Company",
    )
    session = models.ForeignKey(
        POSSession,
        on_delete=models.PROTECT,
        related_name="orders",
        db_index=True,
        verbose_name="Session",
    )
    register = models.ForeignKey(
        POSRegister,
        on_delete=models.PROTECT,
        related_name="orders",
        db_index=True,
        verbose_name="Register",
    )
    branch = models.ForeignKey(
        "companies.Branch",
        on_delete=models.PROTECT,
        related_name="pos_orders",
        db_index=True,
        verbose_name="Branch",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="pos_orders",
        blank=True,
        null=True,
        verbose_name="Warehouse",
    )
    customer = models.ForeignKey(
        "parties.BusinessParty",
        on_delete=models.SET_NULL,
        related_name="pos_orders",
        blank=True,
        null=True,
        verbose_name="Customer",
    )
    invoice = models.ForeignKey(
        "sales.SalesInvoice",
        on_delete=models.SET_NULL,
        related_name="pos_orders",
        blank=True,
        null=True,
        verbose_name="Sales invoice",
    )

    order_number = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Order number",
        help_text="Unique inside the same company.",
    )
    status = models.CharField(
        max_length=30,
        choices=POSOrderStatus.choices,
        default=POSOrderStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )
    payment_status = models.CharField(
        max_length=30,
        choices=POSPaymentStatus.choices,
        default=POSPaymentStatus.UNPAID,
        db_index=True,
        verbose_name="Payment status",
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Subtotal amount",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Discount amount",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Taxable amount",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Tax amount",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Total amount",
    )
    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Paid amount",
    )
    change_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Change amount",
    )

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="completed_pos_orders",
        verbose_name="Completed by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_pos_orders",
        verbose_name="Cancelled by",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_pos_orders",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_pos_orders",
        verbose_name="Updated by",
    )

    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Completed at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Cancelled at",
    )
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name="Cancellation reason",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS order"
        verbose_name_plural = "POS orders"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "order_number"],
                name="unique_pos_order_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "payment_status"]),
            models.Index(fields=["company", "session"]),
            models.Index(fields=["company", "register"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["order_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.order_number} - {self.status}"

    @property
    def balance_due(self) -> Decimal:
        amount = self.total_amount - self.paid_amount
        return amount if amount > ZERO_MONEY else ZERO_MONEY

    @property
    def is_completed(self) -> bool:
        return self.status == POSOrderStatus.COMPLETED

    def clean(self) -> None:
        super().clean()

        if self.session_id and self.company_id and self.session.company_id != self.company_id:
            raise ValidationError({"session": "Session must belong to the same company."})

        if self.register_id and self.company_id and self.register.company_id != self.company_id:
            raise ValidationError({"register": "Register must belong to the same company."})

        if self.branch_id and self.company_id and self.branch.company_id != self.company_id:
            raise ValidationError({"branch": "Branch must belong to the same company."})

        if self.warehouse_id and self.company_id and self.warehouse.company_id != self.company_id:
            raise ValidationError({"warehouse": "Warehouse must belong to the same company."})

        if self.customer_id and self.company_id and self.customer.company_id != self.company_id:
            raise ValidationError({"customer": "Customer must belong to the same company."})

        if self.invoice_id and self.company_id and self.invoice.company_id != self.company_id:
            raise ValidationError({"invoice": "Invoice must belong to the same company."})


class POSOrderItem(models.Model):
    """
    POS checkout order item.

    This model stores CatalogItem snapshot values at checkout time.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_order_items",
        db_index=True,
        verbose_name="Company",
    )
    order = models.ForeignKey(
        POSOrder,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="POS order",
    )
    catalog_item = models.ForeignKey(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="pos_order_items",
        db_index=True,
        verbose_name="Catalog item",
    )

    item_code = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Item code",
    )
    item_sku = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Item SKU",
    )
    item_barcode = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        verbose_name="Item barcode",
    )
    item_name = models.CharField(
        max_length=255,
        verbose_name="Item name",
    )
    unit_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Unit name",
    )

    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=ZERO_QUANTITY,
        verbose_name="Quantity",
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Unit price",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Discount amount",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Taxable amount",
    )
    tax_rate = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=ZERO_MONEY,
        verbose_name="Tax rate",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Tax amount",
    )
    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Line total",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS order item"
        verbose_name_plural = "POS order items"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["company", "order"]),
            models.Index(fields=["company", "catalog_item"]),
            models.Index(fields=["item_code"]),
            models.Index(fields=["item_sku"]),
            models.Index(fields=["item_barcode"]),
        ]

    def __str__(self) -> str:
        return f"{self.item_name} x {self.quantity}"

    def clean(self) -> None:
        super().clean()

        if self.order_id and self.company_id and self.order.company_id != self.company_id:
            raise ValidationError({"order": "Order must belong to the same company."})

        if (
            self.catalog_item_id
            and self.company_id
            and self.catalog_item.company_id != self.company_id
        ):
            raise ValidationError({"catalog_item": "Catalog item must belong to the same company."})

        if self.quantity <= ZERO_QUANTITY:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        if self.unit_price < ZERO_MONEY:
            raise ValidationError({"unit_price": "Unit price cannot be negative."})


class POSPayment(models.Model):
    """
    POS payment line.

    A POS order can have one or more payment lines.
    Payment posting is handled in pos/services.py.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_payments",
        db_index=True,
        verbose_name="Company",
    )
    order = models.ForeignKey(
        POSOrder,
        on_delete=models.CASCADE,
        related_name="payments",
        db_index=True,
        verbose_name="POS order",
    )
    payment_method = models.ForeignKey(
        "payments.CompanyPaymentMethod",
        on_delete=models.PROTECT,
        related_name="pos_payments",
        db_index=True,
        verbose_name="Payment method",
    )
    payment_terminal = models.ForeignKey(
        "payments.CompanyPaymentTerminal",
        on_delete=models.SET_NULL,
        related_name="pos_payments",
        blank=True,
        null=True,
        verbose_name="Payment terminal",
    )
    treasury_account = models.ForeignKey(
        "treasury.TreasuryAccount",
        on_delete=models.PROTECT,
        related_name="pos_payments",
        blank=True,
        null=True,
        verbose_name="Treasury account",
    )
    treasury_transaction = models.ForeignKey(
        "treasury.TreasuryTransaction",
        on_delete=models.SET_NULL,
        related_name="pos_payments",
        blank=True,
        null=True,
        verbose_name="Treasury transaction",
    )
    customer_payment = models.ForeignKey(
        "treasury.CustomerPayment",
        on_delete=models.SET_NULL,
        related_name="pos_payments",
        blank=True,
        null=True,
        verbose_name="Customer payment",
    )

    payment_type = models.CharField(
        max_length=30,
        choices=POSPaymentLineType.choices,
        default=POSPaymentLineType.CASH,
        db_index=True,
        verbose_name="Payment type",
    )
    status = models.CharField(
        max_length=30,
        choices=POSPaymentLineStatus.choices,
        default=POSPaymentLineStatus.PENDING,
        db_index=True,
        verbose_name="Status",
    )
    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Amount",
    )
    reference = models.CharField(
        max_length=160,
        blank=True,
        db_index=True,
        verbose_name="Reference",
    )

    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="confirmed_pos_payments",
        verbose_name="Confirmed by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_pos_payments",
        verbose_name="Cancelled by",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_pos_payments",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_pos_payments",
        verbose_name="Updated by",
    )

    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Confirmed at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Cancelled at",
    )
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name="Cancellation reason",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS payment"
        verbose_name_plural = "POS payments"
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["company", "order"]),
            models.Index(fields=["company", "payment_method"]),
            models.Index(fields=["company", "payment_type"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "treasury_account"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["reference"]),
        ]

    def __str__(self) -> str:
        order_number = self.order.order_number if self.order_id else "POS"
        return f"{order_number} - {self.amount}"

    @property
    def is_confirmed(self) -> bool:
        return self.status == POSPaymentLineStatus.CONFIRMED

    def clean(self) -> None:
        super().clean()

        if self.order_id and self.company_id and self.order.company_id != self.company_id:
            raise ValidationError({"order": "Order must belong to the same company."})

        if (
            self.payment_method_id
            and self.company_id
            and self.payment_method.company_id != self.company_id
        ):
            raise ValidationError({"payment_method": "Payment method must belong to the same company."})

        if (
            self.payment_terminal_id
            and self.company_id
            and self.payment_terminal.company_id != self.company_id
        ):
            raise ValidationError({"payment_terminal": "Payment terminal must belong to the same company."})

        if (
            self.treasury_account_id
            and self.company_id
            and self.treasury_account.company_id != self.company_id
        ):
            raise ValidationError(
                {"treasury_account": "Treasury account must belong to the same company."}
            )

        if (
            self.treasury_transaction_id
            and self.company_id
            and self.treasury_transaction.company_id != self.company_id
        ):
            raise ValidationError(
                {"treasury_transaction": "Treasury transaction must belong to the same company."}
            )

        if (
            self.customer_payment_id
            and self.company_id
            and self.customer_payment.company_id != self.company_id
        ):
            raise ValidationError({"customer_payment": "Customer payment must belong to the same company."})

        if self.amount <= ZERO_MONEY:
            raise ValidationError({"amount": "Amount must be greater than zero."})

class POSReturn(models.Model):
    """
    POS return document.

    This model is the foundation document for returning POS order lines.
    Refund posting, stock return, and accounting reversal are intentionally
    handled later inside pos/services.py, not inside models.py.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_returns",
        db_index=True,
        verbose_name="Company",
    )
    original_order = models.ForeignKey(
        POSOrder,
        on_delete=models.PROTECT,
        related_name="returns",
        db_index=True,
        verbose_name="Original POS order",
    )
    session = models.ForeignKey(
        POSSession,
        on_delete=models.PROTECT,
        related_name="returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="POS session",
    )
    register = models.ForeignKey(
        POSRegister,
        on_delete=models.PROTECT,
        related_name="returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Register",
    )
    branch = models.ForeignKey(
        "companies.Branch",
        on_delete=models.PROTECT,
        related_name="pos_returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="pos_returns",
        blank=True,
        null=True,
        verbose_name="Warehouse",
    )
    customer = models.ForeignKey(
        "parties.BusinessParty",
        on_delete=models.SET_NULL,
        related_name="pos_returns",
        blank=True,
        null=True,
        verbose_name="Customer",
    )

    return_number = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Return number",
        help_text="Unique inside the same company.",
    )
    status = models.CharField(
        max_length=30,
        choices=POSReturnStatus.choices,
        default=POSReturnStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Subtotal amount",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Discount amount",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Taxable amount",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Tax amount",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Total amount",
    )
    refund_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Refund amount",
        help_text="Amount expected to be refunded to the customer.",
    )

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="completed_pos_returns",
        verbose_name="Completed by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_pos_returns",
        verbose_name="Cancelled by",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_pos_returns",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_pos_returns",
        verbose_name="Updated by",
    )

    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Completed at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Cancelled at",
    )
    cancellation_reason = models.TextField(
        blank=True,
        verbose_name="Cancellation reason",
    )
    reason = models.TextField(
        blank=True,
        verbose_name="Return reason",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS return"
        verbose_name_plural = "POS returns"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "return_number"],
                name="unique_pos_return_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "original_order"]),
            models.Index(fields=["company", "session"]),
            models.Index(fields=["company", "register"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["return_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.return_number} - {self.status}"

    @property
    def is_completed(self) -> bool:
        return self.status == POSReturnStatus.COMPLETED

    @property
    def is_cancelled(self) -> bool:
        return self.status == POSReturnStatus.CANCELLED

    def clean(self) -> None:
        super().clean()

        if (
            self.original_order_id
            and self.company_id
            and self.original_order.company_id != self.company_id
        ):
            raise ValidationError(
                {"original_order": "Original POS order must belong to the same company."}
            )

        if self.session_id and self.company_id and self.session.company_id != self.company_id:
            raise ValidationError({"session": "Session must belong to the same company."})

        if self.register_id and self.company_id and self.register.company_id != self.company_id:
            raise ValidationError({"register": "Register must belong to the same company."})

        if self.branch_id and self.company_id and self.branch.company_id != self.company_id:
            raise ValidationError({"branch": "Branch must belong to the same company."})

        if self.warehouse_id and self.company_id and self.warehouse.company_id != self.company_id:
            raise ValidationError({"warehouse": "Warehouse must belong to the same company."})

        if self.customer_id and self.company_id and self.customer.company_id != self.company_id:
            raise ValidationError({"customer": "Customer must belong to the same company."})

        if self.total_amount < ZERO_MONEY:
            raise ValidationError({"total_amount": "Total amount cannot be negative."})

        if self.refund_amount < ZERO_MONEY:
            raise ValidationError({"refund_amount": "Refund amount cannot be negative."})


class POSReturnItem(models.Model):
    """
    POS return item.

    This model stores returned quantity and snapshot values from the original
    POS order item. Return quantity limits are enforced in pos/services.py.
    """

    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="pos_return_items",
        db_index=True,
        verbose_name="Company",
    )
    pos_return = models.ForeignKey(
        POSReturn,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="POS return",
    )
    original_order_item = models.ForeignKey(
        POSOrderItem,
        on_delete=models.PROTECT,
        related_name="return_items",
        db_index=True,
        verbose_name="Original POS order item",
    )
    catalog_item = models.ForeignKey(
        "catalog.CatalogItem",
        on_delete=models.PROTECT,
        related_name="pos_return_items",
        db_index=True,
        verbose_name="Catalog item",
    )

    item_code = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Item code",
    )
    item_sku = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Item SKU",
    )
    item_barcode = models.CharField(
        max_length=120,
        blank=True,
        db_index=True,
        verbose_name="Item barcode",
    )
    item_name = models.CharField(
        max_length=255,
        verbose_name="Item name",
    )
    unit_name = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Unit name",
    )

    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=ZERO_QUANTITY,
        verbose_name="Returned quantity",
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Unit price",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Discount amount",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Taxable amount",
    )
    tax_rate = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=ZERO_MONEY,
        verbose_name="Tax rate",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Tax amount",
    )
    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=ZERO_MONEY,
        verbose_name="Line total",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "POS return item"
        verbose_name_plural = "POS return items"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["company", "pos_return"]),
            models.Index(fields=["company", "original_order_item"]),
            models.Index(fields=["company", "catalog_item"]),
            models.Index(fields=["item_code"]),
            models.Index(fields=["item_sku"]),
            models.Index(fields=["item_barcode"]),
        ]

    def __str__(self) -> str:
        return f"{self.item_name} x {self.quantity}"

    def clean(self) -> None:
        super().clean()

        if (
            self.pos_return_id
            and self.company_id
            and self.pos_return.company_id != self.company_id
        ):
            raise ValidationError({"pos_return": "POS return must belong to the same company."})

        if (
            self.original_order_item_id
            and self.company_id
            and self.original_order_item.company_id != self.company_id
        ):
            raise ValidationError(
                {"original_order_item": "Original order item must belong to the same company."}
            )

        if (
            self.catalog_item_id
            and self.company_id
            and self.catalog_item.company_id != self.company_id
        ):
            raise ValidationError({"catalog_item": "Catalog item must belong to the same company."})

        if (
            self.pos_return_id
            and self.original_order_item_id
            and self.pos_return.original_order_id != self.original_order_item.order_id
        ):
            raise ValidationError(
                {
                    "original_order_item": (
                        "Original order item must belong to the original POS order."
                    )
                }
            )

        if self.quantity <= ZERO_QUANTITY:
            raise ValidationError({"quantity": "Returned quantity must be greater than zero."})

        if self.unit_price < ZERO_MONEY:
            raise ValidationError({"unit_price": "Unit price cannot be negative."})


