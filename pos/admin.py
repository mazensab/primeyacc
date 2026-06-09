# ============================================================
# 📂 pos/admin.py
# 🧠 PrimeyAcc | POS Admin V1.0
# ------------------------------------------------------------
# ✅ POS Registers Admin
# ✅ POS Cashier Sessions Admin
# ✅ POS Checkout Orders Admin
# ✅ POS Checkout Order Items Admin
# ✅ POS Payments Admin
# ✅ Company / Branch / Register Filters
# ✅ Treasury / Payment Filters
# ✅ Readonly Audit Fields
# ✅ Safe Admin Search
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لوحة Admin للعرض والمراجعة التشغيلية فقط
# - لا يتم تنفيذ البيع أو إغلاق الجلسات أو الترحيل من admin.py
# - العمليات التشغيلية تتم داخل pos/services.py
# - كل سجلات POS مرتبطة بشركة واحدة فقط
# - لا يجوز خلط بيانات الشركات في أي علاقة تشغيلية
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    POSOrder,
    POSOrderItem,
    POSPayment,
    POSRegister,
    POSSession,
)


class POSOrderItemInline(admin.TabularInline):
    """
    Inline POS order items.

    Used only for operational review inside Django Admin.
    """

    model = POSOrderItem
    extra = 0
    can_delete = False
    fields = [
        "catalog_item",
        "item_code",
        "item_sku",
        "item_barcode",
        "item_name",
        "unit_name",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable_amount",
        "tax_rate",
        "tax_amount",
        "line_total",
    ]
    readonly_fields = [
        "catalog_item",
        "item_code",
        "item_sku",
        "item_barcode",
        "item_name",
        "unit_name",
        "quantity",
        "unit_price",
        "discount_amount",
        "taxable_amount",
        "tax_rate",
        "tax_amount",
        "line_total",
    ]


class POSPaymentInline(admin.TabularInline):
    """
    Inline POS payments.

    Used only for operational review inside Django Admin.
    """

    model = POSPayment
    extra = 0
    can_delete = False
    fields = [
        "payment_method",
        "payment_terminal",
        "treasury_account",
        "payment_type",
        "status",
        "amount",
        "reference",
        "treasury_transaction",
        "customer_payment",
        "confirmed_at",
        "cancelled_at",
    ]
    readonly_fields = [
        "payment_method",
        "payment_terminal",
        "treasury_account",
        "payment_type",
        "status",
        "amount",
        "reference",
        "treasury_transaction",
        "customer_payment",
        "confirmed_at",
        "cancelled_at",
    ]


@admin.register(POSRegister)
class POSRegisterAdmin(admin.ModelAdmin):
    """
    Admin configuration for POS registers.
    """

    list_display = [
        "id",
        "name",
        "code",
        "company",
        "branch",
        "warehouse",
        "treasury_account",
        "status",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "status",
        "is_active",
        "company",
        "branch",
        "warehouse",
        "treasury_account",
        "created_at",
    ]
    search_fields = [
        "name",
        "code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "branch__name",
        "branch__name_ar",
        "branch__name_en",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    fieldsets = [
        (
            "Register",
            {
                "fields": [
                    "company",
                    "branch",
                    "warehouse",
                    "treasury_account",
                    "default_payment_method",
                    "default_payment_terminal",
                    "name",
                    "code",
                    "status",
                    "is_active",
                ]
            },
        ),
        (
            "Receipt",
            {
                "fields": [
                    "receipt_header",
                    "receipt_footer",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "settings_data",
                    "extra_data",
                    "notes",
                ]
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
                ]
            },
        ),
    ]


