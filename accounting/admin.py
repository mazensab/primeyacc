# ============================================================
# 📂 accounting/admin.py
# 🧠 Mhamcloud | Accounting Admin
# ------------------------------------------------------------
# ✅ إدارة دليل الحسابات لكل شركة
# ✅ إدارة السنوات والفترات المالية
# ✅ إدارة مراكز التكلفة
# ✅ إدارة الضرائب
# ✅ إدارة إعدادات وقواعد التوجيه المحاسبي
# ✅ إدارة القيود اليومية وأسطر القيود
# ✅ إدارة الحركات الضريبية
# ============================================================

from __future__ import annotations

from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.html import format_html

from .models import (
    Account,
    AccountNature,
    AccountType,
    AccountingPeriod,
    AccountingPeriodStatus,
    AccountingRoutingRule,
    AccountingSettings,
    CostCenter,
    CostCenterStatus,
    FiscalYear,
    FiscalYearStatus,
    JournalEntry,
    JournalEntryLine,
    JournalEntryStatus,
    PostingSource,
    TaxRate,
    TaxTransaction,
)


# ============================================================
# 🧩 Filters
# ============================================================

class HasParentFilter(admin.SimpleListFilter):
    title = "له حساب/أصل أب"
    parameter_name = "has_parent"

    def lookups(self, request, model_admin):
        return (
            ("yes", "نعم"),
            ("no", "لا"),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(parent__isnull=False)

        if self.value() == "no":
            return queryset.filter(parent__isnull=True)

        return queryset


class AccountPostingAvailabilityFilter(admin.SimpleListFilter):
    title = "قابل للترحيل"
    parameter_name = "can_post"

    def lookups(self, request, model_admin):
        return (
            ("yes", "نعم"),
            ("no", "لا"),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(is_active=True, is_group=False)

        if self.value() == "no":
            return queryset.exclude(is_active=True, is_group=False)

        return queryset


class JournalEntryBalanceFilter(admin.SimpleListFilter):
    title = "توازن القيد"
    parameter_name = "balance_status"

    def lookups(self, request, model_admin):
        return (
            ("balanced", "متوازن"),
            ("not_balanced", "غير متوازن"),
            ("zero", "صفري"),
        )

    def queryset(self, request, queryset):
        if self.value() == "balanced":
            return queryset.filter(total_debit=models.F("total_credit")).filter(total_debit__gt=0)

        if self.value() == "not_balanced":
            return queryset.exclude(total_debit=models.F("total_credit"))

        if self.value() == "zero":
            return queryset.filter(total_debit=0, total_credit=0)

        return queryset


class HasTaxAccountFilter(admin.SimpleListFilter):
    title = "له حساب ضريبي"
    parameter_name = "has_tax_account"

    def lookups(self, request, model_admin):
        return (
            ("yes", "نعم"),
            ("no", "لا"),
        )

    def queryset(self, request, queryset):
        if self.value() == "yes":
            return queryset.filter(
                models.Q(sales_account__isnull=False)
                | models.Q(purchase_account__isnull=False)
            )

        if self.value() == "no":
            return queryset.filter(
                sales_account__isnull=True,
                purchase_account__isnull=True,
            )

        return queryset


# ============================================================
# 🌳 Account Admin
# ============================================================

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "code",
        "name",
        "name_en",
        "account_type_badge",
        "nature_badge",
        "purpose",
        "parent",
        "level",
        "is_group",
        "is_active",
        "allow_manual_posting",
        "currency",
        "created_at",
    )

    list_filter = (
        "company",
        "account_type",
        "nature",
        "purpose",
        "is_group",
        "is_active",
        "allow_manual_posting",
        "currency",
        HasParentFilter,
        AccountPostingAvailabilityFilter,
        "created_at",
    )

    search_fields = (
        "code",
        "name",
        "name_en",
        "description",
        "company__name",
        "company__code",
        "parent__code",
        "parent__name",
    )

    readonly_fields = (
        "level",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "parent",
    )

    fieldsets = (
        (
            "بيانات الحساب",
            {
                "fields": (
                    "company",
                    "code",
                    "name",
                    "name_en",
                    "account_type",
                    "nature",
                    "purpose",
                    "parent",
                    "level",
                    "currency",
                )
            },
        ),
        (
            "إعدادات الترحيل",
            {
                "fields": (
                    "is_group",
                    "is_active",
                    "is_system",
                    "allow_manual_posting",
                    "opening_balance",
                )
            },
        ),
        (
            "وصف وبيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "description",
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "code")
    list_per_page = 100
    save_on_top = True

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("company", "parent")
        )

    @admin.display(description="نوع الحساب", ordering="account_type")
    def account_type_badge(self, obj):
        colors = {
            AccountType.ASSET: "#2563eb",
            AccountType.LIABILITY: "#7c2d12",
            AccountType.EQUITY: "#6d28d9",
            AccountType.REVENUE: "#15803d",
            AccountType.EXPENSE: "#b45309",
        }

        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            colors.get(obj.account_type, "#374151"),
            obj.get_account_type_display(),
        )

    @admin.display(description="الطبيعة", ordering="nature")
    def nature_badge(self, obj):
        if obj.nature == AccountNature.DEBIT:
            return format_html('<span style="color:#2563eb;font-weight:700;">مدين</span>')

        return format_html('<span style="color:#15803d;font-weight:700;">دائن</span>')


