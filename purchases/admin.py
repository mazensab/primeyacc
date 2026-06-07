# ============================================================
# 📂 purchases/admin.py
# 🧠 PrimeyAcc | Purchases Admin V1.0
# ------------------------------------------------------------
# ✅ Purchase bills admin registration
# ✅ Purchase bill items inline
# ✅ Company, supplier, branch visibility
# ✅ Totals and lifecycle fields read-only
# ✅ Safe search and filters
# ============================================================

from __future__ import annotations

from django.contrib import admin

from purchases.models import PurchaseBill, PurchaseBillItem


class PurchaseBillItemInline(admin.TabularInline):
    model = PurchaseBillItem
    extra = 0

    fields = [
        "line_number",
        "item",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
    ]

    readonly_fields = [
        "item_name_snapshot",
        "unit_name_snapshot",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
    ]

    autocomplete_fields = [
        "item",
    ]


@admin.register(PurchaseBill)
class PurchaseBillAdmin(admin.ModelAdmin):
    list_display = [
        "bill_number",
        "supplier",
        "company",
        "branch",
        "status",
        "bill_date",
        "due_date",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
        "created_at",
    ]

    list_filter = [
        "status",
        "bill_date",
        "due_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "bill_number",
        "supplier_bill_number",
        "supplier__display_name",
        "supplier__legal_name",
        "supplier__phone",
        "supplier__mobile",
        "company__name",
        "company__name_ar",
        "company__name_en",
    ]

    readonly_fields = [
        "subtotal_amount",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "posted_at",
        "posted_by",
        "cancelled_at",
        "cancelled_by",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "company",
        "branch",
        "supplier",
        "created_by",
        "updated_by",
        "posted_by",
        "cancelled_by",
    ]

    fieldsets = [
        (
            "Basic information",
            {
                "fields": [
                    "company",
                    "branch",
                    "supplier",
                    "status",
                    "bill_number",
                    "supplier_bill_number",
                    "bill_date",
                    "due_date",
                    "currency_code",
                ],
            },
        ),
        (
            "Totals",
            {
                "fields": [
                    "subtotal_amount",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                ],
            },
        ),
        (
            "Posting",
            {
                "fields": [
                    "posted_at",
                    "posted_by",
                ],
            },
        ),
        (
            "Cancellation",
            {
                "fields": [
                    "cancelled_at",
                    "cancelled_by",
                    "cancellation_reason",
                ],
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ],
            },
        ),
        (
            "Extra",
            {
                "classes": [
                    "collapse",
                ],
                "fields": [
                    "notes",
                    "extra_data",
                ],
            },
        ),
    ]

    inlines = [
        PurchaseBillItemInline,
    ]


@admin.register(PurchaseBillItem)
class PurchaseBillItemAdmin(admin.ModelAdmin):
    list_display = [
        "bill",
        "line_number",
        "item",
        "company",
        "quantity",
        "unit_price",
        "discount_amount",
        "tax_rate",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
        "created_at",
    ]

    list_filter = [
        "taxable",
        "company",
        "created_at",
    ]

    search_fields = [
        "bill__bill_number",
        "item__name",
        "item__name_ar",
        "item__name_en",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    readonly_fields = [
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "bill",
        "company",
        "item",
    ]