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
from django.db.models import Q, Sum
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


# ============================================================
# Purchase Requests Foundation
# ============================================================


class PurchaseRequestStatus(models.TextChoices):
    """
    Internal purchase request lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    PARTIALLY_CONVERTED = (
        "PARTIALLY_CONVERTED",
        "Partially converted",
    )
    CONVERTED = "CONVERTED", "Converted"
    CANCELLED = "CANCELLED", "Cancelled"


class PurchaseRequest(models.Model):
    """
    Company-scoped internal purchase request.

    Request approval and conversion to purchase orders are
    handled in the purchases service layer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_requests",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="purchase_requests",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )

    request_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Request number",
    )
    request_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Request date",
    )
    required_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Required date",
    )
    status = models.CharField(
        max_length=30,
        choices=PurchaseRequestStatus.choices,
        default=PurchaseRequestStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )
    priority = models.CharField(
        max_length=20,
        choices=[
            ("LOW", "Low"),
            ("NORMAL", "Normal"),
            ("HIGH", "High"),
            ("URGENT", "Urgent"),
        ],
        default="NORMAL",
        db_index=True,
        verbose_name="Priority",
    )
    purpose = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Purpose",
    )

    submitted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Submitted at",
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="submitted_purchase_requests",
        blank=True,
        null=True,
        verbose_name="Submitted by",
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Approved at",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_purchase_requests",
        blank=True,
        null=True,
        verbose_name="Approved by",
    )
    rejected_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Rejected at",
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="rejected_purchase_requests",
        blank=True,
        null=True,
        verbose_name="Rejected by",
    )
    rejection_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Rejection reason",
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
        related_name="cancelled_purchase_requests",
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
        related_name="created_purchase_requests",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_purchase_requests",
        blank=True,
        null=True,
        verbose_name="Updated by",
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
        verbose_name = "Purchase request"
        verbose_name_plural = "Purchase requests"
        ordering = [
            "-request_date",
            "-created_at",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "request_number"],
                name=(
                    "unique_purchase_request_number_"
                    "per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"],
            ),
            models.Index(
                fields=["company", "request_date"],
            ),
            models.Index(
                fields=["company", "required_date"],
            ),
            models.Index(
                fields=["company", "branch"],
            ),
            models.Index(
                fields=["company", "priority"],
            ),
        ]

    def __str__(self) -> str:
        return self.request_number

    @property
    def is_draft(self) -> bool:
        return self.status == PurchaseRequestStatus.DRAFT

    @property
    def is_submitted(self) -> bool:
        return self.status == PurchaseRequestStatus.SUBMITTED

    @property
    def is_approved(self) -> bool:
        return self.status in [
            PurchaseRequestStatus.APPROVED,
            PurchaseRequestStatus.PARTIALLY_CONVERTED,
        ]

    @property
    def can_be_edited(self) -> bool:
        return self.is_draft

    @property
    def can_be_submitted(self) -> bool:
        return self.is_draft

    @property
    def can_be_approved(self) -> bool:
        return self.is_submitted

    @property
    def can_be_rejected(self) -> bool:
        return self.is_submitted

    @property
    def can_be_converted(self) -> bool:
        return self.status in [
            PurchaseRequestStatus.APPROVED,
            PurchaseRequestStatus.PARTIALLY_CONVERTED,
        ]

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            PurchaseRequestStatus.DRAFT,
            PurchaseRequestStatus.SUBMITTED,
            PurchaseRequestStatus.APPROVED,
        ]

    @property
    def requested_quantity(self) -> Decimal:
        result = (
            self.items
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def converted_quantity(self) -> Decimal:
        total = QUANTITY_ZERO

        for item in self.items.all():
            total += item.converted_quantity

        return quantize_quantity(total)

    @property
    def remaining_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.requested_quantity
            - self.converted_quantity
        )

        return max(
            remaining,
            QUANTITY_ZERO,
        )

    def clean(self) -> None:
        super().clean()

        self.request_number = (
            self.request_number or ""
        ).strip()
        self.purpose = (
            self.purpose or ""
        ).strip()
        self.rejection_reason = (
            self.rejection_reason or ""
        ).strip()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        if not self.request_number:
            raise ValidationError(
                {
                    "request_number":
                        "Purchase request number is required."
                }
            )

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                            "Branch does not belong "
                            "to this company."
                    }
                )

        if (
            self.required_date
            and self.request_date
            and self.required_date < self.request_date
        ):
            raise ValidationError(
                {
                    "required_date":
                        "Required date cannot be before "
                        "request date."
                }
            )

    def submit(self, user=None) -> None:
        if not self.can_be_submitted:
            raise ValidationError(
                "Only draft purchase requests can be submitted."
            )

        if not self.items.exists():
            raise ValidationError(
                "Cannot submit a purchase request without items."
            )

        self.status = PurchaseRequestStatus.SUBMITTED
        self.submitted_at = timezone.now()

        if user:
            self.submitted_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "submitted_at",
                "submitted_by",
                "updated_by",
                "updated_at",
            ]
        )

    def approve(self, user=None) -> None:
        if not self.can_be_approved:
            raise ValidationError(
                "Only submitted purchase requests can be approved."
            )

        self.status = PurchaseRequestStatus.APPROVED
        self.approved_at = timezone.now()

        if user:
            self.approved_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "updated_by",
                "updated_at",
            ]
        )

    def reject(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        if not self.can_be_rejected:
            raise ValidationError(
                "Only submitted purchase requests can be rejected."
            )

        reason = (reason or "").strip()

        if not reason:
            raise ValidationError(
                {
                    "rejection_reason":
                        "Rejection reason is required."
                }
            )

        self.status = PurchaseRequestStatus.REJECTED
        self.rejected_at = timezone.now()
        self.rejection_reason = reason

        if user:
            self.rejected_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "rejected_at",
                "rejected_by",
                "rejection_reason",
                "updated_by",
                "updated_at",
            ]
        )

    def refresh_conversion_status(
        self,
        *,
        save: bool = True,
    ) -> None:
        if self.status in [
            PurchaseRequestStatus.DRAFT,
            PurchaseRequestStatus.SUBMITTED,
            PurchaseRequestStatus.REJECTED,
            PurchaseRequestStatus.CANCELLED,
        ]:
            return

        requested = self.requested_quantity
        converted = self.converted_quantity

        if (
            requested > QUANTITY_ZERO
            and converted >= requested
        ):
            new_status = PurchaseRequestStatus.CONVERTED
        elif converted > QUANTITY_ZERO:
            new_status = (
                PurchaseRequestStatus.PARTIALLY_CONVERTED
            )
        else:
            new_status = PurchaseRequestStatus.APPROVED

        self.status = new_status

        if save:
            self.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        if not self.can_be_cancelled:
            raise ValidationError(
                "This purchase request cannot be cancelled."
            )

        if self.converted_quantity > QUANTITY_ZERO:
            raise ValidationError(
                "Converted purchase requests cannot be "
                "cancelled directly."
            )

        self.status = PurchaseRequestStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancellation_reason = (
            reason or ""
        ).strip()

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


class PurchaseRequestItem(models.Model):
    """
    Purchase request line with catalog snapshot.
    """

    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Purchase request",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_request_items",
        db_index=True,
        verbose_name="Company",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="purchase_request_items",
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
    )
    item_name_snapshot = models.CharField(
        max_length=255,
    )
    item_name_ar_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    item_name_en_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    unit_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
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
    suggested_unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Suggested unit price",
    )
    notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "request_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["request", "line_number"],
                name=(
                    "unique_purchase_request_item_line"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "item"],
            ),
            models.Index(
                fields=["request", "line_number"],
            ),
            models.Index(
                fields=["company", "created_at"],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.request.request_number} - "
            f"{self.item_name_snapshot}"
        )

    @property
    def converted_quantity(self) -> Decimal:
        result = (
            self.purchase_order_items
            .exclude(
                order__status=PurchaseOrderStatus.CANCELLED,
            )
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def remaining_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.quantity - self.converted_quantity
        )

        return max(
            remaining,
            QUANTITY_ZERO,
        )

    def apply_item_snapshot(self) -> None:
        if not self.item_id:
            return

        self.item_code_snapshot = (
            self.item.code
            or self.item.sku
            or self.item.barcode
            or ""
        )
        self.item_name_snapshot = self.item.name
        self.item_name_ar_snapshot = (
            self.item.name_ar or ""
        )
        self.item_name_en_snapshot = (
            self.item.name_en or ""
        )
        self.unit_name_snapshot = (
            self.item.unit.name
            if self.item.unit_id
            else ""
        )

        if (
            not self.suggested_unit_price
            or self.suggested_unit_price == MONEY_ZERO
        ):
            self.suggested_unit_price = (
                self.item.purchase_price
                or self.item.cost_price
                or MONEY_ZERO
            )

    def clean(self) -> None:
        super().clean()

        if self.request_id and self.company_id:
            if self.request.company_id != self.company_id:
                raise ValidationError(
                    {
                        "company":
                            "Item company must match "
                            "purchase request company."
                    }
                )

        if self.request_id and not self.request.can_be_edited:
            raise ValidationError(
                "Cannot edit items for a submitted, approved, "
                "rejected, converted, or cancelled request."
            )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item does not belong "
                            "to this company."
                    }
                )

            if not self.item.is_purchasable:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item is not purchasable."
                    }
                )

        self.quantity = quantize_quantity(
            self.quantity
        )
        self.suggested_unit_price = quantize_money(
            self.suggested_unit_price
        )
        self.notes = (
            self.notes or ""
        ).strip()

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                        "Quantity must be greater than zero."
                }
            )

    def save(self, *args, **kwargs):
        if self.request_id and not self.company_id:
            self.company = self.request.company

        if self.item_id:
            self.apply_item_snapshot()

        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if not self.request.can_be_edited:
            raise ValidationError(
                "Cannot delete items from a non-draft "
                "purchase request."
            )

        return super().delete(*args, **kwargs)


