# ============================================================
# 📂 inventory/models.py
# 🧠 PrimeyAcc | Company Inventory & Stock Models V2.3
# ------------------------------------------------------------
# ✅ Company-scoped inventory foundation
# ✅ Warehouses under company and optional branch
# ✅ Stock balances per company / warehouse / catalog item
# ✅ Transitional stock balance location bridge
# ✅ Transitional stock movement location bridge
# ✅ Location/company/warehouse ownership validation
# ✅ Stock movement ledger
# ✅ Advanced inventory locations and bins foundation
# ✅ Hierarchical warehouse locations
# ✅ Receiving / shipping / adjustment locations
# ✅ Tenant isolation through company FK
# ✅ No frontend company_id trust
# ✅ Catalog item ownership validation
# ✅ Warehouse ownership validation
# ✅ Branch ownership validation
# ✅ Prevent negative stock at model/service layer
# ✅ Snapshot catalog item data at movement time
# ✅ Ready for purchases receiving integration later
# ✅ Batch and lot master records
# ✅ Batch balances per warehouse location
# ✅ Serial number lifecycle tracking
# ✅ Manufacturing and expiry date validation
# ✅ Detailed inventory tracking ledger
# ✅ Batch and serial tenant isolation
# ✅ Stock reservation header foundation
# ✅ Sales order stock allocation foundation
# ✅ Location-aware reservation allocations
# ✅ Batch and serial reservation references
# ✅ Reservation quantity lifecycle validation
# ✅ Sales order and inventory tenant consistency
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل بيانات المخزون مرتبطة بشركة واحدة فقط
# - الشركة تؤخذ من request.company في APIs وليس من company_id القادم من الفرونت
# - المستودع يجب أن يتبع نفس الشركة
# - الفرع إن وجد يجب أن يتبع نفس الشركة
# - الصنف يجب أن يتبع نفس الشركة ويكون منتجًا وليس خدمة
# - StockItem يمثل الرصيد الحالي
# - StockMovement يمثل دفتر حركة المخزون
# - لا يتم السماح بالرصيد السالب إلا إذا تم تفعيله لاحقًا من إعدادات الشركة
# - الربط مع فواتير الشراء سيكون لاحقًا من خلال services وليس من الواجهة
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import F, Q, Sum
from django.utils import timezone

from catalog.models import (
    CatalogItem,
    CatalogItemTrackingMethod,
    CatalogItemType,
)
from companies.models import Branch, Company


QUANTITY_ZERO = Decimal("0.0000")
MONEY_ZERO = Decimal("0.00")


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


class WarehouseStatus(models.TextChoices):
    """
    Warehouse lifecycle status.
    """

    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class WarehouseType(models.TextChoices):
    """
    Warehouse type.

    MAIN:
        Main company warehouse.

    BRANCH:
        Branch-level warehouse.

    RETURN:
        Returns warehouse.

    DAMAGE:
        Damaged goods warehouse.

    VIRTUAL:
        Virtual/logical warehouse.
    """

    MAIN = "MAIN", "Main"
    BRANCH = "BRANCH", "Branch"
    RETURN = "RETURN", "Return"
    DAMAGE = "DAMAGE", "Damage"
    VIRTUAL = "VIRTUAL", "Virtual"


class StockMovementType(models.TextChoices):
    """
    Stock movement type.

    IN:
        Stock quantity increases.

    OUT:
        Stock quantity decreases.

    ADJUSTMENT:
        Manual correction. Can increase or decrease using direction.

    TRANSFER_IN:
        Stock received from another warehouse.

    TRANSFER_OUT:
        Stock sent to another warehouse.
    """

    IN = "IN", "In"
    OUT = "OUT", "Out"
    ADJUSTMENT = "ADJUSTMENT", "Adjustment"
    TRANSFER_IN = "TRANSFER_IN", "Transfer in"
    TRANSFER_OUT = "TRANSFER_OUT", "Transfer out"


class StockMovementStatus(models.TextChoices):
    """
    Stock movement status.

    DRAFT:
        Prepared but not applied to stock.

    POSTED:
        Applied to stock.

    CANCELLED:
        Cancelled before posting or reversed later through another movement.
    """

    DRAFT = "DRAFT", "Draft"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class StockMovementDirection(models.TextChoices):
    """
    Direction used to update stock balance.
    """

    INCREASE = "INCREASE", "Increase"
    DECREASE = "DECREASE", "Decrease"


class Warehouse(models.Model):
    """
    Company-scoped warehouse.

    A warehouse is always owned by one company.
    It may optionally be linked to a company branch.

    Tenant isolation:
    - APIs must assign company from request.company.
    - Frontend company_id must never be trusted.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="warehouses",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        related_name="warehouses",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Branch",
        help_text="Optional branch. Must belong to the same company.",
    )

    status = models.CharField(
        max_length=20,
        choices=WarehouseStatus.choices,
        default=WarehouseStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )
    warehouse_type = models.CharField(
        max_length=20,
        choices=WarehouseType.choices,
        default=WarehouseType.MAIN,
        db_index=True,
        verbose_name="Warehouse type",
    )

    code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Warehouse code",
        help_text="Unique warehouse code inside the same company.",
    )
    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Warehouse name",
    )
    name_ar = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Arabic name",
    )
    name_en = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="English name",
    )

    is_default = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Default warehouse",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    manager_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Manager name",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Phone",
    )
    email = models.EmailField(
        blank=True,
        default="",
        db_index=True,
        verbose_name="Email",
    )

    country = models.CharField(
        max_length=100,
        default="Saudi Arabia",
        verbose_name="Country",
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        default="",
        db_index=True,
        verbose_name="City",
    )
    district = models.CharField(
        max_length=150,
        blank=True,
        default="",
        db_index=True,
        verbose_name="District",
    )
    address = models.TextField(
        blank=True,
        default="",
        verbose_name="Address",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_inventory_warehouses",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_inventory_warehouses",
        blank=True,
        null=True,
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
        verbose_name = "Warehouse"
        verbose_name_plural = "Warehouses"
        ordering = ["company_id", "-is_default", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_inventory_warehouse_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_inventory_warehouse_name_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "warehouse_type"]),
            models.Index(fields=["company", "is_default"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "branch"]),
            models.Index(fields=["company", "city"]),
            models.Index(fields=["code"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.display_name} - {self.company.display_name}"

    @property
    def display_name(self) -> str:
        return self.name_ar or self.name_en or self.name

    @property
    def is_active_warehouse(self) -> bool:
        return self.status == WarehouseStatus.ACTIVE and self.is_active

    def clean(self) -> None:
        super().clean()

        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()

        if not self.code:
            raise ValidationError({"code": "Warehouse code is required."})

        if not self.name:
            self.name = self.name_ar or self.name_en

        if not self.name:
            raise ValidationError({"name": "Warehouse name is required."})

        if self.branch_id and self.company_id:
            if self.branch.company_id != self.company_id:
                raise ValidationError(
                    {"branch": "Selected branch does not belong to this company."}
                )

        if self.status in [WarehouseStatus.INACTIVE, WarehouseStatus.ARCHIVED]:
            self.is_active = False

        if self.status == WarehouseStatus.ACTIVE:
            self.is_active = True

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

        if self.is_default:
            Warehouse.objects.filter(
                company=self.company,
                is_default=True,
            ).exclude(pk=self.pk).update(is_default=False)

    def activate(self, user=None) -> None:
        self.status = WarehouseStatus.ACTIVE
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
        self.status = WarehouseStatus.INACTIVE
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

    def archive(self, user=None) -> None:
        self.status = WarehouseStatus.ARCHIVED
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




class InventoryLocationStatus(models.TextChoices):
    """
    Inventory location lifecycle status.
    """

    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class InventoryLocationType(models.TextChoices):
    """
    Internal warehouse location type.

    ZONE:
        Large warehouse zone or section.

    AISLE:
        Warehouse aisle.

    RACK:
        Storage rack.

    BIN:
        Physical storage bin.

    RECEIVING:
        Dedicated receiving location.

    SHIPPING:
        Dedicated picking or shipping location.

    ADJUSTMENT:
        Dedicated inventory adjustment location.

    VIRTUAL:
        Logical location without a physical position.
    """

    ZONE = "ZONE", "Zone"
    AISLE = "AISLE", "Aisle"
    RACK = "RACK", "Rack"
    BIN = "BIN", "Bin"
    RECEIVING = "RECEIVING", "Receiving"
    SHIPPING = "SHIPPING", "Shipping"
    ADJUSTMENT = "ADJUSTMENT", "Adjustment"
    VIRTUAL = "VIRTUAL", "Virtual"


class InventoryLocation(models.Model):
    """
    Company-scoped internal warehouse location.

    A location always belongs to exactly one company and one warehouse.
    Locations may form a hierarchy through the optional parent field.

    Examples:
        Main warehouse
        └── Zone A
            └── Aisle 01
                └── Rack 01
                    └── Bin 01

    Tenant isolation:
    - APIs must assign company from request.company.
    - Frontend company_id must never be trusted.
    - Warehouse and parent must belong to the same company.
    - Parent must belong to the same warehouse.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="inventory_locations",
        db_index=True,
        verbose_name="Company",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="locations",
        db_index=True,
        verbose_name="Warehouse",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        related_name="children",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Parent location",
        help_text="Optional parent location inside the same warehouse.",
    )

    status = models.CharField(
        max_length=20,
        choices=InventoryLocationStatus.choices,
        default=InventoryLocationStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )
    location_type = models.CharField(
        max_length=20,
        choices=InventoryLocationType.choices,
        default=InventoryLocationType.BIN,
        db_index=True,
        verbose_name="Location type",
    )

    code = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Location code",
        help_text="Unique location code inside the same warehouse.",
    )
    name = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Location name",
    )
    name_ar = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Arabic name",
    )
    name_en = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="English name",
    )
    barcode = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Barcode",
        help_text="Optional unique barcode inside the same warehouse.",
    )

    is_default = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Default location",
    )
    is_receiving = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Receiving location",
    )
    is_shipping = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Shipping location",
    )
    is_adjustment = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Adjustment location",
    )
    is_pickable = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Pickable",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    sequence = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sequence",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_inventory_locations",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_inventory_locations",
        blank=True,
        null=True,
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
        verbose_name = "Inventory location"
        verbose_name_plural = "Inventory locations"
        ordering = [
            "company_id",
            "warehouse_id",
            "sequence",
            "code",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["warehouse", "code"],
                name="unique_inventory_location_code_per_warehouse",
            ),
            models.UniqueConstraint(
                fields=["warehouse", "barcode"],
                condition=~Q(barcode=""),
                name="unique_inventory_location_barcode_per_warehouse",
            ),
            models.UniqueConstraint(
                fields=["warehouse"],
                condition=Q(is_default=True),
                name="unique_default_inventory_location_per_warehouse",
            ),
            models.UniqueConstraint(
                fields=["warehouse"],
                condition=Q(is_receiving=True),
                name="unique_receiving_inventory_location_per_warehouse",
            ),
            models.UniqueConstraint(
                fields=["warehouse"],
                condition=Q(is_shipping=True),
                name="unique_shipping_inventory_location_per_warehouse",
            ),
            models.UniqueConstraint(
                fields=["warehouse"],
                condition=Q(is_adjustment=True),
                name="unique_adjustment_inventory_location_per_warehouse",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "location_type"]),
            models.Index(fields=["warehouse", "parent"]),
            models.Index(fields=["warehouse", "status"]),
            models.Index(fields=["warehouse", "location_type"]),
            models.Index(fields=["warehouse", "is_default"]),
            models.Index(fields=["warehouse", "is_receiving"]),
            models.Index(fields=["warehouse", "is_shipping"]),
            models.Index(fields=["warehouse", "is_adjustment"]),
            models.Index(fields=["warehouse", "is_pickable"]),
            models.Index(fields=["warehouse", "is_active"]),
            models.Index(fields=["barcode"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_path} - {self.warehouse.display_name}"

    @property
    def display_name(self) -> str:
        return self.name_ar or self.name_en or self.name

    @property
    def is_active_location(self) -> bool:
        return (
            self.status == InventoryLocationStatus.ACTIVE
            and self.is_active
            and self.warehouse.is_active_warehouse
        )

    @property
    def full_path(self) -> str:
        """
        Return a readable path without performing unbounded traversal.
        """
        names = [self.display_name]
        current = self.parent
        visited: set[int] = set()

        while current is not None:
            if current.pk and current.pk in visited:
                names.append("[cycle]")
                break

            if current.pk:
                visited.add(current.pk)

            names.append(current.display_name)
            current = current.parent

        return " / ".join(reversed(names))

    def clean(self) -> None:
        super().clean()

        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()
        self.barcode = (self.barcode or "").strip()

        if not self.code:
            raise ValidationError(
                {"code": "Inventory location code is required."}
            )

        if not self.name:
            self.name = self.name_ar or self.name_en

        if not self.name:
            raise ValidationError(
                {"name": "Inventory location name is required."}
            )

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {
                        "warehouse": (
                            "Selected warehouse does not belong to this company."
                        )
                    }
                )

        if self.parent_id:
            if self.pk and self.parent_id == self.pk:
                raise ValidationError(
                    {"parent": "Inventory location cannot be its own parent."}
                )

            if self.company_id and self.parent.company_id != self.company_id:
                raise ValidationError(
                    {
                        "parent": (
                            "Parent location does not belong to this company."
                        )
                    }
                )

            if self.warehouse_id and self.parent.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "parent": (
                            "Parent location must belong to the same warehouse."
                        )
                    }
                )

            current = self.parent
            visited: set[int] = set()

            while current is not None:
                if self.pk and current.pk == self.pk:
                    raise ValidationError(
                        {
                            "parent": (
                                "Inventory location hierarchy cannot contain a cycle."
                            )
                        }
                    )

                if current.pk and current.pk in visited:
                    raise ValidationError(
                        {
                            "parent": (
                                "Inventory location hierarchy contains a cycle."
                            )
                        }
                    )

                if current.pk:
                    visited.add(current.pk)

                current = current.parent

        if self.status in [
            InventoryLocationStatus.INACTIVE,
            InventoryLocationStatus.ARCHIVED,
        ]:
            self.is_active = False

        if self.status == InventoryLocationStatus.ACTIVE:
            self.is_active = True

        if self.location_type == InventoryLocationType.RECEIVING:
            self.is_receiving = True

        if self.location_type == InventoryLocationType.SHIPPING:
            self.is_shipping = True

        if self.location_type == InventoryLocationType.ADJUSTMENT:
            self.is_adjustment = True

        if self.is_receiving or self.is_shipping or self.is_adjustment:
            self.is_pickable = False

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def activate(self, user=None) -> None:
        self.status = InventoryLocationStatus.ACTIVE
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
        self.status = InventoryLocationStatus.INACTIVE
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

    def archive(self, user=None) -> None:
        self.status = InventoryLocationStatus.ARCHIVED
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


