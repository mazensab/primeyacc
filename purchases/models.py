# ============================================================
# 📂 purchases/models.py
# 🧠 PrimeyAcc | Company Purchases Models V1.1
# ------------------------------------------------------------
# ✅ Purchase bills foundation for suppliers
# ✅ Company-scoped tenant isolation
# ✅ Optional branch relation with company validation
# ✅ Supplier validation through BusinessParty
# ✅ Catalog item snapshot at purchase time
# ✅ VAT, discount, subtotal, and total calculations
# ✅ Draft / Posted / Cancelled lifecycle
# ✅ Supplier payment allocation helpers
# ✅ paid_amount / balance_due / payment_status
# ✅ Audit fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل فاتورة مشتريات مرتبطة بشركة واحدة فقط
# - لا يتم الاعتماد على company_id القادم من الفرونت
# - المورد يجب أن يكون BusinessParty من نفس الشركة ونوعه SUPPLIER أو BOTH
# - الفرع إن وجد يجب أن يتبع نفس الشركة
# - الصنف يجب أن يتبع نفس الشركة ويكون قابلًا للشراء
# - بعد اعتماد الفاتورة لا يتم تعديلها مباشرة
# - المدفوعات تعدل paid_amount / balance_due / payment_status فقط
# - لا يتم إنشاء قيود محاسبية أو حركات مخزون مباشرة من models.py
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from catalog.models import CatalogItem
from companies.models import Branch, Company
from parties.models import BusinessParty, BusinessPartyType


MONEY_ZERO = Decimal("0.00")
QUANTITY_ZERO = Decimal("0.0000")


def quantize_money(value: Decimal | int | float | str | None) -> Decimal:
    """
    Normalize monetary values to two decimal places.
    """
    if value is None:
        return MONEY_ZERO

    return Decimal(str(value)).quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def quantize_quantity(value: Decimal | int | float | str | None) -> Decimal:
    """
    Normalize quantity values to four decimal places.
    """
    if value is None:
        return QUANTITY_ZERO

    return Decimal(str(value)).quantize(
        Decimal("0.0001"),
        rounding=ROUND_HALF_UP,
    )