# ============================================================
# Purchase Orders Foundation
# ============================================================


class PurchaseOrderStatus(models.TextChoices):
    """
    Purchase order lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    APPROVED = "APPROVED", "Approved"
    PARTIALLY_RECEIVED = (
        "PARTIALLY_RECEIVED",
        "Partially received",
    )
    RECEIVED = "RECEIVED", "Received"
    BILLED = "BILLED", "Billed"
    CANCELLED = "CANCELLED", "Cancelled"


class PurchaseOrder(models.Model):
    """
    Company-scoped purchase order issued to a supplier.

    Financial, receiving, and billing effects are handled
    in the purchases service layer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_orders",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="purchase_orders",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )
    supplier = models.ForeignKey(
        BusinessParty,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
        db_index=True,
        verbose_name="Supplier",
    )
    purchase_request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.PROTECT,
        related_name="purchase_orders",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Purchase request",
    )

    order_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Order number",
    )
    supplier_reference = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Supplier reference",
    )
    order_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Order date",
    )
    expected_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expected delivery date",
    )
    status = models.CharField(
        max_length=30,
        choices=PurchaseOrderStatus.choices,
        default=PurchaseOrderStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
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

    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Approved at",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="approved_purchase_orders",
        blank=True,
        null=True,
        verbose_name="Approved by",
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
        related_name="cancelled_purchase_orders",
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
        related_name="created_purchase_orders",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_purchase_orders",
        blank=True,
        null=True,
        verbose_name="Updated by",
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
        verbose_name = "Purchase order"
        verbose_name_plural = "Purchase orders"
        ordering = [
            "-order_date",
            "-created_at",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "order_number"],
                name=(
                    "unique_purchase_order_number_"
                    "per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"],
            ),
            models.Index(
                fields=["company", "order_date"],
            ),
            models.Index(
                fields=["company", "expected_date"],
            ),
            models.Index(
                fields=["company", "supplier"],
            ),
            models.Index(
                fields=["company", "branch"],
            ),
            models.Index(
                fields=["supplier", "status"],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.order_number} - "
            f"{self.supplier.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return self.status == PurchaseOrderStatus.DRAFT

    @property
    def is_approved(self) -> bool:
        return self.status == PurchaseOrderStatus.APPROVED

    @property
    def is_cancelled(self) -> bool:
        return self.status == PurchaseOrderStatus.CANCELLED

    @property
    def can_be_edited(self) -> bool:
        return self.is_draft

    @property
    def can_be_approved(self) -> bool:
        return self.is_draft

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            PurchaseOrderStatus.DRAFT,
            PurchaseOrderStatus.APPROVED,
            PurchaseOrderStatus.PARTIALLY_RECEIVED,
        ]

    @property
    def ordered_quantity(self) -> Decimal:
        result = (
            self.items
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def received_quantity(self) -> Decimal:
        total = QUANTITY_ZERO

        for item in self.items.all():
            total += item.received_quantity

        return quantize_quantity(total)

    @property
    def billed_quantity(self) -> Decimal:
        total = QUANTITY_ZERO

        for item in self.items.all():
            total += item.billed_quantity

        return quantize_quantity(total)

    def clean(self) -> None:
        super().clean()

        self.order_number = (
            self.order_number or ""
        ).strip()
        self.supplier_reference = (
            self.supplier_reference or ""
        ).strip()
        self.currency_code = (
            self.currency_code or "SAR"
        ).strip().upper()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        self.subtotal_amount = quantize_money(
            self.subtotal_amount
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

        if not self.order_number:
            raise ValidationError(
                {
                    "order_number":
                        "Purchase order number is required."
                }
            )

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                            "Branch does not belong "
                            "to this company."
                    }
                )

        if self.purchase_request_id:
            if (
                self.purchase_request.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "purchase_request":
                            "Purchase request does not belong "
                            "to this company."
                    }
                )

            if not self.purchase_request.can_be_converted:
                raise ValidationError(
                    {
                        "purchase_request":
                            "Purchase request is not eligible "
                            "for order conversion."
                    }
                )

        if self.supplier_id and self.company_id:
            if self.supplier.company_id != self.company_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier does not belong "
                            "to this company."
                    }
                )

            if self.supplier.party_type not in [
                BusinessPartyType.SUPPLIER,
                BusinessPartyType.BOTH,
            ]:
                raise ValidationError(
                    {
                        "supplier":
                            "Selected party is not a supplier."
                    }
                )

        if (
            self.expected_date
            and self.order_date
            and self.expected_date < self.order_date
        ):
            raise ValidationError(
                {
                    "expected_date":
                        "Expected date cannot be before "
                        "order date."
                }
            )

    def recalculate_totals(
        self,
        save: bool = True,
    ) -> None:
        totals = self.items.aggregate(
            subtotal=Sum("subtotal_amount"),
            discount=Sum("discount_amount"),
            taxable=Sum("taxable_amount"),
            tax=Sum("tax_amount"),
            total=Sum("total_amount"),
        )

        self.subtotal_amount = quantize_money(
            totals["subtotal"] or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals["discount"] or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals["taxable"] or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals["tax"] or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals["total"] or MONEY_ZERO
        )

        if save:
            self.full_clean()
            self.save(
                update_fields=[
                    "subtotal_amount",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def approve(self, user=None) -> None:
        if not self.can_be_approved:
            raise ValidationError(
                "Only draft purchase orders can be approved."
            )

        if not self.items.exists():
            raise ValidationError(
                "Cannot approve a purchase order without items."
            )

        self.recalculate_totals(save=False)
        self.status = PurchaseOrderStatus.APPROVED
        self.approved_at = timezone.now()

        if user:
            self.approved_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "updated_by",
                "subtotal_amount",
                "discount_amount",
                "taxable_amount",
                "tax_amount",
                "total_amount",
                "updated_at",
            ]
        )

    def refresh_fulfillment_status(
        self,
        *,
        save: bool = True,
    ) -> None:
        if self.is_cancelled or self.is_draft:
            return

        ordered = self.ordered_quantity
        received = self.received_quantity
        billed = self.billed_quantity

        if ordered > QUANTITY_ZERO and billed >= ordered:
            new_status = PurchaseOrderStatus.BILLED
        elif (
            ordered > QUANTITY_ZERO
            and received >= ordered
        ):
            new_status = PurchaseOrderStatus.RECEIVED
        elif received > QUANTITY_ZERO:
            new_status = (
                PurchaseOrderStatus.PARTIALLY_RECEIVED
            )
        else:
            new_status = PurchaseOrderStatus.APPROVED

        self.status = new_status

        if save:
            self.save(
                update_fields=[
                    "status",
                    "updated_at",
                ]
            )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        if not self.can_be_cancelled:
            raise ValidationError(
                "This purchase order cannot be cancelled."
            )

        if (
            self.received_quantity > QUANTITY_ZERO
            or self.billed_quantity > QUANTITY_ZERO
        ):
            raise ValidationError(
                "Purchase orders with received or billed "
                "quantities cannot be cancelled directly."
            )

        self.status = PurchaseOrderStatus.CANCELLED
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