class StockItem(models.Model):
    """
    Current stock balance for one catalog item inside one location.

    One row represents:
    company + warehouse + inventory location + catalog item

    The same item may have multiple independent balances inside
    different locations of the same warehouse.

    StockMovement is the ledger.
    StockItem is the current location-level balance.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="stock_items",
        db_index=True,
        verbose_name="Company",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="stock_items",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="location_stock_items",
        db_index=True,
        verbose_name="Inventory location",
        help_text=(
            "Required location that owns this independent stock balance."
        ),
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="stock_items",
        db_index=True,
        verbose_name="Catalog item",
    )

    quantity_on_hand = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Quantity on hand",
    )
    reserved_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Reserved quantity",
    )
    minimum_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Minimum quantity",
    )
    maximum_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Maximum quantity",
    )
    average_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Average cost",
    )

    last_movement_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Last movement at",
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
        verbose_name = "Stock item"
        verbose_name_plural = "Stock items"
        ordering = [
            "company_id",
            "warehouse_id",
            "location_id",
            "item__name",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "warehouse",
                    "location",
                    "item",
                ],
                name=(
                    "unique_stock_item_per_company_"
                    "warehouse_location_item"
                ),
            ),
        ]
        indexes = [
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "location", "item"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "quantity_on_hand"]),
            models.Index(fields=["warehouse", "item"]),
            models.Index(fields=["last_movement_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.item.name} - "
            f"{self.warehouse.display_name} - "
            f"{self.location.display_name} - "
            f"{self.quantity_on_hand}"
        )

    @property
    def available_quantity(self) -> Decimal:
        available = quantize_quantity(self.quantity_on_hand - self.reserved_quantity)
        if available < QUANTITY_ZERO:
            return QUANTITY_ZERO
        return available

    @property
    def is_below_minimum(self) -> bool:
        if self.minimum_quantity <= QUANTITY_ZERO:
            return False
        return self.quantity_on_hand < self.minimum_quantity

    def clean(self) -> None:
        super().clean()

        self.quantity_on_hand = quantize_quantity(self.quantity_on_hand)
        self.reserved_quantity = quantize_quantity(self.reserved_quantity)
        self.minimum_quantity = quantize_quantity(self.minimum_quantity)
        self.maximum_quantity = quantize_quantity(self.maximum_quantity)
        self.average_cost = quantize_money(self.average_cost)

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {"warehouse": "Selected warehouse does not belong to this company."}
                )

        if not self.location_id:
            raise ValidationError(
                {
                    "location": (
                        "Inventory location is required for every "
                        "stock balance."
                    )
                }
            )

        if self.location.company_id != self.company_id:
            raise ValidationError(
                {
                    "location": (
                        "Selected inventory location does not belong "
                        "to this company."
                    )
                }
            )

        if self.location.warehouse_id != self.warehouse_id:
            raise ValidationError(
                {
                    "location": (
                        "Selected inventory location does not belong "
                        "to this warehouse."
                    )
                }
            )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {"item": "Selected catalog item does not belong to this company."}
                )

            if self.item.item_type != CatalogItemType.PRODUCT:
                raise ValidationError(
                    {"item": "Only product catalog items can be tracked in inventory."}
                )

        if self.quantity_on_hand < QUANTITY_ZERO:
            raise ValidationError(
                {"quantity_on_hand": "Quantity on hand cannot be negative."}
            )

        if self.reserved_quantity < QUANTITY_ZERO:
            raise ValidationError(
                {"reserved_quantity": "Reserved quantity cannot be negative."}
            )

        if self.reserved_quantity > self.quantity_on_hand:
            raise ValidationError(
                {"reserved_quantity": "Reserved quantity cannot exceed quantity on hand."}
            )

        if self.minimum_quantity < QUANTITY_ZERO:
            raise ValidationError(
                {"minimum_quantity": "Minimum quantity cannot be negative."}
            )

        if self.maximum_quantity < QUANTITY_ZERO:
            raise ValidationError(
                {"maximum_quantity": "Maximum quantity cannot be negative."}
            )

        if self.maximum_quantity > QUANTITY_ZERO and self.minimum_quantity > self.maximum_quantity:
            raise ValidationError(
                {"maximum_quantity": "Maximum quantity cannot be less than minimum quantity."}
            )

        if self.average_cost < MONEY_ZERO:
            raise ValidationError({"average_cost": "Average cost cannot be negative."})


class StockMovement(models.Model):
    """
    Inventory movement ledger.

    Each posted movement updates StockItem quantity.
    Draft movements do not affect stock.

    Purchases, sales, returns, and accounting integrations should create stock
    movements through inventory.services later.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="stock_movements",
        db_index=True,
        verbose_name="Company",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="stock_movements",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="location_stock_movements",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Inventory location",
        help_text=(
            "Transitional nullable location. Existing movements will be "
            "linked to their warehouse default location."
        ),
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="movements",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Stock item",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="stock_movements",
        db_index=True,
        verbose_name="Catalog item",
    )

    movement_type = models.CharField(
        max_length=30,
        choices=StockMovementType.choices,
        db_index=True,
        verbose_name="Movement type",
    )
    direction = models.CharField(
        max_length=20,
        choices=StockMovementDirection.choices,
        db_index=True,
        verbose_name="Direction",
    )
    status = models.CharField(
        max_length=20,
        choices=StockMovementStatus.choices,
        default=StockMovementStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    movement_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Movement number",
        help_text="Unique movement number inside the same company.",
    )
    movement_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Movement date",
    )

    quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        validators=[MinValueValidator(Decimal("0.0001"))],
        verbose_name="Quantity",
    )
    unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Unit cost",
    )
    total_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Total cost",
    )

    quantity_before = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Quantity before",
    )
    quantity_after = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Quantity after",
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

    reference_type = models.CharField(
        max_length=80,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Reference type",
        help_text="Optional source type such as purchase_bill, sales_invoice, manual_adjustment.",
    )
    reference_id = models.PositiveBigIntegerField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Reference ID",
    )
    reference_number = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Reference number",
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
        related_name="posted_stock_movements",
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
        related_name="cancelled_stock_movements",
        blank=True,
        null=True,
        verbose_name="Cancelled by",
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancellation reason",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_stock_movements",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_stock_movements",
        blank=True,
        null=True,
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
        verbose_name = "Stock movement"
        verbose_name_plural = "Stock movements"
        ordering = ["-movement_date", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "movement_number"],
                name="unique_stock_movement_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "movement_type"]),
            models.Index(fields=["company", "direction"]),
            models.Index(fields=["company", "movement_date"]),
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "location", "item"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "reference_type", "reference_id"]),
            models.Index(fields=["warehouse", "item"]),
            models.Index(fields=["stock_item", "status"]),
            models.Index(fields=["posted_at"]),
            models.Index(fields=["cancelled_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.movement_number} - {self.item_name_snapshot} - {self.quantity}"

    @property
    def is_draft(self) -> bool:
        return self.status == StockMovementStatus.DRAFT

    @property
    def is_posted(self) -> bool:
        return self.status == StockMovementStatus.POSTED

    @property
    def is_cancelled(self) -> bool:
        return self.status == StockMovementStatus.CANCELLED

    @property
    def can_post(self) -> bool:
        return self.status == StockMovementStatus.DRAFT

    @property
    def can_cancel(self) -> bool:
        return self.status == StockMovementStatus.DRAFT

    def clean(self) -> None:
        super().clean()

        self.movement_number = (self.movement_number or "").strip()
        self.reference_type = (self.reference_type or "").strip()
        self.reference_number = (self.reference_number or "").strip()

        if not self.movement_number:
            raise ValidationError({"movement_number": "Movement number is required."})

        self.quantity = quantize_quantity(self.quantity)
        self.unit_cost = quantize_money(self.unit_cost)
        self.total_cost = quantize_money(self.quantity * self.unit_cost)
        self.quantity_before = quantize_quantity(self.quantity_before)
        self.quantity_after = quantize_quantity(self.quantity_after)

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError({"quantity": "Quantity must be greater than zero."})

        if self.unit_cost < MONEY_ZERO:
            raise ValidationError({"unit_cost": "Unit cost cannot be negative."})

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {"warehouse": "Selected warehouse does not belong to this company."}
                )

        if self.location_id:
            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this company."
                        )
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this warehouse."
                        )
                    }
                )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {"item": "Selected catalog item does not belong to this company."}
                )

            if self.item.item_type != CatalogItemType.PRODUCT:
                raise ValidationError(
                    {"item": "Only product catalog items can have stock movements."}
                )

        if self.stock_item_id and self.company_id:
            if self.stock_item.company_id != self.company_id:
                raise ValidationError(
                    {"stock_item": "Selected stock item does not belong to this company."}
                )

            if self.stock_item.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {"stock_item": "Stock item warehouse must match movement warehouse."}
                )

            if self.stock_item.item_id != self.item_id:
                raise ValidationError(
                    {"stock_item": "Stock item catalog item must match movement item."}
                )

            if self.stock_item.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item location must match movement location."
                        )
                    }
                )

        if self.movement_type in [
            StockMovementType.IN,
            StockMovementType.TRANSFER_IN,
        ]:
            self.direction = StockMovementDirection.INCREASE

        if self.movement_type in [
            StockMovementType.OUT,
            StockMovementType.TRANSFER_OUT,
        ]:
            self.direction = StockMovementDirection.DECREASE

        if self.movement_type == StockMovementType.ADJUSTMENT:
            if self.direction not in [
                StockMovementDirection.INCREASE,
                StockMovementDirection.DECREASE,
            ]:
                raise ValidationError(
                    {"direction": "Adjustment movement requires a valid direction."}
                )

    def apply_item_snapshot(self) -> None:
        """
        Copy catalog item data into movement snapshot fields.
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

        if not self.unit_cost or self.unit_cost == MONEY_ZERO:
            self.unit_cost = self.item.cost_price or self.item.purchase_price or MONEY_ZERO

    def save(self, *args, **kwargs):
        if self.item_id:
            self.apply_item_snapshot()

        self.full_clean()
        super().save(*args, **kwargs)

class InventoryBatchStatus(models.TextChoices):
    """
    Inventory batch lifecycle status.
    """

    ACTIVE = "ACTIVE", "Active"
    DEPLETED = "DEPLETED", "Depleted"
    EXPIRED = "EXPIRED", "Expired"
    BLOCKED = "BLOCKED", "Blocked"
    ARCHIVED = "ARCHIVED", "Archived"


class InventorySerialStatus(models.TextChoices):
    """
    Inventory serial number lifecycle status.
    """

    AVAILABLE = "AVAILABLE", "Available"
    RESERVED = "RESERVED", "Reserved"
    ISSUED = "ISSUED", "Issued"
    BLOCKED = "BLOCKED", "Blocked"
    ARCHIVED = "ARCHIVED", "Archived"


class InventoryTrackingEntryType(models.TextChoices):
    """
    Detailed batch or serial tracking event type.
    """

    RECEIPT = "RECEIPT", "Receipt"
    ISSUE = "ISSUE", "Issue"
    TRANSFER_IN = "TRANSFER_IN", "Transfer in"
    TRANSFER_OUT = "TRANSFER_OUT", "Transfer out"
    ADJUSTMENT_IN = "ADJUSTMENT_IN", "Adjustment in"
    ADJUSTMENT_OUT = "ADJUSTMENT_OUT", "Adjustment out"
    RESERVATION = "RESERVATION", "Reservation"
    RELEASE = "RELEASE", "Reservation release"
    BLOCK = "BLOCK", "Block"
    UNBLOCK = "UNBLOCK", "Unblock"


class InventoryBatch(models.Model):
    """
    Company-scoped batch or lot master record.

    The batch identifies one lot of one catalog product. Physical quantities
    are stored separately in InventoryBatchBalance so the same batch may exist
    in multiple warehouse locations without duplicating the batch identity.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="inventory_batches",
        db_index=True,
        verbose_name="Company",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="inventory_batches",
        db_index=True,
        verbose_name="Catalog item",
    )

    status = models.CharField(
        max_length=20,
        choices=InventoryBatchStatus.choices,
        default=InventoryBatchStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    batch_number = models.CharField(
        max_length=120,
        db_index=True,
        verbose_name="Batch / lot number",
        help_text="Unique batch number for this catalog item inside the company.",
    )
    supplier_batch_number = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Supplier batch number",
    )

    manufactured_at = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Manufacturing date",
    )
    expiry_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expiry date",
    )

    received_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="First received at",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_inventory_batches",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_inventory_batches",
        blank=True,
        null=True,
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
        verbose_name = "Inventory batch"
        verbose_name_plural = "Inventory batches"
        ordering = [
            "company_id",
            "item_id",
            "expiry_date",
            "batch_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "item", "batch_number"],
                name="unique_inventory_batch_per_company_item",
            ),
            models.CheckConstraint(
                condition=(
                    Q(manufactured_at__isnull=True)
                    | Q(expiry_date__isnull=True)
                    | Q(expiry_date__gte=F("manufactured_at"))
                ),
                name="inventory_batch_expiry_after_manufacture",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "batch_number"]),
            models.Index(fields=["company", "expiry_date"]),
            models.Index(fields=["company", "item", "expiry_date"]),
            models.Index(fields=["status", "expiry_date"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.batch_number} - {self.item.name}"

    @property
    def is_expired(self) -> bool:
        return bool(
            self.expiry_date
            and self.expiry_date < timezone.localdate()
        )

    @property
    def is_available_for_issue(self) -> bool:
        return (
            self.status == InventoryBatchStatus.ACTIVE
            and not self.is_expired
        )

    def clean(self) -> None:
        super().clean()

        self.batch_number = (self.batch_number or "").strip().upper()
        self.supplier_batch_number = (
            self.supplier_batch_number or ""
        ).strip().upper()

        if not self.batch_number:
            raise ValidationError(
                {"batch_number": "Batch number is required."}
            )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item": (
                            "Selected catalog item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.item.item_type != CatalogItemType.PRODUCT:
                raise ValidationError(
                    {
                        "item": (
                            "Only product catalog items can have "
                            "inventory batches."
                        )
                    }
                )

            if not self.item.track_inventory:
                raise ValidationError(
                    {
                        "item": (
                            "Catalog item must have inventory tracking enabled."
                        )
                    }
                )

            if (
                self.item.inventory_tracking_method
                != CatalogItemTrackingMethod.BATCH
            ):
                raise ValidationError(
                    {
                        "item": (
                            "Catalog item must use batch tracking."
                        )
                    }
                )

            if self.item.track_expiry_dates and not self.expiry_date:
                raise ValidationError(
                    {
                        "expiry_date": (
                            "Expiry date is required for this catalog item."
                        )
                    }
                )

        if (
            self.manufactured_at
            and self.expiry_date
            and self.expiry_date < self.manufactured_at
        ):
            raise ValidationError(
                {
                    "expiry_date": (
                        "Expiry date cannot be earlier than "
                        "manufacturing date."
                    )
                }
            )

        if self.is_expired and self.status == InventoryBatchStatus.ACTIVE:
            self.status = InventoryBatchStatus.EXPIRED

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class InventoryBatchBalance(models.Model):
    """
    Current quantity for one batch in one warehouse location.

    One row represents:
    company + warehouse + location + catalog item + batch
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="inventory_batch_balances",
        db_index=True,
        verbose_name="Company",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="batch_balances",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="batch_balances",
        db_index=True,
        verbose_name="Inventory location",
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="batch_balances",
        db_index=True,
        verbose_name="Stock item",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="inventory_batch_balances",
        db_index=True,
        verbose_name="Catalog item",
    )
    batch = models.ForeignKey(
        InventoryBatch,
        on_delete=models.PROTECT,
        related_name="balances",
        db_index=True,
        verbose_name="Inventory batch",
    )

    quantity_on_hand = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Quantity on hand",
    )
    reserved_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Reserved quantity",
    )
    average_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Average cost",
    )

    last_movement_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Last movement at",
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
        verbose_name = "Inventory batch balance"
        verbose_name_plural = "Inventory batch balances"
        ordering = [
            "company_id",
            "warehouse_id",
            "location_id",
            "item_id",
            "batch_id",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "warehouse",
                    "location",
                    "item",
                    "batch",
                ],
                name="unique_inventory_batch_balance_location",
            ),
            models.CheckConstraint(
                condition=Q(quantity_on_hand__gte=QUANTITY_ZERO),
                name="inventory_batch_balance_quantity_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(reserved_quantity__gte=QUANTITY_ZERO),
                name="inventory_batch_reserved_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(reserved_quantity__lte=F("quantity_on_hand")),
                name="inventory_batch_reserved_not_above_on_hand",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "location", "item"]),
            models.Index(fields=["company", "item", "batch"]),
            models.Index(fields=["company", "batch"]),
            models.Index(fields=["batch", "quantity_on_hand"]),
            models.Index(fields=["last_movement_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.batch.batch_number} - "
            f"{self.location.display_name} - "
            f"{self.quantity_on_hand}"
        )

    @property
    def available_quantity(self) -> Decimal:
        available = quantize_quantity(
            self.quantity_on_hand - self.reserved_quantity
        )
        if available < QUANTITY_ZERO:
            return QUANTITY_ZERO
        return available

    @property
    def is_available_for_issue(self) -> bool:
        return (
            self.available_quantity > QUANTITY_ZERO
            and self.batch.is_available_for_issue
        )

    def clean(self) -> None:
        super().clean()

        self.quantity_on_hand = quantize_quantity(self.quantity_on_hand)
        self.reserved_quantity = quantize_quantity(self.reserved_quantity)
        self.average_cost = quantize_money(self.average_cost)

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {
                        "warehouse": (
                            "Selected warehouse does not belong "
                            "to this company."
                        )
                    }
                )

        if self.location_id:
            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this company."
                        )
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this warehouse."
                        )
                    }
                )

        if self.item_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item": (
                            "Selected catalog item does not belong "
                            "to this company."
                        )
                    }
                )

            if (
                self.item.inventory_tracking_method
                != CatalogItemTrackingMethod.BATCH
            ):
                raise ValidationError(
                    {"item": "Catalog item must use batch tracking."}
                )

        if self.batch_id:
            if self.batch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "batch": (
                            "Selected batch does not belong to this company."
                        )
                    }
                )

            if self.batch.item_id != self.item_id:
                raise ValidationError(
                    {
                        "batch": (
                            "Selected batch must belong to the same "
                            "catalog item."
                        )
                    }
                )

        if self.stock_item_id:
            if self.stock_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Selected stock item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.stock_item.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item warehouse must match "
                            "batch balance warehouse."
                        )
                    }
                )

            if self.stock_item.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item location must match "
                            "batch balance location."
                        )
                    }
                )

            if self.stock_item.item_id != self.item_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item catalog item must match "
                            "batch balance item."
                        )
                    }
                )

        if self.quantity_on_hand < QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity_on_hand": (
                        "Quantity on hand cannot be negative."
                    )
                }
            )

        if self.reserved_quantity < QUANTITY_ZERO:
            raise ValidationError(
                {
                    "reserved_quantity": (
                        "Reserved quantity cannot be negative."
                    )
                }
            )

        if self.reserved_quantity > self.quantity_on_hand:
            raise ValidationError(
                {
                    "reserved_quantity": (
                        "Reserved quantity cannot exceed quantity on hand."
                    )
                }
            )

        if self.average_cost < MONEY_ZERO:
            raise ValidationError(
                {"average_cost": "Average cost cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class InventorySerialNumber(models.Model):
    """
    Company-scoped serial number representing one physical inventory unit.

    A serial number may be present in only one current location at a time.
    Issued or archived serial numbers may retain their latest location as
    historical context while their lifecycle status prevents reuse.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="inventory_serial_numbers",
        db_index=True,
        verbose_name="Company",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="inventory_serial_numbers",
        db_index=True,
        verbose_name="Catalog item",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="serial_numbers",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Current warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="serial_numbers",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Current inventory location",
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="serial_numbers",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Current stock item",
    )

    status = models.CharField(
        max_length=20,
        choices=InventorySerialStatus.choices,
        default=InventorySerialStatus.AVAILABLE,
        db_index=True,
        verbose_name="Status",
    )

    serial_number = models.CharField(
        max_length=180,
        db_index=True,
        verbose_name="Serial number",
        help_text="Unique serial number inside the company.",
    )
    manufacturer_serial_number = models.CharField(
        max_length=180,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Manufacturer serial number",
    )

    unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Unit cost",
    )

    received_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Received at",
    )
    issued_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Issued at",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_inventory_serial_numbers",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_inventory_serial_numbers",
        blank=True,
        null=True,
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
        verbose_name = "Inventory serial number"
        verbose_name_plural = "Inventory serial numbers"
        ordering = [
            "company_id",
            "item_id",
            "serial_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "serial_number"],
                name="unique_inventory_serial_number_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "manufacturer_serial_number"],
                condition=~Q(manufacturer_serial_number=""),
                name="unique_manufacturer_serial_per_company",
            ),
            models.CheckConstraint(
                condition=Q(unit_cost__gte=MONEY_ZERO),
                name="inventory_serial_unit_cost_nonnegative",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "location", "item"]),
            models.Index(fields=["company", "serial_number"]),
            models.Index(fields=["item", "status"]),
            models.Index(fields=["received_at"]),
            models.Index(fields=["issued_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.serial_number} - {self.item.name}"

    @property
    def is_available(self) -> bool:
        return self.status == InventorySerialStatus.AVAILABLE

    @property
    def is_in_stock(self) -> bool:
        return (
            self.status
            in {
                InventorySerialStatus.AVAILABLE,
                InventorySerialStatus.RESERVED,
                InventorySerialStatus.BLOCKED,
            }
            and self.warehouse_id is not None
            and self.location_id is not None
            and self.stock_item_id is not None
        )

    def clean(self) -> None:
        super().clean()

        self.serial_number = (self.serial_number or "").strip().upper()
        self.manufacturer_serial_number = (
            self.manufacturer_serial_number or ""
        ).strip().upper()
        self.unit_cost = quantize_money(self.unit_cost)

        if not self.serial_number:
            raise ValidationError(
                {"serial_number": "Serial number is required."}
            )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item": (
                            "Selected catalog item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.item.item_type != CatalogItemType.PRODUCT:
                raise ValidationError(
                    {
                        "item": (
                            "Only product catalog items can have "
                            "serial numbers."
                        )
                    }
                )

            if not self.item.track_inventory:
                raise ValidationError(
                    {
                        "item": (
                            "Catalog item must have inventory tracking enabled."
                        )
                    }
                )

            if (
                self.item.inventory_tracking_method
                != CatalogItemTrackingMethod.SERIAL
            ):
                raise ValidationError(
                    {
                        "item": (
                            "Catalog item must use serial number tracking."
                        )
                    }
                )

        location_required_statuses = {
            InventorySerialStatus.AVAILABLE,
            InventorySerialStatus.RESERVED,
            InventorySerialStatus.BLOCKED,
        }

        if self.status in location_required_statuses:
            location_errors = {}

            if not self.warehouse_id:
                location_errors["warehouse"] = (
                    "Current warehouse is required for an "
                    "in-stock serial number."
                )

            if not self.location_id:
                location_errors["location"] = (
                    "Current location is required for an "
                    "in-stock serial number."
                )

            if not self.stock_item_id:
                location_errors["stock_item"] = (
                    "Current stock item is required for an "
                    "in-stock serial number."
                )

            if location_errors:
                raise ValidationError(location_errors)

        if self.warehouse_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {
                        "warehouse": (
                            "Selected warehouse does not belong "
                            "to this company."
                        )
                    }
                )

        if self.location_id:
            if not self.warehouse_id:
                raise ValidationError(
                    {
                        "warehouse": (
                            "Warehouse is required when a location is selected."
                        )
                    }
                )

            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this company."
                        )
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this warehouse."
                        )
                    }
                )

        if self.stock_item_id:
            if self.stock_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Selected stock item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.stock_item.item_id != self.item_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item catalog item must match "
                            "serial number item."
                        )
                    }
                )

            if self.stock_item.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item warehouse must match "
                            "serial number warehouse."
                        )
                    }
                )

            if self.stock_item.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item location must match "
                            "serial number location."
                        )
                    }
                )

        if self.unit_cost < MONEY_ZERO:
            raise ValidationError(
                {"unit_cost": "Unit cost cannot be negative."}
            )

        if self.status == InventorySerialStatus.ISSUED and not self.issued_at:
            self.issued_at = timezone.now()

        if self.status != InventorySerialStatus.ISSUED:
            self.issued_at = None

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class InventoryTrackingEntry(models.Model):
    """
    Immutable-style detailed ledger entry for one batch or serial number.

    The entry records batch/serial movement history. Stock mutation remains
    the responsibility of inventory.services so model saves cannot silently
    change StockItem or InventoryBatchBalance quantities.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="inventory_tracking_entries",
        db_index=True,
        verbose_name="Company",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="inventory_tracking_entries",
        db_index=True,
        verbose_name="Catalog item",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="tracking_entries",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="tracking_entries",
        db_index=True,
        verbose_name="Inventory location",
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="tracking_entries",
        db_index=True,
        verbose_name="Stock item",
    )
    stock_movement = models.ForeignKey(
        StockMovement,
        on_delete=models.PROTECT,
        related_name="tracking_entries",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Stock movement",
    )

    batch = models.ForeignKey(
        InventoryBatch,
        on_delete=models.PROTECT,
        related_name="tracking_entries",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Inventory batch",
    )
    serial_number = models.ForeignKey(
        InventorySerialNumber,
        on_delete=models.PROTECT,
        related_name="tracking_entries",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Serial number",
    )

    entry_type = models.CharField(
        max_length=30,
        choices=InventoryTrackingEntryType.choices,
        db_index=True,
        verbose_name="Tracking entry type",
    )
    direction = models.CharField(
        max_length=20,
        choices=StockMovementDirection.choices,
        db_index=True,
        verbose_name="Direction",
    )

    quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        validators=[MinValueValidator(Decimal("0.0001"))],
        verbose_name="Quantity",
    )
    quantity_before = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Quantity before",
    )
    quantity_after = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Quantity after",
    )
    unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Unit cost",
    )

    reference_type = models.CharField(
        max_length=80,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Reference type",
    )
    reference_id = models.PositiveBigIntegerField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Reference ID",
    )
    reference_number = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        verbose_name="Reference number",
    )

    occurred_at = models.DateTimeField(
        default=timezone.now,
        db_index=True,
        verbose_name="Occurred at",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_inventory_tracking_entries",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )

    class Meta:
        verbose_name = "Inventory tracking entry"
        verbose_name_plural = "Inventory tracking entries"
        ordering = ["-occurred_at", "-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    (
                        Q(batch__isnull=False)
                        & Q(serial_number__isnull=True)
                    )
                    | (
                        Q(batch__isnull=True)
                        & Q(serial_number__isnull=False)
                    )
                ),
                name="inventory_tracking_batch_or_serial_only",
            ),
            models.CheckConstraint(
                condition=Q(quantity__gt=QUANTITY_ZERO),
                name="inventory_tracking_quantity_positive",
            ),
            models.CheckConstraint(
                condition=Q(unit_cost__gte=MONEY_ZERO),
                name="inventory_tracking_unit_cost_nonnegative",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "entry_type"]),
            models.Index(fields=["company", "occurred_at"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "batch"]),
            models.Index(fields=["company", "serial_number"]),
            models.Index(fields=["company", "reference_type", "reference_id"]),
            models.Index(fields=["stock_movement", "entry_type"]),
            models.Index(fields=["occurred_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        tracked_value = (
            self.batch.batch_number
            if self.batch_id
            else self.serial_number.serial_number
        )
        return f"{self.entry_type} - {tracked_value} - {self.quantity}"

    def clean(self) -> None:
        super().clean()

        self.reference_type = (self.reference_type or "").strip()
        self.reference_number = (self.reference_number or "").strip()
        self.quantity = quantize_quantity(self.quantity)
        self.quantity_before = quantize_quantity(self.quantity_before)
        self.quantity_after = quantize_quantity(self.quantity_after)
        self.unit_cost = quantize_money(self.unit_cost)

        if bool(self.batch_id) == bool(self.serial_number_id):
            raise ValidationError(
                {
                    "batch": (
                        "Select exactly one tracking target: "
                        "batch or serial number."
                    ),
                    "serial_number": (
                        "Select exactly one tracking target: "
                        "batch or serial number."
                    ),
                }
            )

        if self.quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {"quantity": "Tracking quantity must be greater than zero."}
            )

        if self.unit_cost < MONEY_ZERO:
            raise ValidationError(
                {"unit_cost": "Unit cost cannot be negative."}
            )

        if self.warehouse_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {
                        "warehouse": (
                            "Selected warehouse does not belong "
                            "to this company."
                        )
                    }
                )

        if self.location_id:
            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this company."
                        )
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this warehouse."
                        )
                    }
                )

        if self.item_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item": (
                            "Selected catalog item does not belong "
                            "to this company."
                        )
                    }
                )

        if self.stock_item_id:
            if self.stock_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Selected stock item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.stock_item.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item warehouse must match "
                            "tracking entry warehouse."
                        )
                    }
                )

            if self.stock_item.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item location must match "
                            "tracking entry location."
                        )
                    }
                )

            if self.stock_item.item_id != self.item_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item catalog item must match "
                            "tracking entry item."
                        )
                    }
                )

        if self.stock_movement_id:
            if self.stock_movement.company_id != self.company_id:
                raise ValidationError(
                    {
                        "stock_movement": (
                            "Selected stock movement does not belong "
                            "to this company."
                        )
                    }
                )

            if self.stock_movement.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "stock_movement": (
                            "Stock movement warehouse must match "
                            "tracking entry warehouse."
                        )
                    }
                )

            if self.stock_movement.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_movement": (
                            "Stock movement location must match "
                            "tracking entry location."
                        )
                    }
                )

            if self.stock_movement.item_id != self.item_id:
                raise ValidationError(
                    {
                        "stock_movement": (
                            "Stock movement item must match "
                            "tracking entry item."
                        )
                    }
                )

        if self.batch_id:
            if self.batch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "batch": (
                            "Selected batch does not belong to this company."
                        )
                    }
                )

            if self.batch.item_id != self.item_id:
                raise ValidationError(
                    {
                        "batch": (
                            "Selected batch must belong to the same item."
                        )
                    }
                )

            if (
                self.item.inventory_tracking_method
                != CatalogItemTrackingMethod.BATCH
            ):
                raise ValidationError(
                    {
                        "item": (
                            "Batch tracking entry requires a "
                            "batch-tracked catalog item."
                        )
                    }
                )

        if self.serial_number_id:
            if self.serial_number.company_id != self.company_id:
                raise ValidationError(
                    {
                        "serial_number": (
                            "Selected serial number does not belong "
                            "to this company."
                        )
                    }
                )

            if self.serial_number.item_id != self.item_id:
                raise ValidationError(
                    {
                        "serial_number": (
                            "Selected serial number must belong "
                            "to the same item."
                        )
                    }
                )

            if (
                self.item.inventory_tracking_method
                != CatalogItemTrackingMethod.SERIAL
            ):
                raise ValidationError(
                    {
                        "item": (
                            "Serial tracking entry requires a "
                            "serial-tracked catalog item."
                        )
                    }
                )

            if self.quantity != Decimal("1.0000"):
                raise ValidationError(
                    {
                        "quantity": (
                            "A serial number tracking entry must "
                            "have quantity 1."
                        )
                    }
                )

        increase_types = {
            InventoryTrackingEntryType.RECEIPT,
            InventoryTrackingEntryType.TRANSFER_IN,
            InventoryTrackingEntryType.ADJUSTMENT_IN,
            InventoryTrackingEntryType.RELEASE,
            InventoryTrackingEntryType.UNBLOCK,
        }
        decrease_types = {
            InventoryTrackingEntryType.ISSUE,
            InventoryTrackingEntryType.TRANSFER_OUT,
            InventoryTrackingEntryType.ADJUSTMENT_OUT,
            InventoryTrackingEntryType.RESERVATION,
            InventoryTrackingEntryType.BLOCK,
        }

        if self.entry_type in increase_types:
            self.direction = StockMovementDirection.INCREASE

        if self.entry_type in decrease_types:
            self.direction = StockMovementDirection.DECREASE

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

# ============================================================
# Phase 22.3.1 — Stock Reservations & Sales Order Allocation
# ============================================================


class StockReservationStatus(models.TextChoices):
    """
    Stock reservation lifecycle status.
    """

    DRAFT = "DRAFT", "Draft"
    PARTIALLY_ALLOCATED = "PARTIALLY_ALLOCATED", "Partially allocated"
    ALLOCATED = "ALLOCATED", "Allocated"
    PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED", "Partially fulfilled"
    FULFILLED = "FULFILLED", "Fulfilled"
    RELEASED = "RELEASED", "Released"
    CANCELLED = "CANCELLED", "Cancelled"
    EXPIRED = "EXPIRED", "Expired"


class StockReservationSource(models.TextChoices):
    """
    Source that created the stock reservation.
    """

    SALES_ORDER = "SALES_ORDER", "Sales order"
    MANUAL = "MANUAL", "Manual"
    API = "API", "API"
    IMPORT = "IMPORT", "Import"


class StockReservationAllocationStatus(models.TextChoices):
    """
    Lifecycle status for one location-level reservation allocation.
    """

    DRAFT = "DRAFT", "Draft"
    RESERVED = "RESERVED", "Reserved"
    PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED", "Partially fulfilled"
    FULFILLED = "FULFILLED", "Fulfilled"
    RELEASED = "RELEASED", "Released"
    CANCELLED = "CANCELLED", "Cancelled"


class StockReservation(models.Model):
    """
    Company-scoped stock reservation header for one sales order.

    The reservation header records demand and lifecycle totals.
    Exact warehouse, location, batch, and serial allocation is stored in
    StockReservationAllocation.

    Saving this model does not mutate StockItem.reserved_quantity.
    All stock reservation effects must be applied atomically through
    inventory.services.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="stock_reservations",
        db_index=True,
        verbose_name="Company",
    )
    sales_order = models.ForeignKey(
        "sales.SalesOrder",
        on_delete=models.PROTECT,
        related_name="stock_reservations",
        db_index=True,
        verbose_name="Sales order",
    )

    reservation_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Reservation number",
        help_text="Unique reservation number inside the same company.",
    )
    status = models.CharField(
        max_length=30,
        choices=StockReservationStatus.choices,
        default=StockReservationStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )
    source = models.CharField(
        max_length=20,
        choices=StockReservationSource.choices,
        default=StockReservationSource.SALES_ORDER,
        db_index=True,
        verbose_name="Source",
    )

    requested_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Requested quantity",
    )
    reserved_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Reserved quantity",
    )
    fulfilled_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Fulfilled quantity",
    )
    released_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Released quantity",
    )

    expires_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expires at",
    )
    allocated_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Allocated at",
    )
    fulfilled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Fulfilled at",
    )
    released_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Released at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )
    expired_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Expired at",
    )

    release_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Release reason",
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancellation reason",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_stock_reservations",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_stock_reservations",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )
    allocated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="allocated_stock_reservations",
        blank=True,
        null=True,
        verbose_name="Allocated by",
    )
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="released_stock_reservations",
        blank=True,
        null=True,
        verbose_name="Released by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_stock_reservations",
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
        verbose_name = "Stock reservation"
        verbose_name_plural = "Stock reservations"
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "reservation_number"],
                name="unique_stock_reservation_number_per_company",
            ),
            models.CheckConstraint(
                condition=Q(requested_quantity__gte=QUANTITY_ZERO),
                name="stock_reservation_requested_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(reserved_quantity__gte=QUANTITY_ZERO),
                name="stock_reservation_reserved_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(fulfilled_quantity__gte=QUANTITY_ZERO),
                name="stock_reservation_fulfilled_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(released_quantity__gte=QUANTITY_ZERO),
                name="stock_reservation_released_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(
                    reserved_quantity__lte=F("requested_quantity")
                ),
                name="stock_reservation_reserved_not_above_requested",
            ),
            models.CheckConstraint(
                condition=Q(
                    fulfilled_quantity__lte=F("reserved_quantity")
                ),
                name="stock_reservation_fulfilled_not_above_reserved",
            ),
            models.CheckConstraint(
                condition=Q(
                    released_quantity__lte=F("reserved_quantity")
                ),
                name="stock_reservation_released_not_above_reserved",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "source"]),
            models.Index(fields=["company", "sales_order"]),
            models.Index(fields=["company", "expires_at"]),
            models.Index(fields=["sales_order", "status"]),
            models.Index(fields=["reservation_number"]),
            models.Index(fields=["allocated_at"]),
            models.Index(fields=["fulfilled_at"]),
            models.Index(fields=["released_at"]),
            models.Index(fields=["cancelled_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.reservation_number} - "
            f"{self.sales_order.order_number} - "
            f"{self.status}"
        )

    @property
    def is_draft(self) -> bool:
        return self.status == StockReservationStatus.DRAFT

    @property
    def is_active(self) -> bool:
        return self.status in {
            StockReservationStatus.PARTIALLY_ALLOCATED,
            StockReservationStatus.ALLOCATED,
            StockReservationStatus.PARTIALLY_FULFILLED,
        }

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            StockReservationStatus.FULFILLED,
            StockReservationStatus.RELEASED,
            StockReservationStatus.CANCELLED,
            StockReservationStatus.EXPIRED,
        }

    @property
    def remaining_reserved_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.reserved_quantity
            - self.fulfilled_quantity
            - self.released_quantity
        )
        return max(remaining, QUANTITY_ZERO)

    @property
    def unallocated_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.requested_quantity - self.reserved_quantity
        )
        return max(remaining, QUANTITY_ZERO)

    @property
    def is_expired_now(self) -> bool:
        return bool(
            self.expires_at
            and self.expires_at <= timezone.now()
            and not self.is_terminal
        )

    def clean(self) -> None:
        """
        Validate tenant ownership, quantities, and lifecycle state.
        """
        super().clean()

        self.reservation_number = (
            self.reservation_number or ""
        ).strip().upper()
        self.release_reason = (self.release_reason or "").strip()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (self.notes or "").strip()

        self.requested_quantity = quantize_quantity(
            self.requested_quantity
        )
        self.reserved_quantity = quantize_quantity(
            self.reserved_quantity
        )
        self.fulfilled_quantity = quantize_quantity(
            self.fulfilled_quantity
        )
        self.released_quantity = quantize_quantity(
            self.released_quantity
        )

        errors = {}

        if not self.reservation_number:
            errors["reservation_number"] = (
                "Reservation number is required."
            )

        if self.sales_order_id and self.company_id:
            if self.sales_order.company_id != self.company_id:
                errors["sales_order"] = (
                    "Sales order does not belong to this company."
                )

            if self.sales_order.status == "CANCELLED":
                errors["sales_order"] = (
                    "A cancelled sales order cannot own an active "
                    "stock reservation."
                )

        for field_name in [
            "requested_quantity",
            "reserved_quantity",
            "fulfilled_quantity",
            "released_quantity",
        ]:
            if getattr(self, field_name) < QUANTITY_ZERO:
                errors[field_name] = (
                    "Reservation quantity cannot be negative."
                )

        if self.reserved_quantity > self.requested_quantity:
            errors["reserved_quantity"] = (
                "Reserved quantity cannot exceed requested quantity."
            )

        if self.fulfilled_quantity > self.reserved_quantity:
            errors["fulfilled_quantity"] = (
                "Fulfilled quantity cannot exceed reserved quantity."
            )

        if self.released_quantity > self.reserved_quantity:
            errors["released_quantity"] = (
                "Released quantity cannot exceed reserved quantity."
            )

        if (
            self.fulfilled_quantity + self.released_quantity
            > self.reserved_quantity
        ):
            errors["released_quantity"] = (
                "Fulfilled and released quantities together cannot exceed "
                "reserved quantity."
            )

        if (
            self.expires_at
            and self.pk
            and self.created_at
            and self.expires_at <= self.created_at
        ):
            errors["expires_at"] = (
                "Reservation expiry must be later than creation time."
            )

        if self.status == StockReservationStatus.FULFILLED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "A fulfilled reservation cannot have a remaining "
                    "reserved quantity."
                )

            if not self.fulfilled_at:
                self.fulfilled_at = timezone.now()

        if self.status == StockReservationStatus.RELEASED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "A released reservation cannot have a remaining "
                    "reserved quantity."
                )

            if not self.released_at:
                self.released_at = timezone.now()

        if self.status == StockReservationStatus.CANCELLED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "Release all remaining reserved quantity before "
                    "cancelling the reservation."
                )

            if not self.cancelled_at:
                self.cancelled_at = timezone.now()

        if self.status == StockReservationStatus.EXPIRED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "Release all remaining reserved quantity before "
                    "expiring the reservation."
                )

            if not self.expired_at:
                self.expired_at = timezone.now()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class StockReservationAllocation(models.Model):
    """
    Exact physical stock allocation for one sales order line.

    A sales order item may be distributed across multiple warehouses,
    locations, batches, or serial numbers.

    Saving this model does not mutate StockItem, InventoryBatchBalance,
    InventorySerialNumber, or StockMovement. Reservation services are the
    only source of stock reservation effects.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="stock_reservation_allocations",
        db_index=True,
        verbose_name="Company",
    )
    reservation = models.ForeignKey(
        StockReservation,
        on_delete=models.PROTECT,
        related_name="allocations",
        db_index=True,
        verbose_name="Stock reservation",
    )
    sales_order_item = models.ForeignKey(
        "sales.SalesOrderItem",
        on_delete=models.PROTECT,
        related_name="stock_reservation_allocations",
        db_index=True,
        verbose_name="Sales order item",
    )

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="reservation_allocations",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="reservation_allocations",
        db_index=True,
        verbose_name="Inventory location",
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="reservation_allocations",
        db_index=True,
        verbose_name="Stock item",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="stock_reservation_allocations",
        db_index=True,
        verbose_name="Catalog item",
    )
    batch = models.ForeignKey(
        InventoryBatch,
        on_delete=models.PROTECT,
        related_name="reservation_allocations",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Inventory batch",
    )
    serial_number = models.ForeignKey(
        InventorySerialNumber,
        on_delete=models.PROTECT,
        related_name="reservation_allocations",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Inventory serial number",
    )

    status = models.CharField(
        max_length=30,
        choices=StockReservationAllocationStatus.choices,
        default=StockReservationAllocationStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    reserved_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        validators=[MinValueValidator(Decimal("0.0001"))],
        verbose_name="Reserved quantity",
    )
    fulfilled_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Fulfilled quantity",
    )
    released_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Released quantity",
    )

    reserved_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Reserved at",
    )
    fulfilled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Fulfilled at",
    )
    released_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Released at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    release_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Release reason",
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancellation reason",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_stock_reservation_allocations",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_stock_reservation_allocations",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="released_stock_reservation_allocations",
        blank=True,
        null=True,
        verbose_name="Released by",
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
        verbose_name = "Stock reservation allocation"
        verbose_name_plural = "Stock reservation allocations"
        ordering = [
            "reservation_id",
            "sales_order_item_id",
            "warehouse_id",
            "location_id",
            "id",
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(reserved_quantity__gt=QUANTITY_ZERO),
                name="stock_reservation_allocation_reserved_positive",
            ),
            models.CheckConstraint(
                condition=Q(fulfilled_quantity__gte=QUANTITY_ZERO),
                name="stock_reservation_allocation_fulfilled_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(released_quantity__gte=QUANTITY_ZERO),
                name="stock_reservation_allocation_released_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(
                    fulfilled_quantity__lte=F("reserved_quantity")
                ),
                name="stock_reservation_allocation_fulfilled_not_above_reserved",
            ),
            models.CheckConstraint(
                condition=Q(
                    released_quantity__lte=F("reserved_quantity")
                ),
                name="stock_reservation_allocation_released_not_above_reserved",
            ),
            models.CheckConstraint(
                condition=~(
                    Q(batch__isnull=False)
                    & Q(serial_number__isnull=False)
                ),
                name="stock_reservation_batch_and_serial_not_together",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "reservation"]),
            models.Index(fields=["company", "sales_order_item"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "location", "item"]),
            models.Index(fields=["company", "item", "batch"]),
            models.Index(fields=["company", "serial_number"]),
            models.Index(fields=["reservation", "status"]),
            models.Index(fields=["sales_order_item", "status"]),
            models.Index(fields=["stock_item", "status"]),
            models.Index(fields=["reserved_at"]),
            models.Index(fields=["fulfilled_at"]),
            models.Index(fields=["released_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        tracked_value = ""

        if self.batch_id:
            tracked_value = f" / {self.batch.batch_number}"
        elif self.serial_number_id:
            tracked_value = (
                f" / {self.serial_number.serial_number}"
            )

        return (
            f"{self.reservation.reservation_number} - "
            f"{self.item.name} - "
            f"{self.location.display_name}"
            f"{tracked_value} - "
            f"{self.reserved_quantity}"
        )

    @property
    def remaining_reserved_quantity(self) -> Decimal:
        remaining = quantize_quantity(
            self.reserved_quantity
            - self.fulfilled_quantity
            - self.released_quantity
        )
        return max(remaining, QUANTITY_ZERO)

    @property
    def is_active(self) -> bool:
        return self.status in {
            StockReservationAllocationStatus.RESERVED,
            StockReservationAllocationStatus.PARTIALLY_FULFILLED,
        }

    @property
    def is_terminal(self) -> bool:
        return self.status in {
            StockReservationAllocationStatus.FULFILLED,
            StockReservationAllocationStatus.RELEASED,
            StockReservationAllocationStatus.CANCELLED,
        }

    def clean(self) -> None:
        """
        Validate tenant, order, stock source, tracking, and quantities.
        """
        super().clean()

        self.release_reason = (self.release_reason or "").strip()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (self.notes or "").strip()

        self.reserved_quantity = quantize_quantity(
            self.reserved_quantity
        )
        self.fulfilled_quantity = quantize_quantity(
            self.fulfilled_quantity
        )
        self.released_quantity = quantize_quantity(
            self.released_quantity
        )

        errors = {}

        if self.reservation_id:
            if self.reservation.company_id != self.company_id:
                errors["reservation"] = (
                    "Reservation does not belong to this company."
                )

        if self.sales_order_item_id:
            if self.sales_order_item.company_id != self.company_id:
                errors["sales_order_item"] = (
                    "Sales order item does not belong to this company."
                )
            elif (
                self.reservation_id
                and self.sales_order_item.order_id
                != self.reservation.sales_order_id
            ):
                errors["sales_order_item"] = (
                    "Sales order item does not belong to the reservation "
                    "sales order."
                )

        if self.warehouse_id:
            if self.warehouse.company_id != self.company_id:
                errors["warehouse"] = (
                    "Warehouse does not belong to this company."
                )

        if self.location_id:
            if self.location.company_id != self.company_id:
                errors["location"] = (
                    "Inventory location does not belong to this company."
                )
            elif self.location.warehouse_id != self.warehouse_id:
                errors["location"] = (
                    "Inventory location does not belong to this warehouse."
                )
            elif not self.location.is_active_location:
                errors["location"] = (
                    "Stock reservation requires an active location."
                )
            elif not self.location.is_pickable:
                errors["location"] = (
                    "Stock reservation requires a pickable location."
                )

        if self.item_id:
            if self.item.company_id != self.company_id:
                errors["item"] = (
                    "Catalog item does not belong to this company."
                )
            elif self.item.item_type != CatalogItemType.PRODUCT:
                errors["item"] = (
                    "Only product catalog items can be reserved."
                )
            elif not self.item.track_inventory:
                errors["item"] = (
                    "Catalog item must have inventory tracking enabled."
                )

        if self.sales_order_item_id and self.item_id:
            if not self.sales_order_item.catalog_item_id:
                errors["sales_order_item"] = (
                    "Sales order item must reference a catalog item."
                )
            elif (
                self.sales_order_item.catalog_item_id
                != self.item_id
            ):
                errors["item"] = (
                    "Allocation item must match the sales order item."
                )

        if self.stock_item_id:
            if self.stock_item.company_id != self.company_id:
                errors["stock_item"] = (
                    "Stock item does not belong to this company."
                )
            elif self.stock_item.warehouse_id != self.warehouse_id:
                errors["stock_item"] = (
                    "Stock item warehouse must match allocation warehouse."
                )
            elif self.stock_item.location_id != self.location_id:
                errors["stock_item"] = (
                    "Stock item location must match allocation location."
                )
            elif self.stock_item.item_id != self.item_id:
                errors["stock_item"] = (
                    "Stock item catalog item must match allocation item."
                )

        tracking_method = (
            self.item.inventory_tracking_method
            if self.item_id
            else None
        )

        if self.batch_id and self.serial_number_id:
            errors["batch"] = (
                "Batch and serial number cannot be selected together."
            )
            errors["serial_number"] = (
                "Batch and serial number cannot be selected together."
            )

        if tracking_method == CatalogItemTrackingMethod.BATCH:
            if not self.batch_id:
                errors["batch"] = (
                    "A batch-tracked item requires an inventory batch."
                )
            elif self.batch.company_id != self.company_id:
                errors["batch"] = (
                    "Inventory batch does not belong to this company."
                )
            elif self.batch.item_id != self.item_id:
                errors["batch"] = (
                    "Inventory batch must belong to the allocation item."
                )
            elif not self.batch.is_available_for_issue:
                errors["batch"] = (
                    "Inventory batch is not available for reservation."
                )

            if self.serial_number_id:
                errors["serial_number"] = (
                    "Batch-tracked items cannot use a serial number."
                )

        elif tracking_method == CatalogItemTrackingMethod.SERIAL:
            if not self.serial_number_id:
                errors["serial_number"] = (
                    "A serial-tracked item requires a serial number."
                )
            else:
                if self.serial_number.company_id != self.company_id:
                    errors["serial_number"] = (
                        "Serial number does not belong to this company."
                    )
                elif self.serial_number.item_id != self.item_id:
                    errors["serial_number"] = (
                        "Serial number must belong to the allocation item."
                    )
                elif (
                    self.serial_number.warehouse_id
                    != self.warehouse_id
                ):
                    errors["serial_number"] = (
                        "Serial number warehouse must match allocation "
                        "warehouse."
                    )
                elif (
                    self.serial_number.location_id
                    != self.location_id
                ):
                    errors["serial_number"] = (
                        "Serial number location must match allocation "
                        "location."
                    )
                elif (
                    self.serial_number.stock_item_id
                    != self.stock_item_id
                ):
                    errors["serial_number"] = (
                        "Serial number stock item must match allocation "
                        "stock item."
                    )
                elif self.serial_number.status not in {
                    InventorySerialStatus.AVAILABLE,
                    InventorySerialStatus.RESERVED,
                }:
                    errors["serial_number"] = (
                        "Serial number is not available for reservation."
                    )

            if self.batch_id:
                errors["batch"] = (
                    "Serial-tracked items cannot use an inventory batch."
                )

            if self.reserved_quantity != Decimal("1.0000"):
                errors["reserved_quantity"] = (
                    "A serial number allocation must reserve quantity 1."
                )

        else:
            if self.batch_id:
                errors["batch"] = (
                    "Non-batch-tracked items cannot use an inventory batch."
                )

            if self.serial_number_id:
                errors["serial_number"] = (
                    "Non-serial-tracked items cannot use a serial number."
                )

        if self.reserved_quantity <= QUANTITY_ZERO:
            errors["reserved_quantity"] = (
                "Reserved quantity must be greater than zero."
            )

        if self.fulfilled_quantity < QUANTITY_ZERO:
            errors["fulfilled_quantity"] = (
                "Fulfilled quantity cannot be negative."
            )

        if self.released_quantity < QUANTITY_ZERO:
            errors["released_quantity"] = (
                "Released quantity cannot be negative."
            )

        if self.fulfilled_quantity > self.reserved_quantity:
            errors["fulfilled_quantity"] = (
                "Fulfilled quantity cannot exceed reserved quantity."
            )

        if self.released_quantity > self.reserved_quantity:
            errors["released_quantity"] = (
                "Released quantity cannot exceed reserved quantity."
            )

        if (
            self.fulfilled_quantity + self.released_quantity
            > self.reserved_quantity
        ):
            errors["released_quantity"] = (
                "Fulfilled and released quantities together cannot exceed "
                "reserved quantity."
            )

        if self.status == StockReservationAllocationStatus.RESERVED:
            if not self.reserved_at:
                self.reserved_at = timezone.now()

        if (
            self.status
            == StockReservationAllocationStatus.PARTIALLY_FULFILLED
        ):
            if (
                self.fulfilled_quantity <= QUANTITY_ZERO
                or self.remaining_reserved_quantity <= QUANTITY_ZERO
            ):
                errors["status"] = (
                    "Partially fulfilled allocation requires fulfilled and "
                    "remaining reserved quantities."
                )

        if self.status == StockReservationAllocationStatus.FULFILLED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "A fulfilled allocation cannot have a remaining "
                    "reserved quantity."
                )

            if not self.fulfilled_at:
                self.fulfilled_at = timezone.now()

        if self.status == StockReservationAllocationStatus.RELEASED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "A released allocation cannot have a remaining "
                    "reserved quantity."
                )

            if not self.released_at:
                self.released_at = timezone.now()

        if self.status == StockReservationAllocationStatus.CANCELLED:
            if self.remaining_reserved_quantity != QUANTITY_ZERO:
                errors["status"] = (
                    "Release all remaining reserved quantity before "
                    "cancelling the allocation."
                )

            if not self.cancelled_at:
                self.cancelled_at = timezone.now()

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

# ============================================================
# Phase 22.4 - Goods Issues Foundation
# ============================================================


class GoodsIssueStatus(models.TextChoices):
    """
    Goods issue lifecycle.
    """

    DRAFT = "DRAFT", "Draft"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class GoodsIssue(models.Model):
    """
    Company-scoped goods issue document.

    A goods issue consumes inventory for a sales order. Actual stock effects
    are applied through inventory.services only.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="goods_issues",
        db_index=True,
        verbose_name="Company",
    )
    sales_order = models.ForeignKey(
        "sales.SalesOrder",
        on_delete=models.PROTECT,
        related_name="goods_issues",
        db_index=True,
        verbose_name="Sales order",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="goods_issues",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="goods_issues",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Default issue location",
    )

    issue_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Issue number",
    )
    issue_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Issue date",
    )
    status = models.CharField(
        max_length=20,
        choices=GoodsIssueStatus.choices,
        default=GoodsIssueStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
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
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancellation reason",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_goods_issues",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_goods_issues",
        blank=True,
        null=True,
        verbose_name="Updated by",
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="posted_goods_issues",
        blank=True,
        null=True,
        verbose_name="Posted by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="cancelled_goods_issues",
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
        verbose_name = "Goods issue"
        verbose_name_plural = "Goods issues"
        ordering = [
            "-issue_date",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "company",
                    "issue_number",
                ],
                name="unique_goods_issue_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "issue_date"]),
            models.Index(fields=["company", "sales_order"]),
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "location"]),
            models.Index(fields=["posted_at"]),
            models.Index(fields=["cancelled_at"]),
        ]

    def __str__(self) -> str:
        return self.issue_number

    @property
    def is_draft(self) -> bool:
        return self.status == GoodsIssueStatus.DRAFT

    @property
    def is_posted(self) -> bool:
        return self.status == GoodsIssueStatus.POSTED

    @property
    def is_cancelled(self) -> bool:
        return self.status == GoodsIssueStatus.CANCELLED

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

        self.issue_number = (
            self.issue_number or ""
        ).strip().upper()
        self.cancellation_reason = (
            self.cancellation_reason or ""
        ).strip()
        self.notes = (
            self.notes or ""
        ).strip()

        if not self.issue_number:
            raise ValidationError(
                {
                    "issue_number":
                        "Goods issue number is required."
                }
            )

        if self.sales_order_id and self.company_id:
            if self.sales_order.company_id != self.company_id:
                raise ValidationError(
                    {
                        "sales_order":
                            "Sales order does not belong "
                            "to this company."
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

        if self.location_id:
            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location":
                            "Location does not belong "
                            "to this company."
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location":
                            "Location does not belong "
                            "to selected warehouse."
                    }
                )

    def mark_posted(self, user=None) -> None:
        if not self.can_be_posted:
            raise ValidationError(
                "Only draft goods issues can be posted."
            )

        self.status = GoodsIssueStatus.POSTED
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
                "Only draft goods issues can be cancelled."
            )

        self.status = GoodsIssueStatus.CANCELLED
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


