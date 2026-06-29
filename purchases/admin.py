# ============================================================
# 📂 purchases/admin.py
# 🧠 Mhamcloud | Purchases Admin V1.0
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
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseRequest,
    PurchaseRequestItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseReturn,
    PurchaseReturnItem,
    SupplierDebitNote,
    SupplierDebitNoteItem,
)


class PurchaseRequestItemInline(admin.TabularInline):
    """
    Inline purchase request items.
    """

    model = PurchaseRequestItem
    extra = 0

    fields = [
        "line_number",
        "item",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "suggested_unit_price",
        "converted_quantity_display",
        "remaining_quantity_display",
        "notes",
    ]

    readonly_fields = [
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "converted_quantity_display",
        "remaining_quantity_display",
    ]

    autocomplete_fields = [
        "item",
    ]

    @admin.display(
        description="Converted quantity",
    )
    def converted_quantity_display(
        self,
        obj,
    ):
        if not obj or not obj.pk:
            return "0.0000"

        return obj.converted_quantity

    @admin.display(
        description="Remaining quantity",
    )
    def remaining_quantity_display(
        self,
        obj,
    ):
        if not obj or not obj.pk:
            return obj.quantity if obj else "0.0000"

        return obj.remaining_quantity


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    """
    Purchase requests administration.
    """

    list_display = [
        "request_number",
        "company",
        "branch",
        "status",
        "priority",
        "request_date",
        "required_date",
        "requested_quantity_display",
        "converted_quantity_display",
        "remaining_quantity_display",
        "submitted_at",
        "approved_at",
        "created_at",
    ]

    list_filter = [
        "status",
        "priority",
        "request_date",
        "required_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "request_number",
        "purpose",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "branch__name",
        "notes",
        "rejection_reason",
        "cancellation_reason",
    ]

    readonly_fields = [
        "requested_quantity_display",
        "converted_quantity_display",
        "remaining_quantity_display",
        "submitted_at",
        "submitted_by",
        "approved_at",
        "approved_by",
        "rejected_at",
        "rejected_by",
        "cancelled_at",
        "cancelled_by",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "company",
        "branch",
        "created_by",
        "updated_by",
        "submitted_by",
        "approved_by",
        "rejected_by",
        "cancelled_by",
    ]

    fieldsets = [
        (
            "Basic information",
            {
                "fields": [
                    "company",
                    "branch",
                    "request_number",
                    "request_date",
                    "required_date",
                    "status",
                    "priority",
                    "purpose",
                ],
            },
        ),
        (
            "Quantities",
            {
                "fields": [
                    "requested_quantity_display",
                    "converted_quantity_display",
                    "remaining_quantity_display",
                ],
            },
        ),
        (
            "Submission",
            {
                "fields": [
                    "submitted_at",
                    "submitted_by",
                ],
            },
        ),
        (
            "Approval",
            {
                "fields": [
                    "approved_at",
                    "approved_by",
                ],
            },
        ),
        (
            "Rejection",
            {
                "fields": [
                    "rejected_at",
                    "rejected_by",
                    "rejection_reason",
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
        PurchaseRequestItemInline,
    ]

    @admin.display(
        description="Requested quantity",
    )
    def requested_quantity_display(
        self,
        obj,
    ):
        return obj.requested_quantity

    @admin.display(
        description="Converted quantity",
    )
    def converted_quantity_display(
        self,
        obj,
    ):
        return obj.converted_quantity

    @admin.display(
        description="Remaining quantity",
    )
    def remaining_quantity_display(
        self,
        obj,
    ):
        return obj.remaining_quantity


@admin.register(PurchaseRequestItem)
class PurchaseRequestItemAdmin(admin.ModelAdmin):
    """
    Purchase request items administration.
    """

    list_display = [
        "request",
        "line_number",
        "item",
        "company",
        "quantity",
        "suggested_unit_price",
        "converted_quantity_display",
        "remaining_quantity_display",
        "created_at",
    ]

    list_filter = [
        "company",
        "request__status",
        "request__priority",
        "created_at",
    ]

    search_fields = [
        "request__request_number",
        "request__purpose",
        "item__name",
        "item__name_ar",
        "item__name_en",
        "item__code",
        "item__sku",
        "item_code_snapshot",
        "item_name_snapshot",
        "notes",
    ]

    readonly_fields = [
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "converted_quantity_display",
        "remaining_quantity_display",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "request",
        "company",
        "item",
    ]

    @admin.display(
        description="Converted quantity",
    )
    def converted_quantity_display(
        self,
        obj,
    ):
        return obj.converted_quantity

    @admin.display(
        description="Remaining quantity",
    )
    def remaining_quantity_display(
        self,
        obj,
    ):
        return obj.remaining_quantity


class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 0

    fields = [
        "line_number",
        "purchase_request_item",
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
        "item",
    ]


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = [
        "order_number",
        "supplier",
        "company",
        "branch",
        "status",
        "order_date",
        "expected_date",
        "subtotal_amount",
        "tax_amount",
        "total_amount",
        "approved_at",
        "created_at",
    ]

    list_filter = [
        "status",
        "order_date",
        "expected_date",
        "company",
        "branch",
        "created_at",
    ]

    search_fields = [
        "order_number",
        "supplier_reference",
        "supplier__display_name",
        "supplier__legal_name",
        "supplier__phone",
        "supplier__mobile",
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
        "approved_at",
        "approved_by",
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
        "approved_by",
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
                    "purchase_request",
                    "order_number",
                    "supplier_reference",
                    "order_date",
                    "expected_date",
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
            "Approval",
            {
                "fields": [
                    "approved_at",
                    "approved_by",
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
        PurchaseOrderItemInline,
    ]


@admin.register(PurchaseOrderItem)
class PurchaseOrderItemAdmin(admin.ModelAdmin):
    list_display = [
        "order",
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
        "order__status",
        "created_at",
    ]

    search_fields = [
        "order__order_number",
        "order__supplier_reference",
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
        "order",
        "company",
        "item",
        "purchase_request_item",
    ]


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
                    "purchase_order",
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
        "purchase_order_item",
    ]


class PurchaseReceiptItemInline(admin.TabularInline):
    model = PurchaseReceiptItem
    extra = 0

    fields = [
        "line_number",
        "bill_item",
        "item",
        "item_name_snapshot",
        "unit_name_snapshot",
        "quantity",
        "unit_cost",
        "stock_movement",
        "notes",
    ]

    readonly_fields = [
        "item",
        "item_code_snapshot",
        "item_name_snapshot",
        "item_name_ar_snapshot",
        "item_name_en_snapshot",
        "unit_name_snapshot",
        "unit_cost",
        "stock_movement",
    ]

    autocomplete_fields = [
        "bill_item",
    ]


@admin.register(PurchaseReceipt)
class PurchaseReceiptAdmin(admin.ModelAdmin):
    list_display = [
        "receipt_number",
        "bill",
        "supplier",
        "warehouse",
        "company",
        "branch",
        "status",
        "receipt_date",
        "posted_at",
        "created_at",
    ]

    list_filter = [
        "status",
        "receipt_date",
        "company",
        "branch",
        "warehouse",
        "created_at",
    ]

    search_fields = [
        "receipt_number",
        "bill__bill_number",
        "bill__supplier_bill_number",
        "supplier__display_name",
        "supplier__legal_name",
        "warehouse__code",
        "warehouse__name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "notes",
    ]

    readonly_fields = [
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
        "warehouse",
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
                    "bill",
                    "warehouse",
                    "receipt_number",
                    "receipt_date",
                    "status",
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
        PurchaseReceiptItemInline,
    ]


@admin.register(PurchaseReceiptItem)
class PurchaseReceiptItemAdmin(admin.ModelAdmin):
    list_display = [
        "receipt",
        "line_number",
        "bill_item",
        "item",
        "company",
        "quantity",
        "unit_cost",
        "stock_movement",
        "created_at",
    ]

    list_filter = [
        "company",
        "receipt__status",
        "created_at",
    ]

    search_fields = [
        "receipt__receipt_number",
        "receipt__bill__bill_number",
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
        "unit_cost",
        "stock_movement",
        "created_at",
        "updated_at",
    ]

    autocomplete_fields = [
        "receipt",
        "company",
        "bill_item",
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
