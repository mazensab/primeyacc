# ============================================================
# 📂 treasury/admin.py
# 🧠 PrimeyAcc | Treasury Admin V1.0
# ------------------------------------------------------------
# ✅ TreasuryAccount admin registration
# ✅ TreasuryTransaction admin registration
# ✅ Company-scoped visibility helpers
# ✅ Operational filters/search for treasury review
# ✅ Readonly protection for audit and posting fields
# ------------------------------------------------------------
# القاعدة المعمارية المعتمدة:
# - Django Admin أداة مراجعة وإدارة داخلية فقط
# - منطق الخزينة الحقيقي يبقى داخل treasury/services.py
# - لا يتم تعديل الحركات المرحلة أو الملغاة مباشرة من الواجهة لاحقًا
# - العزل النهائي داخل /company يتم عبر services و APIs وليس من Admin فقط
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from .models import TreasuryAccount, TreasuryTransaction


@admin.register(TreasuryAccount)
class TreasuryAccountAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "account_type",
        "status",
        "currency",
        "opening_balance",
        "current_balance",
        "is_default",
        "updated_at",
    )
    list_filter = (
        "account_type",
        "status",
        "currency",
        "is_default",
        "company",
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
        "created_by",
        "updated_by",
    )
    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "company",
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