class PurchaseOrderItem(models.Model):
    """
    Purchase order line with catalog snapshots and totals.
    """

    order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Purchase order",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_order_items",
        db_index=True,
        verbose_name="Company",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="purchase_order_items",
        db_index=True,
        verbose_name="Catalog item",
    )
    purchase_request_item = models.ForeignKey(
        PurchaseRequestItem,
        on_delete=models.PROTECT,
        related_name="purchase_order_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Purchase request item",
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
    )
    item_name_snapshot = models.CharField(
        max_length=255,
    )
    item_name_ar_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    item_name_en_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    unit_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        default=Decimal("1.0000"),
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    taxable = models.BooleanField(
        default=True,
        db_index=True,
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        validators=[MinValueValidator(MONEY_ZERO)],
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "order_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["order", "line_number"],
                name=(
                    "unique_purchase_order_item_line"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "item"],
            ),
            models.Index(
                fields=["order", "line_number"],
            ),
            models.Index(
                fields=["company", "created_at"],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.order.order_number} - "
            f"{self.item_name_snapshot}"
        )

    @property
    def billed_quantity(self) -> Decimal:
        result = (
            self.purchase_bill_items
            .filter(
                bill__status="POSTED",
            )
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def received_quantity(self) -> Decimal:
        result = (
            self.purchase_bill_items
            .filter(
                purchase_receipt_items__receipt__status=(
                    "POSTED"
                ),
            )
            .aggregate(
                total=Sum(
                    "purchase_receipt_items__quantity"
                )
            )
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def remaining_to_bill_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.quantity - self.billed_quantity
        )

        return max(
            remaining,
            QUANTITY_ZERO,
        )

    @property
    def remaining_to_receive_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.quantity - self.received_quantity
        )

        return max(
            remaining,
            QUANTITY_ZERO,
        )

    def apply_item_snapshot(self) -> None:
        if not self.item_id:
            return

        self.item_code_snapshot = (
            self.item.code
            or self.item.sku
            or self.item.barcode
            or ""
        )
        self.item_name_snapshot = self.item.name
        self.item_name_ar_snapshot = (
            self.item.name_ar or ""
        )
        self.item_name_en_snapshot = (
            self.item.name_en or ""
        )
        self.unit_name_snapshot = (
            self.item.unit.name
            if self.item.unit_id
            else ""
        )

        if (
            not self.unit_price
            or self.unit_price == MONEY_ZERO
        ):
            self.unit_price = (
                self.item.purchase_price
                or self.item.cost_price
                or MONEY_ZERO
            )

        self.taxable = bool(self.item.taxable)
        self.tax_rate = (
            self.item.tax_rate or MONEY_ZERO
        )

    def calculate_totals(self) -> None:
        self.quantity = quantize_quantity(
            self.quantity
        )
        self.unit_price = quantize_money(
            self.unit_price
        )
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.tax_rate = quantize_money(
            self.tax_rate
        )

        subtotal = quantize_money(
            self.quantity * self.unit_price
        )

        if self.discount_amount > subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                        "Discount cannot exceed subtotal."
                }
            )

        taxable_amount = quantize_money(
            subtotal - self.discount_amount
        )

        tax_amount = MONEY_ZERO
        if self.taxable:
            tax_amount = quantize_money(
                taxable_amount
                * self.tax_rate
                / Decimal("100.00")
            )

        self.subtotal_amount = subtotal
        self.taxable_amount = taxable_amount
        self.tax_amount = tax_amount
        self.total_amount = quantize_money(
            taxable_amount + tax_amount
        )

    def clean(self) -> None:
        super().clean()

        if self.order_id and self.company_id:
            if self.order.company_id != self.company_id:
                raise ValidationError(
                    {
                        "company":
                            "Item company must match "
                            "purchase order company."
                    }
                )

        if self.order_id and not self.order.can_be_edited:
            raise ValidationError(
                "Cannot edit items for an approved "
                "or cancelled purchase order."
            )

        if self.purchase_request_item_id:
            source = self.purchase_request_item

            if source.company_id != self.company_id:
                raise ValidationError(
                    {
                        "purchase_request_item":
                            "Purchase request item does not "
                            "belong to this company."
                    }
                )

            if (
                self.order_id
                and not self.order.purchase_request_id
            ):
                raise ValidationError(
                    {
                        "purchase_request_item":
                            "Purchase order must reference "
                            "the source purchase request."
                    }
                )

            if (
                self.order_id
                and self.order.purchase_request_id
                != source.request_id
            ):
                raise ValidationError(
                    {
                        "purchase_request_item":
                            "Purchase request item must belong "
                            "to the order purchase request."
                    }
                )

            if self.item_id != source.item_id:
                raise ValidationError(
                    {
                        "purchase_request_item":
                            "Purchase order item must match "
                            "the request catalog item."
                    }
                )

            available = source.remaining_quantity
            existing_quantity = QUANTITY_ZERO

            if self.pk:
                existing = (
                    PurchaseOrderItem.objects
                    .filter(pk=self.pk)
                    .values_list(
                        "quantity",
                        flat=True,
                    )
                    .first()
                )
                existing_quantity = quantize_quantity(
                    existing or QUANTITY_ZERO
                )

            allowed_quantity = quantize_quantity(
                available + existing_quantity
            )

            if self.quantity > allowed_quantity:
                raise ValidationError(
                    {
                        "quantity":
                            "Purchase order quantity cannot "
                            "exceed the remaining request "
                            "quantity."
                    }
                )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item does not belong "
                            "to this company."
                    }
                )

            if not self.item.is_purchasable:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item is not purchasable."
                    }
                )

        self.quantity = quantize_quantity(
            self.quantity
        )

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                        "Quantity must be greater than zero."
                }
            )

    def save(self, *args, **kwargs):
        if self.order_id and not self.company_id:
            self.company = self.order.company

        if self.item_id:
            self.apply_item_snapshot()

        self.calculate_totals()
        self.full_clean()
        super().save(*args, **kwargs)

        if self.order_id:
            self.order.recalculate_totals(save=True)

    def delete(self, *args, **kwargs):
        order = self.order

        if not order.can_be_edited:
            raise ValidationError(
                "Cannot delete items from an approved "
                "or cancelled purchase order."
            )

        result = super().delete(*args, **kwargs)
        order.recalculate_totals(save=True)

        return result


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

    purchase_order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.PROTECT,
        related_name="bills",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Purchase order",
        help_text=(
            "Optional source purchase order used "
            "to create this supplier bill."
        ),
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

    debit_note_applied_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Debit note applied amount",
        help_text=(
            "Total posted supplier debit note amount "
            "applied against this purchase bill."
        ),
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
        self.debit_note_applied_amount = quantize_money(
            self.debit_note_applied_amount
        )
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

        if self.purchase_order_id:
            if self.purchase_order.company_id != self.company_id:
                raise ValidationError(
                    {
                        "purchase_order":
                            "Purchase order does not belong "
                            "to this company."
                    }
                )

            if (
                self.purchase_order.supplier_id
                != self.supplier_id
            ):
                raise ValidationError(
                    {
                        "purchase_order":
                            "Purchase order supplier must "
                            "match bill supplier."
                    }
                )

            if self.purchase_order.status not in [
                PurchaseOrderStatus.APPROVED,
                PurchaseOrderStatus.PARTIALLY_RECEIVED,
                PurchaseOrderStatus.RECEIVED,
                PurchaseOrderStatus.BILLED,
            ]:
                raise ValidationError(
                    {
                        "purchase_order":
                            "Purchase bill requires an "
                            "approved purchase order."
                    }
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

        allocated_amount = quantize_money(
            self.paid_amount
            + self.debit_note_applied_amount
        )

        if allocated_amount > self.total_amount:
            raise ValidationError(
                {
                    "debit_note_applied_amount":
                        "Payments and applied debit notes "
                        "cannot exceed bill total."
                }
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

        balance = quantize_money(
            self.total_amount
            - self.paid_amount
            - self.debit_note_applied_amount
        )
        if balance < MONEY_ZERO:
            balance = MONEY_ZERO

        self.balance_due = balance

        if self.balance_due <= MONEY_ZERO:
            self.payment_status = PurchaseBillPaymentStatus.PAID
        elif (
            self.paid_amount <= MONEY_ZERO
            and self.debit_note_applied_amount <= MONEY_ZERO
        ):
            self.payment_status = PurchaseBillPaymentStatus.UNPAID
        else:
            self.payment_status = PurchaseBillPaymentStatus.PARTIAL

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
                "debit_note_applied_amount",
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
                "debit_note_applied_amount",
                "balance_due",
                "payment_status",
                "updated_by",
                "updated_at",
            ]

            if not user:
                update_fields.remove("updated_by")

            self.save(update_fields=update_fields)

    def apply_debit_note_amount(
        self,
        amount: Decimal | int | float | str,
        *,
        save: bool = True,
        user=None,
    ) -> None:
        """
        Apply a posted supplier debit note amount to this bill.
        """
        applied_amount = quantize_money(amount)

        if applied_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "amount":
                        "Debit note applied amount must be "
                        "greater than zero."
                }
            )

        if self.status != PurchaseBillStatus.POSTED:
            raise ValidationError(
                {
                    "status":
                        "Debit notes can only be applied "
                        "to posted purchase bills."
                }
            )

        if applied_amount > self.balance_due:
            raise ValidationError(
                {
                    "amount":
                        "Debit note applied amount cannot "
                        "exceed bill balance due."
                }
            )

        self.debit_note_applied_amount = quantize_money(
            self.debit_note_applied_amount
            + applied_amount
        )
        self.refresh_payment_status()

        if user:
            self.updated_by = user

        self.full_clean()

        if save:
            update_fields = [
                "debit_note_applied_amount",
                "balance_due",
                "payment_status",
                "updated_by",
                "updated_at",
            ]

            if not user:
                update_fields.remove("updated_by")

            self.save(update_fields=update_fields)

    def reverse_debit_note_amount(
        self,
        amount: Decimal | int | float | str,
        *,
        save: bool = True,
        user=None,
    ) -> None:
        """
        Reverse a previously applied supplier debit note amount.
        """
        reversal_amount = quantize_money(amount)

        if reversal_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "amount":
                        "Debit note reversal amount must be "
                        "greater than zero."
                }
            )

        if reversal_amount > self.debit_note_applied_amount:
            raise ValidationError(
                {
                    "amount":
                        "Debit note reversal cannot exceed "
                        "the applied debit note amount."
                }
            )

        self.debit_note_applied_amount = quantize_money(
            self.debit_note_applied_amount
            - reversal_amount
        )
        self.refresh_payment_status()

        if user:
            self.updated_by = user

        self.full_clean()

        if save:
            update_fields = [
                "debit_note_applied_amount",
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
                "debit_note_applied_amount",
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

    purchase_order_item = models.ForeignKey(
        PurchaseOrderItem,
        on_delete=models.PROTECT,
        related_name="purchase_bill_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Purchase order item",
        help_text=(
            "Optional source purchase order line."
        ),
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

    @property
    def received_quantity(self) -> Decimal:
        """
        Quantity received through posted purchase receipts.
        """
        result = (
            self.purchase_receipt_items
            .filter(
                receipt__status=PurchaseReceiptStatus.POSTED,
            )
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def receivable_quantity(self) -> Decimal:
        """
        Remaining quantity available for receiving.
        """
        remaining = quantize_quantity(
            self.quantity - self.received_quantity
        )

        if remaining < QUANTITY_ZERO:
            return QUANTITY_ZERO

        return remaining

    @property
    def returned_quantity(self) -> Decimal:
        """
        Quantity consumed by confirmed or posted purchase returns.
        """
        result = (
            self.purchase_return_items
            .filter(
                purchase_return__status__in=[
                    PurchaseReturnStatus.CONFIRMED,
                    PurchaseReturnStatus.POSTED,
                ]
            )
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    @property
    def returnable_quantity(self) -> Decimal:
        """
        Remaining quantity available for purchase return.

        Compatibility rule:
        - When posted purchase receipts exist, returns are limited
          to the quantity actually received.
        - When no posted receipt exists yet, preserve the previous
          bill-based behavior for legacy purchase bills.
        """
        has_posted_receipt = (
            self.purchase_receipt_items
            .filter(
                receipt__status=PurchaseReceiptStatus.POSTED,
            )
            .exists()
        )

        base_quantity = (
            self.received_quantity
            if has_posted_receipt
            else quantize_quantity(self.quantity)
        )

        remaining = quantize_quantity(
            base_quantity
            - self.returned_quantity
        )

        if remaining < QUANTITY_ZERO:
            return QUANTITY_ZERO

        return remaining

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

        if self.purchase_order_item_id:
            source = self.purchase_order_item

            if source.company_id != self.company_id:
                raise ValidationError(
                    {
                        "purchase_order_item":
                            "Purchase order item does not "
                            "belong to this company."
                    }
                )

            if (
                self.bill_id
                and not self.bill.purchase_order_id
            ):
                raise ValidationError(
                    {
                        "purchase_order_item":
                            "Bill must reference the source "
                            "purchase order."
                    }
                )

            if (
                self.bill_id
                and self.bill.purchase_order_id
                != source.order_id
            ):
                raise ValidationError(
                    {
                        "purchase_order_item":
                            "Purchase order item must belong "
                            "to the bill purchase order."
                    }
                )

            if self.item_id != source.item_id:
                raise ValidationError(
                    {
                        "purchase_order_item":
                            "Bill item must match purchase "
                            "order item catalog item."
                    }
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


# ============================================================
# Purchase Receiving Foundation
# ============================================================


class PurchaseReceiptStatus(models.TextChoices):
    """
    Purchase receipt lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class PurchaseReceipt(models.Model):
    """
    Company-scoped warehouse receipt linked to a posted purchase bill.

    Stock effects are created by the purchases service layer.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_receipts",
        db_index=True,
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="purchase_receipts",
        blank=True,
        null=True,
        db_index=True,
    )
    supplier = models.ForeignKey(
        BusinessParty,
        on_delete=models.PROTECT,
        related_name="purchase_receipts",
        db_index=True,
    )
    bill = models.ForeignKey(
        PurchaseBill,
        on_delete=models.PROTECT,
        related_name="receipts",
        db_index=True,
    )
    warehouse = models.ForeignKey(
        "inventory.Warehouse",
        on_delete=models.PROTECT,
        related_name="purchase_receipts",
        db_index=True,
    )

    receipt_number = models.CharField(
        max_length=80,
        db_index=True,
    )
    receipt_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=PurchaseReceiptStatus.choices,
        default=PurchaseReceiptStatus.DRAFT,
        db_index=True,
    )

    posted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_purchase_receipts",
        blank=True,
        null=True,
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_purchase_receipts",
        blank=True,
        null=True,
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_purchase_receipts",
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_purchase_receipts",
        blank=True,
        null=True,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-receipt_date",
            "-created_at",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "receipt_number"],
                name=(
                    "unique_purchase_receipt_number_"
                    "per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"],
            ),
            models.Index(
                fields=["company", "receipt_date"],
            ),
            models.Index(
                fields=["company", "supplier"],
            ),
            models.Index(
                fields=["company", "bill"],
            ),
            models.Index(
                fields=["company", "warehouse"],
            ),
            models.Index(
                fields=["bill", "status"],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.receipt_number} - "
            f"{self.bill.bill_number}"
        )

    @property
    def is_draft(self) -> bool:
        return self.status == PurchaseReceiptStatus.DRAFT

    @property
    def is_posted(self) -> bool:
        return self.status == PurchaseReceiptStatus.POSTED

    @property
    def is_cancelled(self) -> bool:
        return self.status == PurchaseReceiptStatus.CANCELLED

    @property
    def can_be_edited(self) -> bool:
        return self.is_draft

    @property
    def can_be_posted(self) -> bool:
        return self.is_draft

    @property
    def can_be_cancelled(self) -> bool:
        return self.is_draft

    @property
    def total_quantity(self) -> Decimal:
        result = (
            self.items
            .aggregate(total=Sum("quantity"))
            .get("total")
        )

        return quantize_quantity(
            result or QUANTITY_ZERO
        )

    def clean(self) -> None:
        super().clean()

        self.receipt_number = (
            self.receipt_number or ""
        ).strip()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        if not self.receipt_number:
            raise ValidationError(
                {
                    "receipt_number":
                        "Purchase receipt number is required."
                }
            )

        if self.bill_id and self.company_id:
            if self.bill.company_id != self.company_id:
                raise ValidationError(
                    {
                        "bill":
                            "Purchase bill does not belong "
                            "to this company."
                    }
                )

            if self.bill.status != PurchaseBillStatus.POSTED:
                raise ValidationError(
                    {
                        "bill":
                            "Only posted purchase bills "
                            "can be received."
                    }
                )

        if self.supplier_id and self.company_id:
            if self.supplier.company_id != self.company_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier does not belong "
                            "to this company."
                    }
                )

        if self.bill_id and self.supplier_id:
            if self.bill.supplier_id != self.supplier_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier must match purchase bill."
                    }
                )

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                            "Branch does not belong "
                            "to this company."
                    }
                )

        if self.bill_id and self.branch_id:
            if (
                self.bill.branch_id
                and self.bill.branch_id != self.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                            "Branch must match purchase bill."
                    }
                )

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {
                        "warehouse":
                            "Warehouse does not belong "
                            "to this company."
                    }
                )

            if not self.warehouse.is_active_warehouse:
                raise ValidationError(
                    {
                        "warehouse":
                            "Warehouse must be active."
                    }
                )

        if (
            self.bill_id
            and self.receipt_date
            and self.receipt_date < self.bill.bill_date
        ):
            raise ValidationError(
                {
                    "receipt_date":
                        "Receipt date cannot be before bill date."
                }
            )

    def mark_posted(self, user=None) -> None:
        if not self.can_be_posted:
            raise ValidationError(
                "Only draft purchase receipts can be posted."
            )

        if not self.items.exists():
            raise ValidationError(
                "Cannot post a purchase receipt without items."
            )

        self.status = PurchaseReceiptStatus.POSTED
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
                "updated_at",
            ]
        )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        if not self.can_be_cancelled:
            raise ValidationError(
                "Only draft purchase receipts can be cancelled."
            )

        self.status = PurchaseReceiptStatus.CANCELLED
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


