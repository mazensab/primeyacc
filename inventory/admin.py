# ============================================================
# 📂 inventory/admin.py
# 🧠 PrimeyAcc | Company Inventory Admin V2.0
# ------------------------------------------------------------
# ✅ Warehouse admin
# ✅ Inventory locations and bins admin
# ✅ Location hierarchy and operational purpose management
# ✅ Safe location lifecycle actions
# ✅ Stock item admin
# ✅ Stock movement admin
# ✅ Company-scoped visibility helpers
# ✅ Search / filters / readonly audit fields
# ✅ Safe admin display for inventory foundation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Admin للمتابعة الداخلية فقط
# - العزل الفعلي يكون في APIs/services وليس في Django Admin فقط
# - لا يتم تعديل الحركات المرحلة Posted يدويًا من الواجهة لاحقًا إلا عبر services
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from .models import (
    InventoryLocation,
    InventoryLocationStatus,
    InventoryLocationType,
    StockItem,
    StockMovement,
    StockMovementDirection,
    StockMovementStatus,
    StockMovementType,
    Warehouse,
    WarehouseStatus,
    WarehouseType,
)


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    """
    Admin configuration for company warehouses.
    """

    list_display = [
        "code",
        "name",
        "company",
        "branch",
        "warehouse_type",
        "status",
        "is_default",
        "is_active",
        "city",
        "created_at",
    ]
    list_filter = [
        "status",
        "warehouse_type",
        "is_default",
        "is_active",
        "company",
        "branch",
        "city",
        "created_at",
    ]
    search_fields = [
        "code",
        "name",
        "name_ar",
        "name_en",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "branch__name",
        "branch__name_ar",
        "branch__name_en",
        "manager_name",
        "phone",
        "email",
        "city",
        "district",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "branch",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "-is_default",
        "name",
    ]
    fieldsets = (
        (
            "Basic information",
            {
                "fields": (
                    "company",
                    "branch",
                    "warehouse_type",
                    "status",
                    "is_default",
                    "is_active",
                    "code",
                    "name",
                    "name_ar",
                    "name_en",
                )
            },
        ),
        (
            "Contact",
            {
                "fields": (
                    "manager_name",
                    "phone",
                    "email",
                )
            },
        ),
        (
            "Address",
            {
                "fields": (
                    "country",
                    "city",
                    "district",
                    "address",
                )
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = [
        "activate_warehouses",
        "deactivate_warehouses",
        "archive_warehouses",
    ]

    @admin.action(description="Activate selected warehouses")
    def activate_warehouses(
        self,
        request: HttpRequest,
        queryset: QuerySet[Warehouse],
    ) -> None:
        for warehouse in queryset:
            warehouse.activate(user=request.user)

    @admin.action(description="Deactivate selected warehouses")
    def deactivate_warehouses(
        self,
        request: HttpRequest,
        queryset: QuerySet[Warehouse],
    ) -> None:
        for warehouse in queryset:
            warehouse.deactivate(user=request.user)

    @admin.action(description="Archive selected warehouses")
    def archive_warehouses(
        self,
        request: HttpRequest,
        queryset: QuerySet[Warehouse],
    ) -> None:
        for warehouse in queryset:
            warehouse.archive(user=request.user)



@admin.register(InventoryLocation)
class InventoryLocationAdmin(admin.ModelAdmin):
    """
    Admin configuration for internal warehouse locations and bins.

    Inventory locations are operational master data. Tenant isolation remains
    enforced by models, services, and company APIs rather than Django Admin
    alone.
    """

    list_display = [
        "code",
        "name",
        "company",
        "warehouse",
        "parent",
        "location_type",
        "status",
        "is_default",
        "is_receiving",
        "is_shipping",
        "is_adjustment",
        "is_pickable",
        "is_active",
        "sequence",
        "created_at",
    ]
    list_filter = [
        "status",
        "location_type",
        "is_default",
        "is_receiving",
        "is_shipping",
        "is_adjustment",
        "is_pickable",
        "is_active",
        "company",
        "warehouse",
        "created_at",
    ]
    search_fields = [
        "code",
        "name",
        "name_ar",
        "name_en",
        "barcode",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "warehouse__code",
        "warehouse__name",
        "warehouse__name_ar",
        "warehouse__name_en",
        "parent__code",
        "parent__name",
        "parent__name_ar",
        "parent__name_en",
        "notes",
    ]
    readonly_fields = [
        "full_path",
        "is_active_location",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "warehouse",
        "parent",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "warehouse",
        "sequence",
        "code",
    ]
    date_hierarchy = "created_at"
    list_select_related = [
        "company",
        "warehouse",
        "warehouse__branch",
        "parent",
        "created_by",
        "updated_by",
    ]
    list_per_page = 50
    save_on_top = True

    fieldsets = (
        (
            "Location identity",
            {
                "fields": (
                    "company",
                    "warehouse",
                    "parent",
                    "location_type",
                    "status",
                    "code",
                    "name",
                    "name_ar",
                    "name_en",
                    "barcode",
                    "sequence",
                )
            },
        ),
        (
            "Operational purposes",
            {
                "fields": (
                    "is_default",
                    "is_receiving",
                    "is_shipping",
                    "is_adjustment",
                    "is_pickable",
                    "is_active",
                )
            },
        ),
        (
            "Calculated information",
            {
                "fields": (
                    "full_path",
                    "is_active_location",
                )
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = [
        "activate_locations",
        "deactivate_locations",
        "archive_locations",
    ]

    def get_queryset(self, request: HttpRequest) -> QuerySet[InventoryLocation]:
        """
        Load related master data efficiently for the admin list.
        """
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "warehouse",
                "warehouse__branch",
                "parent",
                "created_by",
                "updated_by",
            )
        )

    @admin.action(description="Activate selected inventory locations")
    def activate_locations(
        self,
        request: HttpRequest,
        queryset: QuerySet[InventoryLocation],
    ) -> None:
        updated_count = 0

        for location in queryset:
            location.activate(user=request.user)
            updated_count += 1

        self.message_user(
            request,
            f"{updated_count} inventory location(s) activated.",
        )

    @admin.action(description="Deactivate selected inventory locations")
    def deactivate_locations(
        self,
        request: HttpRequest,
        queryset: QuerySet[InventoryLocation],
    ) -> None:
        updated_count = 0

        for location in queryset:
            location.deactivate(user=request.user)
            updated_count += 1

        self.message_user(
            request,
            f"{updated_count} inventory location(s) deactivated.",
        )

    @admin.action(description="Archive selected inventory locations")
    def archive_locations(
        self,
        request: HttpRequest,
        queryset: QuerySet[InventoryLocation],
    ) -> None:
        updated_count = 0

        for location in queryset:
            location.archive(user=request.user)
            updated_count += 1

        self.message_user(
            request,
            f"{updated_count} inventory location(s) archived.",
        )

    def has_delete_permission(
        self,
        request: HttpRequest,
        obj: InventoryLocation | None = None,
    ) -> bool:
        """
        Prevent deleting locations that already participate in a hierarchy.

        Locations will later be referenced by stock balances and movements, so
        lifecycle status should be used instead of physical deletion.
        """
        if obj is not None:
            if obj.status == InventoryLocationStatus.ARCHIVED:
                return False

            if obj.children.exists():
                return False

        return super().has_delete_permission(request, obj)

    def get_readonly_fields(
        self,
        request: HttpRequest,
        obj: InventoryLocation | None = None,
    ) -> list[str] | tuple[str, ...]:
        """
        Freeze operational identity after archiving.
        """
        readonly_fields = list(
            super().get_readonly_fields(request, obj)
        )

        if obj and obj.status == InventoryLocationStatus.ARCHIVED:
            readonly_fields.extend(
                [
                    "company",
                    "warehouse",
                    "parent",
                    "location_type",
                    "status",
                    "code",
                    "name",
                    "name_ar",
                    "name_en",
                    "barcode",
                    "is_default",
                    "is_receiving",
                    "is_shipping",
                    "is_adjustment",
                    "is_pickable",
                    "is_active",
                    "sequence",
                    "notes",
                    "extra_data",
                    "created_by",
                    "updated_by",
                ]
            )

        return tuple(sorted(set(readonly_fields)))


@admin.register(StockItem)
class StockItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for current stock balances.
    """

    list_display = [
        "item",
        "warehouse",
        "company",
        "quantity_on_hand",
        "reserved_quantity",
        "available_quantity",
        "minimum_quantity",
        "maximum_quantity",
        "average_cost",
        "last_movement_at",
        "created_at",
    ]
    list_filter = [
        "company",
        "warehouse",
        "item__item_type",
        "item__status",
        "last_movement_at",
        "created_at",
    ]
    search_fields = [
        "item__code",
        "item__sku",
        "item__barcode",
        "item__name",
        "item__name_ar",
        "item__name_en",
        "warehouse__code",
        "warehouse__name",
        "warehouse__name_ar",
        "warehouse__name_en",
        "company__name",
        "company__name_ar",
        "company__name_en",
    ]
    readonly_fields = [
        "available_quantity",
        "last_movement_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "warehouse",
        "item",
    ]
    ordering = [
        "company",
        "warehouse",
        "item__name",
    ]
    fieldsets = (
        (
            "Stock identity",
            {
                "fields": (
                    "company",
                    "warehouse",
                    "item",
                )
            },
        ),
        (
            "Quantities",
            {
                "fields": (
                    "quantity_on_hand",
                    "reserved_quantity",
                    "available_quantity",
                    "minimum_quantity",
                    "maximum_quantity",
                )
            },
        ),
        (
            "Cost",
            {
                "fields": (
                    "average_cost",
                )
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "last_movement_at",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    """
    Admin configuration for inventory movement ledger.
    """

    list_display = [
        "movement_number",
        "movement_date",
        "company",
        "warehouse",
        "item_name_snapshot",
        "movement_type",
        "direction",
        "status",
        "quantity",
        "unit_cost",
        "total_cost",
        "quantity_before",
        "quantity_after",
        "reference_type",
        "reference_number",
        "posted_at",
        "created_at",
    ]
    list_filter = [
        "status",
        "movement_type",
        "direction",
        "company",
        "warehouse",
        "reference_type",
        "movement_date",
        "posted_at",
        "cancelled_at",
        "created_at",
    ]
    search_fields = [
        "movement_number",
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "item__code",
        "item__sku",
        "item__barcode",
        "item__name",
        "warehouse__code",
        "warehouse__name",
        "company__name",
        "reference_type",
        "reference_number",
        "notes",
    ]
    readonly_fields = [
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "quantity_before",
        "quantity_after",
        "total_cost",
        "posted_at",
        "posted_by",
        "cancelled_at",
        "cancelled_by",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "warehouse",
        "stock_item",
        "item",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "-movement_date",
        "-created_at",
        "-id",
    ]
    date_hierarchy = "movement_date"
    fieldsets = (
        (
            "Movement identity",
            {
                "fields": (
                    "company",
                    "warehouse",
                    "stock_item",
                    "item",
                    "movement_number",
                    "movement_date",
                    "movement_type",
                    "direction",
                    "status",
                )
            },
        ),
        (
            "Quantity and cost",
            {
                "fields": (
                    "quantity",
                    "unit_cost",
                    "total_cost",
                    "quantity_before",
                    "quantity_after",
                )
            },
        ),
        (
            "Item snapshot",
            {
                "fields": (
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_name_ar_snapshot",
                    "item_name_en_snapshot",
                    "unit_name_snapshot",
                )
            },
        ),
        (
            "Reference",
            {
                "fields": (
                    "reference_type",
                    "reference_id",
                    "reference_number",
                )
            },
        ),
        (
            "Posting / cancellation",
            {
                "fields": (
                    "posted_at",
                    "posted_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancellation_reason",
                )
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                )
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    def has_delete_permission(
        self,
        request: HttpRequest,
        obj: StockMovement | None = None,
    ) -> bool:
        """
        Prevent deleting posted stock ledger records from admin.
        """
        if obj and obj.status == StockMovementStatus.POSTED:
            return False
        return super().has_delete_permission(request, obj)

    def get_readonly_fields(
        self,
        request: HttpRequest,
        obj: StockMovement | None = None,
    ) -> list[str] | tuple[str, ...]:
        readonly_fields = list(super().get_readonly_fields(request, obj))

        if obj and obj.status == StockMovementStatus.POSTED:
            readonly_fields.extend(
                [
                    "company",
                    "warehouse",
                    "stock_item",
                    "item",
                    "movement_number",
                    "movement_date",
                    "movement_type",
                    "direction",
                    "status",
                    "quantity",
                    "unit_cost",
                    "reference_type",
                    "reference_id",
                    "reference_number",
                    "notes",
                    "extra_data",
                    "created_by",
                    "updated_by",
                ]
            )

        return tuple(sorted(set(readonly_fields)))