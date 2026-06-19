# ============================================================
# 📂 jewelry/admin.py
# 🧠 PrimeyAcc | Jewelry and Gold Admin — Phase 25.1
# ============================================================
# ✅ Admin registration for jewelry activity backend
# ✅ Company-aware list display and filters
# ✅ Safe read-only audit timestamps
# ============================================================

from django.contrib import admin

from .models import JewelryGoldRate, JewelryItem, JewelryKarat, JewelryMetal


@admin.register(JewelryMetal)
class JewelryMetalAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "company", "metal_type", "purity_percent", "is_active", "updated_at")
    list_filter = ("metal_type", "is_active", "company")
    search_fields = ("code", "name", "company__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(JewelryKarat)
class JewelryKaratAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "company", "metal", "karat_value", "purity_percent", "is_default", "is_active")
    list_filter = ("is_default", "is_active", "company", "metal")
    search_fields = ("code", "name", "metal__code", "company__name")
    readonly_fields = ("created_at", "updated_at")


@admin.register(JewelryGoldRate)
class JewelryGoldRateAdmin(admin.ModelAdmin):
    list_display = (
        "rate_date",
        "company",
        "metal",
        "karat",
        "buying_price_per_gram",
        "selling_price_per_gram",
        "currency",
        "status",
    )
    list_filter = ("status", "currency", "company", "metal", "karat", "rate_date")
    search_fields = ("metal__code", "karat__code", "source", "company__name")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "rate_date"


@admin.register(JewelryItem)
class JewelryItemAdmin(admin.ModelAdmin):
    list_display = (
        "sku",
        "name",
        "company",
        "metal",
        "karat",
        "gross_weight",
        "net_gold_weight",
        "last_total",
        "status",
        "updated_at",
    )
    list_filter = ("status", "company", "metal", "karat", "making_charge_type")
    search_fields = ("sku", "name", "company__name")
    readonly_fields = (
        "last_gold_rate",
        "last_base_amount",
        "last_making_amount",
        "last_subtotal",
        "last_vat_amount",
        "last_total",
        "last_priced_at",
        "created_at",
        "updated_at",
    )