class PurchaseReceiptItem(models.Model):
    """
    Purchase receipt line linked to one purchase bill item.
    """

    receipt = models.ForeignKey(
        PurchaseReceipt,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_receipt_items",
        db_index=True,
    )
    bill_item = models.ForeignKey(
        PurchaseBillItem,
        on_delete=models.PROTECT,
        related_name="purchase_receipt_items",
        db_index=True,
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="purchase_receipt_items",
        db_index=True,
    )
    stock_movement = models.OneToOneField(
        "inventory.StockMovement",
        on_delete=models.PROTECT,
        related_name="purchase_receipt_item",
        blank=True,
        null=True,
    )

    line_number = models.PositiveIntegerField(
        default=1,
        db_index=True,
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
    )
    unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )

    item_code_snapshot = models.CharField(
        max_length=80,
        blank=True,
        default="",
    )
    item_name_snapshot = models.CharField(
        max_length=255,
    )
    item_name_ar_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    item_name_en_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    unit_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "receipt_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "receipt",
                    "line_number",
                ],
                name=(
                    "unique_purchase_receipt_item_line"
                ),
            ),
            models.UniqueConstraint(
                fields=[
                    "receipt",
                    "bill_item",
                ],
                name=(
                    "unique_purchase_receipt_bill_item"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "item"],
            ),
            models.Index(
                fields=["company", "bill_item"],
            ),
            models.Index(
                fields=[
                    "receipt",
                    "line_number",
                ],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.receipt.receipt_number} - "
            f"{self.item_name_snapshot}"
        )

    def apply_bill_item_snapshot(self) -> None:
        if not self.bill_item_id:
            return

        source = self.bill_item

        self.item = source.item
        self.item_code_snapshot = (
            source.item_code_snapshot
        )
        self.item_name_snapshot = (
            source.item_name_snapshot
        )
        self.item_name_ar_snapshot = (
            source.item_name_ar_snapshot
        )
        self.item_name_en_snapshot = (
            source.item_name_en_snapshot
        )
        self.unit_name_snapshot = (
            source.unit_name_snapshot
        )
        self.unit_cost = quantize_money(
            source.taxable_amount / source.quantity
            if source.quantity > QUANTITY_ZERO
            else source.unit_price
        )

    def clean(self) -> None:
        super().clean()

        if (
            self.receipt_id
            and self.company_id
            and self.receipt.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "company":
                        "Item company must match receipt company."
                }
            )

        if (
            self.receipt_id
            and not self.receipt.can_be_edited
        ):
            raise ValidationError(
                "Cannot edit items for a posted "
                "or cancelled purchase receipt."
            )

        if (
            self.bill_item_id
            and self.receipt_id
            and self.bill_item.bill_id
            != self.receipt.bill_id
        ):
            raise ValidationError(
                {
                    "bill_item":
                        "Bill item must belong to receipt bill."
                }
            )

        if (
            self.bill_item_id
            and self.company_id
            and self.bill_item.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "bill_item":
                        "Bill item does not belong "
                        "to this company."
                }
            )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item does not belong "
                            "to this company."
                    }
                )

        self.quantity = quantize_quantity(
            self.quantity
        )
        self.unit_cost = quantize_money(
            self.unit_cost
        )
        self.notes = (
            self.notes or ""
        ).strip()

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                        "Receipt quantity must be greater "
                        "than zero."
                }
            )

        if self.unit_cost < MONEY_ZERO:
            raise ValidationError(
                {
                    "unit_cost":
                        "Unit cost cannot be negative."
                }
            )

        if self.bill_item_id:
            available = (
                self.bill_item.receivable_quantity
            )

            existing_quantity = QUANTITY_ZERO
            if self.pk:
                existing = (
                    PurchaseReceiptItem.objects
                    .filter(pk=self.pk)
                    .values_list(
                        "quantity",
                        flat=True,
                    )
                    .first()
                )
                existing_quantity = quantize_quantity(
                    existing or QUANTITY_ZERO
                )

            allowed_quantity = quantize_quantity(
                available + existing_quantity
            )

            if self.quantity > allowed_quantity:
                raise ValidationError(
                    {
                        "quantity":
                            "Receipt quantity cannot exceed "
                            "the remaining bill quantity."
                    }
                )

    def save(self, *args, **kwargs):
        if (
            self.receipt_id
            and not self.company_id
        ):
            self.company = self.receipt.company

        if self.bill_item_id:
            self.apply_bill_item_snapshot()

        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if not self.receipt.can_be_edited:
            raise ValidationError(
                "Cannot delete items from a posted "
                "or cancelled purchase receipt."
            )

        return super().delete(*args, **kwargs)


