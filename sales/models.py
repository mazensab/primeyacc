# ============================================================
# 📂 sales/models.py
# 🧠 PrimeyAcc | Sales Models V1.3
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

# Phase 21.3 sales order invoice conversion foundation
# Partial and full order invoicing tracking
# Ordered, invoiced, and remaining quantities tracking
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
    SALES_ORDER = "SALES_ORDER", "Sales order"
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

    source_order = models.ForeignKey(
        "SalesOrder",
        on_delete=models.SET_NULL,
        related_name="generated_invoices",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Source sales order",
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

        if self.source_order_id:
            if (
                self.source_order.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "source_order":
                        "Source sales order must belong "
                        "to the same company."
                    }
                )

            if self.source_order.status in [
                SalesOrderStatus.DRAFT,
                SalesOrderStatus.CANCELLED,
            ]:
                raise ValidationError(
                    {
                        "source_order":
                        "Only confirmed, processing, "
                        "or completed orders can be invoiced."
                    }
                )

            if (
                self.customer_id
                and self.source_order.customer_id
                != self.customer_id
            ):
                raise ValidationError(
                    {
                        "customer":
                        "Invoice customer must match "
                        "source order customer."
                    }
                )

            if (
                self.branch_id
                and self.source_order.branch_id
                and self.source_order.branch_id
                != self.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                        "Invoice branch must match "
                        "source order branch."
                    }
                )

            self.source = (
                SalesInvoiceSource.SALES_ORDER
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

    source_order_item = models.ForeignKey(
        "SalesOrderItem",
        on_delete=models.SET_NULL,
        related_name="invoice_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Source sales order item",
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

        if self.source_order_item_id:
            source_item = self.source_order_item
            source_order = source_item.order

            if source_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "source_order_item":
                        "Source order item must belong "
                        "to the same company."
                    }
                )

            if not self.invoice.source_order_id:
                raise ValidationError(
                    {
                        "source_order_item":
                        "Invoice must reference "
                        "a source sales order."
                    }
                )

            if (
                source_order.id
                != self.invoice.source_order_id
            ):
                raise ValidationError(
                    {
                        "source_order_item":
                        "Source order item does not "
                        "belong to invoice order."
                    }
                )

            if source_order.status in [
                SalesOrderStatus.DRAFT,
                SalesOrderStatus.CANCELLED,
            ]:
                raise ValidationError(
                    {
                        "source_order_item":
                        "Source sales order cannot "
                        "be invoiced in its current status."
                    }
                )

            already_invoiced = (
                source_item.invoice_items
                .exclude(
                    invoice__status=(
                        SalesInvoiceStatus.CANCELLED
                    )
                )
                .exclude(pk=self.pk)
                .aggregate(total=Sum("quantity"))
                .get("total")
                or QUANTITY_ZERO
            )

            available_quantity = quantize_quantity(
                source_item.quantity
                - already_invoiced
            )

            if self.quantity > available_quantity:
                raise ValidationError(
                    {
                        "quantity":
                        "Invoice quantity cannot exceed "
                        "the remaining sales order quantity."
                    }
                )

            if (
                self.catalog_item_id
                and source_item.catalog_item_id
                and self.catalog_item_id
                != source_item.catalog_item_id
            ):
                raise ValidationError(
                    {
                        "catalog_item":
                        "Invoice catalog item must match "
                        "source order item."
                    }
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

    @property
    def returned_quantity(self) -> Decimal:
        """
        Return quantity consumed by confirmed or posted sales returns.

        Draft and cancelled returns do not consume invoice quantities.
        """
        totals = (
            self.sales_return_items
            .filter(
                sales_return__status__in=[
                    SalesReturnStatus.CONFIRMED,
                    SalesReturnStatus.POSTED,
                ],
            )
            .aggregate(total=Sum("quantity"))
        )

        return quantize_quantity(
            totals.get("total") or QUANTITY_ZERO
        )

    @property
    def returnable_quantity(self) -> Decimal:
        """
        Return remaining quantity available for sales return.
        """
        remaining = quantize_quantity(
            self.quantity - self.returned_quantity
        )

        return max(
            remaining,
            QUANTITY_ZERO,
        )

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

        if self.source_order_item_id:
            self.source_order_item.refresh_invoicing_quantities(
                save=True
            )
            self.source_order_item.order.refresh_invoice_progress(
                save=True
            )

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        source_order_item = (
            self.source_order_item
            if self.source_order_item_id
            else None
        )

        result = super().delete(*args, **kwargs)

        if invoice.pk:
            invoice.recalculate_totals(save=True)

        if source_order_item:
            source_order_item.refresh_invoicing_quantities(
                save=True
            )
            source_order_item.order.refresh_invoice_progress(
                save=True
            )

        return result

# ============================================================
# Phase 21.1 ? Sales Quotations Foundation
# ============================================================


class SalesQuotationStatus(models.TextChoices):
    """
    Sales quotation lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    SENT = "SENT", "Sent"
    ACCEPTED = "ACCEPTED", "Accepted"
    REJECTED = "REJECTED", "Rejected"
    EXPIRED = "EXPIRED", "Expired"
    CANCELLED = "CANCELLED", "Cancelled"


class SalesQuotationSource(models.TextChoices):
    """
    Source of sales quotation creation.
    """

    MANUAL = "MANUAL", "Manual"
    ONLINE = "ONLINE", "Online"
    IMPORT = "IMPORT", "Import"
    API = "API", "API"


class SalesQuotation(models.Model):
    """
    Company-scoped sales quotation header.

    Quotations do not create accounting entries and do not move inventory.
    Conversion to a sales order is handled later through the service layer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_quotations",
        db_index=True,
        verbose_name="Company",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="sales_quotations",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
        help_text="Optional branch. Must belong to the same company.",
    )

    customer = models.ForeignKey(
        BusinessParty,
        on_delete=models.SET_NULL,
        related_name="sales_quotations",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Customer",
        help_text="Optional in draft. Required before sending.",
    )

    quotation_number = models.CharField(
        max_length=60,
        db_index=True,
        verbose_name="Quotation number",
        help_text="Unique inside the same company when provided.",
    )

    status = models.CharField(
        max_length=20,
        choices=SalesQuotationStatus.choices,
        default=SalesQuotationStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    source = models.CharField(
        max_length=20,
        choices=SalesQuotationSource.choices,
        default=SalesQuotationSource.MANUAL,
        db_index=True,
        verbose_name="Source",
    )

    quotation_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Quotation date",
    )

    valid_until = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Valid until",
    )

    sent_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Sent at",
    )

    accepted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Accepted at",
    )

    rejected_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Rejected at",
    )

    expired_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expired at",
    )

    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    rejection_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Rejection reason",
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

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        verbose_name="Currency code",
    )

    customer_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Customer snapshot",
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

    terms_and_conditions = models.TextField(
        blank=True,
        default="",
        verbose_name="Terms and conditions",
    )

    public_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Public notes",
    )

    internal_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Internal notes",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_sales_quotations",
        blank=True,
        null=True,
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_sales_quotations",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )

    sent_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="sent_sales_quotations",
        blank=True,
        null=True,
        verbose_name="Sent by",
    )

    accepted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="accepted_sales_quotations",
        blank=True,
        null=True,
        verbose_name="Accepted by",
    )

    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="rejected_sales_quotations",
        blank=True,
        null=True,
        verbose_name="Rejected by",
    )

    expired_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="expired_sales_quotations",
        blank=True,
        null=True,
        verbose_name="Expired by",
    )

    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_sales_quotations",
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
        verbose_name = "Sales Quotation"
        verbose_name_plural = "Sales Quotations"
        ordering = ["-quotation_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "quotation_number"],
                condition=~Q(quotation_number=""),
                name="unique_sales_quotation_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "source"]),
            models.Index(fields=["company", "quotation_date"]),
            models.Index(fields=["company", "valid_until"]),
            models.Index(fields=["company", "customer"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["quotation_number"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.quotation_number or 'Draft quotation'}"
            f" - {self.company.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return self.status == SalesQuotationStatus.DRAFT

    @property
    def is_sent(self) -> bool:
        return self.status == SalesQuotationStatus.SENT

    @property
    def is_accepted(self) -> bool:
        return self.status == SalesQuotationStatus.ACCEPTED

    @property
    def is_rejected(self) -> bool:
        return self.status == SalesQuotationStatus.REJECTED

    @property
    def is_expired(self) -> bool:
        return self.status == SalesQuotationStatus.EXPIRED

    @property
    def is_cancelled(self) -> bool:
        return self.status == SalesQuotationStatus.CANCELLED

    @property
    def can_be_edited(self) -> bool:
        return self.status == SalesQuotationStatus.DRAFT

    @property
    def can_be_sent(self) -> bool:
        return self.status == SalesQuotationStatus.DRAFT

    @property
    def can_be_accepted(self) -> bool:
        return self.status == SalesQuotationStatus.SENT

    @property
    def can_be_rejected(self) -> bool:
        return self.status == SalesQuotationStatus.SENT

    @property
    def can_be_expired(self) -> bool:
        return self.status == SalesQuotationStatus.SENT

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            SalesQuotationStatus.DRAFT,
            SalesQuotationStatus.SENT,
        ]

    def clean(self) -> None:
        """
        Validate tenant consistency, dates, status, and totals.
        """
        super().clean()

        self.quotation_number = (self.quotation_number or "").strip()
        self.currency_code = (self.currency_code or "SAR").strip().upper()
        self.rejection_reason = (self.rejection_reason or "").strip()
        self.cancelled_reason = (self.cancelled_reason or "").strip()
        self.terms_and_conditions = (
            self.terms_and_conditions or ""
        ).strip()
        self.public_notes = (self.public_notes or "").strip()
        self.internal_notes = (self.internal_notes or "").strip()

        self.subtotal = quantize_money(self.subtotal)
        self.discount_amount = quantize_money(self.discount_amount)
        self.taxable_amount = quantize_money(self.taxable_amount)
        self.tax_amount = quantize_money(self.tax_amount)
        self.total_amount = quantize_money(self.total_amount)

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                        "Selected branch does not belong to this company."
                    }
                )

        if self.customer_id and self.company_id:
            if self.customer.company_id != self.company_id:
                raise ValidationError(
                    {
                        "customer":
                        "Selected customer does not belong to this company."
                    }
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

        if (
            self.status != SalesQuotationStatus.EXPIRED
            and self.valid_until
            and self.quotation_date
            and self.valid_until < self.quotation_date
        ):
            raise ValidationError(
                {
                    "valid_until":
                    "Valid until date cannot be before quotation date."
                }
            )

        if (
            self.status != SalesQuotationStatus.DRAFT
            and not self.customer_id
        ):
            raise ValidationError(
                {
                    "customer":
                    "Customer is required outside draft status."
                }
            )

        if self.discount_amount > self.subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater than subtotal."
                }
            )

        self.total_amount = quantize_money(
            self.subtotal - self.discount_amount + self.tax_amount
        )

    def build_customer_snapshot(self) -> dict:
        """
        Build a historical customer snapshot.
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
            "commercial_registration": (
                self.customer.commercial_registration
            ),
        }

    def build_billing_address_snapshot(self) -> dict:
        """
        Build a historical billing address snapshot.
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
        self.billing_address_snapshot = (
            self.build_billing_address_snapshot()
        )
        self.tax_snapshot = {
            "company_tax_number": (
                self.company.tax_number if self.company_id else ""
            ),
            "company_vat_percentage": (
                str(self.company.vat_percentage)
                if self.company_id
                else "0.00"
            ),
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
        Recalculate quotation totals from quotation lines.
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

        self.subtotal = quantize_money(
            totals.get("subtotal") or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals.get("discount_amount") or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals.get("taxable_amount") or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals.get("tax_amount") or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals.get("total_amount") or MONEY_ZERO
        )

        if save:
            self.save(
                update_fields=[
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def send(self, user=None) -> None:
        """
        Send a draft quotation to the customer.
        """
        if not self.can_be_sent:
            raise ValidationError(
                {"status": "Only draft quotations can be sent."}
            )

        if not self.customer_id:
            raise ValidationError(
                {
                    "customer":
                    "Customer is required before sending quotation."
                }
            )

        if self.pk and not self.items.exists():
            raise ValidationError(
                {"items": "Quotation cannot be sent without items."}
            )

        if self.total_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "total_amount":
                    "Quotation total must be greater than zero."
                }
            )

        self.status = SalesQuotationStatus.SENT
        self.sent_at = timezone.now()
        self.refresh_snapshots(save=False)

        if user:
            self.sent_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "sent_at",
            "customer_snapshot",
            "billing_address_snapshot",
            "tax_snapshot",
            "updated_at",
        ]

        if user:
            update_fields.extend(["sent_by", "updated_by"])

        self.save(update_fields=update_fields)

    def accept(self, user=None) -> None:
        """
        Accept a sent quotation.
        """
        if not self.can_be_accepted:
            raise ValidationError(
                {"status": "Only sent quotations can be accepted."}
            )

        if (
            self.valid_until
            and self.valid_until < timezone.localdate()
        ):
            raise ValidationError(
                {"valid_until": "Expired quotation cannot be accepted."}
            )

        self.status = SalesQuotationStatus.ACCEPTED
        self.accepted_at = timezone.now()

        if user:
            self.accepted_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "accepted_at",
            "updated_at",
        ]

        if user:
            update_fields.extend(["accepted_by", "updated_by"])

        self.save(update_fields=update_fields)

    def reject(self, reason: str = "", user=None) -> None:
        """
        Reject a sent quotation.
        """
        if not self.can_be_rejected:
            raise ValidationError(
                {"status": "Only sent quotations can be rejected."}
            )

        self.status = SalesQuotationStatus.REJECTED
        self.rejected_at = timezone.now()
        self.rejection_reason = (reason or "").strip()

        if user:
            self.rejected_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "rejected_at",
            "rejection_reason",
            "updated_at",
        ]

        if user:
            update_fields.extend(["rejected_by", "updated_by"])

        self.save(update_fields=update_fields)

    def expire(self, user=None) -> None:
        """
        Mark a sent quotation as expired.
        """
        if not self.can_be_expired:
            raise ValidationError(
                {"status": "Only sent quotations can be expired."}
            )

        if not self.valid_until:
            raise ValidationError(
                {
                    "valid_until":
                    "Valid until date is required to expire quotation."
                }
            )

        if self.valid_until >= timezone.localdate():
            raise ValidationError(
                {
                    "valid_until":
                    "Quotation validity date has not passed yet."
                }
            )

        self.status = SalesQuotationStatus.EXPIRED
        self.expired_at = timezone.now()

        if user:
            self.expired_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "expired_at",
            "updated_at",
        ]

        if user:
            update_fields.extend(["expired_by", "updated_by"])

        self.save(update_fields=update_fields)

    def cancel(self, reason: str = "", user=None) -> None:
        """
        Cancel a draft or sent quotation.
        """
        if not self.can_be_cancelled:
            raise ValidationError(
                {
                    "status":
                    "Only draft or sent quotations can be cancelled."
                }
            )

        self.status = SalesQuotationStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_reason = (reason or "").strip()

        if user:
            self.cancelled_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "cancelled_at",
            "cancelled_reason",
            "updated_at",
        ]

        if user:
            update_fields.extend(["cancelled_by", "updated_by"])

        self.save(update_fields=update_fields)