class PurchaseBillStatus(models.TextChoices):
    """
    Purchase bill lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class PurchaseBillPaymentStatus(models.TextChoices):
    """
    Supplier bill payment status.
    """

    UNPAID = "UNPAID", "Unpaid"
    PARTIAL = "PARTIAL", "Partially paid"
    PAID = "PAID", "Paid"


class PurchaseBill(models.Model):
    """
    Company-scoped supplier purchase bill.

    This model is the foundation for:
    - supplier bills
    - purchase accounting
    - supplier payable balances
    - inventory receiving

    Tenant isolation:
    The company must be assigned from backend request.company.
    Frontend company_id must never be trusted.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_bills",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="purchase_bills",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
        help_text="Optional branch. Must belong to the same company.",
    )
    supplier = models.ForeignKey(
        BusinessParty,
        on_delete=models.PROTECT,
        related_name="purchase_bills",
        db_index=True,
        verbose_name="Supplier",
        help_text="Supplier must belong to the same company and be supplier or both.",
    )

    status = models.CharField(
        max_length=20,
        choices=PurchaseBillStatus.choices,
        default=PurchaseBillStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PurchaseBillPaymentStatus.choices,
        default=PurchaseBillPaymentStatus.UNPAID,
        db_index=True,
        verbose_name="Payment status",
    )

    bill_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Bill number",
        help_text="Unique purchase bill number inside the same company.",
    )
    supplier_bill_number = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Supplier bill number",
        help_text="Original supplier invoice/bill number when available.",
    )

    bill_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Bill date",
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Due date",
    )

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        verbose_name="Currency code",
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Subtotal amount",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Discount amount",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Taxable amount",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Tax amount",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Total amount",
    )

    paid_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Paid amount",
        help_text="Updated by treasury supplier payment allocation services.",
    )

    balance_due = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Balance due",
    )

    posted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Posted at",
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_purchase_bills",
        blank=True,
        null=True,
        verbose_name="Posted by",
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_purchase_bills",
        blank=True,
        null=True,
        verbose_name="Cancelled by",
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancellation reason",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_purchase_bills",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_purchase_bills",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )

    notes = models.TextField(
        blank=True,
        default="",
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
        verbose_name = "Purchase bill"
        verbose_name_plural = "Purchase bills"
        ordering = ["-bill_date", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "bill_number"],
                name="unique_purchase_bill_number_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "supplier", "supplier_bill_number"],
                condition=~Q(supplier_bill_number=""),
                name="unique_supplier_bill_number_per_supplier_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "payment_status"]),
            models.Index(fields=["company", "bill_date"]),
            models.Index(fields=["company", "due_date"]),
            models.Index(fields=["company", "supplier"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["supplier", "status"]),
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["posted_at"]),
            models.Index(fields=["cancelled_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.bill_number} - {self.supplier.display_name}"

    @property
    def is_draft(self) -> bool:
        return self.status == PurchaseBillStatus.DRAFT

    @property
    def is_posted(self) -> bool:
        return self.status == PurchaseBillStatus.POSTED

    @property
    def is_cancelled(self) -> bool:
        return self.status == PurchaseBillStatus.CANCELLED

    @property
    def can_edit(self) -> bool:
        return self.status == PurchaseBillStatus.DRAFT

    @property
    def can_post(self) -> bool:
        return self.status == PurchaseBillStatus.DRAFT

    @property
    def can_cancel(self) -> bool:
        return self.status in [
            PurchaseBillStatus.DRAFT,
            PurchaseBillStatus.POSTED,
        ]

    @property
    def can_receive_payment(self) -> bool:
        """
        Only posted purchase bills can receive supplier payment allocation.
        """
        return self.status == PurchaseBillStatus.POSTED

    @property
    def remaining_amount(self) -> Decimal:
        """
        Current unpaid supplier bill amount.
        """
        return quantize_money(self.balance_due)

    def clean(self) -> None:
        super().clean()

        self.bill_number = (self.bill_number or "").strip()
        self.supplier_bill_number = (self.supplier_bill_number or "").strip()
        self.currency_code = (self.currency_code or "SAR").strip().upper()
        self.cancellation_reason = (self.cancellation_reason or "").strip()
        self.notes = (self.notes or "").strip()

        self.subtotal_amount = quantize_money(self.subtotal_amount)
        self.discount_amount = quantize_money(self.discount_amount)
        self.taxable_amount = quantize_money(self.taxable_amount)
        self.tax_amount = quantize_money(self.tax_amount)
        self.total_amount = quantize_money(self.total_amount)
        self.paid_amount = quantize_money(self.paid_amount)
        self.balance_due = quantize_money(self.balance_due)

        if not self.bill_number:
            raise ValidationError({"bill_number": "Purchase bill number is required."})

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {"branch": "Selected branch does not belong to this company."}
                )

        if self.supplier_id and self.company_id:
            if self.supplier.company_id != self.company_id:
                raise ValidationError(
                    {"supplier": "Selected supplier does not belong to this company."}
                )

            if self.supplier.party_type not in [
                BusinessPartyType.SUPPLIER,
                BusinessPartyType.BOTH,
            ]:
                raise ValidationError(
                    {"supplier": "Selected party is not a supplier."}
                )

        if self.discount_amount < MONEY_ZERO:
            raise ValidationError({"discount_amount": "Discount cannot be negative."})

        if self.subtotal_amount < MONEY_ZERO:
            raise ValidationError({"subtotal_amount": "Subtotal cannot be negative."})

        if self.taxable_amount < MONEY_ZERO:
            raise ValidationError({"taxable_amount": "Taxable amount cannot be negative."})

        if self.tax_amount < MONEY_ZERO:
            raise ValidationError({"tax_amount": "Tax amount cannot be negative."})

        if self.total_amount < MONEY_ZERO:
            raise ValidationError({"total_amount": "Total amount cannot be negative."})

        if self.paid_amount > self.total_amount:
            raise ValidationError(
                {"paid_amount": "Paid amount cannot be greater than bill total."}
            )

        if self.due_date and self.bill_date and self.due_date < self.bill_date:
            raise ValidationError({"due_date": "Due date cannot be before bill date."})

        self.refresh_payment_status()

    def refresh_payment_status(self) -> None:
        """
        Refresh payment_status and balance_due from total_amount and paid_amount.

        This method does not save by itself.
        """
        self.total_amount = quantize_money(self.total_amount)
        self.paid_amount = quantize_money(self.paid_amount)

        balance = quantize_money(self.total_amount - self.paid_amount)
        if balance < MONEY_ZERO:
            balance = MONEY_ZERO

        self.balance_due = balance

        if self.paid_amount <= MONEY_ZERO:
            self.payment_status = PurchaseBillPaymentStatus.UNPAID
        elif self.paid_amount < self.total_amount:
            self.payment_status = PurchaseBillPaymentStatus.PARTIAL
        else:
            self.payment_status = PurchaseBillPaymentStatus.PAID

    def apply_payment_allocation(
        self,
        amount: Decimal | int | float | str,
        *,
        save: bool = True,
        user=None,
    ) -> None:
        """
        Apply a supplier payment allocation to this purchase bill.

        Rules:
        - bill must belong to the same company as the caller/service context
          before this method is called
        - bill must be posted
        - amount must be positive
        - amount cannot exceed current balance_due
        """
        allocation_amount = quantize_money(amount)

        if allocation_amount <= MONEY_ZERO:
            raise ValidationError({"amount": "Payment allocation amount must be greater than zero."})

        if not self.can_receive_payment:
            raise ValidationError({"status": "Only posted purchase bills can receive payments."})

        current_balance = quantize_money(self.balance_due)
        if allocation_amount > current_balance:
            raise ValidationError({"amount": "Payment allocation cannot exceed bill balance due."})

        self.paid_amount = quantize_money(self.paid_amount + allocation_amount)
        self.refresh_payment_status()

        if user:
            self.updated_by = user

        self.full_clean()

        if save:
            update_fields = [
                "paid_amount",
                "balance_due",
                "payment_status",
                "updated_by",
                "updated_at",
            ]

            if not user:
                update_fields.remove("updated_by")

            self.save(update_fields=update_fields)

    def reverse_payment_allocation(
        self,
        amount: Decimal | int | float | str,
        *,
        save: bool = True,
        user=None,
    ) -> None:
        """
        Reverse a previous supplier payment allocation from this purchase bill.

        Used when cancelling/reversing a confirmed SupplierPayment.
        """
        reversal_amount = quantize_money(amount)

        if reversal_amount <= MONEY_ZERO:
            raise ValidationError({"amount": "Payment reversal amount must be greater than zero."})

        if reversal_amount > self.paid_amount:
            raise ValidationError({"amount": "Payment reversal cannot exceed paid amount."})

        self.paid_amount = quantize_money(self.paid_amount - reversal_amount)
        self.refresh_payment_status()

        if user:
            self.updated_by = user

        self.full_clean()

        if save:
            update_fields = [
                "paid_amount",
                "balance_due",
                "payment_status",
                "updated_by",
                "updated_at",
            ]

            if not user:
                update_fields.remove("updated_by")

            self.save(update_fields=update_fields)

    def recalculate_totals(self, save: bool = True) -> None:
        """
        Recalculate purchase bill totals from current items.
        """
        items = self.items.all()

        subtotal = MONEY_ZERO
        discount = MONEY_ZERO
        taxable = MONEY_ZERO
        tax = MONEY_ZERO
        total = MONEY_ZERO

        for item in items:
            subtotal += item.subtotal_amount
            discount += item.discount_amount
            taxable += item.taxable_amount
            tax += item.tax_amount
            total += item.total_amount

        self.subtotal_amount = quantize_money(subtotal)
        self.discount_amount = quantize_money(discount)
        self.taxable_amount = quantize_money(taxable)
        self.tax_amount = quantize_money(tax)
        self.total_amount = quantize_money(total)

        if self.paid_amount > self.total_amount:
            self.paid_amount = self.total_amount

        self.refresh_payment_status()

        if save:
            self.full_clean()
            self.save(
                update_fields=[
                    "subtotal_amount",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "paid_amount",
                    "balance_due",
                    "payment_status",
                    "updated_at",
                ]
            )

    def post(self, user=None) -> None:
        """
        Mark bill as posted.

        Accounting, payables, and inventory effects are handled in service layers.
        """
        if not self.can_post:
            raise ValidationError("Only draft purchase bills can be posted.")

        if not self.items.exists():
            raise ValidationError("Cannot post a purchase bill without items.")

        self.recalculate_totals(save=False)
        self.status = PurchaseBillStatus.POSTED
        self.posted_at = timezone.now()

        if user:
            self.posted_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "posted_at",
                "posted_by",
                "updated_by",
                "subtotal_amount",
                "discount_amount",
                "taxable_amount",
                "tax_amount",
                "total_amount",
                "paid_amount",
                "balance_due",
                "payment_status",
                "updated_at",
            ]
        )

    def cancel(self, reason: str = "", user=None) -> None:
        """
        Cancel purchase bill.

        Reversals are handled in accounting and inventory services.
        """
        if not self.can_cancel:
            raise ValidationError("This purchase bill cannot be cancelled.")

        if self.paid_amount > MONEY_ZERO:
            raise ValidationError(
                {"payment_status": "Paid or partially paid purchase bills cannot be cancelled directly."}
            )

        self.status = PurchaseBillStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancellation_reason = reason or ""

        if user:
            self.cancelled_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "cancellation_reason",
                "updated_by",
                "updated_at",
            ]
        )