# ============================================================
# Purchase Returns Foundation
# ============================================================


class PurchaseReturnStatus(models.TextChoices):
    """
    Purchase return lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    CONFIRMED = "CONFIRMED", "Confirmed"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class PurchaseReturnReason(models.TextChoices):
    """
    Standard supplier return reasons.
    """

    DAMAGED = "DAMAGED", "Damaged"
    DEFECTIVE = "DEFECTIVE", "Defective"
    WRONG_ITEM = "WRONG_ITEM", "Wrong item"
    EXCESS_QUANTITY = "EXCESS_QUANTITY", "Excess quantity"
    QUALITY_ISSUE = "QUALITY_ISSUE", "Quality issue"
    SUPPLIER_REQUEST = "SUPPLIER_REQUEST", "Supplier request"
    OTHER = "OTHER", "Other"


class PurchaseReturn(models.Model):
    """
    Company-scoped purchase return linked to a posted purchase bill.

    Accounting, stock issue, and supplier debit note effects are
    handled by service layers.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_returns",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="purchase_returns",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )
    supplier = models.ForeignKey(
        BusinessParty,
        on_delete=models.PROTECT,
        related_name="purchase_returns",
        db_index=True,
        verbose_name="Supplier",
    )
    bill = models.ForeignKey(
        PurchaseBill,
        on_delete=models.PROTECT,
        related_name="purchase_returns",
        db_index=True,
        verbose_name="Purchase bill",
    )

    return_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Return number",
    )
    return_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Return date",
    )
    status = models.CharField(
        max_length=20,
        choices=PurchaseReturnStatus.choices,
        default=PurchaseReturnStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )
    reason = models.CharField(
        max_length=40,
        choices=PurchaseReturnReason.choices,
        default=PurchaseReturnReason.OTHER,
        db_index=True,
        verbose_name="Reason",
    )
    reason_details = models.TextField(
        blank=True,
        default="",
        verbose_name="Reason details",
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
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )

    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="confirmed_purchase_returns",
        blank=True,
        null=True,
    )
    posted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_purchase_returns",
        blank=True,
        null=True,
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_purchase_returns",
        blank=True,
        null=True,
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_purchase_returns",
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_purchase_returns",
        blank=True,
        null=True,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-return_date",
            "-created_at",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "return_number"],
                name=(
                    "unique_purchase_return_number_"
                    "per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"],
            ),
            models.Index(
                fields=["company", "return_date"],
            ),
            models.Index(
                fields=["company", "supplier"],
            ),
            models.Index(
                fields=["company", "bill"],
            ),
            models.Index(
                fields=["supplier", "status"],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.return_number} - "
            f"{self.supplier.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return self.status == PurchaseReturnStatus.DRAFT

    @property
    def can_be_edited(self) -> bool:
        return self.is_draft

    @property
    def can_be_confirmed(self) -> bool:
        return self.is_draft

    @property
    def can_be_posted(self) -> bool:
        return self.status == PurchaseReturnStatus.CONFIRMED

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in [
            PurchaseReturnStatus.DRAFT,
            PurchaseReturnStatus.CONFIRMED,
        ]

    def clean(self) -> None:
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
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (self.notes or "").strip()

        if not self.return_number:
            raise ValidationError(
                {
                    "return_number":
                        "Purchase return number is required."
                }
            )

        if self.bill_id and self.company_id:
            if self.bill.company_id != self.company_id:
                raise ValidationError(
                    {
                        "bill":
                            "Purchase bill does not belong "
                            "to this company."
                    }
                )

            if self.bill.status != PurchaseBillStatus.POSTED:
                raise ValidationError(
                    {
                        "bill":
                            "Only posted purchase bills "
                            "can be returned."
                    }
                )

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                            "Selected branch does not belong "
                            "to this company."
                    }
                )

        if self.supplier_id and self.company_id:
            if self.supplier.company_id != self.company_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Selected supplier does not belong "
                            "to this company."
                    }
                )

        if self.bill_id and self.supplier_id:
            if self.bill.supplier_id != self.supplier_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier must match purchase bill."
                    }
                )

        if self.bill_id and self.branch_id:
            if (
                self.bill.branch_id
                and self.bill.branch_id != self.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                            "Branch must match purchase bill."
                    }
                )

        if (
            self.bill_id
            and self.return_date
            and self.return_date < self.bill.bill_date
        ):
            raise ValidationError(
                {
                    "return_date":
                        "Return date cannot be before bill date."
                }
            )

        if (
            self.bill_id
            and self.currency_code
            != self.bill.currency_code
        ):
            raise ValidationError(
                {
                    "currency_code":
                        "Currency must match purchase bill."
                }
            )

    def recalculate_totals(
        self,
        save: bool = True,
    ) -> None:
        totals = self.items.aggregate(
            subtotal=Sum("subtotal_amount"),
            discount=Sum("discount_amount"),
            taxable=Sum("taxable_amount"),
            tax=Sum("tax_amount"),
            total=Sum("total_amount"),
        )

        self.subtotal_amount = quantize_money(
            totals["subtotal"] or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals["discount"] or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals["taxable"] or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals["tax"] or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals["total"] or MONEY_ZERO
        )

        if save:
            self.full_clean()
            self.save(
                update_fields=[
                    "subtotal_amount",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def confirm(self, user=None) -> None:
        if not self.can_be_confirmed:
            raise ValidationError(
                "Only draft purchase returns can be confirmed."
            )

        if not self.items.exists():
            raise ValidationError(
                "Cannot confirm a purchase return without items."
            )

        for item in self.items.select_related(
            "bill_item"
        ):
            item.full_clean()

        self.recalculate_totals(save=False)
        self.status = PurchaseReturnStatus.CONFIRMED
        self.confirmed_at = timezone.now()

        if user:
            self.confirmed_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "confirmed_at",
                "confirmed_by",
                "updated_by",
                "subtotal_amount",
                "discount_amount",
                "taxable_amount",
                "tax_amount",
                "total_amount",
                "updated_at",
            ]
        )

    def mark_posted(self, user=None) -> None:
        if not self.can_be_posted:
            raise ValidationError(
                "Only confirmed purchase returns can be posted."
            )

        self.status = PurchaseReturnStatus.POSTED
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
                "updated_at",
            ]
        )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        if not self.can_be_cancelled:
            raise ValidationError(
                "This purchase return cannot be cancelled."
            )

        self.status = PurchaseReturnStatus.CANCELLED
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


