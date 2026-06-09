# ============================================================
# 📂 pos/models.py
# 🧠 PrimeyAcc | POS Models V1.0
# ------------------------------------------------------------
# ✅ POS Registers Foundation
# ✅ POS Cashier Sessions Foundation
# ✅ POS Checkout Orders Foundation
# ✅ POS Checkout Order Items Foundation
# ✅ POS Payments Foundation
# ✅ Branch / Warehouse / Treasury Account Linking
# ✅ Payment Method / Terminal Linking
# ✅ Sales Invoice Linking
# ✅ Customer Linking
# ✅ CatalogItem Snapshot at Checkout Time
# ✅ Company-level Tenant Isolation
# ✅ Audit Fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - POS يعمل داخل مساحة /company فقط
# - لا تقبل واجهات /company أي company_id من الواجهة
# - أي API داخل /company يجب أن يستخرج الشركة من المستخدم الحالي
# - كل سجل POS يجب أن يرتبط بـ company
# - كل Register يرتبط بشركة وفرع ويمكن ربطه بمستودع وحساب خزينة
# - كل Session ترتبط بـ Register واحد وتمنع الخدمات فتح أكثر من جلسة نشطة
# - كل POSOrder هو مستند checkout قبل/بعد إنشاء فاتورة البيع
# - كل POSOrderItem يحتفظ بنسخة Snapshot من بيانات CatalogItem وقت البيع
# - كل POSPayment يحتفظ بطريقة الدفع والجهاز وحساب الخزينة وحركة الخزينة عند الحاجة
# - لا يتم تنفيذ البيع أو خصم المخزون أو الترحيل المحاسبي داخل models.py
# - العمليات التشغيلية تتم داخل pos/services.py فقط
# - لا يجوز ربط أي فرع أو مستودع أو حساب خزينة أو طريقة دفع من شركة أخرى
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