class SalesQuotationItem(models.Model):
    """
    Company-scoped sales quotation line.

    Snapshot fields preserve historical catalog values.
    """

    quotation = models.ForeignKey(
        SalesQuotation,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Quotation",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_quotation_items",
        db_index=True,
        verbose_name="Company",
    )

    catalog_item = models.ForeignKey(
        CatalogItem,
        on_delete=models.SET_NULL,
        related_name="sales_quotation_items",
        blank=True,
        null=True,
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
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
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
        verbose_name = "Sales Quotation Item"
        verbose_name_plural = "Sales Quotation Items"
        ordering = [
            "quotation_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["quotation", "line_number"],
                name=(
                    "unique_sales_quotation_line_number_per_quotation"
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["company", "quotation"]),
            models.Index(fields=["company", "catalog_item"]),
            models.Index(fields=["quotation", "line_number"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["company", "taxable"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.quotation.quotation_number}"
            f" - {self.item_name_snapshot}"
        )

    def clean(self) -> None:
        """
        Validate tenant consistency and calculate line totals.
        """
        super().clean()

        self.item_code_snapshot = (
            self.item_code_snapshot or ""
        ).strip()
        self.item_name_snapshot = (
            self.item_name_snapshot or ""
        ).strip()
        self.item_description_snapshot = (
            self.item_description_snapshot or ""
        ).strip()
        self.unit_name_snapshot = (
            self.unit_name_snapshot or ""
        ).strip()
        self.notes = (self.notes or "").strip()

        self.quantity = quantize_quantity(self.quantity)
        self.unit_price = quantize_money(self.unit_price)
        self.line_subtotal = quantize_money(
            self.quantity * self.unit_price
        )
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.tax_rate = quantize_money(self.tax_rate)

        if self.quotation_id and self.company_id:
            if self.quotation.company_id != self.company_id:
                raise ValidationError(
                    {
                        "company":
                        "Quotation item company must match quotation company."
                    }
                )

        if (
            self.quotation_id
            and not self.quotation.can_be_edited
        ):
            raise ValidationError(
                {
                    "quotation":
                    "Only draft quotations can be modified."
                }
            )

        if self.catalog_item_id and self.company_id:
            if self.catalog_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "catalog_item":
                        "Catalog item must belong to the same company."
                    }
                )

            if (
                self.catalog_item.status
                != CatalogItemStatus.ACTIVE
            ):
                raise ValidationError(
                    {
                        "catalog_item":
                        "Catalog item is not active."
                    }
                )

            if not self.catalog_item.is_sellable:
                raise ValidationError(
                    {
                        "catalog_item":
                        "Catalog item is not sellable."
                    }
                )

        if not self.item_name_snapshot:
            if self.catalog_item_id:
                self.item_name_snapshot = (
                    self.catalog_item.name
                )
            else:
                raise ValidationError(
                    {
                        "item_name_snapshot":
                        "Item name is required."
                    }
                )

        if self.discount_amount > self.line_subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater than line subtotal."
                }
            )

        net_amount = quantize_money(
            self.line_subtotal - self.discount_amount
        )

        if self.taxable:
            self.taxable_amount = net_amount
            self.tax_amount = quantize_money(
                net_amount
                * self.tax_rate
                / Decimal("100.00")
            )
        else:
            self.taxable_amount = MONEY_ZERO
            self.tax_amount = MONEY_ZERO

        self.line_total = quantize_money(
            net_amount + self.tax_amount
        )

    def apply_catalog_snapshot(self) -> None:
        """
        Copy catalog values into quotation snapshots.
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
        self.item_description_snapshot = (
            self.catalog_item.description or ""
        )
        self.unit_name_snapshot = (
            self.catalog_item.unit.name
            if self.catalog_item.unit_id
            else ""
        )
        self.unit_price = quantize_money(
            self.catalog_item.sale_price
        )
        self.taxable = bool(self.catalog_item.taxable)
        self.tax_rate = quantize_money(
            self.catalog_item.tax_rate
        )

    def save(self, *args, **kwargs):
        """
        Validate and recalculate quotation totals after saving.
        """
        if self.quotation_id and not self.company_id:
            self.company_id = self.quotation.company_id

        if (
            self.catalog_item_id
            and not self.item_name_snapshot
        ):
            self.apply_catalog_snapshot()

        self.full_clean()
        super().save(*args, **kwargs)

        if self.quotation_id:
            self.quotation.recalculate_totals(save=True)

    def delete(self, *args, **kwargs):
        """
        Delete quotation lines only while quotation is draft.
        """
        quotation = self.quotation

        if not quotation.can_be_edited:
            raise ValidationError(
                {
                    "quotation":
                    "Only draft quotations can be modified."
                }
            )

        result = super().delete(*args, **kwargs)

        if quotation.pk:
            quotation.recalculate_totals(save=True)

        return result


# End Phase 21.1 ? Sales Quotations Foundation
# ============================================================

# ============================================================
# Phase 21.2 - Sales Orders Foundation
# ============================================================


class SalesOrderStatus(models.TextChoices):
    """
    Sales order lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class SalesOrderBillingStatus(models.TextChoices):
    """
    Sales order invoicing progress.
    """

    NOT_INVOICED = (
        "NOT_INVOICED",
        "Not invoiced",
    )
    PARTIAL = "PARTIAL", "Partially invoiced"
    FULL = "FULL", "Fully invoiced"


class SalesOrderSource(models.TextChoices):
    """
    Source of sales order creation.
    """

    MANUAL = "MANUAL", "Manual"
    QUOTATION = "QUOTATION", "Sales quotation"
    ONLINE = "ONLINE", "Online"
    IMPORT = "IMPORT", "Import"
    API = "API", "API"