class PurchaseReturnItem(models.Model):
    """
    Purchase return line linked to one purchase bill item.
    """

    purchase_return = models.ForeignKey(
        PurchaseReturn,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="purchase_return_items",
        db_index=True,
    )
    bill_item = models.ForeignKey(
        PurchaseBillItem,
        on_delete=models.PROTECT,
        related_name="purchase_return_items",
        db_index=True,
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="purchase_return_items",
        db_index=True,
    )

    stock_movement = models.OneToOneField(
        "inventory.StockMovement",
        on_delete=models.PROTECT,
        related_name="purchase_return_item",
        blank=True,
        null=True,
        verbose_name="Stock movement",
        help_text=(
            "Posted stock issue created for this "
            "purchase return item."
        ),
    )

    line_number = models.PositiveIntegerField(
        default=1,
        db_index=True,
    )

    item_code_snapshot = models.CharField(
        max_length=80,
        blank=True,
        default="",
    )
    item_name_snapshot = models.CharField(
        max_length=255,
    )
    item_name_ar_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    item_name_en_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    unit_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    taxable = models.BooleanField(
        default=True,
        db_index=True,
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=MONEY_ZERO,
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
    )

    condition_notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "purchase_return_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "purchase_return",
                    "line_number",
                ],
                name=(
                    "unique_purchase_return_item_line"
                ),
            ),
            models.UniqueConstraint(
                fields=[
                    "purchase_return",
                    "bill_item",
                ],
                name=(
                    "unique_purchase_return_bill_item"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "item"],
            ),
            models.Index(
                fields=["company", "bill_item"],
            ),
            models.Index(
                fields=[
                    "purchase_return",
                    "line_number",
                ],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.purchase_return.return_number} - "
            f"{self.item_name_snapshot}"
        )

    def apply_bill_item_snapshot(self) -> None:
        if not self.bill_item_id:
            return

        bill_item = self.bill_item

        self.item = bill_item.item
        self.item_code_snapshot = (
            bill_item.item_code_snapshot
        )
        self.item_name_snapshot = (
            bill_item.item_name_snapshot
        )
        self.item_name_ar_snapshot = (
            bill_item.item_name_ar_snapshot
        )
        self.item_name_en_snapshot = (
            bill_item.item_name_en_snapshot
        )
        self.unit_name_snapshot = (
            bill_item.unit_name_snapshot
        )
        self.unit_price = bill_item.unit_price
        self.taxable = bill_item.taxable
        self.tax_rate = bill_item.tax_rate

    def calculate_totals(self) -> None:
        bill_quantity = quantize_quantity(
            self.bill_item.quantity
        )
        return_quantity = quantize_quantity(
            self.quantity
        )

        ratio = (
            return_quantity / bill_quantity
            if bill_quantity > QUANTITY_ZERO
            else Decimal("0")
        )

        self.quantity = return_quantity
        self.unit_price = quantize_money(
            self.bill_item.unit_price
        )
        self.discount_amount = quantize_money(
            self.bill_item.discount_amount * ratio
        )
        self.subtotal_amount = quantize_money(
            self.unit_price * return_quantity
        )
        self.taxable_amount = quantize_money(
            self.subtotal_amount
            - self.discount_amount
        )

        if self.taxable_amount < MONEY_ZERO:
            self.taxable_amount = MONEY_ZERO

        self.tax_amount = (
            quantize_money(
                self.taxable_amount
                * self.tax_rate
                / Decimal("100.00")
            )
            if self.taxable
            else MONEY_ZERO
        )
        self.total_amount = quantize_money(
            self.taxable_amount
            + self.tax_amount
        )

    def clean(self) -> None:
        super().clean()

        if (
            self.purchase_return_id
            and self.company_id
            and self.purchase_return.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "company":
                        "Item company must match "
                        "purchase return company."
                }
            )

        if (
            self.bill_item_id
            and self.purchase_return_id
            and self.bill_item.bill_id
            != self.purchase_return.bill_id
        ):
            raise ValidationError(
                {
                    "bill_item":
                        "Bill item must belong to the "
                        "purchase return bill."
                }
            )

        if (
            self.bill_item_id
            and self.company_id
            and self.bill_item.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "bill_item":
                        "Bill item does not belong "
                        "to this company."
                }
            )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item does not belong "
                            "to this company."
                    }
                )

        if (
            self.purchase_return_id
            and not self.purchase_return.can_be_edited
        ):
            raise ValidationError(
                "Cannot edit items for a confirmed, "
                "posted, or cancelled purchase return."
            )

        self.quantity = quantize_quantity(
            self.quantity
        )

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                        "Return quantity must be greater "
                        "than zero."
                }
            )

        if self.bill_item_id:
            available = (
                self.bill_item.returnable_quantity
            )

            existing_quantity = QUANTITY_ZERO
            if self.pk:
                existing = (
                    PurchaseReturnItem.objects
                    .filter(pk=self.pk)
                    .values_list(
                        "quantity",
                        flat=True,
                    )
                    .first()
                )
                existing_quantity = quantize_quantity(
                    existing or QUANTITY_ZERO
                )

            allowed_quantity = quantize_quantity(
                available + existing_quantity
            )

            if self.quantity > allowed_quantity:
                raise ValidationError(
                    {
                        "quantity":
                            "Return quantity cannot exceed "
                            "the remaining bill quantity."
                    }
                )

    def save(self, *args, **kwargs):
        if (
            self.purchase_return_id
            and not self.company_id
        ):
            self.company = (
                self.purchase_return.company
            )

        if self.bill_item_id:
            self.apply_bill_item_snapshot()
            self.calculate_totals()

        self.full_clean()
        super().save(*args, **kwargs)

        if self.purchase_return_id:
            self.purchase_return.recalculate_totals(
                save=True
            )

    def delete(self, *args, **kwargs):
        purchase_return = self.purchase_return

        if not purchase_return.can_be_edited:
            raise ValidationError(
                "Cannot delete items from a confirmed, "
                "posted, or cancelled purchase return."
            )

        result = super().delete(*args, **kwargs)

        purchase_return.recalculate_totals(
            save=True
        )

        return result


# ============================================================
# Supplier Debit Notes Foundation
# ============================================================


