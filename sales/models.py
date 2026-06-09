# ============================================================
# 📂 sales/models.py
# 🧠 PrimeyAcc | Sales Models V1.1
# ------------------------------------------------------------
# ✅ Company-scoped sales invoices foundation
# ✅ SalesInvoice header model
# ✅ SalesInvoiceItem line model
# ✅ Tenant isolation through company FK
# ✅ Optional branch relation with company validation
# ✅ Customer validation through BusinessParty
# ✅ Catalog item snapshot for invoice lines
# ✅ Safe totals recalculation at model level
# ✅ Payment allocation helpers for treasury integration
# ✅ Ready for APIs, payments, accounting, inventory, and POS later
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل فاتورة مبيعات مرتبطة بشركة واحدة فقط
# - الشركة تؤخذ من /company context في APIs وليس من company_id القادم من الفرونت
# - الفرع اختياري، وإذا تم ربطه يجب أن يكون تابعًا لنفس الشركة
# - العميل اختياري حاليًا، وإذا تم ربطه يجب أن يكون عميلًا لنفس الشركة
# - بند الفاتورة يحفظ snapshot للسعر والضريبة والوصف وقت إنشاء الفاتورة
# - المدفوعات تعدل paid_amount / balance_due / payment_status فقط
# - لا يتم إنشاء قيود محاسبية أو حركات مخزون مباشرة من models.py
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q, Sum
from django.utils import timezone

from catalog.models import CatalogItem, CatalogItemStatus
from companies.models import Branch, Company
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType


MONEY_ZERO = Decimal("0.00")
QUANTITY_ZERO = Decimal("0.0000")
TAX_ZERO = Decimal("0.00")