# ============================================================
# 🏷️ CostCenter Admin
# ============================================================

@admin.register(CostCenter)
class CostCenterAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "code",
        "name",
        "name_en",
        "parent",
        "level",
        "is_group",
        "status_badge",
        "created_at",
    )

    list_filter = (
        "company",
        "status",
        "is_group",
        HasParentFilter,
        "created_at",
    )

    search_fields = (
        "code",
        "name",
        "name_en",
        "description",
        "company__name",
        "company__code",
        "parent__code",
        "parent__name",
    )

    readonly_fields = (
        "level",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "parent",
    )

    fieldsets = (
        (
            "بيانات مركز التكلفة",
            {
                "fields": (
                    "company",
                    "code",
                    "name",
                    "name_en",
                    "parent",
                    "level",
                    "is_group",
                    "status",
                    "description",
                )
            },
        ),
        (
            "بيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "code")
    list_per_page = 100

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("company", "parent")
        )

    @admin.display(description="الحالة", ordering="status")
    def status_badge(self, obj):
        if obj.status == CostCenterStatus.ACTIVE:
            return format_html('<span style="color:#166534;font-weight:700;">نشط</span>')

        return format_html('<span style="color:#991b1b;font-weight:700;">غير نشط</span>')


# ============================================================
# 📅 FiscalYear Admin
# ============================================================

@admin.register(FiscalYear)
class FiscalYearAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "name",
        "start_date",
        "end_date",
        "status_badge",
        "is_current",
        "is_default",
        "created_at",
    )

    list_filter = (
        "company",
        "status",
        "is_current",
        "is_default",
        "start_date",
        "end_date",
        "created_at",
    )

    search_fields = (
        "name",
        "description",
        "notes",
        "company__name",
        "company__code",
    )

    readonly_fields = (
        "closed_at",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
    )

    fieldsets = (
        (
            "بيانات السنة المالية",
            {
                "fields": (
                    "company",
                    "name",
                    "start_date",
                    "end_date",
                    "status",
                    "is_current",
                    "is_default",
                    "description",
                    "notes",
                )
            },
        ),
        (
            "الإغلاق",
            {
                "classes": ("collapse",),
                "fields": (
                    "closed_at",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "-start_date")
    date_hierarchy = "start_date"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("company")

    @admin.display(description="الحالة", ordering="status")
    def status_badge(self, obj):
        if obj.status == FiscalYearStatus.OPEN:
            return format_html('<span style="color:#166534;font-weight:700;">مفتوحة</span>')

        if obj.status == FiscalYearStatus.CLOSED:
            return format_html('<span style="color:#991b1b;font-weight:700;">مغلقة</span>')

        return format_html('<span style="color:#4b5563;font-weight:700;">مؤرشفة</span>')


# ============================================================
# 📆 AccountingPeriod Admin
# ============================================================

@admin.register(AccountingPeriod)
class AccountingPeriodAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "fiscal_year",
        "name",
        "start_date",
        "end_date",
        "status_badge",
        "is_adjustment_period",
        "created_at",
    )

    list_filter = (
        "company",
        "fiscal_year",
        "status",
        "is_adjustment_period",
        "start_date",
        "end_date",
        "created_at",
    )

    search_fields = (
        "name",
        "fiscal_year__name",
        "notes",
        "company__name",
        "company__code",
    )

    readonly_fields = (
        "closed_at",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "fiscal_year",
    )

    fieldsets = (
        (
            "بيانات الفترة",
            {
                "fields": (
                    "company",
                    "fiscal_year",
                    "name",
                    "start_date",
                    "end_date",
                    "status",
                    "is_adjustment_period",
                    "notes",
                )
            },
        ),
        (
            "الإغلاق",
            {
                "classes": ("collapse",),
                "fields": (
                    "closed_at",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "fiscal_year", "start_date")
    date_hierarchy = "start_date"

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("company", "fiscal_year")
        )

    @admin.display(description="الحالة", ordering="status")
    def status_badge(self, obj):
        if obj.status == AccountingPeriodStatus.OPEN:
            return format_html('<span style="color:#166534;font-weight:700;">مفتوحة</span>')

        if obj.status == AccountingPeriodStatus.CLOSED:
            return format_html('<span style="color:#991b1b;font-weight:700;">مغلقة</span>')

        return format_html('<span style="color:#92400e;font-weight:700;">مقفلة</span>')


# ============================================================
# 🧾 TaxRate Admin
# ============================================================

@admin.register(TaxRate)
class TaxRateAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "code",
        "name",
        "tax_type",
        "direction",
        "rate",
        "sales_account",
        "purchase_account",
        "is_active",
        "is_default",
        "created_at",
    )

    list_filter = (
        "company",
        "tax_type",
        "direction",
        "is_active",
        "is_default",
        HasTaxAccountFilter,
        "created_at",
    )

    search_fields = (
        "code",
        "name",
        "description",
        "company__name",
        "company__code",
        "sales_account__code",
        "sales_account__name",
        "purchase_account__code",
        "purchase_account__name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "sales_account",
        "purchase_account",
    )

    fieldsets = (
        (
            "بيانات الضريبة",
            {
                "fields": (
                    "company",
                    "code",
                    "name",
                    "tax_type",
                    "direction",
                    "rate",
                    "is_active",
                    "is_default",
                    "description",
                )
            },
        ),
        (
            "الحسابات الضريبية",
            {
                "fields": (
                    "sales_account",
                    "purchase_account",
                )
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "code")

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "sales_account",
                "purchase_account",
            )
        )


# ============================================================
# ⚙️ AccountingSettings Admin
# ============================================================

@admin.register(AccountingSettings)
class AccountingSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "default_currency",
        "default_tax_rate",
        "auto_post_sales",
        "auto_post_purchases",
        "auto_post_inventory",
        "auto_post_treasury",
        "require_period_for_posting",
        "updated_at",
    )

    list_filter = (
        "company",
        "default_currency",
        "auto_post_sales",
        "auto_post_purchases",
        "auto_post_inventory",
        "auto_post_treasury",
        "require_period_for_posting",
        "allow_posting_without_cost_center",
    )

    search_fields = (
        "company__name",
        "company__code",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "default_tax_rate",
    )

    fieldsets = (
        (
            "الشركة والإعدادات العامة",
            {
                "fields": (
                    "company",
                    "default_currency",
                    "default_tax_rate",
                    "require_period_for_posting",
                    "allow_posting_without_cost_center",
                )
            },
        ),
        (
            "الترحيل التلقائي",
            {
                "fields": (
                    "auto_post_sales",
                    "auto_post_purchases",
                    "auto_post_inventory",
                    "auto_post_treasury",
                )
            },
        ),
        (
            "بيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("company", "default_tax_rate")
        )


# ============================================================
# 🧭 AccountingRoutingRule Admin
# ============================================================

@admin.register(AccountingRoutingRule)
class AccountingRoutingRuleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "source",
        "purpose",
        "account",
        "tax_rate",
        "cost_center",
        "is_active",
        "priority",
        "created_at",
    )

    list_filter = (
        "company",
        "source",
        "purpose",
        "is_active",
        "priority",
        "tax_rate",
        "cost_center",
        "created_at",
    )

    search_fields = (
        "source",
        "purpose",
        "description",
        "company__name",
        "company__code",
        "account__code",
        "account__name",
        "tax_rate__code",
        "tax_rate__name",
        "cost_center__code",
        "cost_center__name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "account",
        "tax_rate",
        "cost_center",
    )

    fieldsets = (
        (
            "قاعدة التوجيه",
            {
                "fields": (
                    "company",
                    "source",
                    "purpose",
                    "account",
                    "tax_rate",
                    "cost_center",
                    "is_active",
                    "priority",
                    "description",
                )
            },
        ),
        (
            "بيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "source", "purpose", "priority")

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "account",
                "tax_rate",
                "cost_center",
            )
        )


# ============================================================
# 🧾 JournalEntryLine Inline
# ============================================================

class JournalEntryLineInline(admin.TabularInline):
    model = JournalEntryLine
    extra = 0

    autocomplete_fields = (
        "account",
        "cost_center",
        "tax_rate",
    )

    fields = (
        "sort_order",
        "account",
        "description",
        "debit_amount",
        "credit_amount",
        "tax_amount",
        "currency",
        "cost_center",
        "tax_rate",
        "party_type",
        "party_id",
        "source_line_id",
    )

    def has_change_permission(self, request, obj=None):
        if obj and obj.status != JournalEntryStatus.DRAFT:
            return False
        return super().has_change_permission(request, obj)

    def has_add_permission(self, request, obj=None):
        if obj and obj.status != JournalEntryStatus.DRAFT:
            return False
        return super().has_add_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.status != JournalEntryStatus.DRAFT:
            return False
        return super().has_delete_permission(request, obj)


# ============================================================
# 🧾 JournalEntry Admin
# ============================================================

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "entry_number",
        "entry_date",
        "posting_source_badge",
        "status_badge",
        "reference",
        "source_display",
        "currency",
        "total_debit",
        "total_credit",
        "balance_badge",
        "is_auto_posted",
        "posted_at",
        "created_at",
    )

    list_filter = (
        "company",
        "status",
        "posting_source",
        "entry_date",
        "currency",
        "is_auto_posted",
        "period",
        JournalEntryBalanceFilter,
        "created_at",
    )

    search_fields = (
        "entry_number",
        "reference",
        "external_reference",
        "source_type",
        "source_id",
        "source_number",
        "description",
        "notes",
        "company__name",
        "company__code",
    )

    readonly_fields = (
        "total_debit",
        "total_credit",
        "posted_at",
        "cancelled_at",
        "reversed_at",
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "period",
        "posted_by",
        "cancelled_by",
        "reversal_of",
        "reversed_entry",
        "created_by",
        "updated_by",
    )

    fieldsets = (
        (
            "بيانات القيد",
            {
                "fields": (
                    "company",
                    "entry_number",
                    "entry_date",
                    "period",
                    "status",
                    "posting_source",
                    "currency",
                    "is_auto_posted",
                )
            },
        ),
        (
            "المصدر والمرجع",
            {
                "fields": (
                    "reference",
                    "external_reference",
                    "source_type",
                    "source_id",
                    "source_number",
                    "reversal_of",
                    "reversed_entry",
                )
            },
        ),
        (
            "الوصف",
            {
                "fields": (
                    "description",
                    "notes",
                )
            },
        ),
        (
            "الإجماليات",
            {
                "fields": (
                    "total_debit",
                    "total_credit",
                )
            },
        ),
        (
            "الترحيل والإلغاء والعكس",
            {
                "classes": ("collapse",),
                "fields": (
                    "posted_at",
                    "posted_by",
                    "cancelled_at",
                    "cancelled_by",
                    "reversed_at",
                ),
            },
        ),
        (
            "بيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    inlines = (JournalEntryLineInline,)

    ordering = ("company", "-entry_date", "-id")
    date_hierarchy = "entry_date"
    list_per_page = 100
    save_on_top = True

    actions = (
        "post_entries",
        "cancel_entries",
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "period",
                "posted_by",
                "cancelled_by",
                "reversal_of",
                "reversed_entry",
            )
        )

    @admin.display(description="مصدر القيد", ordering="posting_source")
    def posting_source_badge(self, obj):
        colors = {
            PostingSource.MANUAL: "#374151",
            PostingSource.OPENING_BALANCE: "#0f766e",
            PostingSource.SALES_INVOICE: "#2563eb",
            PostingSource.SALES_PAYMENT: "#15803d",
            PostingSource.PURCHASE_BILL: "#7c2d12",
            PostingSource.SUPPLIER_PAYMENT: "#b45309",
            PostingSource.INVENTORY_RECEIPT: "#0369a1",
            PostingSource.INVENTORY_ISSUE: "#9333ea",
            PostingSource.INVENTORY_ADJUSTMENT: "#7c2d12",
            PostingSource.TREASURY: "#0f766e",
            PostingSource.TREASURY_RECEIPT: "#166534",
            PostingSource.TREASURY_PAYMENT: "#b45309",
            PostingSource.TREASURY_TRANSFER: "#0369a1",
            PostingSource.TAX: "#dc2626",
            PostingSource.SYSTEM: "#4b5563",
        }

        return format_html(
            '<span style="color:{};font-weight:700;">{}</span>',
            colors.get(obj.posting_source, "#374151"),
            obj.get_posting_source_display(),
        )

    @admin.display(description="الحالة", ordering="status")
    def status_badge(self, obj):
        if obj.status == JournalEntryStatus.POSTED:
            return format_html('<span style="color:#166534;font-weight:700;">مرحل</span>')

        if obj.status == JournalEntryStatus.CANCELLED:
            return format_html('<span style="color:#991b1b;font-weight:700;">ملغي</span>')

        if obj.status == JournalEntryStatus.REVERSED:
            return format_html('<span style="color:#7c2d12;font-weight:700;">معكوس</span>')

        return format_html('<span style="color:#92400e;font-weight:700;">مسودة</span>')

    @admin.display(description="المصدر")
    def source_display(self, obj):
        if obj.source_type or obj.source_id or obj.source_number:
            return f"{obj.source_type or '-'}:{obj.source_id or '-'} / {obj.source_number or '-'}"

        return "-"

    @admin.display(description="التوازن")
    def balance_badge(self, obj):
        if obj.total_debit == obj.total_credit and obj.total_debit > 0:
            return format_html('<span style="color:#166534;font-weight:700;">متوازن</span>')

        if obj.total_debit == obj.total_credit:
            return format_html('<span style="color:#6b7280;font-weight:700;">صفري</span>')

        return format_html('<span style="color:#991b1b;font-weight:700;">غير متوازن</span>')

    @admin.action(description="ترحيل القيود المحددة")
    def post_entries(self, request, queryset):
        posted_count = 0

        for entry in queryset:
            try:
                if entry.status == JournalEntryStatus.POSTED:
                    continue

                entry.post(actor=request.user)
                posted_count += 1

            except ValidationError as exc:
                self.message_user(
                    request,
                    f"تعذر ترحيل القيد {entry.entry_number}: {exc}",
                    level=messages.ERROR,
                )
            except Exception as exc:
                self.message_user(
                    request,
                    f"خطأ غير متوقع أثناء ترحيل القيد {entry.entry_number}: {exc}",
                    level=messages.ERROR,
                )

        if posted_count:
            self.message_user(
                request,
                f"تم ترحيل {posted_count} قيد.",
                level=messages.SUCCESS,
            )

    @admin.action(description="إلغاء القيود المرحلة المحددة")
    def cancel_entries(self, request, queryset):
        cancelled_count = 0

        for entry in queryset:
            try:
                if entry.status != JournalEntryStatus.POSTED:
                    continue

                entry.cancel(actor=request.user)
                cancelled_count += 1

            except ValidationError as exc:
                self.message_user(
                    request,
                    f"تعذر إلغاء القيد {entry.entry_number}: {exc}",
                    level=messages.ERROR,
                )
            except Exception as exc:
                self.message_user(
                    request,
                    f"خطأ غير متوقع أثناء إلغاء القيد {entry.entry_number}: {exc}",
                    level=messages.ERROR,
                )

        if cancelled_count:
            self.message_user(
                request,
                f"تم إلغاء {cancelled_count} قيد.",
                level=messages.SUCCESS,
            )


# ============================================================
# 🧾 JournalEntryLine Admin
# ============================================================

@admin.register(JournalEntryLine)
class JournalEntryLineAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "journal_entry",
        "account",
        "debit_amount",
        "credit_amount",
        "tax_amount",
        "currency",
        "cost_center",
        "tax_rate",
        "party_display",
        "source_line_id",
        "sort_order",
        "created_at",
    )

    list_filter = (
        "company",
        "currency",
        "account",
        "cost_center",
        "tax_rate",
        "party_type",
        "created_at",
    )

    search_fields = (
        "journal_entry__entry_number",
        "account__code",
        "account__name",
        "description",
        "party_type",
        "party_id",
        "source_line_id",
        "company__name",
        "company__code",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "journal_entry",
        "account",
        "cost_center",
        "tax_rate",
    )

    fieldsets = (
        (
            "بيانات السطر",
            {
                "fields": (
                    "company",
                    "journal_entry",
                    "account",
                    "description",
                    "debit_amount",
                    "credit_amount",
                    "tax_amount",
                    "currency",
                    "sort_order",
                )
            },
        ),
        (
            "مركز التكلفة والضريبة",
            {
                "fields": (
                    "cost_center",
                    "tax_rate",
                )
            },
        ),
        (
            "الطرف والمصدر",
            {
                "fields": (
                    "party_type",
                    "party_id",
                    "source_line_id",
                )
            },
        ),
        (
            "بيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "-created_at", "-id")
    list_per_page = 100

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "journal_entry",
                "account",
                "cost_center",
                "tax_rate",
            )
        )

    def has_change_permission(self, request, obj=None):
        if obj and obj.journal_entry.status != JournalEntryStatus.DRAFT:
            return False
        return super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        if obj and obj.journal_entry.status != JournalEntryStatus.DRAFT:
            return False
        return super().has_delete_permission(request, obj)

    @admin.display(description="الطرف")
    def party_display(self, obj):
        if obj.party_type or obj.party_id:
            return f"{obj.party_type or '-'}:{obj.party_id or '-'}"
        return "-"


# ============================================================
# 🧾 TaxTransaction Admin
# ============================================================

@admin.register(TaxTransaction)
class TaxTransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "tax_rate",
        "direction",
        "transaction_date",
        "taxable_amount",
        "tax_amount",
        "currency",
        "source_display",
        "journal_entry",
        "journal_line",
        "created_at",
    )

    list_filter = (
        "company",
        "direction",
        "tax_rate",
        "transaction_date",
        "currency",
        "source_type",
        "created_at",
    )

    search_fields = (
        "source_type",
        "source_id",
        "source_number",
        "description",
        "company__name",
        "company__code",
        "tax_rate__code",
        "tax_rate__name",
        "journal_entry__entry_number",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    autocomplete_fields = (
        "company",
        "tax_rate",
        "journal_entry",
        "journal_line",
    )

    fieldsets = (
        (
            "بيانات الحركة الضريبية",
            {
                "fields": (
                    "company",
                    "tax_rate",
                    "direction",
                    "transaction_date",
                    "taxable_amount",
                    "tax_amount",
                    "currency",
                    "description",
                )
            },
        ),
        (
            "المصدر والربط",
            {
                "fields": (
                    "source_type",
                    "source_id",
                    "source_number",
                    "journal_entry",
                    "journal_line",
                )
            },
        ),
        (
            "بيانات إضافية",
            {
                "classes": ("collapse",),
                "fields": (
                    "metadata",
                ),
            },
        ),
        (
            "التتبع",
            {
                "classes": ("collapse",),
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )

    ordering = ("company", "-transaction_date", "-id")
    date_hierarchy = "transaction_date"
    list_per_page = 100

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "tax_rate",
                "journal_entry",
                "journal_line",
            )
        )

    @admin.display(description="المصدر")
    def source_display(self, obj):
        if obj.source_type or obj.source_id or obj.source_number:
            return f"{obj.source_type or '-'}:{obj.source_id or '-'} / {obj.source_number or '-'}"

        return "-"