class SupplierDebitNoteStatus(models.TextChoices):
    """
    Supplier debit note lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    ISSUED = "ISSUED", "Issued"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class SupplierDebitNote(models.Model):
    """
    Company-scoped supplier debit note.

    A debit note may originate from a confirmed or posted
    purchase return and remains linked to its supplier bill.

    Financial effects are handled in service layers:
    - reduce supplier bill balance
    - create supplier credit balance
    - post accounting reversal
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="supplier_debit_notes",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="supplier_debit_notes",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
    )
    supplier = models.ForeignKey(
        BusinessParty,
        on_delete=models.PROTECT,
        related_name="supplier_debit_notes",
        db_index=True,
        verbose_name="Supplier",
    )
    bill = models.ForeignKey(
        PurchaseBill,
        on_delete=models.PROTECT,
        related_name="supplier_debit_notes",
        db_index=True,
        verbose_name="Purchase bill",
    )
    purchase_return = models.OneToOneField(
        PurchaseReturn,
        on_delete=models.PROTECT,
        related_name="debit_note",
        blank=True,
        null=True,
        verbose_name="Purchase return",
        help_text=(
            "Optional source purchase return. "
            "One purchase return can create one debit note."
        ),
    )

    debit_note_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Debit note number",
    )
    supplier_reference = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Supplier reference",
    )
    debit_note_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Debit note date",
    )
    status = models.CharField(
        max_length=20,
        choices=SupplierDebitNoteStatus.choices,
        default=SupplierDebitNoteStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
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

    applied_to_bill_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Applied to bill amount",
        help_text=(
            "Amount used to reduce the linked purchase bill balance."
        ),
    )
    supplier_credit_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Supplier credit amount",
        help_text=(
            "Remaining debit note amount held as supplier credit."
        ),
    )

    issued_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Issued at",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="issued_supplier_debit_notes",
        blank=True,
        null=True,
        verbose_name="Issued by",
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
        related_name="posted_supplier_debit_notes",
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
        related_name="cancelled_supplier_debit_notes",
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
        related_name="created_supplier_debit_notes",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_supplier_debit_notes",
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
        verbose_name = "Supplier debit note"
        verbose_name_plural = "Supplier debit notes"
        ordering = [
            "-debit_note_date",
            "-created_at",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "debit_note_number",
                ],
                name=(
                    "unique_supplier_debit_note_number_"
                    "per_company"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "status"],
            ),
            models.Index(
                fields=["company", "debit_note_date"],
            ),
            models.Index(
                fields=["company", "supplier"],
            ),
            models.Index(
                fields=["company", "bill"],
            ),
            models.Index(
                fields=["supplier", "status"],
            ),
            models.Index(
                fields=["posted_at"],
            ),
            models.Index(
                fields=["cancelled_at"],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.debit_note_number} - "
            f"{self.supplier.display_name}"
        )

    @property
    def is_draft(self) -> bool:
        return (
            self.status
            == SupplierDebitNoteStatus.DRAFT
        )

    @property
    def is_issued(self) -> bool:
        return (
            self.status
            == SupplierDebitNoteStatus.ISSUED
        )

    @property
    def is_posted(self) -> bool:
        return (
            self.status
            == SupplierDebitNoteStatus.POSTED
        )

    @property
    def is_cancelled(self) -> bool:
        return (
            self.status
            == SupplierDebitNoteStatus.CANCELLED
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
            SupplierDebitNoteStatus.DRAFT,
            SupplierDebitNoteStatus.ISSUED,
        ]

    @property
    def unapplied_amount(self) -> Decimal:
        """
        Amount not yet assigned to bill reduction or supplier credit.
        """
        allocated = quantize_money(
            self.applied_to_bill_amount
            + self.supplier_credit_amount
        )

        remaining = quantize_money(
            self.total_amount - allocated
        )

        if remaining < MONEY_ZERO:
            return MONEY_ZERO

        return remaining

    def clean(self) -> None:
        super().clean()

        self.debit_note_number = (
            self.debit_note_number or ""
        ).strip()
        self.supplier_reference = (
            self.supplier_reference or ""
        ).strip()
        self.currency_code = (
            self.currency_code or "SAR"
        ).strip().upper()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        self.subtotal_amount = quantize_money(
            self.subtotal_amount
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
        self.applied_to_bill_amount = quantize_money(
            self.applied_to_bill_amount
        )
        self.supplier_credit_amount = quantize_money(
            self.supplier_credit_amount
        )

        if not self.debit_note_number:
            raise ValidationError(
                {
                    "debit_note_number":
                        "Supplier debit note number is required."
                }
            )

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "branch":
                            "Selected branch does not belong "
                            "to this company."
                    }
                )

        if self.supplier_id and self.company_id:
            if self.supplier.company_id != self.company_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Selected supplier does not belong "
                            "to this company."
                    }
                )

            if self.supplier.party_type not in [
                BusinessPartyType.SUPPLIER,
                BusinessPartyType.BOTH,
            ]:
                raise ValidationError(
                    {
                        "supplier":
                            "Selected party is not a supplier."
                    }
                )

        if self.bill_id and self.company_id:
            if self.bill.company_id != self.company_id:
                raise ValidationError(
                    {
                        "bill":
                            "Purchase bill does not belong "
                            "to this company."
                    }
                )

            if self.bill.status != PurchaseBillStatus.POSTED:
                raise ValidationError(
                    {
                        "bill":
                            "Supplier debit notes require "
                            "a posted purchase bill."
                    }
                )

        if self.bill_id and self.supplier_id:
            if self.bill.supplier_id != self.supplier_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier must match purchase bill."
                    }
                )

        if self.bill_id and self.branch_id:
            if (
                self.bill.branch_id
                and self.bill.branch_id != self.branch_id
            ):
                raise ValidationError(
                    {
                        "branch":
                            "Branch must match purchase bill."
                    }
                )

        if self.purchase_return_id:
            purchase_return = self.purchase_return

            if (
                self.company_id
                and purchase_return.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "purchase_return":
                            "Purchase return does not belong "
                            "to this company."
                    }
                )

            if (
                self.bill_id
                and purchase_return.bill_id
                != self.bill_id
            ):
                raise ValidationError(
                    {
                        "purchase_return":
                            "Purchase return must belong "
                            "to the selected purchase bill."
                    }
                )

            if (
                self.supplier_id
                and purchase_return.supplier_id
                != self.supplier_id
            ):
                raise ValidationError(
                    {
                        "purchase_return":
                            "Purchase return supplier must "
                            "match debit note supplier."
                    }
                )

            if purchase_return.status not in [
                PurchaseReturnStatus.CONFIRMED,
                PurchaseReturnStatus.POSTED,
            ]:
                raise ValidationError(
                    {
                        "purchase_return":
                            "Purchase return must be confirmed "
                            "or posted."
                    }
                )

        if (
            self.bill_id
            and self.debit_note_date
            and self.debit_note_date
            < self.bill.bill_date
        ):
            raise ValidationError(
                {
                    "debit_note_date":
                        "Debit note date cannot be before "
                        "purchase bill date."
                }
            )

        if (
            self.purchase_return_id
            and self.debit_note_date
            and self.debit_note_date
            < self.purchase_return.return_date
        ):
            raise ValidationError(
                {
                    "debit_note_date":
                        "Debit note date cannot be before "
                        "purchase return date."
                }
            )

        if (
            self.bill_id
            and self.currency_code
            != self.bill.currency_code
        ):
            raise ValidationError(
                {
                    "currency_code":
                        "Currency must match purchase bill."
                }
            )

        allocated_amount = quantize_money(
            self.applied_to_bill_amount
            + self.supplier_credit_amount
        )

        if allocated_amount > self.total_amount:
            raise ValidationError(
                {
                    "applied_to_bill_amount":
                        "Applied amount and supplier credit "
                        "cannot exceed debit note total."
                }
            )

        if self.is_posted:
            if self.total_amount <= MONEY_ZERO:
                raise ValidationError(
                    {
                        "total_amount":
                            "Posted supplier debit note "
                            "must have a positive total."
                    }
                )

            if allocated_amount != self.total_amount:
                raise ValidationError(
                    {
                        "applied_to_bill_amount":
                            "Posted supplier debit note total "
                            "must be fully distributed between "
                            "bill application and supplier credit."
                    }
                )

    def recalculate_totals(
        self,
        save: bool = True,
    ) -> None:
        totals = self.items.aggregate(
            subtotal=Sum("subtotal_amount"),
            discount=Sum("discount_amount"),
            taxable=Sum("taxable_amount"),
            tax=Sum("tax_amount"),
            total=Sum("total_amount"),
        )

        self.subtotal_amount = quantize_money(
            totals["subtotal"] or MONEY_ZERO
        )
        self.discount_amount = quantize_money(
            totals["discount"] or MONEY_ZERO
        )
        self.taxable_amount = quantize_money(
            totals["taxable"] or MONEY_ZERO
        )
        self.tax_amount = quantize_money(
            totals["tax"] or MONEY_ZERO
        )
        self.total_amount = quantize_money(
            totals["total"] or MONEY_ZERO
        )

        if save:
            self.full_clean()
            self.save(
                update_fields=[
                    "subtotal_amount",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "updated_at",
                ]
            )

    def issue(self, user=None) -> None:
        """
        Issue a draft supplier debit note.
        """
        if not self.can_be_issued:
            raise ValidationError(
                "Only draft supplier debit notes can be issued."
            )

        if not self.items.exists():
            raise ValidationError(
                "Cannot issue a supplier debit note without items."
            )

        self.recalculate_totals(
            save=False
        )

        if self.total_amount <= MONEY_ZERO:
            raise ValidationError(
                {
                    "total_amount":
                        "Supplier debit note total "
                        "must be greater than zero."
                }
            )

        self.status = SupplierDebitNoteStatus.ISSUED
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
                "subtotal_amount",
                "discount_amount",
                "taxable_amount",
                "tax_amount",
                "total_amount",
                "updated_at",
            ]
        )

    def mark_posted(
        self,
        *,
        applied_to_bill_amount: (
            Decimal | int | float | str
        ) = MONEY_ZERO,
        supplier_credit_amount: (
            Decimal | int | float | str
        ) = MONEY_ZERO,
        user=None,
    ) -> None:
        """
        Mark an issued supplier debit note as posted.

        Accounting and supplier balance effects must be
        completed by the service layer before this call.
        """
        if not self.can_be_posted:
            raise ValidationError(
                "Only issued supplier debit notes can be posted."
            )

        self.applied_to_bill_amount = quantize_money(
            applied_to_bill_amount
        )
        self.supplier_credit_amount = quantize_money(
            supplier_credit_amount
        )
        self.status = SupplierDebitNoteStatus.POSTED
        self.posted_at = timezone.now()

        if user:
            self.posted_by = user
            self.updated_by = user

        self.full_clean()
        self.save(
            update_fields=[
                "status",
                "applied_to_bill_amount",
                "supplier_credit_amount",
                "posted_at",
                "posted_by",
                "updated_by",
                "updated_at",
            ]
        )

    def cancel(
        self,
        reason: str = "",
        user=None,
    ) -> None:
        """
        Cancel a draft or issued debit note.

        Posted debit notes require reversal services instead.
        """
        if not self.can_be_cancelled:
            raise ValidationError(
                "This supplier debit note cannot be cancelled."
            )

        self.status = SupplierDebitNoteStatus.CANCELLED
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




class SupplierCreditStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    CONSUMED = "CONSUMED", "Consumed"
    CANCELLED = "CANCELLED", "Cancelled"


