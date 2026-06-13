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

from purchases.models import (
    PurchaseBill,
    PurchaseBillItem,
    PurchaseReturn,
    PurchaseReturnItem,
    SupplierDebitNote,
    SupplierDebitNoteItem,
)


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


class PurchaseReturnItemInline(admin.TabularInline):
    model = PurchaseReturnItem
    extra = 0

    fields = [
        "line_number",
        "bill_item",
        "item",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "condition_notes",
    ]

    readonly_fields = [
        "item",
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
    ]

    autocomplete_fields = [
        "bill_item",
    ]


@admin.register(PurchaseReturn)
class PurchaseReturnAdmin(admin.ModelAdmin):
    list_display = [
        "return_number",
        "supplier",
        "bill",
        "company",
        "branch",
        "status",
        "reason",
        "return_date",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
        "created_at",
    ]

    list_filter = [
        "status",
        "reason",
        "return_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "return_number",
        "bill__bill_number",
        "bill__supplier_bill_number",
        "supplier__display_name",
        "supplier__legal_name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "reason_details",
        "notes",
    ]

    readonly_fields = [
        "subtotal_amount",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "confirmed_at",
        "confirmed_by",
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
        "bill",
        "created_by",
        "updated_by",
        "confirmed_by",
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
                    "bill",
                    "return_number",
                    "return_date",
                    "status",
                    "reason",
                    "reason_details",
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
            "Confirmation",
            {
                "fields": [
                    "confirmed_at",
                    "confirmed_by",
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
        PurchaseReturnItemInline,
    ]


@admin.register(PurchaseReturnItem)
class PurchaseReturnItemAdmin(admin.ModelAdmin):
    list_display = [
        "purchase_return",
        "line_number",
        "bill_item",
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
        "purchase_return__return_number",
        "purchase_return__bill__bill_number",
        "item__name",
        "item__name_ar",
        "item__name_en",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    readonly_fields = [
        "item",
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "purchase_return",
        "company",
        "bill_item",
    ]


class SupplierDebitNoteItemInline(admin.TabularInline):
    model = SupplierDebitNoteItem
    extra = 0

    fields = [
        "line_number",
        "purchase_return_item",
        "bill_item",
        "item",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable",
        "tax_rate",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "notes",
    ]

    readonly_fields = [
        "item",
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "subtotal_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
    ]

    autocomplete_fields = [
        "purchase_return_item",
        "bill_item",
    ]


@admin.register(SupplierDebitNote)
class SupplierDebitNoteAdmin(admin.ModelAdmin):
    list_display = [
        "debit_note_number",
        "supplier",
        "bill",
        "purchase_return",
        "company",
        "branch",
        "status",
        "debit_note_date",
        "total_amount",
        "applied_to_bill_amount",
        "supplier_credit_amount",
        "created_at",
    ]

    list_filter = [
        "status",
        "debit_note_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "debit_note_number",
        "supplier_reference",
        "bill__bill_number",
        "bill__supplier_bill_number",
        "purchase_return__return_number",
        "supplier__display_name",
        "supplier__legal_name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "notes",
    ]

    readonly_fields = [
        "subtotal_amount",
        "discount_amount",
        "taxable_amount",
        "tax_amount",
        "total_amount",
        "applied_to_bill_amount",
        "supplier_credit_amount",
        "issued_at",
        "issued_by",
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
        "bill",
        "purchase_return",
        "created_by",
        "updated_by",
        "issued_by",
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
                    "bill",
                    "purchase_return",
                    "debit_note_number",
                    "supplier_reference",
                    "debit_note_date",
                    "status",
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
            "Financial distribution",
            {
                "fields": [
                    "applied_to_bill_amount",
                    "supplier_credit_amount",
                ],
            },
        ),
        (
            "Issuing",
            {
                "fields": [
                    "issued_at",
                    "issued_by",
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
        SupplierDebitNoteItemInline,
    ]


@admin.register(SupplierDebitNoteItem)
class SupplierDebitNoteItemAdmin(admin.ModelAdmin):
    list_display = [
        "debit_note",
        "line_number",
        "purchase_return_item",
        "bill_item",
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
        "debit_note__debit_note_number",
        "debit_note__bill__bill_number",
        "debit_note__purchase_return__return_number",
        "item__name",
        "item__name_ar",
        "item__name_en",
        "item_code_snapshot",
        "item_name_snapshot",
    ]

    readonly_fields = [
        "item",
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
        "debit_note",
        "company",
        "purchase_return_item",
        "bill_item",
    ]