@admin.register(POSSession)
class POSSessionAdmin(admin.ModelAdmin):
    """
    Admin configuration for POS cashier sessions.
    """

    list_display = [
        "id",
        "session_number",
        "company",
        "register",
        "branch",
        "treasury_account",
        "status",
        "opening_cash_amount",
        "expected_cash_amount",
        "closing_cash_amount",
        "difference_amount",
        "opened_at",
        "closed_at",
    ]
    list_filter = [
        "status",
        "company",
        "register",
        "branch",
        "treasury_account",
        "opened_at",
        "closed_at",
    ]
    search_fields = [
        "session_number",
        "register__name",
        "register__code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "branch__name",
        "branch__name_ar",
        "branch__name_en",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    fieldsets = [
        (
            "Session",
            {
                "fields": [
                    "company",
                    "register",
                    "branch",
                    "warehouse",
                    "treasury_account",
                    "session_number",
                    "status",
                ]
            },
        ),
        (
            "Cash",
            {
                "fields": [
                    "opening_cash_amount",
                    "expected_cash_amount",
                    "closing_cash_amount",
                    "difference_amount",
                ]
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "opened_by",
                    "closed_by",
                    "cancelled_by",
                    "opened_at",
                    "closed_at",
                    "cancelled_at",
                    "cancellation_reason",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "extra_data",
                    "notes",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


@admin.register(POSOrder)
class POSOrderAdmin(admin.ModelAdmin):
    """
    Admin configuration for POS checkout orders.
    """

    list_display = [
        "id",
        "order_number",
        "company",
        "session",
        "register",
        "branch",
        "customer",
        "status",
        "payment_status",
        "total_amount",
        "paid_amount",
        "change_amount",
        "invoice",
        "created_at",
    ]
    list_filter = [
        "status",
        "payment_status",
        "company",
        "register",
        "branch",
        "created_at",
        "completed_at",
        "cancelled_at",
    ]
    search_fields = [
        "order_number",
        "session__session_number",
        "register__name",
        "register__code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "customer__name",
        "customer__name_ar",
        "customer__name_en",
        "invoice__invoice_number",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
        "balance_due",
    ]
    inlines = [
        POSOrderItemInline,
        POSPaymentInline,
    ]
    fieldsets = [
        (
            "Order",
            {
                "fields": [
                    "company",
                    "session",
                    "register",
                    "branch",
                    "warehouse",
                    "customer",
                    "invoice",
                    "order_number",
                    "status",
                    "payment_status",
                ]
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "subtotal_amount",
                    "discount_amount",
                    "taxable_amount",
                    "tax_amount",
                    "total_amount",
                    "paid_amount",
                    "change_amount",
                    "balance_due",
                ]
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "completed_by",
                    "cancelled_by",
                    "completed_at",
                    "cancelled_at",
                    "cancellation_reason",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "extra_data",
                    "notes",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


@admin.register(POSOrderItem)
class POSOrderItemAdmin(admin.ModelAdmin):
    """
    Admin configuration for POS checkout order items.
    """

    list_display = [
        "id",
        "order",
        "company",
        "catalog_item",
        "item_name",
        "item_code",
        "item_sku",
        "quantity",
        "unit_price",
        "tax_amount",
        "line_total",
        "created_at",
    ]
    list_filter = [
        "company",
        "catalog_item",
        "created_at",
    ]
    search_fields = [
        "order__order_number",
        "item_name",
        "item_code",
        "item_sku",
        "item_barcode",
        "catalog_item__name",
        "catalog_item__name_ar",
        "catalog_item__name_en",
        "company__name",
        "company__name_ar",
        "company__name_en",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    fieldsets = [
        (
            "Item",
            {
                "fields": [
                    "company",
                    "order",
                    "catalog_item",
                    "item_code",
                    "item_sku",
                    "item_barcode",
                    "item_name",
                    "unit_name",
                ]
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "quantity",
                    "unit_price",
                    "discount_amount",
                    "taxable_amount",
                    "tax_rate",
                    "tax_amount",
                    "line_total",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


@admin.register(POSPayment)
class POSPaymentAdmin(admin.ModelAdmin):
    """
    Admin configuration for POS payment lines.
    """

    list_display = [
        "id",
        "order",
        "company",
        "payment_method",
        "payment_type",
        "status",
        "amount",
        "treasury_account",
        "reference",
        "confirmed_at",
        "created_at",
    ]
    list_filter = [
        "status",
        "payment_type",
        "company",
        "payment_method",
        "treasury_account",
        "created_at",
        "confirmed_at",
        "cancelled_at",
    ]
    search_fields = [
        "order__order_number",
        "reference",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "payment_method__name",
        "treasury_account__name",
        "treasury_transaction__transaction_number",
        "customer_payment__payment_number",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    fieldsets = [
        (
            "Payment",
            {
                "fields": [
                    "company",
                    "order",
                    "payment_method",
                    "payment_terminal",
                    "treasury_account",
                    "treasury_transaction",
                    "customer_payment",
                    "payment_type",
                    "status",
                    "amount",
                    "reference",
                ]
            },
        ),
        (
            "Lifecycle",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "confirmed_by",
                    "cancelled_by",
                    "confirmed_at",
                    "cancelled_at",
                    "cancellation_reason",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "extra_data",
                    "notes",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]