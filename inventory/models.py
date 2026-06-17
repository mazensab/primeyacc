# ============================================================
# 📂 inventory/models.py
# 🧠 PrimeyAcc | Company Inventory & Stock Models V2.1
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
from django.db.models import Q
from django.utils import timezone

from catalog.models import CatalogItem, CatalogItemType
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