class SupplierCredit(models.Model):
    """
    Supplier credit balance created from the excess amount
    of a posted supplier debit note.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="supplier_credits",
        db_index=True,
    )
    supplier = models.ForeignKey(
        BusinessParty,
        on_delete=models.PROTECT,
        related_name="supplier_credits",
        db_index=True,
    )
    debit_note = models.OneToOneField(
        SupplierDebitNote,
        on_delete=models.PROTECT,
        related_name="supplier_credit",
    )

    status = models.CharField(
        max_length=20,
        choices=SupplierCreditStatus.choices,
        default=SupplierCreditStatus.ACTIVE,
        db_index=True,
    )
    currency_code = models.CharField(
        max_length=10,
        default="SAR",
    )
    original_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    remaining_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_supplier_credits",
        blank=True,
        null=True,
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_supplier_credits",
        blank=True,
        null=True,
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
        indexes = [
            models.Index(fields=["company", "supplier"]),
            models.Index(fields=["company", "status"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.debit_note.debit_note_number} - "
            f"{self.remaining_amount}"
        )

    def clean(self) -> None:
        super().clean()

        self.currency_code = (
            self.currency_code or "SAR"
        ).strip().upper()
        self.original_amount = quantize_money(
            self.original_amount
        )
        self.remaining_amount = quantize_money(
            self.remaining_amount
        )

        if self.supplier_id and self.company_id:
            if self.supplier.company_id != self.company_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier credit supplier must "
                            "belong to the same company."
                    }
                )

        if self.debit_note_id and self.company_id:
            if self.debit_note.company_id != self.company_id:
                raise ValidationError(
                    {
                        "debit_note":
                            "Supplier debit note must belong "
                            "to the same company."
                    }
                )

            if self.debit_note.supplier_id != self.supplier_id:
                raise ValidationError(
                    {
                        "supplier":
                            "Supplier credit supplier must "
                            "match debit note supplier."
                    }
                )

        if self.remaining_amount > self.original_amount:
            raise ValidationError(
                {
                    "remaining_amount":
                        "Remaining supplier credit cannot "
                        "exceed original amount."
                }
            )

        if self.status == SupplierCreditStatus.CONSUMED:
            if self.remaining_amount != MONEY_ZERO:
                raise ValidationError(
                    {
                        "remaining_amount":
                            "Consumed supplier credit must "
                            "have zero remaining amount."
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class SupplierDebitNoteItem(models.Model):
    """
    Supplier debit note line.

    When created from a purchase return, values are copied
    from the linked purchase return item.
    """

    debit_note = models.ForeignKey(
        SupplierDebitNote,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Supplier debit note",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="supplier_debit_note_items",
        db_index=True,
        verbose_name="Company",
    )
    purchase_return_item = models.OneToOneField(
        PurchaseReturnItem,
        on_delete=models.PROTECT,
        related_name="debit_note_item",
        blank=True,
        null=True,
        verbose_name="Purchase return item",
    )
    bill_item = models.ForeignKey(
        PurchaseBillItem,
        on_delete=models.PROTECT,
        related_name="supplier_debit_note_items",
        db_index=True,
        verbose_name="Purchase bill item",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="supplier_debit_note_items",
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
    )
    item_name_snapshot = models.CharField(
        max_length=255,
    )
    item_name_ar_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    item_name_en_snapshot = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )
    unit_name_snapshot = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
    )
    unit_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    taxable = models.BooleanField(
        default=True,
        db_index=True,
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )

    subtotal_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    taxable_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    tax_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
    )

    notes = models.TextField(
        blank=True,
        default="",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )
    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Supplier debit note item"
        verbose_name_plural = "Supplier debit note items"
        ordering = [
            "debit_note_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "debit_note",
                    "line_number",
                ],
                name=(
                    "unique_supplier_debit_note_item_line"
                ),
            ),
            models.UniqueConstraint(
                fields=[
                    "debit_note",
                    "bill_item",
                ],
                name=(
                    "unique_supplier_debit_note_bill_item"
                ),
            ),
        ]
        indexes = [
            models.Index(
                fields=["company", "item"],
            ),
            models.Index(
                fields=["company", "bill_item"],
            ),
            models.Index(
                fields=[
                    "debit_note",
                    "line_number",
                ],
            ),
        ]

    def __str__(self) -> str:
        return (
            f"{self.debit_note.debit_note_number} - "
            f"{self.item_name_snapshot}"
        )

    def apply_source_snapshot(self) -> None:
        """
        Copy source data from return item or bill item.
        """
        if self.purchase_return_item_id:
            source = self.purchase_return_item

            self.bill_item = source.bill_item
            self.item = source.item
            self.item_code_snapshot = (
                source.item_code_snapshot
            )
            self.item_name_snapshot = (
                source.item_name_snapshot
            )
            self.item_name_ar_snapshot = (
                source.item_name_ar_snapshot
            )
            self.item_name_en_snapshot = (
                source.item_name_en_snapshot
            )
            self.unit_name_snapshot = (
                source.unit_name_snapshot
            )
            self.quantity = source.quantity
            self.unit_price = source.unit_price
            self.discount_amount = (
                source.discount_amount
            )
            self.taxable = source.taxable
            self.tax_rate = source.tax_rate
            self.subtotal_amount = (
                source.subtotal_amount
            )
            self.taxable_amount = (
                source.taxable_amount
            )
            self.tax_amount = source.tax_amount
            self.total_amount = (
                source.total_amount
            )
            return

        if self.bill_item_id:
            source = self.bill_item

            self.item = source.item
            self.item_code_snapshot = (
                source.item_code_snapshot
            )
            self.item_name_snapshot = (
                source.item_name_snapshot
            )
            self.item_name_ar_snapshot = (
                source.item_name_ar_snapshot
            )
            self.item_name_en_snapshot = (
                source.item_name_en_snapshot
            )
            self.unit_name_snapshot = (
                source.unit_name_snapshot
            )

    def calculate_totals(self) -> None:
        """
        Calculate manual debit note line totals.
        """
        if self.purchase_return_item_id:
            return

        quantity = quantize_quantity(
            self.quantity
        )
        unit_price = quantize_money(
            self.unit_price
        )
        discount = quantize_money(
            self.discount_amount
        )

        subtotal = quantize_money(
            quantity * unit_price
        )

        if discount > subtotal:
            raise ValidationError(
                {
                    "discount_amount":
                        "Discount cannot exceed subtotal."
                }
            )

        taxable_amount = quantize_money(
            subtotal - discount
        )

        tax_amount = MONEY_ZERO
        if self.taxable:
            tax_amount = quantize_money(
                taxable_amount
                * self.tax_rate
                / Decimal("100.00")
            )

        self.quantity = quantity
        self.unit_price = unit_price
        self.discount_amount = discount
        self.subtotal_amount = subtotal
        self.taxable_amount = taxable_amount
        self.tax_amount = tax_amount
        self.total_amount = quantize_money(
            taxable_amount + tax_amount
        )

    def clean(self) -> None:
        super().clean()

        if (
            self.debit_note_id
            and self.company_id
            and self.debit_note.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "company":
                        "Item company must match "
                        "supplier debit note company."
                }
            )

        if (
            self.debit_note_id
            and not self.debit_note.can_be_edited
        ):
            raise ValidationError(
                "Cannot edit items for an issued, "
                "posted, or cancelled supplier debit note."
            )

        if (
            self.bill_item_id
            and self.debit_note_id
            and self.bill_item.bill_id
            != self.debit_note.bill_id
        ):
            raise ValidationError(
                {
                    "bill_item":
                        "Bill item must belong to the "
                        "supplier debit note bill."
                }
            )

        if (
            self.bill_item_id
            and self.company_id
            and self.bill_item.company_id
            != self.company_id
        ):
            raise ValidationError(
                {
                    "bill_item":
                        "Bill item does not belong "
                        "to this company."
                }
            )

        if self.purchase_return_item_id:
            source = self.purchase_return_item

            if not self.debit_note.purchase_return_id:
                raise ValidationError(
                    {
                        "purchase_return_item":
                            "Debit note must reference "
                            "a purchase return."
                    }
                )

            if (
                source.purchase_return_id
                != self.debit_note.purchase_return_id
            ):
                raise ValidationError(
                    {
                        "purchase_return_item":
                            "Purchase return item must belong "
                            "to the debit note purchase return."
                    }
                )

            if (
                self.company_id
                and source.company_id
                != self.company_id
            ):
                raise ValidationError(
                    {
                        "purchase_return_item":
                            "Purchase return item does not "
                            "belong to this company."
                    }
                )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item does not belong "
                            "to this company."
                    }
                )

        self.quantity = quantize_quantity(
            self.quantity
        )
        self.unit_price = quantize_money(
            self.unit_price
        )
        self.discount_amount = quantize_money(
            self.discount_amount
        )
        self.tax_rate = quantize_money(
            self.tax_rate
        )

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                        "Quantity must be greater than zero."
                }
            )

        if self.unit_price < MONEY_ZERO:
            raise ValidationError(
                {
                    "unit_price":
                        "Unit price cannot be negative."
                }
            )

        if self.discount_amount < MONEY_ZERO:
            raise ValidationError(
                {
                    "discount_amount":
                        "Discount cannot be negative."
                }
            )

        if self.tax_rate < MONEY_ZERO:
            raise ValidationError(
                {
                    "tax_rate":
                        "Tax rate cannot be negative."
                }
            )

    def save(self, *args, **kwargs):
        if (
            self.debit_note_id
            and not self.company_id
        ):
            self.company = self.debit_note.company

        self.apply_source_snapshot()
        self.calculate_totals()
        self.full_clean()

        super().save(*args, **kwargs)

        if self.debit_note_id:
            self.debit_note.recalculate_totals(
                save=True
            )

    def delete(self, *args, **kwargs):
        debit_note = self.debit_note

        if not debit_note.can_be_edited:
            raise ValidationError(
                "Cannot delete items from an issued, "
                "posted, or cancelled supplier debit note."
            )

        result = super().delete(*args, **kwargs)

        debit_note.recalculate_totals(
            save=True
        )

        return result

