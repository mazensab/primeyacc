# ============================================================
# 📂 sales/admin.py
# 🧠 PrimeyAcc | Sales Admin V1.0
# ------------------------------------------------------------
# ✅ Sales invoices admin
# ✅ Sales invoice items inline
# ✅ Readonly totals and lifecycle timestamps
# ✅ Company / branch / customer visibility
# ✅ Search and filtering for operational review
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Admin هنا للمراجعة والإدارة الداخلية فقط
# - عمليات /company الحقيقية ستكون عبر APIs وخدمات sales/services.py
# - لا نضع منطق business ثقيل داخل admin.py
# ============================================================

from __future__ import annotations

from django.contrib import admin

from sales.models import (
    SalesInvoice,
    SalesInvoiceItem,
)


class SalesInvoiceItemInline(admin.TabularInline):
    """
    Inline invoice items for quick operational review.
    """

    model = SalesInvoiceItem
    extra = 0
    fields = [
        "line_number",
        "catalog_item",
        "item_code_snapshot",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "line_subtotal",
        "discount_amount",
        "taxable",
        "tax_rate",
        "tax_amount",
        "line_total",
    ]
    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
    ]
    autocomplete_fields = [
        "catalog_item",
    ]


@admin.register(SalesInvoice)
class SalesInvoiceAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales invoices.
    """

    list_display = [
        "invoice_number",
        "company",
        "branch",
        "customer",
        "status",
        "payment_status",
        "invoice_date",
        "due_date",
        "total_amount",
        "paid_amount",
        "balance_due",
        "source",
        "created_at",
    ]

    list_filter = [
        "status",
        "payment_status",
        "source",
        "invoice_date",
        "due_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "invoice_number",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "branch__name",
        "branch__branch_code",
        "customer__display_name",
        "customer__legal_name",
        "customer__code",
        "customer__phone",
        "customer__mobile",
    ]

    autocomplete_fields = [
        "company",
        "branch",
        "customer",
        "created_by",
        "updated_by",
        "issued_by",
        "cancelled_by",
    ]

    readonly_fields = [
        "subtotal",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "paid_amount",
        "balance_due",
        "customer_snapshot",
        "billing_address_snapshot",
        "tax_snapshot",
        "issued_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Invoice identity",
            {
                "fields": [
                    "company",
                    "branch",
                    "customer",
                    "invoice_number",
                    "status",
                    "payment_status",
                    "source",
                    "invoice_date",
                    "due_date",
                    "currency_code",
                ]
            },
        ),
        (
            "Totals",
            {
                "fields": [
                    "subtotal",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "paid_amount",
                    "balance_due",
                ]
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "issued_at",
                    "issued_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancelled_reason",
                ]
            },
        ),
        (
            "Snapshots",
            {
                "classes": ["collapse"],
                "fields": [
                    "customer_snapshot",
                    "billing_address_snapshot",
                    "tax_snapshot",
                ],
            },
        ),
        (
            "Notes and extra data",
            {
                "fields": [
                    "public_notes",
                    "internal_notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    inlines = [
        SalesInvoiceItemInline,
    ]

    date_hierarchy = "invoice_date"
    ordering = [
        "-invoice_date",
        "-id",
    ]

    def save_model(self, request, obj, form, change):
        if not change and not obj.created_by_id:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()
        super().save_model(request, obj, form, change)

        obj.refresh_snapshots(save=True)
        obj.recalculate_totals(save=True)


@admin.register(SalesInvoiceItem)
class SalesInvoiceItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for sales invoice items.
    """

    list_display = [
        "invoice",
        "company",
        "line_number",
        "catalog_item",
        "item_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "line_total",
        "created_at",
    ]

    list_filter = [
        "company",
        "taxable",
        "tax_rate",
        "created_at",
    ]

    search_fields = [
        "invoice__invoice_number",
        "company__name",
        "company__company_code",
        "catalog_item__name",
        "catalog_item__code",
        "catalog_item__sku",
        "catalog_item__barcode",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    autocomplete_fields = [
        "invoice",
        "company",
        "catalog_item",
    ]

    readonly_fields = [
        "line_subtotal",
        "taxable_amount",
        "tax_amount",
        "line_total",
        "created_at",
        "updated_at",
    ]

    fieldsets = [
        (
            "Invoice line",
            {
                "fields": [
                    "invoice",
                    "company",
                    "catalog_item",
                    "line_number",
                ]
            },
        ),
        (
            "Snapshot",
            {
                "fields": [
                    "item_code_snapshot",
                    "item_name_snapshot",
                    "item_description_snapshot",
                    "unit_name_snapshot",
                ]
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "quantity",
                    "unit_price",
                    "line_subtotal",
                    "discount_amount",
                    "taxable",
                    "tax_rate",
                    "taxable_amount",
                    "tax_amount",
                    "line_total",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "classes": ["collapse"],
                "fields": [
                    "created_at",
                    "updated_at",
                ],
            },
        ),
    ]

    ordering = [
        "-created_at",
        "-id",
    ]

    def save_model(self, request, obj, form, change):
        if obj.invoice_id and not obj.company_id:
            obj.company_id = obj.invoice.company_id

        if obj.catalog_item_id and not obj.item_name_snapshot:
            obj.apply_catalog_snapshot()

        obj.full_clean()
        super().save_model(request, obj, form, change)