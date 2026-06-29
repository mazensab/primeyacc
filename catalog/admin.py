# ============================================================
# 📂 catalog/admin.py
# 🧠 Mhamcloud | Company Catalog Admin V1.0
# ------------------------------------------------------------
# ✅ Django Admin registration for company-scoped catalog
# ✅ Manage categories, units, products, and services
# ✅ Search, filters, readonly audit fields
# ✅ Tenant visibility through company relation
# ✅ Safe admin helpers for operational review
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف خاص بإدارة Django Admin فقط
# - لا نعتمد على company_id من الفرونت داخل APIs
# - كل سجل كتالوج مرتبط بشركة
# - العزل الحقيقي للـ /company يتم في services/APIs عبر request.company
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    CatalogCategory,
    CatalogCategoryStatus,
    CatalogItem,
    CatalogItemStatus,
    CatalogItemType,
    CatalogUnit,
    CatalogUnitStatus,
)


@admin.register(CatalogCategory)
class CatalogCategoryAdmin(admin.ModelAdmin):
    """
    Admin configuration for catalog categories.
    """

    list_display = (
        "id",
        "name",
        "code",
        "company",
        "parent",
        "status",
        "sort_order",
        "created_at",
    )
    list_filter = (
        "status",
        "company",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "name",
        "name_ar",
        "name_en",
        "code",
        "company__name",
        "company__display_name",
    )
    autocomplete_fields = (
        "company",
        "parent",
        "created_by",
        "updated_by",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = (
        "company",
        "sort_order",
        "name",
        "id",
    )
    list_per_page = 50
    save_on_top = True

    fieldsets = (
        (
            "Company Scope",
            {
                "fields": (
                    "company",
                    "parent",
                )
            },
        ),
        (
            "Category Information",
            {
                "fields": (
                    "status",
                    "code",
                    "name",
                    "name_ar",
                    "name_en",
                    "description",
                    "sort_order",
                )
            },
        ),
        (
            "Notes & Extra Data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                ),
                "classes": (
                    "collapse",
                ),
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
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    actions = (
        "mark_active",
        "mark_inactive",
        "mark_archived",
    )

    @admin.action(description="Mark selected categories as active")
    def mark_active(self, request, queryset):
        queryset.update(status=CatalogCategoryStatus.ACTIVE)

    @admin.action(description="Mark selected categories as inactive")
    def mark_inactive(self, request, queryset):
        queryset.update(status=CatalogCategoryStatus.INACTIVE)

    @admin.action(description="Mark selected categories as archived")
    def mark_archived(self, request, queryset):
        queryset.update(status=CatalogCategoryStatus.ARCHIVED)


@admin.register(CatalogUnit)
class CatalogUnitAdmin(admin.ModelAdmin):
    """
    Admin configuration for catalog units.
    """

    list_display = (
        "id",
        "name",
        "symbol",
        "code",
        "company",
        "status",
        "decimal_places",
        "is_default",
        "created_at",
    )
    list_filter = (
        "status",
        "is_default",
        "company",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "name",
        "name_ar",
        "name_en",
        "symbol",
        "code",
        "company__name",
        "company__display_name",
    )
    autocomplete_fields = (
        "company",
        "created_by",
        "updated_by",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = (
        "company",
        "name",
        "id",
    )
    list_per_page = 50
    save_on_top = True

    fieldsets = (
        (
            "Company Scope",
            {
                "fields": (
                    "company",
                )
            },
        ),
        (
            "Unit Information",
            {
                "fields": (
                    "status",
                    "code",
                    "name",
                    "name_ar",
                    "name_en",
                    "symbol",
                    "decimal_places",
                    "is_default",
                )
            },
        ),
        (
            "Notes & Extra Data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                ),
                "classes": (
                    "collapse",
                ),
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
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    actions = (
        "mark_active",
        "mark_inactive",
        "mark_archived",
    )

    @admin.action(description="Mark selected units as active")
    def mark_active(self, request, queryset):
        queryset.update(status=CatalogUnitStatus.ACTIVE)

    @admin.action(description="Mark selected units as inactive")
    def mark_inactive(self, request, queryset):
        queryset.update(status=CatalogUnitStatus.INACTIVE)

    @admin.action(description="Mark selected units as archived")
    def mark_archived(self, request, queryset):
        queryset.update(status=CatalogUnitStatus.ARCHIVED)


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for catalog products and services.
    """

    list_display = (
        "id",
        "name",
        "item_type",
        "code",
        "sku",
        "barcode",
        "company",
        "category",
        "unit",
        "status",
        "sale_price",
        "purchase_price",
        "taxable",
        "tax_rate",
        "track_inventory",
        "created_at",
    )
    list_filter = (
        "item_type",
        "status",
        "is_sellable",
        "is_purchasable",
        "track_inventory",
        "taxable",
        "company",
        "category",
        "unit",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "name",
        "name_ar",
        "name_en",
        "code",
        "sku",
        "barcode",
        "description",
        "company__name",
        "company__display_name",
        "category__name",
        "unit__name",
    )
    autocomplete_fields = (
        "company",
        "category",
        "unit",
        "created_by",
        "updated_by",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    ordering = (
        "company",
        "sort_order",
        "name",
        "id",
    )
    list_per_page = 50
    save_on_top = True

    fieldsets = (
        (
            "Company Scope",
            {
                "fields": (
                    "company",
                    "category",
                    "unit",
                )
            },
        ),
        (
            "Item Identity",
            {
                "fields": (
                    "item_type",
                    "status",
                    "code",
                    "sku",
                    "barcode",
                    "name",
                    "name_ar",
                    "name_en",
                    "description",
                    "sort_order",
                )
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "sale_price",
                    "purchase_price",
                    "cost_price",
                )
            },
        ),
        (
            "Behavior",
            {
                "fields": (
                    "is_sellable",
                    "is_purchasable",
                    "track_inventory",
                    "taxable",
                    "tax_rate",
                )
            },
        ),
        (
            "Media",
            {
                "fields": (
                    "image",
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
        (
            "Notes & Extra Data",
            {
                "fields": (
                    "notes",
                    "extra_data",
                ),
                "classes": (
                    "collapse",
                ),
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
                ),
                "classes": (
                    "collapse",
                ),
            },
        ),
    )

    actions = (
        "mark_active",
        "mark_inactive",
        "mark_archived",
        "mark_as_product",
        "mark_as_service",
        "enable_inventory_tracking",
        "disable_inventory_tracking",
    )

    @admin.action(description="Mark selected items as active")
    def mark_active(self, request, queryset):
        queryset.update(status=CatalogItemStatus.ACTIVE)

    @admin.action(description="Mark selected items as inactive")
    def mark_inactive(self, request, queryset):
        queryset.update(status=CatalogItemStatus.INACTIVE)

    @admin.action(description="Mark selected items as archived")
    def mark_archived(self, request, queryset):
        queryset.update(status=CatalogItemStatus.ARCHIVED)

    @admin.action(description="Mark selected items as products")
    def mark_as_product(self, request, queryset):
        queryset.update(item_type=CatalogItemType.PRODUCT)

    @admin.action(description="Mark selected items as services")
    def mark_as_service(self, request, queryset):
        queryset.update(
            item_type=CatalogItemType.SERVICE,
            track_inventory=False,
        )

    @admin.action(description="Enable inventory tracking")
    def enable_inventory_tracking(self, request, queryset):
        queryset.filter(item_type=CatalogItemType.PRODUCT).update(
            track_inventory=True,
        )

    @admin.action(description="Disable inventory tracking")
    def disable_inventory_tracking(self, request, queryset):
        queryset.update(track_inventory=False)