class SalesOrder(models.Model):
    """
    Company-scoped sales order header.

    A sales order may be created manually or from one accepted quotation.
    It does not create accounting entries or inventory movements directly.
    Those integrations remain inside the service layer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_orders",
        db_index=True,
        verbose_name="Company",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="sales_orders",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
        help_text="Optional branch. Must belong to the same company.",
    )

    customer = models.ForeignKey(
        BusinessParty,
        on_delete=models.SET_NULL,
        related_name="sales_orders",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Customer",
        help_text="Optional in draft. Required before confirmation.",
    )

    source_quotation = models.OneToOneField(
        SalesQuotation,
        on_delete=models.SET_NULL,
        related_name="converted_sales_order",
        blank=True,
        null=True,
        verbose_name="Source quotation",
        help_text="Optional accepted quotation used to create this order.",
    )

    order_number = models.CharField(
        max_length=60,
        db_index=True,
        verbose_name="Order number",
        help_text="Unique inside the same company.",
    )

    status = models.CharField(
        max_length=20,
        choices=SalesOrderStatus.choices,
        default=SalesOrderStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    billing_status = models.CharField(
        max_length=20,
        choices=SalesOrderBillingStatus.choices,
        default=(
            SalesOrderBillingStatus.NOT_INVOICED
        ),
        db_index=True,
        verbose_name="Billing status",
    )

    invoiced_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Invoiced amount",
    )

    source = models.CharField(
        max_length=20,
        choices=SalesOrderSource.choices,
        default=SalesOrderSource.MANUAL,
        db_index=True,
        verbose_name="Source",
    )

    order_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Order date",
    )

    expected_delivery_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expected delivery date",
    )

    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Confirmed at",
    )

    processing_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Processing at",
    )

    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Completed at",
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

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        verbose_name="Currency code",
    )

    customer_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Customer snapshot",
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

    quotation_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Quotation snapshot",
    )

    public_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Public notes",
    )

    internal_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Internal notes",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_sales_orders",
        blank=True,
        null=True,
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_sales_orders",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )

    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="confirmed_sales_orders",
        blank=True,
        null=True,
        verbose_name="Confirmed by",
    )

    processing_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="processing_sales_orders",
        blank=True,
        null=True,
        verbose_name="Processing by",
    )

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="completed_sales_orders",
        blank=True,
        null=True,
        verbose_name="Completed by",
    )

    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_sales_orders",
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
        verbose_name = "Sales Order"
        verbose_name_plural = "Sales Orders"
        ordering = ["-order_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "order_number"],
                condition=~Q(order_number=""),
                name="unique_sales_order_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(
                fields=["company", "billing_status"]
            ),
            models.Index(fields=["company", "source"]),
            models.Index(fields=["company", "order_date"]),
            models.Index(
                fields=["company", "expected_delivery_date"]
            ),
            models.Index(fields=["company", "customer"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["branch", "status"]),
            models.Index(fields=["customer", "status"]),
            models.Index(fields=["order_number"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.order_number or 'Draft order'}"
            f" - {self.company.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return self.status == SalesOrderStatus.DRAFT

    @property
    def is_confirmed(self) -> bool:
        return self.status == SalesOrderStatus.CONFIRMED

    @property
    def is_processing(self) -> bool:
        return self.status == SalesOrderStatus.PROCESSING

    @property
    def is_completed(self) -> bool:
        return self.status == SalesOrderStatus.COMPLETED

    @property
    def is_cancelled(self) -> bool:
        return self.status == SalesOrderStatus.CANCELLED

    @property
    def can_be_edited(self) -> bool:
        return self.status == SalesOrderStatus.DRAFT

    @property
    def can_be_confirmed(self) -> bool:
        return self.status == SalesOrderStatus.DRAFT

    @property
    def can_start_processing(self) -> bool:
        return self.status == SalesOrderStatus.CONFIRMED

    @property
    def can_be_completed(self) -> bool:
        return self.status == SalesOrderStatus.PROCESSING

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            SalesOrderStatus.DRAFT,
            SalesOrderStatus.CONFIRMED,
            SalesOrderStatus.PROCESSING,
        ]

    @property
    def can_be_invoiced(self) -> bool:
        return (
            self.status in [
                SalesOrderStatus.CONFIRMED,
                SalesOrderStatus.PROCESSING,
                SalesOrderStatus.COMPLETED,
            ]
            and self.billing_status
            != SalesOrderBillingStatus.FULL
        )

    @property
    def remaining_invoice_amount(self) -> Decimal:
        remaining = quantize_money(
            self.total_amount
            - self.invoiced_amount
        )
        return max(remaining, MONEY_ZERO)

    def clean(self) -> None:
        """
        Validate tenant consistency, source quotation, dates, and totals.
        """
        super().clean()

        self.order_number = (self.order_number or "").strip()
        self.currency_code = (
            self.currency_code or "SAR"
        ).strip().upper()
        self.cancelled_reason = (
            self.cancelled_reason or ""
        ).strip()
        self.public_notes = (self.public_notes or "").strip()
        self.internal_notes = (
            self.internal_notes or ""
        ).strip()

        self.subtotal = quantize_money(self.subtotal)
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.taxable_amount = quantize_money(
            self.taxable_amount
        )
        self.tax_amount = quantize_money(self.tax_amount)
        self.total_amount = quantize_money(
            self.total_amount
        )
        self.invoiced_amount = quantize_money(
            self.invoiced_amount
        )

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                        "Selected branch does not belong to this company."
                    }
                )

        if self.customer_id and self.company_id:
            if self.customer.company_id != self.company_id:
                raise ValidationError(
                    {
                        "customer":
                        "Selected customer does not belong to this company."
                    }
                )

            if self.customer.party_type not in [
                BusinessPartyType.CUSTOMER,
                BusinessPartyType.BOTH,
            ]:
                raise ValidationError(
                    {
                        "customer":
                        "Selected party is not a customer."
                    }
                )

            if self.customer.status != BusinessPartyStatus.ACTIVE:
                raise ValidationError(
                    {
                        "customer":
                        "Selected customer is not active."
                    }
                )

        if self.source_quotation_id:
            if (
                self.source_quotation.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "source_quotation":
                        "Source quotation must belong to the same company."
                    }
                )

            if (
                self.source_quotation.status
                != SalesQuotationStatus.ACCEPTED
            ):
                raise ValidationError(
                    {
                        "source_quotation":
                        "Only accepted quotations can create sales orders."
                    }
                )

            if (
                self.customer_id
                and self.source_quotation.customer_id
                != self.customer_id
            ):
                raise ValidationError(
                    {
                        "customer":
                        "Order customer must match source quotation customer."
                    }
                )

            if (
                self.branch_id
                and self.source_quotation.branch_id
                and self.source_quotation.branch_id
                != self.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                        "Order branch must match source quotation branch."
                    }
                )

        if (
            self.expected_delivery_date
            and self.order_date
            and self.expected_delivery_date < self.order_date
        ):
            raise ValidationError(
                {
                    "expected_delivery_date":
                    "Expected delivery date cannot be before order date."
                }
            )

        if (
            self.status != SalesOrderStatus.DRAFT
            and not self.customer_id
        ):
            raise ValidationError(
                {
                    "customer":
                    "Customer is required outside draft status."
                }
            )

        if self.discount_amount > self.subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater than subtotal."
                }
            )

        self.total_amount = quantize_money(
            self.subtotal
            - self.discount_amount
            + self.tax_amount
        )

    def build_customer_snapshot(self) -> dict:
        """
        Build a historical customer snapshot.
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
            "commercial_registration": (
                self.customer.commercial_registration
            ),
        }

    def build_billing_address_snapshot(self) -> dict:
        """
        Build a historical customer address snapshot.
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

    def build_quotation_snapshot(self) -> dict:
        """
        Build source quotation identity snapshot.
        """
        if not self.source_quotation_id:
            return {}

        return {
            "id": self.source_quotation_id,
            "quotation_number":
                self.source_quotation.quotation_number,
            "quotation_date": (
                self.source_quotation.quotation_date.isoformat()
                if self.source_quotation.quotation_date
                else None
            ),
            "valid_until": (
                self.source_quotation.valid_until.isoformat()
                if self.source_quotation.valid_until
                else None
            ),
            "total_amount": str(
                self.source_quotation.total_amount
            ),
            "currency_code":
                self.source_quotation.currency_code,
        }

    def refresh_snapshots(self, save: bool = True) -> None:
        """
        Refresh customer, tax, address, and quotation snapshots.
        """
        self.customer_snapshot = (
            self.build_customer_snapshot()
        )
        self.billing_address_snapshot = (
            self.build_billing_address_snapshot()
        )
        self.quotation_snapshot = (
            self.build_quotation_snapshot()
        )
        self.tax_snapshot = {
            "company_tax_number": (
                self.company.tax_number
                if self.company_id
                else ""
            ),
            "company_vat_percentage": (
                str(self.company.vat_percentage)
                if self.company_id
                else "0.00"
            ),
            "currency_code": self.currency_code,
        }

        if save and self.pk:
            self.save(
                update_fields=[
                    "customer_snapshot",
                    "billing_address_snapshot",
                    "quotation_snapshot",
                    "tax_snapshot",
                    "updated_at",
                ]
            )

    def recalculate_totals(self, save: bool = True) -> None:
        """
        Recalculate order totals from order lines.
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

        self.subtotal = quantize_money(
            totals.get("subtotal") or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals.get("discount_amount") or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals.get("taxable_amount") or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals.get("tax_amount") or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals.get("total_amount") or MONEY_ZERO
        )

        if save:
            self.save(
                update_fields=[
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def refresh_invoice_progress(
        self,
        save: bool = True,
    ) -> None:
        """
        Refresh line quantities and invoice progress.
        """
        if not self.pk:
            return

        items = list(self.items.all())

        for item in items:
            item.refresh_invoicing_quantities(
                save=True
            )

        ordered_quantity = sum(
            (
                quantize_quantity(item.quantity)
                for item in items
            ),
            QUANTITY_ZERO,
        )

        invoiced_quantity = sum(
            (
                quantize_quantity(
                    item.invoiced_quantity
                )
                for item in items
            ),
            QUANTITY_ZERO,
        )

        totals = (
            self.generated_invoices
            .exclude(
                status=SalesInvoiceStatus.CANCELLED
            )
            .aggregate(total=Sum("total_amount"))
        )

        self.invoiced_amount = quantize_money(
            totals.get("total") or MONEY_ZERO
        )

        if (
            not items
            or invoiced_quantity <= QUANTITY_ZERO
        ):
            self.billing_status = (
                SalesOrderBillingStatus.NOT_INVOICED
            )
        elif invoiced_quantity < ordered_quantity:
            self.billing_status = (
                SalesOrderBillingStatus.PARTIAL
            )
        else:
            self.billing_status = (
                SalesOrderBillingStatus.FULL
            )

        if save:
            SalesOrder.objects.filter(
                pk=self.pk
            ).update(
                billing_status=self.billing_status,
                invoiced_amount=self.invoiced_amount,
                updated_at=timezone.now(),
            )

    def confirm(self, user=None) -> None:
        """
        Confirm a draft sales order.
        """
        if not self.can_be_confirmed:
            raise ValidationError(
                {
                    "status":
                    "Only draft sales orders can be confirmed."
                }
            )

        if not self.customer_id:
            raise ValidationError(
                {
                    "customer":
                    "Customer is required before confirming order."
                }
            )

        if self.pk and not self.items.exists():
            raise ValidationError(
                {
                    "items":
                    "Sales order cannot be confirmed without items."
                }
            )

        if self.total_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "total_amount":
                    "Sales order total must be greater than zero."
                }
            )

        self.status = SalesOrderStatus.CONFIRMED
        self.confirmed_at = timezone.now()
        self.refresh_snapshots(save=False)

        if user:
            self.confirmed_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "confirmed_at",
            "customer_snapshot",
            "billing_address_snapshot",
            "quotation_snapshot",
            "tax_snapshot",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "confirmed_by",
                "updated_by",
            ])

        self.save(update_fields=update_fields)

    def start_processing(self, user=None) -> None:
        """
        Move a confirmed order into processing.
        """
        if not self.can_start_processing:
            raise ValidationError(
                {
                    "status":
                    "Only confirmed sales orders can start processing."
                }
            )

        self.status = SalesOrderStatus.PROCESSING
        self.processing_at = timezone.now()

        if user:
            self.processing_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "processing_at",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "processing_by",
                "updated_by",
            ])

        self.save(update_fields=update_fields)

    def complete(self, user=None) -> None:
        """
        Complete a processing sales order.
        """
        if not self.can_be_completed:
            raise ValidationError(
                {
                    "status":
                    "Only processing sales orders can be completed."
                }
            )

        self.status = SalesOrderStatus.COMPLETED
        self.completed_at = timezone.now()

        if user:
            self.completed_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "completed_at",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "completed_by",
                "updated_by",
            ])

        self.save(update_fields=update_fields)

    def cancel(self, reason: str = "", user=None) -> None:
        """
        Cancel a draft, confirmed, or processing sales order.
        """
        if not self.can_be_cancelled:
            raise ValidationError(
                {
                    "status":
                    "This sales order cannot be cancelled."
                }
            )

        self.refresh_invoice_progress(save=False)

        if (
            self.billing_status
            != SalesOrderBillingStatus.NOT_INVOICED
        ):
            raise ValidationError(
                {
                    "billing_status":
                    "Invoiced sales orders cannot be cancelled."
                }
            )

        self.status = SalesOrderStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_reason = (reason or "").strip()

        if user:
            self.cancelled_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "cancelled_at",
            "cancelled_reason",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "cancelled_by",
                "updated_by",
            ])

        self.save(update_fields=update_fields)