class PurchaseBillItem(models.Model):
    """
    Purchase bill line item.

    The item stores a snapshot of catalog item data at purchase time.
    This keeps old bills stable even if catalog data changes later.
    """

    bill = models.ForeignKey(
        PurchaseBill,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Purchase bill",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_bill_items",
        db_index=True,
        verbose_name="Company",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="purchase_bill_items",
        db_index=True,
        verbose_name="Catalog item",
    )

    line_number = models.PositiveIntegerField(
        default=1,
        db_index=True,
        verbose_name="Line number",
    )

    item_code_snapshot = models.CharField(
        max_length=80,
        blank=True,
        default="",
        verbose_name="Item code snapshot",
    )
    item_name_snapshot = models.CharField(
        max_length=255,
        verbose_name="Item name snapshot",
    )
    item_name_ar_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Item Arabic name snapshot",
    )
    item_name_en_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Item English name snapshot",
    )
    unit_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
        verbose_name="Unit name snapshot",
    )

    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal("1.0000"),
        validators=[MinValueValidator(Decimal("0.0001"))],
        verbose_name="Quantity",
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Unit price",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Discount amount",
    )

    taxable = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Taxable",
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Tax rate",
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Subtotal amount",
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Taxable amount",
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Tax amount",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Total amount",
    )

    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Notes",
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
        verbose_name = "Purchase bill item"
        verbose_name_plural = "Purchase bill items"
        ordering = ["bill_id", "line_number", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["bill", "line_number"],
                name="unique_purchase_bill_item_line_per_bill",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["bill", "line_number"]),
            models.Index(fields=["item", "created_at"]),
            models.Index(fields=["taxable"]),
        ]

    def __str__(self) -> str:
        return f"{self.bill.bill_number} - {self.item_name_snapshot}"

    def clean(self) -> None:
        super().clean()

        if self.bill_id and self.company_id:
            if self.bill.company_id != self.company_id:
                raise ValidationError(
                    {"company": "Item company must match purchase bill company."}
                )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {"item": "Selected catalog item does not belong to this company."}
                )

            if not self.item.is_purchasable:
                raise ValidationError(
                    {"item": "Selected catalog item is not purchasable."}
                )

        if self.bill_id and not self.bill.can_edit:
            raise ValidationError(
                "Cannot edit items for a posted or cancelled purchase bill."
            )

        self.quantity = quantize_quantity(self.quantity)
        self.unit_price = quantize_money(self.unit_price)
        self.discount_amount = quantize_money(self.discount_amount)
        self.tax_rate = quantize_money(self.tax_rate)

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        if self.unit_price < MONEY_ZERO:
            raise ValidationError({"unit_price": "Unit price cannot be negative."})

        if self.discount_amount < MONEY_ZERO:
            raise ValidationError({"discount_amount": "Discount cannot be negative."})

        if self.tax_rate < MONEY_ZERO:
            raise ValidationError({"tax_rate": "Tax rate cannot be negative."})

        raw_subtotal = quantize_money(self.quantity * self.unit_price)

        if self.discount_amount > raw_subtotal:
            raise ValidationError(
                {"discount_amount": "Discount cannot be greater than subtotal."}
            )

    def apply_item_snapshot(self) -> None:
        """
        Copy catalog item data into line snapshot fields.
        """
        if not self.item_id:
            return

        self.item_code_snapshot = self.item.code or self.item.sku or self.item.barcode or ""
        self.item_name_snapshot = self.item.name
        self.item_name_ar_snapshot = self.item.name_ar or ""
        self.item_name_en_snapshot = self.item.name_en or ""

        if self.item.unit_id:
            self.unit_name_snapshot = self.item.unit.name
        else:
            self.unit_name_snapshot = ""

        if not self.unit_price or self.unit_price == MONEY_ZERO:
            self.unit_price = self.item.purchase_price or self.item.cost_price or MONEY_ZERO

        self.taxable = bool(self.item.taxable)
        self.tax_rate = self.item.tax_rate or MONEY_ZERO

    def calculate_totals(self) -> None:
        """
        Calculate line totals.
        """
        quantity = quantize_quantity(self.quantity)
        unit_price = quantize_money(self.unit_price)
        discount = quantize_money(self.discount_amount)

        subtotal = quantize_money(quantity * unit_price)
        taxable_amount = quantize_money(subtotal - discount)

        if taxable_amount < MONEY_ZERO:
            taxable_amount = MONEY_ZERO

        tax_amount = MONEY_ZERO
        if self.taxable:
            tax_amount = quantize_money(
                taxable_amount * self.tax_rate / Decimal("100.00")
            )

        total = quantize_money(taxable_amount + tax_amount)

        self.quantity = quantity
        self.unit_price = unit_price
        self.discount_amount = discount
        self.subtotal_amount = subtotal
        self.taxable_amount = taxable_amount
        self.tax_amount = tax_amount
        self.total_amount = total

    def save(self, *args, **kwargs):
        if self.bill_id and not self.company_id:
            self.company = self.bill.company

        if self.item_id:
            self.apply_item_snapshot()

        self.calculate_totals()
        self.full_clean()

        super().save(*args, **kwargs)

        if self.bill_id:
            self.bill.recalculate_totals(save=True)

    def delete(self, *args, **kwargs):
        bill = self.bill
        result = super().delete(*args, **kwargs)

        if bill:
            bill.recalculate_totals(save=True)

        return result