class GoodsIssueItem(models.Model):
    """
    Goods issue line.

    It may consume a reservation allocation from Phase 22.3 or issue directly
    from a selected stock item.
    """

    issue = models.ForeignKey(
        GoodsIssue,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Goods issue",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="goods_issue_items",
        db_index=True,
        verbose_name="Company",
    )
    sales_order_item = models.ForeignKey(
        "sales.SalesOrderItem",
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        db_index=True,
        verbose_name="Sales order item",
    )
    reservation_allocation = models.ForeignKey(
        StockReservationAllocation,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Reservation allocation",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        db_index=True,
        verbose_name="Inventory location",
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        db_index=True,
        verbose_name="Stock item",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        db_index=True,
        verbose_name="Catalog item",
    )
    batch = models.ForeignKey(
        InventoryBatch,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Batch",
    )
    serial_number = models.ForeignKey(
        InventorySerialNumber,
        on_delete=models.PROTECT,
        related_name="goods_issue_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Serial number",
    )
    stock_movement = models.OneToOneField(
        StockMovement,
        on_delete=models.PROTECT,
        related_name="goods_issue_item",
        blank=True,
        null=True,
        verbose_name="Stock movement",
    )

    line_number = models.PositiveIntegerField(
        default=1,
        db_index=True,
        verbose_name="Line number",
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        validators=[
            MinValueValidator(Decimal("0.0001"))
        ],
        verbose_name="Quantity",
    )
    unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        validators=[MinValueValidator(MONEY_ZERO)],
        verbose_name="Unit cost",
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
        verbose_name = "Goods issue item"
        verbose_name_plural = "Goods issue items"
        ordering = [
            "issue_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "issue",
                    "line_number",
                ],
                name="unique_goods_issue_item_line",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "issue"]),
            models.Index(fields=["company", "sales_order_item"]),
            models.Index(fields=["company", "reservation_allocation"]),
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "location"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["company", "batch"]),
            models.Index(fields=["company", "serial_number"]),
            models.Index(fields=["company", "created_at"]),
        ]

    def __str__(self) -> str:
        return (
            f"{self.issue.issue_number} - "
            f"{self.item_name_snapshot}"
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

    def clean(self) -> None:
        super().clean()

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
                        "Issue quantity must be greater than zero."
                }
            )

        if self.issue_id and self.company_id:
            if self.issue.company_id != self.company_id:
                raise ValidationError(
                    {
                        "company":
                            "Issue item company must match issue company."
                    }
                )

            if not self.issue.is_draft:
                raise ValidationError(
                    "Only draft goods issue items can be edited."
                )

        if self.sales_order_item_id and self.issue_id:
            if (
                self.sales_order_item.order_id
                != self.issue.sales_order_id
            ):
                raise ValidationError(
                    {
                        "sales_order_item":
                            "Sales order item does not belong "
                            "to the goods issue sales order."
                    }
                )

            if self.sales_order_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "sales_order_item":
                            "Sales order item does not belong "
                            "to this company."
                    }
                )

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {
                        "warehouse":
                            "Warehouse does not belong to this company."
                    }
                )

        if self.location_id:
            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location":
                            "Location does not belong to this company."
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location":
                            "Location does not belong to selected warehouse."
                    }
                )

        if self.stock_item_id:
            if self.stock_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "stock_item":
                            "Stock item does not belong to this company."
                    }
                )

            if self.stock_item.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "stock_item":
                            "Stock item warehouse must match issue item warehouse."
                    }
                )

            if self.stock_item.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_item":
                            "Stock item location must match issue item location."
                    }
                )

            if self.stock_item.item_id != self.item_id:
                raise ValidationError(
                    {
                        "stock_item":
                            "Stock item catalog item must match issue item."
                    }
                )

        if self.item_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item does not belong to this company."
                    }
                )

            if self.item.item_type != CatalogItemType.PRODUCT:
                raise ValidationError(
                    {
                        "item":
                            "Only product catalog items can be issued."
                    }
                )

            if not self.item.track_inventory:
                raise ValidationError(
                    {
                        "item":
                            "Catalog item must track inventory."
                    }
                )

        if self.reservation_allocation_id:
            allocation = self.reservation_allocation

            if allocation.company_id != self.company_id:
                raise ValidationError(
                    {
                        "reservation_allocation":
                            "Reservation allocation does not belong "
                            "to this company."
                    }
                )

            if allocation.sales_order_item_id != self.sales_order_item_id:
                raise ValidationError(
                    {
                        "reservation_allocation":
                            "Reservation allocation must match "
                            "the sales order item."
                    }
                )

            if allocation.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "reservation_allocation":
                            "Reservation allocation warehouse must match."
                    }
                )

            if allocation.location_id != self.location_id:
                raise ValidationError(
                    {
                        "reservation_allocation":
                            "Reservation allocation location must match."
                    }
                )

            if allocation.stock_item_id != self.stock_item_id:
                raise ValidationError(
                    {
                        "reservation_allocation":
                            "Reservation allocation stock item must match."
                    }
                )

            if allocation.item_id != self.item_id:
                raise ValidationError(
                    {
                        "reservation_allocation":
                            "Reservation allocation item must match."
                    }
                )

            if allocation.batch_id != self.batch_id:
                raise ValidationError(
                    {
                        "batch":
                            "Goods issue batch must match reservation allocation."
                    }
                )

            if allocation.serial_number_id != self.serial_number_id:
                raise ValidationError(
                    {
                        "serial_number":
                            "Goods issue serial number must match "
                            "reservation allocation."
                    }
                )

        if self.batch_id:
            if self.batch.company_id != self.company_id:
                raise ValidationError(
                    {
                        "batch":
                            "Batch does not belong to this company."
                    }
                )

            if self.batch.item_id != self.item_id:
                raise ValidationError(
                    {
                        "batch":
                            "Batch item must match issue item."
                    }
                )

        if self.serial_number_id:
            if self.serial_number.company_id != self.company_id:
                raise ValidationError(
                    {
                        "serial_number":
                            "Serial number does not belong to this company."
                    }
                )

            if self.serial_number.item_id != self.item_id:
                raise ValidationError(
                    {
                        "serial_number":
                            "Serial number item must match issue item."
                    }
                )

            if self.quantity != Decimal("1.0000"):
                raise ValidationError(
                    {
                        "quantity":
                            "Serial goods issue quantity must be one."
                    }
                )

    def save(self, *args, **kwargs):
        if self.issue_id and not self.company_id:
            self.company = self.issue.company

        if self.item_id:
            self.apply_item_snapshot()

        self.full_clean()
        super().save(*args, **kwargs)