def quantize_money(value: Decimal | int | float | str | None) -> Decimal:
    """
    Normalize money values to 2 decimal places.
    """
    if value is None:
        value = MONEY_ZERO

    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def quantize_quantity(value: Decimal | int | float | str | None) -> Decimal:
    """
    Normalize quantity values to 4 decimal places.
    """
    if value is None:
        value = QUANTITY_ZERO

    return Decimal(str(value)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


class SalesInvoiceStatus(models.TextChoices):
    """
    Sales invoice lifecycle.

    DRAFT:
        Editable invoice draft.

    ISSUED:
        Official invoice issued to customer.

    CANCELLED:
        Cancelled invoice. It is not deleted for audit reasons.
    """

    DRAFT = "DRAFT", "Draft"
    ISSUED = "ISSUED", "Issued"
    CANCELLED = "CANCELLED", "Cancelled"


class SalesInvoicePaymentStatus(models.TextChoices):
    """
    Payment status.
    """

    UNPAID = "UNPAID", "Unpaid"
    PARTIAL = "PARTIAL", "Partially paid"
    PAID = "PAID", "Paid"


class SalesInvoiceSource(models.TextChoices):
    """
    Source of invoice creation.

    This allows future POS, online checkout, recurring invoices,
    and API integrations without changing invoice identity.
    """

    MANUAL = "MANUAL", "Manual"
    POS = "POS", "POS"
    ONLINE = "ONLINE", "Online"
    IMPORT = "IMPORT", "Import"
    API = "API", "API"


class SalesInvoice(models.Model):
    """
    Company-scoped sales invoice header.

    This is the operational sales document foundation.
    It does not post accounting entries and does not move inventory directly.
    Those integrations should be handled through services.py layers.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_invoices",
        db_index=True,
        verbose_name="Company",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="sales_invoices",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
        help_text="Optional branch. Must belong to the same company.",
    )

    customer = models.ForeignKey(
        BusinessParty,
        on_delete=models.SET_NULL,
        related_name="sales_invoices",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Customer",
        help_text="Optional customer. Must be an active customer inside the same company.",
    )

    invoice_number = models.CharField(
        max_length=60,
        db_index=True,
        verbose_name="Invoice number",
        help_text="Unique inside the same company when provided.",
    )

    status = models.CharField(
        max_length=20,
        choices=SalesInvoiceStatus.choices,
        default=SalesInvoiceStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    payment_status = models.CharField(
        max_length=20,
        choices=SalesInvoicePaymentStatus.choices,
        default=SalesInvoicePaymentStatus.UNPAID,
        db_index=True,
        verbose_name="Payment status",
    )

    source = models.CharField(
        max_length=20,
        choices=SalesInvoiceSource.choices,
        default=SalesInvoiceSource.MANUAL,
        db_index=True,
        verbose_name="Source",
    )

    invoice_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Invoice date",
    )

    due_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Due date",
    )

    issued_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Issued at",
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    cancelled_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancelled reason",
    )

    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Subtotal",
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
        help_text="Updated by treasury payment allocation services.",
    )

    balance_due = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Balance due",
    )

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        verbose_name="Currency code",
    )

    customer_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Customer snapshot",
        help_text="Customer data snapshot at invoice time.",
    )

    billing_address_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Billing address snapshot",
    )

    tax_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Tax snapshot",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    public_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Public notes",
        help_text="Notes visible to customer on invoice.",
    )

    internal_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Internal notes",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_sales_invoices",
        blank=True,
        null=True,
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_sales_invoices",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )

    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="issued_sales_invoices",
        blank=True,
        null=True,
        verbose_name="Issued by",
    )

    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_sales_invoices",
        blank=True,
        null=True,
        verbose_name="Cancelled by",
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
        verbose_name = "Sales Invoice"
        verbose_name_plural = "Sales Invoices"
        ordering = ["-invoice_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "invoice_number"],
                condition=~Q(invoice_number=""),
                name="unique_sales_invoice_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "payment_status"]),
            models.Index(fields=["company", "source"]),
            models.Index(fields=["company", "invoice_date"]),
            models.Index(fields=["company", "due_date"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["company", "customer"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.invoice_number or 'Draft invoice'} - {self.company.display_name}"

    @property
    def is_draft(self) -> bool:
        return self.status == SalesInvoiceStatus.DRAFT

    @property
    def is_issued(self) -> bool:
        return self.status == SalesInvoiceStatus.ISSUED

    @property
    def is_cancelled(self) -> bool:
        return self.status == SalesInvoiceStatus.CANCELLED

    @property
    def can_be_edited(self) -> bool:
        return self.status == SalesInvoiceStatus.DRAFT

    @property
    def can_be_issued(self) -> bool:
        return self.status == SalesInvoiceStatus.DRAFT

    @property
    def can_be_cancelled(self) -> bool:
        return self.status == SalesInvoiceStatus.ISSUED

    @property
    def can_receive_payment(self) -> bool:
        """
        Only issued invoices can receive allocated payments.
        """
        return self.status == SalesInvoiceStatus.ISSUED

    @property
    def remaining_amount(self) -> Decimal:
        """
        Current unpaid invoice amount.
        """
        return quantize_money(self.balance_due)

    def clean(self) -> None:
        """
        Validate tenant consistency and invoice state.
        """
        super().clean()

        self.invoice_number = (self.invoice_number or "").strip()
        self.currency_code = (self.currency_code or "SAR").strip().upper()
        self.cancelled_reason = (self.cancelled_reason or "").strip()
        self.public_notes = (self.public_notes or "").strip()
        self.internal_notes = (self.internal_notes or "").strip()

        self.subtotal = quantize_money(self.subtotal)
        self.discount_amount = quantize_money(self.discount_amount)
        self.taxable_amount = quantize_money(self.taxable_amount)
        self.tax_amount = quantize_money(self.tax_amount)
        self.total_amount = quantize_money(self.total_amount)
        self.paid_amount = quantize_money(self.paid_amount)
        self.balance_due = quantize_money(self.balance_due)

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {"branch": "Selected branch does not belong to this company."}
                )

        if self.customer_id and self.company_id:
            if self.customer.company_id != self.company_id:
                raise ValidationError(
                    {"customer": "Selected customer does not belong to this company."}
                )

            if self.customer.party_type not in [
                BusinessPartyType.CUSTOMER,
                BusinessPartyType.BOTH,
            ]:
                raise ValidationError(
                    {"customer": "Selected party is not a customer."}
                )

            if self.customer.status != BusinessPartyStatus.ACTIVE:
                raise ValidationError(
                    {"customer": "Selected customer is not active."}
                )

        if self.discount_amount > self.subtotal:
            raise ValidationError(
                {"discount_amount": "Discount cannot be greater than subtotal."}
            )

        if self.paid_amount > self.total_amount:
            raise ValidationError(
                {"paid_amount": "Paid amount cannot be greater than invoice total."}
            )

        expected_total = quantize_money(
            self.subtotal - self.discount_amount + self.tax_amount
        )

        if self.total_amount != expected_total:
            self.total_amount = expected_total

        expected_balance = quantize_money(self.total_amount - self.paid_amount)
        if expected_balance < MONEY_ZERO:
            expected_balance = MONEY_ZERO

        self.balance_due = expected_balance

        self.refresh_payment_status()

        if self.status == SalesInvoiceStatus.CANCELLED and not self.cancelled_at:
            self.cancelled_at = timezone.now()

        if self.status == SalesInvoiceStatus.ISSUED and not self.issued_at:
            self.issued_at = timezone.now()

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
            self.payment_status = SalesInvoicePaymentStatus.UNPAID
        elif self.paid_amount < self.total_amount:
            self.payment_status = SalesInvoicePaymentStatus.PARTIAL
        else:
            self.payment_status = SalesInvoicePaymentStatus.PAID

    def apply_payment_allocation(
        self,
        amount: Decimal | int | float | str,
        *,
        save: bool = True,
        user=None,
    ) -> None:
        """
        Apply a customer payment allocation to this invoice.

        Rules:
        - invoice must belong to the same company as the caller/service context
          before this method is called
        - invoice must be issued
        - amount must be positive
        - amount cannot exceed current balance_due
        """
        allocation_amount = quantize_money(amount)

        if allocation_amount <= MONEY_ZERO:
            raise ValidationError({"amount": "Payment allocation amount must be greater than zero."})

        if not self.can_receive_payment:
            raise ValidationError({"status": "Only issued invoices can receive payments."})

        current_balance = quantize_money(self.balance_due)
        if allocation_amount > current_balance:
            raise ValidationError({"amount": "Payment allocation cannot exceed invoice balance due."})

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
        Reverse a previous customer payment allocation from this invoice.

        Used when cancelling/reversing a confirmed CustomerPayment.
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

    def build_customer_snapshot(self) -> dict:
        """
        Create a safe customer snapshot for historical invoice display.
        """
        if not self.customer_id:
            return {}

        return {
            "id": self.customer_id,
            "code": self.customer.code,
            "display_name": self.customer.display_name,
            "legal_name": self.customer.legal_name,
            "party_type": self.customer.party_type,
            "phone": self.customer.phone,
            "mobile": self.customer.mobile,
            "email": self.customer.email,
            "vat_number": self.customer.vat_number,
            "commercial_registration": self.customer.commercial_registration,
        }

    def build_billing_address_snapshot(self) -> dict:
        """
        Create a safe customer billing address snapshot.
        """
        if not self.customer_id:
            return {}

        return {
            "country": self.customer.country,
            "city": self.customer.city,
            "district": self.customer.district,
            "street": self.customer.street,
            "building_number": self.customer.building_number,
            "additional_number": self.customer.additional_number,
            "postal_code": self.customer.postal_code,
            "short_address": self.customer.short_address,
            "address_line": self.customer.address_line,
        }

    def refresh_snapshots(self, save: bool = True) -> None:
        """
        Refresh customer, address, and tax snapshots.
        """
        self.customer_snapshot = self.build_customer_snapshot()
        self.billing_address_snapshot = self.build_billing_address_snapshot()
        self.tax_snapshot = {
            "company_tax_number": self.company.tax_number if self.company_id else "",
            "company_vat_percentage": str(self.company.vat_percentage) if self.company_id else "0.00",
            "currency_code": self.currency_code,
        }

        if save and self.pk:
            self.save(
                update_fields=[
                    "customer_snapshot",
                    "billing_address_snapshot",
                    "tax_snapshot",
                    "updated_at",
                ]
            )

    def recalculate_totals(self, save: bool = True) -> None:
        """
        Recalculate invoice totals from lines.

        Accounting, payments, and inventory effects are handled outside models.py.
        """
        if not self.pk:
            return

        totals = self.items.aggregate(
            subtotal=Sum("line_subtotal"),
            discount_amount=Sum("discount_amount"),
            taxable_amount=Sum("taxable_amount"),
            tax_amount=Sum("tax_amount"),
            total_amount=Sum("line_total"),
        )

        self.subtotal = quantize_money(totals.get("subtotal") or MONEY_ZERO)
        self.discount_amount = quantize_money(totals.get("discount_amount") or MONEY_ZERO)
        self.taxable_amount = quantize_money(totals.get("taxable_amount") or MONEY_ZERO)
        self.tax_amount = quantize_money(totals.get("tax_amount") or MONEY_ZERO)
        self.total_amount = quantize_money(totals.get("total_amount") or MONEY_ZERO)

        if self.paid_amount > self.total_amount:
            self.paid_amount = self.total_amount

        self.refresh_payment_status()

        if save:
            self.save(
                update_fields=[
                    "subtotal",
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

    def issue(self, user=None) -> None:
        """
        Mark invoice as issued.

        APIs/services must ensure invoice has lines before calling this
        or call full_clean after assigning state.
        """
        if not self.can_be_issued:
            raise ValidationError({"status": "Only draft invoices can be issued."})

        if self.pk and not self.items.exists():
            raise ValidationError({"items": "Invoice cannot be issued without items."})

        if self.total_amount <= MONEY_ZERO:
            raise ValidationError({"total_amount": "Invoice total must be greater than zero."})

        self.status = SalesInvoiceStatus.ISSUED
        self.issued_at = timezone.now()

        if user:
            self.issued_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "issued_at",
                "issued_by",
                "updated_by",
                "updated_at",
            ]
        )

    def cancel(self, reason: str = "", user=None) -> None:
        """
        Cancel issued invoice without deleting it.
        """
        if not self.can_be_cancelled:
            raise ValidationError({"status": "Only issued invoices can be cancelled."})

        if self.paid_amount > MONEY_ZERO:
            raise ValidationError(
                {"payment_status": "Paid or partially paid invoices cannot be cancelled directly."}
            )

        self.status = SalesInvoiceStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_reason = (reason or "").strip()

        if user:
            self.cancelled_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_reason",
                "cancelled_by",
                "updated_by",
                "updated_at",
            ]
        )


class SalesInvoiceItem(models.Model):
    """
    Company-scoped sales invoice line.

    Stores product/service snapshot values to protect historical invoice data
    from later catalog changes.
    """

    invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Invoice",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_invoice_items",
        db_index=True,
        verbose_name="Company",
    )

    catalog_item = models.ForeignKey(
        CatalogItem,
        on_delete=models.SET_NULL,
        related_name="sales_invoice_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Catalog item",
        help_text="Optional catalog item. Snapshot fields preserve historical data.",
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

    item_description_snapshot = models.TextField(
        blank=True,
        default="",
        verbose_name="Item description snapshot",
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

    line_subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Line subtotal",
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
        validators=[MinValueValidator(TAX_ZERO)],
        verbose_name="Tax rate",
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

    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Line total",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Internal notes",
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
        verbose_name = "Sales Invoice Item"
        verbose_name_plural = "Sales Invoice Items"
        ordering = ["invoice_id", "line_number", "id"]
        indexes = [
            models.Index(fields=["company", "invoice"]),
            models.Index(fields=["company", "catalog_item"]),
            models.Index(fields=["invoice", "line_number"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["company", "taxable"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["invoice", "line_number"],
                name="unique_sales_invoice_line_number_per_invoice",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.invoice.invoice_number} - {self.item_name_snapshot}"

    def clean(self) -> None:
        """
        Validate tenant consistency and recalculate line totals.
        """
        super().clean()

        self.item_code_snapshot = (self.item_code_snapshot or "").strip()
        self.item_name_snapshot = (self.item_name_snapshot or "").strip()
        self.item_description_snapshot = (self.item_description_snapshot or "").strip()
        self.unit_name_snapshot = (self.unit_name_snapshot or "").strip()
        self.notes = (self.notes or "").strip()

        self.quantity = quantize_quantity(self.quantity)
        self.unit_price = quantize_money(self.unit_price)
        self.line_subtotal = quantize_money(self.quantity * self.unit_price)
        self.discount_amount = quantize_money(self.discount_amount)
        self.tax_rate = quantize_money(self.tax_rate)

        if self.invoice_id and self.company_id:
            if self.invoice.company_id != self.company_id:
                raise ValidationError(
                    {"company": "Invoice item company must match invoice company."}
                )

        if self.catalog_item_id and self.company_id:
            if self.catalog_item.company_id != self.company_id:
                raise ValidationError(
                    {"catalog_item": "Catalog item must belong to the same company."}
                )

            if self.catalog_item.status != CatalogItemStatus.ACTIVE:
                raise ValidationError(
                    {"catalog_item": "Catalog item is not active."}
                )

            if not self.catalog_item.is_sellable:
                raise ValidationError(
                    {"catalog_item": "Catalog item is not sellable."}
                )

        if not self.item_name_snapshot:
            if self.catalog_item_id:
                self.item_name_snapshot = self.catalog_item.name
            else:
                raise ValidationError(
                    {"item_name_snapshot": "Item name is required."}
                )

        if self.discount_amount > self.line_subtotal:
            raise ValidationError(
                {"discount_amount": "Discount cannot be greater than line subtotal."}
            )

        net_amount = quantize_money(self.line_subtotal - self.discount_amount)

        if self.taxable:
            self.taxable_amount = net_amount
            self.tax_amount = quantize_money(net_amount * self.tax_rate / Decimal("100.00"))
        else:
            self.taxable_amount = MONEY_ZERO
            self.tax_amount = MONEY_ZERO

        self.line_total = quantize_money(net_amount + self.tax_amount)

    def apply_catalog_snapshot(self) -> None:
        """
        Copy catalog item values into snapshot fields.
        """
        if not self.catalog_item_id:
            return

        self.item_code_snapshot = (
            self.catalog_item.code
            or self.catalog_item.sku
            or self.catalog_item.barcode
            or ""
        )
        self.item_name_snapshot = self.catalog_item.name
        self.item_description_snapshot = self.catalog_item.description or ""
        self.unit_name_snapshot = self.catalog_item.unit.name if self.catalog_item.unit_id else ""
        self.unit_price = quantize_money(self.catalog_item.sale_price)
        self.taxable = bool(self.catalog_item.taxable)
        self.tax_rate = quantize_money(self.catalog_item.tax_rate)

    def save(self, *args, **kwargs):
        """
        Normalize data and recalculate invoice totals after saving.
        """
        if self.invoice_id and not self.company_id:
            self.company_id = self.invoice.company_id

        if self.catalog_item_id and not self.item_name_snapshot:
            self.apply_catalog_snapshot()

        self.full_clean()

        super().save(*args, **kwargs)

        if self.invoice_id:
            self.invoice.recalculate_totals(save=True)

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        result = super().delete(*args, **kwargs)

        if invoice.pk:
            invoice.recalculate_totals(save=True)

        return result