class SalesOrderItem(models.Model):
    """
    Company-scoped sales order line.

    Snapshot fields preserve catalog values at order time.
    """

    order = models.ForeignKey(
        SalesOrder,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Sales order",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_order_items",
        db_index=True,
        verbose_name="Company",
    )

    catalog_item = models.ForeignKey(
        CatalogItem,
        on_delete=models.SET_NULL,
        related_name="sales_order_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Catalog item",
    )

    source_quotation_item = models.ForeignKey(
        SalesQuotationItem,
        on_delete=models.SET_NULL,
        related_name="converted_sales_order_items",
        blank=True,
        null=True,
        verbose_name="Source quotation item",
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
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
        verbose_name="Quantity",
    )

    invoiced_quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[
            MinValueValidator(QUANTITY_ZERO)
        ],
        verbose_name="Invoiced quantity",
    )

    remaining_quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[
            MinValueValidator(QUANTITY_ZERO)
        ],
        verbose_name="Remaining quantity",
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
        verbose_name = "Sales Order Item"
        verbose_name_plural = "Sales Order Items"
        ordering = [
            "order_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["order", "line_number"],
                name=(
                    "unique_sales_order_line_number_per_order"
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["company", "order"]),
            models.Index(fields=["company", "catalog_item"]),
            models.Index(fields=["order", "line_number"]),
            models.Index(fields=["company", "created_at"]),
            models.Index(fields=["company", "taxable"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.order.order_number}"
            f" - {self.item_name_snapshot}"
        )

    def clean(self) -> None:
        """
        Validate tenant consistency and calculate line totals.
        """
        super().clean()

        self.item_code_snapshot = (
            self.item_code_snapshot or ""
        ).strip()
        self.item_name_snapshot = (
            self.item_name_snapshot or ""
        ).strip()
        self.item_description_snapshot = (
            self.item_description_snapshot or ""
        ).strip()
        self.unit_name_snapshot = (
            self.unit_name_snapshot or ""
        ).strip()
        self.notes = (self.notes or "").strip()

        self.quantity = quantize_quantity(
            self.quantity
        )
        self.invoiced_quantity = quantize_quantity(
            self.invoiced_quantity
        )
        self.remaining_quantity = quantize_quantity(
            self.remaining_quantity
        )
        self.unit_price = quantize_money(
            self.unit_price
        )
        self.line_subtotal = quantize_money(
            self.quantity * self.unit_price
        )
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.tax_rate = quantize_money(self.tax_rate)

        if self.order_id and self.company_id:
            if self.order.company_id != self.company_id:
                raise ValidationError(
                    {
                        "company":
                        "Order item company must match order company."
                    }
                )

        if self.order_id and not self.order.can_be_edited:
            raise ValidationError(
                {
                    "order":
                    "Only draft sales orders can be modified."
                }
            )

        if self.catalog_item_id and self.company_id:
            if self.catalog_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "catalog_item":
                        "Catalog item must belong to the same company."
                    }
                )

            if (
                self.catalog_item.status
                != CatalogItemStatus.ACTIVE
            ):
                raise ValidationError(
                    {
                        "catalog_item":
                        "Catalog item is not active."
                    }
                )

            if not self.catalog_item.is_sellable:
                raise ValidationError(
                    {
                        "catalog_item":
                        "Catalog item is not sellable."
                    }
                )

        if self.source_quotation_item_id:
            if (
                self.source_quotation_item.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "source_quotation_item":
                        "Source quotation item must belong to the same company."
                    }
                )

            if (
                self.order.source_quotation_id
                and self.source_quotation_item.quotation_id
                != self.order.source_quotation_id
            ):
                raise ValidationError(
                    {
                        "source_quotation_item":
                        "Source quotation item does not belong to the order quotation."
                    }
                )

        if not self.item_name_snapshot:
            if self.catalog_item_id:
                self.item_name_snapshot = (
                    self.catalog_item.name
                )
            else:
                raise ValidationError(
                    {
                        "item_name_snapshot":
                        "Item name is required."
                    }
                )

        if self.invoiced_quantity > self.quantity:
            raise ValidationError(
                {
                    "invoiced_quantity":
                    "Invoiced quantity cannot exceed "
                    "ordered quantity."
                }
            )

        self.remaining_quantity = quantize_quantity(
            self.quantity
            - self.invoiced_quantity
        )

        if self.discount_amount > self.line_subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater than line subtotal."
                }
            )

        net_amount = quantize_money(
            self.line_subtotal - self.discount_amount
        )

        if self.taxable:
            self.taxable_amount = net_amount
            self.tax_amount = quantize_money(
                net_amount
                * self.tax_rate
                / Decimal("100.00")
            )
        else:
            self.taxable_amount = MONEY_ZERO
            self.tax_amount = MONEY_ZERO

        self.line_total = quantize_money(
            net_amount + self.tax_amount
        )

    def refresh_invoicing_quantities(
        self,
        save: bool = True,
    ) -> None:
        """
        Refresh invoiced and remaining quantities.
        """
        if not self.pk:
            return

        totals = (
            self.invoice_items
            .exclude(
                invoice__status=(
                    SalesInvoiceStatus.CANCELLED
                )
            )
            .aggregate(total=Sum("quantity"))
        )

        self.invoiced_quantity = quantize_quantity(
            totals.get("total") or QUANTITY_ZERO
        )

        if self.invoiced_quantity > self.quantity:
            raise ValidationError(
                {
                    "invoiced_quantity":
                    "Invoiced quantity cannot exceed "
                    "ordered quantity."
                }
            )

        self.remaining_quantity = quantize_quantity(
            self.quantity
            - self.invoiced_quantity
        )

        if save:
            SalesOrderItem.objects.filter(
                pk=self.pk
            ).update(
                invoiced_quantity=(
                    self.invoiced_quantity
                ),
                remaining_quantity=(
                    self.remaining_quantity
                ),
                updated_at=timezone.now(),
            )

    def apply_catalog_snapshot(self) -> None:
        """
        Copy current catalog values into order snapshots.
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
        self.item_description_snapshot = (
            self.catalog_item.description or ""
        )
        self.unit_name_snapshot = (
            self.catalog_item.unit.name
            if self.catalog_item.unit_id
            else ""
        )
        self.unit_price = quantize_money(
            self.catalog_item.sale_price
        )
        self.taxable = bool(self.catalog_item.taxable)
        self.tax_rate = quantize_money(
            self.catalog_item.tax_rate
        )

    def apply_quotation_item_snapshot(self) -> None:
        """
        Copy accepted quotation line values into this order line.
        """
        if not self.source_quotation_item_id:
            return

        source_item = self.source_quotation_item

        self.catalog_item = source_item.catalog_item
        self.item_code_snapshot = (
            source_item.item_code_snapshot
        )
        self.item_name_snapshot = (
            source_item.item_name_snapshot
        )
        self.item_description_snapshot = (
            source_item.item_description_snapshot
        )
        self.unit_name_snapshot = (
            source_item.unit_name_snapshot
        )
        self.quantity = source_item.quantity
        self.unit_price = source_item.unit_price
        self.discount_amount = (
            source_item.discount_amount
        )
        self.taxable = source_item.taxable
        self.tax_rate = source_item.tax_rate
        self.notes = source_item.notes
        self.extra_data = dict(
            source_item.extra_data or {}
        )

    def save(self, *args, **kwargs):
        """
        Validate and refresh order totals after saving.
        """
        if self.order_id and not self.company_id:
            self.company_id = self.order.company_id

        if (
            self.source_quotation_item_id
            and not self.item_name_snapshot
        ):
            self.apply_quotation_item_snapshot()

        if (
            self.catalog_item_id
            and not self.item_name_snapshot
        ):
            self.apply_catalog_snapshot()

        if not self.pk:
            self.remaining_quantity = (
                quantize_quantity(self.quantity)
            )

        self.full_clean()
        super().save(*args, **kwargs)

        if self.order_id:
            self.order.recalculate_totals(save=True)

    def delete(self, *args, **kwargs):
        """
        Delete order lines only while the order is draft.
        """
        order = self.order

        if not order.can_be_edited:
            raise ValidationError(
                {
                    "order":
                    "Only draft sales orders can be modified."
                }
            )

        result = super().delete(*args, **kwargs)

        if order.pk:
            order.recalculate_totals(save=True)

        return result


# End Phase 21.2 - Sales Orders Foundation
# ============================================================

# ============================================================
# Phase 21.3 - Sales Order Fulfillment & Invoice Conversion Foundation
# ------------------------------------------------------------
# SalesInvoice links to its source SalesOrder.
# SalesInvoiceItem links to its source SalesOrderItem.
# Partial and full invoicing are supported.
# Cancelled invoices are excluded from fulfillment progress.
# ============================================================

# ============================================================
# Phase 21.4.1 - Sales Returns Models Foundation
# ------------------------------------------------------------
# Company-scoped sales return header and lines.
# Partial and full invoice returns are supported.
# Confirmed and posted returns consume invoice quantities.
# Draft and cancelled returns do not consume quantities.
# Inventory, accounting, and credit notes remain in services.
# ============================================================


class SalesReturnStatus(models.TextChoices):
    """
    Sales return lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class SalesReturnReason(models.TextChoices):
    """
    Standard sales return reasons.
    """

    CUSTOMER_REQUEST = (
        "CUSTOMER_REQUEST",
        "Customer request",
    )
    DAMAGED = "DAMAGED", "Damaged item"
    DEFECTIVE = "DEFECTIVE", "Defective item"
    WRONG_ITEM = "WRONG_ITEM", "Wrong item"
    WRONG_QUANTITY = (
        "WRONG_QUANTITY",
        "Wrong quantity",
    )
    EXPIRED = "EXPIRED", "Expired item"
    QUALITY_ISSUE = (
        "QUALITY_ISSUE",
        "Quality issue",
    )
    OTHER = "OTHER", "Other"