# ============================================================
# Phase 22.5 - Physical Inventory and Cycle Count Models
# ============================================================


class PhysicalInventoryCountStatus(models.TextChoices):
    """
    Physical inventory count lifecycle status.
    """

    DRAFT = "DRAFT", "Draft"
    IN_PROGRESS = "IN_PROGRESS", "In progress"
    COUNTED = "COUNTED", "Counted"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class PhysicalInventoryCountScope(models.TextChoices):
    """
    Physical inventory count operational scope.
    """

    FULL_WAREHOUSE = "FULL_WAREHOUSE", "Full warehouse"
    LOCATION = "LOCATION", "Location"
    CYCLE_COUNT = "CYCLE_COUNT", "Cycle count"


class PhysicalInventoryCount(models.Model):
    """
    Company-scoped physical inventory or cycle count header.

    The count captures system quantities at count time and posts only
    inventory adjustment movements for detected variances. Posted counts are
    immutable from the service/API perspective.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="physical_inventory_counts",
        db_index=True,
        verbose_name="Company",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="physical_inventory_counts",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="physical_inventory_counts",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Inventory location",
    )

    status = models.CharField(
        max_length=20,
        choices=PhysicalInventoryCountStatus.choices,
        default=PhysicalInventoryCountStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )
    scope = models.CharField(
        max_length=30,
        choices=PhysicalInventoryCountScope.choices,
        default=PhysicalInventoryCountScope.CYCLE_COUNT,
        db_index=True,
        verbose_name="Scope",
    )

    count_number = models.CharField(
        max_length=80,
        db_index=True,
        verbose_name="Count number",
    )
    count_date = models.DateField(
        default=timezone.localdate,
        db_index=True,
        verbose_name="Count date",
    )

    total_system_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Total system quantity",
    )
    total_counted_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Total counted quantity",
    )
    total_variance_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Total variance quantity",
    )
    total_variance_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        verbose_name="Total variance value",
    )

    started_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Started at",
    )
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="started_physical_inventory_counts",
        blank=True,
        null=True,
        verbose_name="Started by",
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
        related_name="posted_physical_inventory_counts",
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
        related_name="cancelled_physical_inventory_counts",
        blank=True,
        null=True,
        verbose_name="Cancelled by",
    )
    cancellation_reason = models.TextField(
        blank=True,
        default="",
        verbose_name="Cancellation reason",
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

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_physical_inventory_counts",
        blank=True,
        null=True,
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_physical_inventory_counts",
        blank=True,
        null=True,
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
        verbose_name = "Physical inventory count"
        verbose_name_plural = "Physical inventory counts"
        ordering = [
            "-count_date",
            "-created_at",
            "-id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "count_number"],
                name="unique_physical_inventory_count_number_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "scope"]),
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "count_date"]),
            models.Index(fields=["posted_at"]),
            models.Index(fields=["cancelled_at"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.count_number} - {self.warehouse.display_name}"

    @property
    def is_draft(self) -> bool:
        return self.status == PhysicalInventoryCountStatus.DRAFT

    @property
    def is_posted(self) -> bool:
        return self.status == PhysicalInventoryCountStatus.POSTED

    @property
    def is_cancelled(self) -> bool:
        return self.status == PhysicalInventoryCountStatus.CANCELLED

    @property
    def can_be_started(self) -> bool:
        return self.status == PhysicalInventoryCountStatus.DRAFT

    @property
    def can_be_posted(self) -> bool:
        return self.status in {
            PhysicalInventoryCountStatus.IN_PROGRESS,
            PhysicalInventoryCountStatus.COUNTED,
        }

    @property
    def can_be_cancelled(self) -> bool:
        return self.status in {
            PhysicalInventoryCountStatus.DRAFT,
            PhysicalInventoryCountStatus.IN_PROGRESS,
            PhysicalInventoryCountStatus.COUNTED,
        }

    def clean(self) -> None:
        super().clean()

        self.count_number = (self.count_number or "").strip().upper()
        self.notes = (self.notes or "").strip()

        if not self.count_number:
            raise ValidationError(
                {"count_number": "Physical inventory count number is required."}
            )

        if self.warehouse_id and self.company_id:
            if self.warehouse.company_id != self.company_id:
                raise ValidationError(
                    {"warehouse": "Selected warehouse does not belong to this company."}
                )

        if self.location_id:
            if self.location.company_id != self.company_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this company."
                        )
                    }
                )

            if self.location.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "location": (
                            "Selected inventory location does not belong "
                            "to this warehouse."
                        )
                    }
                )

            if self.scope == PhysicalInventoryCountScope.FULL_WAREHOUSE:
                raise ValidationError(
                    {
                        "scope": (
                            "Full warehouse counts cannot be restricted "
                            "to one location."
                        )
                    }
                )

        if (
            self.scope == PhysicalInventoryCountScope.LOCATION
            and not self.location_id
        ):
            raise ValidationError(
                {
                    "location": (
                        "Location scope requires an inventory location."
                    )
                }
            )

        self.total_system_quantity = quantize_quantity(
            self.total_system_quantity
        )
        self.total_counted_quantity = quantize_quantity(
            self.total_counted_quantity
        )
        self.total_variance_quantity = quantize_quantity(
            self.total_variance_quantity
        )
        self.total_variance_value = quantize_money(
            self.total_variance_value
        )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class PhysicalInventoryCountItem(models.Model):
    """
    Physical inventory count line.

    system_quantity and system_unit_cost are frozen when the line is created
    so the count can be reviewed and posted safely even if other reads occur
    later.
    """

    count = models.ForeignKey(
        PhysicalInventoryCount,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Physical inventory count",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="physical_inventory_count_items",
        db_index=True,
        verbose_name="Company",
    )
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="physical_inventory_count_items",
        db_index=True,
        verbose_name="Warehouse",
    )
    location = models.ForeignKey(
        InventoryLocation,
        on_delete=models.PROTECT,
        related_name="physical_inventory_count_items",
        db_index=True,
        verbose_name="Inventory location",
    )
    stock_item = models.ForeignKey(
        StockItem,
        on_delete=models.PROTECT,
        related_name="physical_inventory_count_items",
        db_index=True,
        verbose_name="Stock item",
    )
    item = models.ForeignKey(
        CatalogItem,
        on_delete=models.PROTECT,
        related_name="physical_inventory_count_items",
        db_index=True,
        verbose_name="Catalog item",
    )

    line_number = models.PositiveIntegerField(
        default=1,
        db_index=True,
        verbose_name="Line number",
    )
    system_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="System quantity",
    )
    counted_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        validators=[MinValueValidator(QUANTITY_ZERO)],
        verbose_name="Counted quantity",
    )
    variance_quantity = models.DecimalField(
        max_digits=16,
        decimal_places=4,
        default=QUANTITY_ZERO,
        verbose_name="Variance quantity",
    )
    system_unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        verbose_name="System unit cost",
    )
    variance_value = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=MONEY_ZERO,
        verbose_name="Variance value",
    )

    stock_movement = models.ForeignKey(
        StockMovement,
        on_delete=models.SET_NULL,
        related_name="physical_inventory_count_items",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Stock movement",
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
        verbose_name = "Physical inventory count item"
        verbose_name_plural = "Physical inventory count items"
        ordering = [
            "count_id",
            "line_number",
            "id",
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["count", "stock_item"],
                name="unique_physical_count_line_per_stock_item",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "warehouse"]),
            models.Index(fields=["company", "warehouse", "location"]),
            models.Index(fields=["company", "item"]),
            models.Index(fields=["stock_item", "count"]),
            models.Index(fields=["stock_movement"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.count.count_number} - {self.item_name_snapshot}"

    @property
    def has_variance(self) -> bool:
        return self.variance_quantity != QUANTITY_ZERO

    def apply_item_snapshot(self) -> None:
        """
        Copy catalog item data into the count line snapshot.
        """
        if not self.item_id:
            return

        self.item_code_snapshot = (
            self.item.code
            or self.item.sku
            or self.item.barcode
            or ""
        )
        self.item_name_snapshot = self.item.name
        self.item_name_ar_snapshot = self.item.name_ar or ""
        self.item_name_en_snapshot = self.item.name_en or ""
        self.unit_name_snapshot = (
            self.item.unit.name
            if self.item.unit_id
            else ""
        )

    def recalculate(self) -> None:
        """
        Recalculate variance fields from system and counted quantities.
        """
        self.system_quantity = quantize_quantity(
            self.system_quantity
        )
        self.counted_quantity = quantize_quantity(
            self.counted_quantity
        )
        self.system_unit_cost = quantize_money(
            self.system_unit_cost
        )
        self.variance_quantity = quantize_quantity(
            self.counted_quantity - self.system_quantity
        )
        self.variance_value = quantize_money(
            self.variance_quantity * self.system_unit_cost
        )

    def clean(self) -> None:
        super().clean()

        if self.count_id and not self.company_id:
            self.company = self.count.company

        if self.count_id:
            if self.company_id != self.count.company_id:
                raise ValidationError(
                    {
                        "company": (
                            "Count item company must match count company."
                        )
                    }
                )

            if self.warehouse_id != self.count.warehouse_id:
                raise ValidationError(
                    {
                        "warehouse": (
                            "Count item warehouse must match count warehouse."
                        )
                    }
                )

            if (
                self.count.location_id
                and self.location_id != self.count.location_id
            ):
                raise ValidationError(
                    {
                        "location": (
                            "Count item location must match count location."
                        )
                    }
                )

        if self.stock_item_id:
            if self.stock_item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Selected stock item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.stock_item.warehouse_id != self.warehouse_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item warehouse must match count item "
                            "warehouse."
                        )
                    }
                )

            if self.stock_item.location_id != self.location_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item location must match count item "
                            "location."
                        )
                    }
                )

            if self.stock_item.item_id != self.item_id:
                raise ValidationError(
                    {
                        "stock_item": (
                            "Stock item catalog item must match count item."
                        )
                    }
                )

        if self.item_id and self.company_id:
            if self.item.company_id != self.company_id:
                raise ValidationError(
                    {
                        "item": (
                            "Selected catalog item does not belong "
                            "to this company."
                        )
                    }
                )

            if self.item.item_type != CatalogItemType.PRODUCT:
                raise ValidationError(
                    {
                        "item": (
                            "Only product catalog items can be counted."
                        )
                    }
                )

        self.recalculate()

        if self.counted_quantity < QUANTITY_ZERO:
            raise ValidationError(
                {
                    "counted_quantity": (
                        "Counted quantity cannot be negative."
                    )
                }
            )

    def save(self, *args, **kwargs):
        if self.item_id:
            self.apply_item_snapshot()

        self.full_clean()
        super().save(*args, **kwargs)


# End Phase 22.5 - Physical Inventory and Cycle Count Models
# ============================================================
