# ============================================================
# 📂 treasury/admin.py
# 🧠 Mhamcloud | Treasury Admin V1.1
# ------------------------------------------------------------
# ✅ TreasuryAccount admin registration
# ✅ TreasuryTransaction admin registration
# ✅ CustomerPayment admin registration
# ✅ SupplierPayment admin registration
# ✅ Company-scoped visibility helpers
# ✅ Operational filters/search for treasury review
# ✅ Readonly protection for audit, posting, confirmation fields
# ------------------------------------------------------------
# القاعدة المعمارية المعتمدة:
# - Django Admin أداة مراجعة وإدارة داخلية فقط
# - منطق الخزينة الحقيقي يبقى داخل treasury/services.py
# - لا يتم تعديل الحركات المرحلة أو الملغاة مباشرة من الواجهة لاحقًا
# - مدفوعات العملاء والموردين يتم تأكيدها فعليًا من services.py لاحقًا
# - العزل النهائي داخل /company يتم عبر services و APIs وليس من Admin فقط
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from .models import (
    CustomerPayment,
    SupplierPayment,
    TreasuryAccount,
    TreasuryTransaction,
)


@admin.register(TreasuryAccount)
class TreasuryAccountAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "accounting_account",
        "account_type",
        "status",
        "currency",
        "opening_balance",
        "current_balance",
        "opening_accounting_entry",
        "is_default",
        "updated_at",
    )
    list_filter = (
        "account_type",
        "status",
        "currency",
        "is_default",
        "company",
        "opening_accounting_entry",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "name",
        "code",
        "company__name",
        "bank_name",
        "bank_account_number",
        "iban",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "accounting_account",
        "created_by",
        "updated_by",
    )
    ordering = (
        "company__name",
        "account_type",
        "name",
    )
    list_select_related = (
        "company",
        "accounting_account",
        "created_by",
        "updated_by",
    )
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "company",
                    "accounting_account",
                    "name",
                    "code",
                    "account_type",
                    "status",
                    "currency",
                    "is_default",
                )
            },
        ),
        (
            "Balances",
            {
                "fields": (
                    "opening_balance",
                    "current_balance",
                    "opening_accounting_entry",
                )
            },
        ),
        (
            "Bank Details",
            {
                "fields": (
                    "bank_name",
                    "bank_account_number",
                    "iban",
                )
            },
        ),
        (
            "Notes",
            {
                "fields": (
                    "notes",
                )
            },
        ),
        (
            "Audit",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    def get_queryset(self, request: HttpRequest) -> QuerySet[TreasuryAccount]:
        return super().get_queryset(request).select_related(
            "company",
            "created_by",
            "updated_by",
        )

    def save_model(
        self,
        request: HttpRequest,
        obj: TreasuryAccount,
        form,
        change: bool,
    ) -> None:
        if not change and obj.created_by_id is None:
            obj.created_by = request.user

        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TreasuryTransaction)
class TreasuryTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "transaction_number",
        "company",
        "account",
        "transaction_type",
        "status",
        "source_type",
        "amount",
        "currency",
        "transaction_date",
        "is_accounting_posted",
        "posted_at",
    )
    list_filter = (
        "transaction_type",
        "status",
        "source_type",
        "currency",
        "is_accounting_posted",
        "company",
        "account",
        "transaction_date",
        "created_at",
        "posted_at",
        "cancelled_at",
    )
    search_fields = (
        "transaction_number",
        "reference",
        "description",
        "notes",
        "company__name",
        "account__name",
        "counterparty_account__name",
        "source_app",
        "source_model",
        "source_object_id",
    )
    readonly_fields = (
        "balance_before",
        "balance_after",
        "accounting_entry",
        "is_accounting_posted",
        "accounting_posted_at",
        "posted_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "account",
        "counterparty_account",
        "accounting_entry",
        "posted_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    ordering = (
        "-transaction_date",
        "-id",
    )
    list_select_related = (
        "company",
        "account",
        "counterparty_account",
        "accounting_entry",
        "posted_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    date_hierarchy = "transaction_date"
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "company",
                    "account",
                    "counterparty_account",
                    "transaction_number",
                    "transaction_type",
                    "status",
                    "source_type",
                    "amount",
                    "currency",
                    "transaction_date",
                )
            },
        ),
        (
            "Source Reference",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "source_app",
                    "source_model",
                    "source_object_id",
                    "reference",
                ),
            },
        ),
        (
            "Description",
            {
                "fields": (
                    "description",
                    "notes",
                )
            },
        ),
        (
            "Balance Snapshot",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "balance_before",
                    "balance_after",
                ),
            },
        ),
        (
            "Accounting",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "accounting_entry",
                    "is_accounting_posted",
                    "accounting_posted_at",
                ),
            },
        ),
        (
            "Posting / Cancellation",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "posted_at",
                    "posted_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancellation_reason",
                ),
            },
        ),
        (
            "Audit",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    def get_queryset(self, request: HttpRequest) -> QuerySet[TreasuryTransaction]:
        return super().get_queryset(request).select_related(
            "company",
            "account",
            "counterparty_account",
            "accounting_entry",
            "posted_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )

    def save_model(
        self,
        request: HttpRequest,
        obj: TreasuryTransaction,
        form,
        change: bool,
    ) -> None:
        if not change and obj.created_by_id is None:
            obj.created_by = request.user

        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CustomerPayment)
class CustomerPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "payment_number",
        "company",
        "customer_name",
        "sales_invoice",
        "treasury_account",
        "amount",
        "currency",
        "payment_method",
        "status",
        "payment_date",
        "confirmed_at",
        "is_accounting_posted",
    )
    list_filter = (
        "status",
        "payment_method",
        "currency",
        "is_accounting_posted",
        "company",
        "treasury_account",
        "payment_date",
        "created_at",
        "confirmed_at",
        "cancelled_at",
    )
    search_fields = (
        "payment_number",
        "reference",
        "description",
        "notes",
        "company__name",
        "customer_name",
        "customer_phone",
        "customer_id",
        "treasury_account__name",
        "sales_invoice__invoice_number",
    )
    readonly_fields = (
        "treasury_transaction",
        "accounting_entry",
        "is_accounting_posted",
        "accounting_posted_at",
        "confirmed_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "sales_invoice",
        "treasury_account",
        "treasury_transaction",
        "accounting_entry",
        "confirmed_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    ordering = (
        "-payment_date",
        "-id",
    )
    list_select_related = (
        "company",
        "sales_invoice",
        "treasury_account",
        "treasury_transaction",
        "accounting_entry",
        "confirmed_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    date_hierarchy = "payment_date"
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "company",
                    "payment_number",
                    "status",
                    "payment_date",
                    "amount",
                    "currency",
                    "payment_method",
                )
            },
        ),
        (
            "Customer",
            {
                "fields": (
                    "customer_id",
                    "customer_name",
                    "customer_phone",
                    "sales_invoice",
                )
            },
        ),
        (
            "Treasury",
            {
                "fields": (
                    "treasury_account",
                    "treasury_transaction",
                )
            },
        ),
        (
            "Reference / Notes",
            {
                "fields": (
                    "reference",
                    "description",
                    "notes",
                )
            },
        ),
        (
            "Confirmation / Cancellation",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "confirmed_at",
                    "confirmed_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancellation_reason",
                ),
            },
        ),
        (
            "Accounting",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "accounting_entry",
                    "is_accounting_posted",
                    "accounting_posted_at",
                ),
            },
        ),
        (
            "Audit",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    def get_queryset(self, request: HttpRequest) -> QuerySet[CustomerPayment]:
        return super().get_queryset(request).select_related(
            "company",
            "sales_invoice",
            "treasury_account",
            "treasury_transaction",
            "accounting_entry",
            "confirmed_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )

    def save_model(
        self,
        request: HttpRequest,
        obj: CustomerPayment,
        form,
        change: bool,
    ) -> None:
        if not change and obj.created_by_id is None:
            obj.created_by = request.user

        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(SupplierPayment)
class SupplierPaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "payment_number",
        "company",
        "supplier_name",
        "purchase_bill",
        "treasury_account",
        "amount",
        "currency",
        "payment_method",
        "status",
        "payment_date",
        "confirmed_at",
        "is_accounting_posted",
    )
    list_filter = (
        "status",
        "payment_method",
        "currency",
        "is_accounting_posted",
        "company",
        "treasury_account",
        "payment_date",
        "created_at",
        "confirmed_at",
        "cancelled_at",
    )
    search_fields = (
        "payment_number",
        "reference",
        "description",
        "notes",
        "company__name",
        "supplier_name",
        "supplier_phone",
        "supplier_id",
        "treasury_account__name",
        "purchase_bill__bill_number",
    )
    readonly_fields = (
        "treasury_transaction",
        "accounting_entry",
        "is_accounting_posted",
        "accounting_posted_at",
        "confirmed_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "purchase_bill",
        "treasury_account",
        "treasury_transaction",
        "accounting_entry",
        "confirmed_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    ordering = (
        "-payment_date",
        "-id",
    )
    list_select_related = (
        "company",
        "purchase_bill",
        "treasury_account",
        "treasury_transaction",
        "accounting_entry",
        "confirmed_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    )
    date_hierarchy = "payment_date"
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "company",
                    "payment_number",
                    "status",
                    "payment_date",
                    "amount",
                    "currency",
                    "payment_method",
                )
            },
        ),
        (
            "Supplier",
            {
                "fields": (
                    "supplier_id",
                    "supplier_name",
                    "supplier_phone",
                    "purchase_bill",
                )
            },
        ),
        (
            "Treasury",
            {
                "fields": (
                    "treasury_account",
                    "treasury_transaction",
                )
            },
        ),
        (
            "Reference / Notes",
            {
                "fields": (
                    "reference",
                    "description",
                    "notes",
                )
            },
        ),
        (
            "Confirmation / Cancellation",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "confirmed_at",
                    "confirmed_by",
                    "cancelled_at",
                    "cancelled_by",
                    "cancellation_reason",
                ),
            },
        ),
        (
            "Accounting",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "accounting_entry",
                    "is_accounting_posted",
                    "accounting_posted_at",
                ),
            },
        ),
        (
            "Audit",
            {
                "classes": (
                    "collapse",
                ),
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    def get_queryset(self, request: HttpRequest) -> QuerySet[SupplierPayment]:
        return super().get_queryset(request).select_related(
            "company",
            "purchase_bill",
            "treasury_account",
            "treasury_transaction",
            "accounting_entry",
            "confirmed_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )

    def save_model(
        self,
        request: HttpRequest,
        obj: SupplierPayment,
        form,
        change: bool,
    ) -> None:
        if not change and obj.created_by_id is None:
            obj.created_by = request.user

        obj.updated_by = request.user
        super().save_model(request, obj, form, change)