class SalesReturn(models.Model):
    """
    Company-scoped sales return header.

    A return references one issued sales invoice.

    This model manages lifecycle, validation, snapshots, and totals only.
    Credit notes, accounting entries, and inventory movements are created
    through sales.services in later Phase 21.4 parts.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_returns",
        db_index=True,
        verbose_name="Company",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="sales_returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )

    customer = models.ForeignKey(
        BusinessParty,
        on_delete=models.SET_NULL,
        related_name="sales_returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Customer",
    )

    invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.PROTECT,
        related_name="sales_returns",
        db_index=True,
        verbose_name="Sales invoice",
    )

    return_warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="sales_returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Return warehouse",
        help_text=(
            "Optional in draft. Used later for physical "
            "inventory return processing."
        ),
    )

    return_number = models.CharField(
        max_length=60,
        db_index=True,
        verbose_name="Return number",
        help_text="Unique inside the same company.",
    )

    status = models.CharField(
        max_length=20,
        choices=SalesReturnStatus.choices,
        default=SalesReturnStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    reason = models.CharField(
        max_length=40,
        choices=SalesReturnReason.choices,
        default=SalesReturnReason.CUSTOMER_REQUEST,
        db_index=True,
        verbose_name="Return reason",
    )

    reason_details = models.TextField(
        blank=True,
        default="",
        verbose_name="Reason details",
    )

    return_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Return date",
    )

    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Confirmed at",
    )

    posted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Posted at",
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
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Subtotal",
    )

    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Discount amount",
    )

    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Taxable amount",
    )

    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Tax amount",
    )

    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Total amount",
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
    )

    invoice_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Invoice snapshot",
    )

    tax_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Tax snapshot",
    )

    public_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Public notes",
    )

    internal_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Internal notes",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_sales_returns",
        blank=True,
        null=True,
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_sales_returns",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )

    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="confirmed_sales_returns",
        blank=True,
        null=True,
        verbose_name="Confirmed by",
    )

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_sales_returns",
        blank=True,
        null=True,
        verbose_name="Posted by",
    )

    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_sales_returns",
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
        verbose_name = "Sales Return"
        verbose_name_plural = "Sales Returns"
        ordering = [
            "-return_date",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "return_number",
                ],
                condition=~Q(return_number=""),
                name=(
                    "unique_sales_return_number_per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "company",
                    "status",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "reason",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "return_date",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "invoice",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "customer",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "branch",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "return_warehouse",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "created_at",
                ]
            ),
            models.Index(
                fields=["return_number"]
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.return_number or 'Draft return'}"
            f" - {self.company.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.DRAFT
        )

    @property
    def is_confirmed(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.CONFIRMED
        )

    @property
    def is_posted(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.POSTED
        )

    @property
    def is_cancelled(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.CANCELLED
        )

    @property
    def can_be_edited(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.DRAFT
        )

    @property
    def can_be_confirmed(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.DRAFT
        )

    @property
    def can_be_posted(self) -> bool:
        return (
            self.status
            == SalesReturnStatus.CONFIRMED
        )

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            SalesReturnStatus.DRAFT,
            SalesReturnStatus.CONFIRMED,
        ]

    def clean(self) -> None:
        """
        Validate company isolation, invoice, dates, and totals.
        """
        super().clean()

        self.return_number = (
            self.return_number or ""
        ).strip()
        self.currency_code = (
            self.currency_code or "SAR"
        ).strip().upper()
        self.reason_details = (
            self.reason_details or ""
        ).strip()
        self.cancelled_reason = (
            self.cancelled_reason or ""
        ).strip()
        self.public_notes = (
            self.public_notes or ""
        ).strip()
        self.internal_notes = (
            self.internal_notes or ""
        ).strip()

        self.subtotal = quantize_money(
            self.subtotal
        )
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.taxable_amount = quantize_money(
            self.taxable_amount
        )
        self.tax_amount = quantize_money(
            self.tax_amount
        )
        self.total_amount = quantize_money(
            self.total_amount
        )

        if self.invoice_id and self.company_id:
            if (
                self.invoice.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "invoice":
                        "Sales invoice must belong "
                        "to the same company."
                    }
                )

            if (
                self.invoice.status
                != SalesInvoiceStatus.ISSUED
            ):
                raise ValidationError(
                    {
                        "invoice":
                        "Only issued sales invoices "
                        "can be returned."
                    }
                )

            if (
                self.return_date
                and self.invoice.invoice_date
                and self.return_date
                < self.invoice.invoice_date
            ):
                raise ValidationError(
                    {
                        "return_date":
                        "Return date cannot be before "
                        "invoice date."
                    }
                )

            if (
                self.customer_id
                and self.invoice.customer_id
                and self.customer_id
                != self.invoice.customer_id
            ):
                raise ValidationError(
                    {
                        "customer":
                        "Return customer must match "
                        "invoice customer."
                    }
                )

            if (
                self.branch_id
                and self.invoice.branch_id
                and self.branch_id
                != self.invoice.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                        "Return branch must match "
                        "invoice branch."
                    }
                )

            if (
                self.currency_code
                != self.invoice.currency_code
            ):
                raise ValidationError(
                    {
                        "currency_code":
                        "Return currency must match "
                        "invoice currency."
                    }
                )

        if self.branch_id and self.company_id:
            if (
                self.branch.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "branch":
                        "Selected branch does not belong "
                        "to this company."
                    }
                )

        if self.customer_id and self.company_id:
            if (
                self.customer.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "customer":
                        "Selected customer does not belong "
                        "to this company."
                    }
                )

            if self.customer.party_type not in [
                BusinessPartyType.CUSTOMER,
                BusinessPartyType.BOTH,
            ]:
                raise ValidationError(
                    {
                        "customer":
                        "Selected party is not a customer."
                    }
                )

        if (
            self.return_warehouse_id
            and self.company_id
            and self.return_warehouse.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "return_warehouse":
                    "Return warehouse must belong "
                    "to the same company."
                }
            )

        if self.discount_amount > self.subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater "
                    "than subtotal."
                }
            )

        self.total_amount = quantize_money(
            self.subtotal
            - self.discount_amount
            + self.tax_amount
        )

    def build_customer_snapshot(self) -> dict:
        """
        Copy the customer snapshot from the source invoice.
        """
        if not self.invoice_id:
            return {}

        return dict(
            self.invoice.customer_snapshot or {}
        )

    def build_invoice_snapshot(self) -> dict:
        """
        Build source invoice identity and amount snapshot.
        """
        if not self.invoice_id:
            return {}

        return {
            "id": self.invoice_id,
            "invoice_number":
                self.invoice.invoice_number,
            "invoice_date": (
                self.invoice.invoice_date.isoformat()
                if self.invoice.invoice_date
                else None
            ),
            "status": self.invoice.status,
            "payment_status":
                self.invoice.payment_status,
            "subtotal": str(
                self.invoice.subtotal
            ),
            "discount_amount": str(
                self.invoice.discount_amount
            ),
            "taxable_amount": str(
                self.invoice.taxable_amount
            ),
            "tax_amount": str(
                self.invoice.tax_amount
            ),
            "total_amount": str(
                self.invoice.total_amount
            ),
            "paid_amount": str(
                self.invoice.paid_amount
            ),
            "balance_due": str(
                self.invoice.balance_due
            ),
            "currency_code":
                self.invoice.currency_code,
        }

    def refresh_snapshots(
        self,
        save: bool = True,
    ) -> None:
        """
        Refresh snapshots from the source invoice.
        """
        self.customer_snapshot = (
            self.build_customer_snapshot()
        )
        self.invoice_snapshot = (
            self.build_invoice_snapshot()
        )
        self.tax_snapshot = (
            dict(self.invoice.tax_snapshot or {})
            if self.invoice_id
            else {}
        )

        if save and self.pk:
            self.save(
                update_fields=[
                    "customer_snapshot",
                    "invoice_snapshot",
                    "tax_snapshot",
                    "updated_at",
                ]
            )

    def recalculate_totals(
        self,
        save: bool = True,
    ) -> None:
        """
        Recalculate return totals from return lines.
        """
        if not self.pk:
            return

        totals = self.items.aggregate(
            subtotal=Sum("line_subtotal"),
            discount_amount=Sum(
                "discount_amount"
            ),
            taxable_amount=Sum(
                "taxable_amount"
            ),
            tax_amount=Sum("tax_amount"),
            total_amount=Sum("line_total"),
        )

        self.subtotal = quantize_money(
            totals.get("subtotal")
            or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals.get("discount_amount")
            or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals.get("taxable_amount")
            or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals.get("tax_amount")
            or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals.get("total_amount")
            or MONEY_ZERO
        )

        if save:
            self.save(
                update_fields=[
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def validate_items_for_confirmation(
        self,
    ) -> None:
        """
        Validate return lines before confirmation.
        """
        if (
            not self.pk
            or not self.items.exists()
        ):
            raise ValidationError(
                {
                    "items":
                    "Sales return cannot be "
                    "confirmed without items."
                }
            )

        for item in self.items.select_related(
            "invoice_item",
            "invoice_item__invoice",
            "catalog_item",
        ):
            item.full_clean()

        self.recalculate_totals(
            save=False
        )

        if self.total_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "total_amount":
                    "Sales return total must "
                    "be greater than zero."
                }
            )

    def confirm(self, user=None) -> None:
        """
        Confirm a draft return.
        """
        if not self.can_be_confirmed:
            raise ValidationError(
                {
                    "status":
                    "Only draft sales returns "
                    "can be confirmed."
                }
            )

        self.validate_items_for_confirmation()

        self.status = (
            SalesReturnStatus.CONFIRMED
        )
        self.confirmed_at = timezone.now()
        self.refresh_snapshots(
            save=False
        )

        if user:
            self.confirmed_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "confirmed_at",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total_amount",
            "customer_snapshot",
            "invoice_snapshot",
            "tax_snapshot",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "confirmed_by",
                "updated_by",
            ])

        self.save(
            update_fields=update_fields
        )

    def mark_posted(self, user=None) -> None:
        """
        Mark a confirmed return as posted.

        Integrations must finish successfully before this method is called
        inside the service transaction.
        """
        if not self.can_be_posted:
            raise ValidationError(
                {
                    "status":
                    "Only confirmed sales returns "
                    "can be posted."
                }
            )

        self.status = SalesReturnStatus.POSTED
        self.posted_at = timezone.now()

        if user:
            self.posted_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "posted_at",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "posted_by",
                "updated_by",
            ])

        self.save(
            update_fields=update_fields
        )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        """
        Cancel a draft or confirmed return.

        Posted returns require a dedicated reversal flow later.
        """
        if not self.can_be_cancelled:
            raise ValidationError(
                {
                    "status":
                    "Posted or already cancelled "
                    "returns cannot be cancelled directly."
                }
            )

        self.status = (
            SalesReturnStatus.CANCELLED
        )
        self.cancelled_at = timezone.now()
        self.cancelled_reason = (
            reason or ""
        ).strip()

        if user:
            self.cancelled_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "cancelled_at",
            "cancelled_reason",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "cancelled_by",
                "updated_by",
            ])

        self.save(
            update_fields=update_fields
        )


class SalesReturnItem(models.Model):
    """
    One returned quantity from one sales invoice item.

    Historical commercial values are copied from the invoice item.
    """

    sales_return = models.ForeignKey(
        SalesReturn,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Sales return",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_return_items",
        db_index=True,
        verbose_name="Company",
    )

    invoice_item = models.ForeignKey(
        SalesInvoiceItem,
        on_delete=models.PROTECT,
        related_name="sales_return_items",
        db_index=True,
        verbose_name="Source invoice item",
    )

    catalog_item = models.ForeignKey(
        CatalogItem,
        on_delete=models.SET_NULL,
        related_name="sales_return_items",
        blank=True,
        null=True,
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
        blank=True,
        default="",
        verbose_name="Item name snapshot",
        help_text=(
            "Automatically copied from the source "
            "sales invoice item."
        ),
    )

    item_description_snapshot = (
        models.TextField(
            blank=True,
            default="",
            verbose_name=(
                "Item description snapshot"
            ),
        )
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
        validators=[
            MinValueValidator(
                Decimal("0.0001")
            )
        ],
        verbose_name="Returned quantity",
    )

    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Unit price",
    )

    line_subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Line subtotal",
    )

    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
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
        validators=[
            MinValueValidator(TAX_ZERO)
        ],
        verbose_name="Tax rate",
    )

    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Taxable amount",
    )

    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Tax amount",
    )

    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Line total",
    )

    restock = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Restock item",
        help_text=(
            "Inventory services ignore service "
            "or non-inventory catalog items."
        ),
    )

    condition_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Condition notes",
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
        verbose_name = "Sales Return Item"
        verbose_name_plural = (
            "Sales Return Items"
        )
        ordering = [
            "sales_return_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "sales_return",
                    "line_number",
                ],
                name=(
                    "unique_sales_return_line_number_per_return"
                ),
            ),
            models.UniqueConstraint(
                fields=[
                    "sales_return",
                    "invoice_item",
                ],
                name=(
                    "unique_invoice_item_per_sales_return"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "company",
                    "sales_return",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "invoice_item",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "catalog_item",
                ]
            ),
            models.Index(
                fields=[
                    "sales_return",
                    "line_number",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "restock",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "created_at",
                ]
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.sales_return.return_number}"
            f" - {self.item_name_snapshot}"
        )

    def apply_invoice_item_snapshot(
        self,
    ) -> None:
        """
        Copy historical invoice line values.
        """
        if not self.invoice_item_id:
            return

        source_item = self.invoice_item

        self.catalog_item = (
            source_item.catalog_item
        )
        self.item_code_snapshot = (
            source_item.item_code_snapshot
        )
        self.item_name_snapshot = (
            source_item.item_name_snapshot
        )
        self.item_description_snapshot = (
            source_item
            .item_description_snapshot
        )
        self.unit_name_snapshot = (
            source_item.unit_name_snapshot
        )
        self.unit_price = quantize_money(
            source_item.unit_price
        )
        self.taxable = bool(
            source_item.taxable
        )
        self.tax_rate = quantize_money(
            source_item.tax_rate
        )

    def calculate_amounts_from_invoice_item(
        self,
    ) -> None:
        """
        Calculate proportional amounts using invoice snapshots.
        """
        if not self.invoice_item_id:
            return

        source_item = self.invoice_item

        source_quantity = quantize_quantity(
            source_item.quantity
        )

        if source_quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "invoice_item":
                    "Source invoice item has "
                    "invalid quantity."
                }
            )

        ratio = (
            self.quantity
            / source_quantity
        )

        self.line_subtotal = quantize_money(
            source_item.line_subtotal
            * ratio
        )
        self.discount_amount = quantize_money(
            source_item.discount_amount
            * ratio
        )
        self.taxable_amount = quantize_money(
            source_item.taxable_amount
            * ratio
        )
        self.tax_amount = quantize_money(
            source_item.tax_amount
            * ratio
        )
        self.line_total = quantize_money(
            source_item.line_total
            * ratio
        )

    def clean(self) -> None:
        """
        Validate isolation, invoice linkage, quantity, and totals.
        """
        super().clean()

        self.item_code_snapshot = (
            self.item_code_snapshot or ""
        ).strip()
        self.item_name_snapshot = (
            self.item_name_snapshot or ""
        ).strip()
        self.item_description_snapshot = (
            self.item_description_snapshot
            or ""
        ).strip()
        self.unit_name_snapshot = (
            self.unit_name_snapshot or ""
        ).strip()
        self.condition_notes = (
            self.condition_notes or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        self.quantity = quantize_quantity(
            self.quantity
        )
        self.unit_price = quantize_money(
            self.unit_price
        )
        self.tax_rate = quantize_money(
            self.tax_rate
        )

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                    "Returned quantity must "
                    "be greater than zero."
                }
            )

        if (
            self.sales_return_id
            and self.company_id
            and self.sales_return.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "company":
                    "Return item company must "
                    "match return company."
                }
            )

        if (
            self.sales_return_id
            and not self.sales_return.can_be_edited
        ):
            existing_item = (
                type(self).objects
                .filter(pk=self.pk)
                .first()
                if self.pk
                else None
            )

            if not existing_item:
                raise ValidationError(
                    {
                        "sales_return":
                        "Only draft sales returns "
                        "can be modified."
                    }
                )

            protected_fields = [
                "invoice_item_id",
                "catalog_item_id",
                "line_number",
                "quantity",
                "restock",
                "condition_notes",
                "notes",
                "extra_data",
            ]

            for field_name in protected_fields:
                if (
                    getattr(
                        existing_item,
                        field_name,
                    )
                    != getattr(
                        self,
                        field_name,
                    )
                ):
                    raise ValidationError(
                        {
                            "sales_return":
                            "Only draft sales returns "
                            "can be modified."
                        }
                    )

        if (
            self.invoice_item_id
            and self.company_id
        ):
            if (
                self.invoice_item.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "invoice_item":
                        "Invoice item must belong "
                        "to the same company."
                    }
                )

            if (
                self.sales_return_id
                and self.invoice_item.invoice_id
                != self.sales_return.invoice_id
            ):
                raise ValidationError(
                    {
                        "invoice_item":
                        "Invoice item must belong "
                        "to the return invoice."
                    }
                )

            if (
                self.invoice_item.invoice.status
                != SalesInvoiceStatus.ISSUED
            ):
                raise ValidationError(
                    {
                        "invoice_item":
                        "Only issued invoice items "
                        "can be returned."
                    }
                )

            accepted_quantity = (
                type(self).objects
                .filter(
                    invoice_item=(
                        self.invoice_item
                    ),
                    sales_return__status__in=[
                        SalesReturnStatus.CONFIRMED,
                        SalesReturnStatus.POSTED,
                    ],
                )
                .exclude(pk=self.pk)
                .aggregate(
                    total=Sum("quantity")
                )
                .get("total")
                or QUANTITY_ZERO
            )

            returnable_quantity = (
                quantize_quantity(
                    self.invoice_item.quantity
                    - accepted_quantity
                )
            )

            if (
                self.quantity
                > returnable_quantity
            ):
                raise ValidationError(
                    {
                        "quantity":
                        "Returned quantity cannot exceed "
                        "the remaining invoice quantity."
                    }
                )

        if (
            self.catalog_item_id
            and self.company_id
            and self.catalog_item.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "catalog_item":
                    "Catalog item must belong "
                    "to the same company."
                }
            )

        if (
            self.invoice_item_id
            and self.catalog_item_id
            != self.invoice_item.catalog_item_id
        ):
            raise ValidationError(
                {
                    "catalog_item":
                    "Return catalog item must "
                    "match invoice item."
                }
            )

        if not self.item_name_snapshot:
            if self.invoice_item_id:
                self.apply_invoice_item_snapshot()
            else:
                raise ValidationError(
                    {
                        "item_name_snapshot":
                        "Item name is required."
                    }
                )

        self.calculate_amounts_from_invoice_item()

        if (
            self.discount_amount
            > self.line_subtotal
        ):
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater "
                    "than line subtotal."
                }
            )

        self.line_total = quantize_money(
            self.line_subtotal
            - self.discount_amount
            + self.tax_amount
        )

    def save(self, *args, **kwargs):
        """
        Validate and refresh return totals.
        """
        if (
            self.sales_return_id
            and not self.company_id
        ):
            self.company_id = (
                self.sales_return.company_id
            )

        if self.invoice_item_id:
            self.apply_invoice_item_snapshot()

        self.full_clean()

        super().save(
            *args,
            **kwargs,
        )

        if self.sales_return_id:
            self.sales_return.recalculate_totals(
                save=True
            )

    def delete(self, *args, **kwargs):
        """
        Delete lines only while return is draft.
        """
        sales_return = self.sales_return

        if not sales_return.can_be_edited:
            raise ValidationError(
                {
                    "sales_return":
                    "Only draft sales returns "
                    "can be modified."
                }
            )

        result = super().delete(
            *args,
            **kwargs,
        )

        if sales_return.pk:
            sales_return.recalculate_totals(
                save=True
            )

        return result


# End Phase 21.4.1 - Sales Returns Models Foundation
# ============================================================


# ============================================================
# Phase 21.5.1 - Sales Credit Notes Models Foundation
# ------------------------------------------------------------
# Company-scoped credit note header and lines.
# One credit note may be created from one confirmed sales return.
# Commercial values are copied from the return snapshots.
# Accounting posting remains inside the service layer.
# ============================================================


class SalesCreditNoteStatus(models.TextChoices):
    """
    Sales credit note lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    ISSUED = "ISSUED", "Issued"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class SalesCreditNote(models.Model):
    """
    Company-scoped sales credit note.

    The document references one issued sales invoice and may reference
    one confirmed sales return. Accounting effects are handled later
    through sales services.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_credit_notes",
        db_index=True,
        verbose_name="Company",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="sales_credit_notes",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )

    customer = models.ForeignKey(
        BusinessParty,
        on_delete=models.SET_NULL,
        related_name="sales_credit_notes",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Customer",
    )

    invoice = models.ForeignKey(
        SalesInvoice,
        on_delete=models.PROTECT,
        related_name="credit_notes",
        db_index=True,
        verbose_name="Sales invoice",
    )

    sales_return = models.OneToOneField(
        SalesReturn,
        on_delete=models.PROTECT,
        related_name="credit_note",
        blank=True,
        null=True,
        verbose_name="Sales return",
        help_text=(
            "Optional in draft. A sales return can create "
            "only one credit note."
        ),
    )

    credit_note_number = models.CharField(
        max_length=60,
        db_index=True,
        verbose_name="Credit note number",
        help_text="Unique inside the same company.",
    )

    status = models.CharField(
        max_length=20,
        choices=SalesCreditNoteStatus.choices,
        default=SalesCreditNoteStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    credit_note_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Credit note date",
    )

    issued_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Issued at",
    )

    posted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Posted at",
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

    currency_code = models.CharField(
        max_length=10,
        default="SAR",
        verbose_name="Currency code",
    )

    customer_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Customer snapshot",
    )

    invoice_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Invoice snapshot",
    )

    return_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Sales return snapshot",
    )

    tax_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Tax snapshot",
    )

    public_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Public notes",
    )

    internal_notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Internal notes",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_sales_credit_notes",
        blank=True,
        null=True,
        verbose_name="Created by",
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_sales_credit_notes",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )

    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="issued_sales_credit_notes",
        blank=True,
        null=True,
        verbose_name="Issued by",
    )

    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_sales_credit_notes",
        blank=True,
        null=True,
        verbose_name="Posted by",
    )

    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_sales_credit_notes",
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
        verbose_name = "Sales Credit Note"
        verbose_name_plural = "Sales Credit Notes"
        ordering = [
            "-credit_note_date",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "credit_note_number",
                ],
                condition=~Q(
                    credit_note_number=""
                ),
                name=(
                    "unique_sales_credit_note_number_per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"]
            ),
            models.Index(
                fields=[
                    "company",
                    "credit_note_date",
                ]
            ),
            models.Index(
                fields=["company", "invoice"]
            ),
            models.Index(
                fields=["company", "customer"]
            ),
            models.Index(
                fields=["company", "branch"]
            ),
            models.Index(
                fields=["company", "created_at"]
            ),
            models.Index(
                fields=["credit_note_number"]
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.credit_note_number or 'Draft credit note'}"
            f" - {self.company.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return (
            self.status
            == SalesCreditNoteStatus.DRAFT
        )

    @property
    def is_issued(self) -> bool:
        return (
            self.status
            == SalesCreditNoteStatus.ISSUED
        )

    @property
    def is_posted(self) -> bool:
        return (
            self.status
            == SalesCreditNoteStatus.POSTED
        )

    @property
    def is_cancelled(self) -> bool:
        return (
            self.status
            == SalesCreditNoteStatus.CANCELLED
        )

    @property
    def can_be_edited(self) -> bool:
        return self.is_draft

    @property
    def can_be_issued(self) -> bool:
        return self.is_draft

    @property
    def can_be_posted(self) -> bool:
        return self.is_issued

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            SalesCreditNoteStatus.DRAFT,
            SalesCreditNoteStatus.ISSUED,
        ]

    def clean(self) -> None:
        """
        Validate company isolation, source documents, dates, and totals.
        """
        super().clean()

        self.credit_note_number = (
            self.credit_note_number or ""
        ).strip()
        self.currency_code = (
            self.currency_code or "SAR"
        ).strip().upper()
        self.cancelled_reason = (
            self.cancelled_reason or ""
        ).strip()
        self.public_notes = (
            self.public_notes or ""
        ).strip()
        self.internal_notes = (
            self.internal_notes or ""
        ).strip()

        self.subtotal = quantize_money(
            self.subtotal
        )
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.taxable_amount = quantize_money(
            self.taxable_amount
        )
        self.tax_amount = quantize_money(
            self.tax_amount
        )
        self.total_amount = quantize_money(
            self.total_amount
        )

        if self.invoice_id and self.company_id:
            if (
                self.invoice.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "invoice":
                        "Sales invoice must belong "
                        "to the same company."
                    }
                )

            if (
                self.invoice.status
                != SalesInvoiceStatus.ISSUED
            ):
                raise ValidationError(
                    {
                        "invoice":
                        "Only issued sales invoices "
                        "can receive credit notes."
                    }
                )

            if (
                self.credit_note_date
                and self.invoice.invoice_date
                and self.credit_note_date
                < self.invoice.invoice_date
            ):
                raise ValidationError(
                    {
                        "credit_note_date":
                        "Credit note date cannot be before "
                        "invoice date."
                    }
                )

            if (
                self.customer_id
                and self.invoice.customer_id
                and self.customer_id
                != self.invoice.customer_id
            ):
                raise ValidationError(
                    {
                        "customer":
                        "Credit note customer must match "
                        "invoice customer."
                    }
                )

            if (
                self.branch_id
                and self.invoice.branch_id
                and self.branch_id
                != self.invoice.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                        "Credit note branch must match "
                        "invoice branch."
                    }
                )

            if (
                self.currency_code
                != self.invoice.currency_code
            ):
                raise ValidationError(
                    {
                        "currency_code":
                        "Credit note currency must match "
                        "invoice currency."
                    }
                )

        if self.sales_return_id:
            if (
                self.sales_return.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "sales_return":
                        "Sales return must belong "
                        "to the same company."
                    }
                )

            if (
                self.sales_return.invoice_id
                != self.invoice_id
            ):
                raise ValidationError(
                    {
                        "sales_return":
                        "Sales return must belong "
                        "to the selected invoice."
                    }
                )

            if self.sales_return.status not in [
                SalesReturnStatus.CONFIRMED,
                SalesReturnStatus.POSTED,
            ]:
                raise ValidationError(
                    {
                        "sales_return":
                        "Only confirmed or posted returns "
                        "can create credit notes."
                    }
                )

            if (
                self.credit_note_date
                and self.sales_return.return_date
                and self.credit_note_date
                < self.sales_return.return_date
            ):
                raise ValidationError(
                    {
                        "credit_note_date":
                        "Credit note date cannot be before "
                        "sales return date."
                    }
                )

        if (
            self.branch_id
            and self.branch.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "branch":
                    "Selected branch does not belong "
                    "to this company."
                }
            )

        if (
            self.customer_id
            and self.customer.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "customer":
                    "Selected customer does not belong "
                    "to this company."
                }
            )

        if (
            self.discount_amount
            > self.subtotal
        ):
            raise ValidationError(
                {
                    "discount_amount":
                    "Discount cannot be greater "
                    "than subtotal."
                }
            )

        self.total_amount = quantize_money(
            self.subtotal
            - self.discount_amount
            + self.tax_amount
        )

    def build_customer_snapshot(self) -> dict:
        """
        Copy customer snapshot from return or invoice.
        """
        if self.sales_return_id:
            return dict(
                self.sales_return.customer_snapshot
                or {}
            )

        if self.invoice_id:
            return dict(
                self.invoice.customer_snapshot
                or {}
            )

        return {}

    def build_invoice_snapshot(self) -> dict:
        """
        Copy invoice identity and amount snapshot.
        """
        if not self.invoice_id:
            return {}

        return {
            "id": self.invoice_id,
            "invoice_number":
                self.invoice.invoice_number,
            "invoice_date": (
                self.invoice.invoice_date.isoformat()
                if self.invoice.invoice_date
                else None
            ),
            "status": self.invoice.status,
            "payment_status":
                self.invoice.payment_status,
            "subtotal": str(
                self.invoice.subtotal
            ),
            "discount_amount": str(
                self.invoice.discount_amount
            ),
            "taxable_amount": str(
                self.invoice.taxable_amount
            ),
            "tax_amount": str(
                self.invoice.tax_amount
            ),
            "total_amount": str(
                self.invoice.total_amount
            ),
            "paid_amount": str(
                self.invoice.paid_amount
            ),
            "balance_due": str(
                self.invoice.balance_due
            ),
            "currency_code":
                self.invoice.currency_code,
        }

    def build_return_snapshot(self) -> dict:
        """
        Copy sales return identity and totals.
        """
        if not self.sales_return_id:
            return {}

        return {
            "id": self.sales_return_id,
            "return_number":
                self.sales_return.return_number,
            "return_date": (
                self.sales_return.return_date.isoformat()
                if self.sales_return.return_date
                else None
            ),
            "status": self.sales_return.status,
            "reason": self.sales_return.reason,
            "reason_details":
                self.sales_return.reason_details,
            "subtotal": str(
                self.sales_return.subtotal
            ),
            "discount_amount": str(
                self.sales_return.discount_amount
            ),
            "taxable_amount": str(
                self.sales_return.taxable_amount
            ),
            "tax_amount": str(
                self.sales_return.tax_amount
            ),
            "total_amount": str(
                self.sales_return.total_amount
            ),
            "currency_code":
                self.sales_return.currency_code,
        }

    def refresh_snapshots(
        self,
        save: bool = True,
    ) -> None:
        """
        Refresh historical snapshots.
        """
        self.customer_snapshot = (
            self.build_customer_snapshot()
        )
        self.invoice_snapshot = (
            self.build_invoice_snapshot()
        )
        self.return_snapshot = (
            self.build_return_snapshot()
        )
        self.tax_snapshot = (
            dict(
                self.sales_return.tax_snapshot
                or {}
            )
            if self.sales_return_id
            else dict(
                self.invoice.tax_snapshot
                or {}
            )
            if self.invoice_id
            else {}
        )

        if save and self.pk:
            self.save(
                update_fields=[
                    "customer_snapshot",
                    "invoice_snapshot",
                    "return_snapshot",
                    "tax_snapshot",
                    "updated_at",
                ]
            )

    def recalculate_totals(
        self,
        save: bool = True,
    ) -> None:
        """
        Recalculate credit note totals from lines.
        """
        if not self.pk:
            return

        totals = self.items.aggregate(
            subtotal=Sum("line_subtotal"),
            discount_amount=Sum(
                "discount_amount"
            ),
            taxable_amount=Sum(
                "taxable_amount"
            ),
            tax_amount=Sum("tax_amount"),
            total_amount=Sum("line_total"),
        )

        self.subtotal = quantize_money(
            totals.get("subtotal")
            or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals.get("discount_amount")
            or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals.get("taxable_amount")
            or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals.get("tax_amount")
            or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals.get("total_amount")
            or MONEY_ZERO
        )

        if save:
            self.save(
                update_fields=[
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def validate_items_for_issue(self) -> None:
        """
        Validate credit note lines before issuing.
        """
        if (
            not self.pk
            or not self.items.exists()
        ):
            raise ValidationError(
                {
                    "items":
                    "Credit note cannot be issued "
                    "without items."
                }
            )

        for item in self.items.select_related(
            "sales_return_item",
            "invoice_item",
            "catalog_item",
        ):
            item.full_clean()

        self.recalculate_totals(
            save=False
        )

        if self.total_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "total_amount":
                    "Credit note total must "
                    "be greater than zero."
                }
            )

        if (
            self.sales_return_id
            and self.total_amount
            != quantize_money(
                self.sales_return.total_amount
            )
        ):
            raise ValidationError(
                {
                    "total_amount":
                    "Credit note total must match "
                    "sales return total."
                }
            )

    def issue(self, user=None) -> None:
        """
        Issue a draft credit note.
        """
        if not self.can_be_issued:
            raise ValidationError(
                {
                    "status":
                    "Only draft credit notes "
                    "can be issued."
                }
            )

        self.validate_items_for_issue()

        self.status = (
            SalesCreditNoteStatus.ISSUED
        )
        self.issued_at = timezone.now()
        self.refresh_snapshots(
            save=False
        )

        if user:
            self.issued_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "issued_at",
            "subtotal",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total_amount",
            "customer_snapshot",
            "invoice_snapshot",
            "return_snapshot",
            "tax_snapshot",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "issued_by",
                "updated_by",
            ])

        self.save(
            update_fields=update_fields
        )

    def mark_posted(self, user=None) -> None:
        """
        Mark an issued credit note as posted.
        """
        if not self.can_be_posted:
            raise ValidationError(
                {
                    "status":
                    "Only issued credit notes "
                    "can be posted."
                }
            )

        self.status = (
            SalesCreditNoteStatus.POSTED
        )
        self.posted_at = timezone.now()

        if user:
            self.posted_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "posted_at",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "posted_by",
                "updated_by",
            ])

        self.save(
            update_fields=update_fields
        )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        """
        Cancel a draft or issued credit note.

        Posted credit notes require a reversal flow.
        """
        if not self.can_be_cancelled:
            raise ValidationError(
                {
                    "status":
                    "Posted or already cancelled "
                    "credit notes cannot be cancelled directly."
                }
            )

        self.status = (
            SalesCreditNoteStatus.CANCELLED
        )
        self.cancelled_at = timezone.now()
        self.cancelled_reason = (
            reason or ""
        ).strip()

        if user:
            self.cancelled_by = user
            self.updated_by = user

        self.full_clean()

        update_fields = [
            "status",
            "cancelled_at",
            "cancelled_reason",
            "updated_at",
        ]

        if user:
            update_fields.extend([
                "cancelled_by",
                "updated_by",
            ])

        self.save(
            update_fields=update_fields
        )


class SalesCreditNoteItem(models.Model):
    """
    Credit note line copied from one sales return item.
    """

    credit_note = models.ForeignKey(
        SalesCreditNote,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Credit note",
    )

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="sales_credit_note_items",
        db_index=True,
        verbose_name="Company",
    )

    sales_return_item = models.OneToOneField(
        SalesReturnItem,
        on_delete=models.PROTECT,
        related_name="credit_note_item",
        verbose_name="Sales return item",
    )

    invoice_item = models.ForeignKey(
        SalesInvoiceItem,
        on_delete=models.PROTECT,
        related_name="credit_note_items",
        db_index=True,
        verbose_name="Invoice item",
    )

    catalog_item = models.ForeignKey(
        CatalogItem,
        on_delete=models.SET_NULL,
        related_name="sales_credit_note_items",
        blank=True,
        null=True,
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
        blank=True,
        default="",
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
        validators=[
            MinValueValidator(
                Decimal("0.0001")
            )
        ],
        verbose_name="Quantity",
    )

    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Unit price",
    )

    line_subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Line subtotal",
    )

    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
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
        validators=[
            MinValueValidator(TAX_ZERO)
        ],
        verbose_name="Tax rate",
    )

    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Taxable amount",
    )

    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Tax amount",
    )

    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[
            MinValueValidator(MONEY_ZERO)
        ],
        verbose_name="Line total",
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
        verbose_name = "Sales Credit Note Item"
        verbose_name_plural = (
            "Sales Credit Note Items"
        )
        ordering = [
            "credit_note_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "credit_note",
                    "line_number",
                ],
                name=(
                    "unique_sales_credit_note_line_number"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "company",
                    "credit_note",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "invoice_item",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "catalog_item",
                ]
            ),
            models.Index(
                fields=[
                    "credit_note",
                    "line_number",
                ]
            ),
            models.Index(
                fields=[
                    "company",
                    "created_at",
                ]
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.credit_note.credit_note_number}"
            f" - {self.item_name_snapshot}"
        )

    def apply_sales_return_item_snapshot(
        self,
    ) -> None:
        """
        Copy immutable commercial values from the return item.
        """
        if not self.sales_return_item_id:
            return

        source_item = self.sales_return_item

        self.invoice_item = (
            source_item.invoice_item
        )
        self.catalog_item = (
            source_item.catalog_item
        )
        self.item_code_snapshot = (
            source_item.item_code_snapshot
        )
        self.item_name_snapshot = (
            source_item.item_name_snapshot
        )
        self.item_description_snapshot = (
            source_item.item_description_snapshot
        )
        self.unit_name_snapshot = (
            source_item.unit_name_snapshot
        )
        self.quantity = quantize_quantity(
            source_item.quantity
        )
        self.unit_price = quantize_money(
            source_item.unit_price
        )
        self.line_subtotal = quantize_money(
            source_item.line_subtotal
        )
        self.discount_amount = quantize_money(
            source_item.discount_amount
        )
        self.taxable = bool(
            source_item.taxable
        )
        self.tax_rate = quantize_money(
            source_item.tax_rate
        )
        self.taxable_amount = quantize_money(
            source_item.taxable_amount
        )
        self.tax_amount = quantize_money(
            source_item.tax_amount
        )
        self.line_total = quantize_money(
            source_item.line_total
        )
        self.notes = (
            source_item.notes or ""
        ).strip()
        self.extra_data = dict(
            source_item.extra_data or {}
        )

    def clean(self) -> None:
        """
        Validate tenant consistency and snapshot equality.
        """
        super().clean()

        self.item_code_snapshot = (
            self.item_code_snapshot or ""
        ).strip()
        self.item_name_snapshot = (
            self.item_name_snapshot or ""
        ).strip()
        self.item_description_snapshot = (
            self.item_description_snapshot
            or ""
        ).strip()
        self.unit_name_snapshot = (
            self.unit_name_snapshot or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        if (
            self.credit_note_id
            and self.company_id
            and self.credit_note.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "company":
                    "Credit note item company must "
                    "match credit note company."
                }
            )

        if (
            self.credit_note_id
            and not self.credit_note.can_be_edited
        ):
            existing_item = (
                type(self).objects
                .filter(pk=self.pk)
                .first()
                if self.pk
                else None
            )

            if not existing_item:
                raise ValidationError(
                    {
                        "credit_note":
                        "Only draft credit notes "
                        "can be modified."
                    }
                )

            protected_fields = [
                "sales_return_item_id",
                "invoice_item_id",
                "catalog_item_id",
                "line_number",
                "quantity",
                "unit_price",
                "line_subtotal",
                "discount_amount",
                "taxable",
                "tax_rate",
                "taxable_amount",
                "tax_amount",
                "line_total",
                "notes",
                "extra_data",
            ]

            for field_name in protected_fields:
                if (
                    getattr(
                        existing_item,
                        field_name,
                    )
                    != getattr(
                        self,
                        field_name,
                    )
                ):
                    raise ValidationError(
                        {
                            "credit_note":
                            "Only draft credit notes "
                            "can be modified."
                        }
                    )

        if self.sales_return_item_id:
            source_item = (
                self.sales_return_item
            )

            if (
                source_item.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "sales_return_item":
                        "Sales return item must belong "
                        "to the same company."
                    }
                )

            if (
                self.credit_note.sales_return_id
                != source_item.sales_return_id
            ):
                raise ValidationError(
                    {
                        "sales_return_item":
                        "Sales return item must belong "
                        "to credit note return."
                    }
                )

            if (
                source_item.sales_return.status
                not in [
                    SalesReturnStatus.CONFIRMED,
                    SalesReturnStatus.POSTED,
                ]
            ):
                raise ValidationError(
                    {
                        "sales_return_item":
                        "Only confirmed or posted return "
                        "items can create credit note lines."
                    }
                )

        if (
            self.invoice_item_id
            and self.invoice_item.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "invoice_item":
                    "Invoice item must belong "
                    "to the same company."
                }
            )

        if (
            self.credit_note_id
            and self.invoice_item_id
            and self.invoice_item.invoice_id
            != self.credit_note.invoice_id
        ):
            raise ValidationError(
                {
                    "invoice_item":
                    "Invoice item must belong "
                    "to credit note invoice."
                }
            )

        if (
            self.catalog_item_id
            and self.catalog_item.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "catalog_item":
                    "Catalog item must belong "
                    "to the same company."
                }
            )

        if self.sales_return_item_id:
            expected = (
                self.sales_return_item
            )

            expected_values = {
                "invoice_item_id":
                    expected.invoice_item_id,
                "catalog_item_id":
                    expected.catalog_item_id,
                "quantity":
                    quantize_quantity(
                        expected.quantity
                    ),
                "unit_price":
                    quantize_money(
                        expected.unit_price
                    ),
                "line_subtotal":
                    quantize_money(
                        expected.line_subtotal
                    ),
                "discount_amount":
                    quantize_money(
                        expected.discount_amount
                    ),
                "taxable":
                    bool(expected.taxable),
                "tax_rate":
                    quantize_money(
                        expected.tax_rate
                    ),
                "taxable_amount":
                    quantize_money(
                        expected.taxable_amount
                    ),
                "tax_amount":
                    quantize_money(
                        expected.tax_amount
                    ),
                "line_total":
                    quantize_money(
                        expected.line_total
                    ),
            }

            for (
                field_name,
                expected_value,
            ) in expected_values.items():
                if (
                    getattr(
                        self,
                        field_name,
                    )
                    != expected_value
                ):
                    raise ValidationError(
                        {
                            field_name:
                            "Credit note line must match "
                            "the sales return item."
                        }
                    )

        if not self.item_name_snapshot:
            if self.sales_return_item_id:
                self.apply_sales_return_item_snapshot()
            else:
                raise ValidationError(
                    {
                        "item_name_snapshot":
                        "Item name is required."
                    }
                )

    def save(self, *args, **kwargs):
        """
        Validate and refresh credit note totals.
        """
        if (
            self.credit_note_id
            and not self.company_id
        ):
            self.company_id = (
                self.credit_note.company_id
            )

        if self.sales_return_item_id:
            self.apply_sales_return_item_snapshot()

        self.full_clean()

        super().save(
            *args,
            **kwargs,
        )

        if self.credit_note_id:
            self.credit_note.recalculate_totals(
                save=True
            )

    def delete(self, *args, **kwargs):
        """
        Delete lines only while credit note is draft.
        """
        credit_note = self.credit_note

        if not credit_note.can_be_edited:
            raise ValidationError(
                {
                    "credit_note":
                    "Only draft credit notes "
                    "can be modified."
                }
            )

        result = super().delete(
            *args,
            **kwargs,
        )

        if credit_note.pk:
            credit_note.recalculate_totals(
                save=True
            )

        return result


# End Phase 21.5.1 - Sales Credit Notes Models Foundation
# ============================================================

