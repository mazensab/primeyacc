# ============================================================
# 📂 companies/admin.py
# 🧠 PrimeyAcc | Companies Admin V1.2
# ------------------------------------------------------------
# ✅ Register Company Model
# ✅ Register CompanySettings Model
# ✅ Register Branch Model
# ✅ Search + Filters
# ✅ Saudi National Address Fields
# ✅ Readable Admin Sections
# ✅ Status Lifecycle Admin Actions
# ✅ Branch Lifecycle Admin Actions
# ✅ Audit Fields Auto-fill
# ✅ Safe System Owner Management
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company = حدود العزل الأساسية للنظام
# - CompanySettings = إعدادات تشغيلية لشركة واحدة فقط
# - Branch = فرع تشغيلي داخل شركة واحدة فقط
# - /system يدير الشركات والاشتراكات من جهة مالك المنصة
# - /company يدير بيانات شركة واحدة فقط
# - Admin هنا للإدارة الداخلية وليس واجهة تشغيل نهائية
# - العنوان الأساسي للشركات والفروع في السعودية = العنوان الوطني
# - أي تعديل مهم يجب أن يحافظ على عزل الشركات
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from .models import Branch, Company, CompanySettings


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "company_code",
        "display_name",
        "activity_profile",
        "status",
        "is_active",
        "city",
        "district",
        "postal_code",
        "short_address",
        "currency_code",
        "vat_percentage",
        "created_at",
    )
    list_filter = (
        "status",
        "is_active",
        "activity_profile",
        "country",
        "region",
        "city",
        "district",
        "created_at",
    )
    search_fields = (
        "name",
        "name_ar",
        "name_en",
        "company_code",
        "commercial_registration",
        "tax_number",
        "email",
        "phone",
        "mobile",
        "whatsapp_number",
        "building_number",
        "street_name",
        "district",
        "city",
        "region",
        "postal_code",
        "short_address",
    )
    readonly_fields = (
        "national_address_line",
        "created_at",
        "updated_at",
        "suspended_at",
    )
    autocomplete_fields = (
        "owner",
        "created_by",
        "updated_by",
    )
    ordering = ("-created_at",)
    list_per_page = 25
    actions = (
        "activate_companies",
        "suspend_companies",
        "mark_companies_expired",
    )

    fieldsets = (
        (
            "Basic Information",
            {
                "fields": (
                    "name",
                    "name_ar",
                    "name_en",
                    "company_code",
                    "activity_profile",
                    "status",
                    "is_active",
                )
            },
        ),
        (
            "Legal / Tax Information",
            {
                "fields": (
                    "commercial_registration",
                    "tax_number",
                )
            },
        ),
        (
            "Contact Information",
            {
                "fields": (
                    "email",
                    "phone",
                    "mobile",
                    "whatsapp_number",
                )
            },
        ),
        (
            "Saudi National Address",
            {
                "fields": (
                    "country",
                    "building_number",
                    "street_name",
                    "district",
                    "city",
                    "region",
                    "postal_code",
                    "short_address",
                    "national_address_line",
                    "address",
                )
            },
        ),
        (
            "Branding",
            {
                "fields": (
                    "logo",
                )
            },
        ),
        (
            "Financial Defaults",
            {
                "fields": (
                    "currency_code",
                    "vat_percentage",
                )
            },
        ),
        (
            "Subscription / Platform Status",
            {
                "fields": (
                    "trial_ends_at",
                    "suspended_at",
                    "suspended_reason",
                )
            },
        ),
        (
            "Ownership / Audit",
            {
                "fields": (
                    "owner",
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                )
            },
        ),
        (
            "Advanced Data",
            {
                "classes": ("collapse",),
                "fields": (
                    "settings",
                    "extra_data",
                    "notes",
                ),
            },
        ),
    )

    def save_model(
        self,
        request: HttpRequest,
        obj: Company,
        form,
        change: bool,
    ) -> None:
        if not change and not obj.created_by:
            obj.created_by = request.user

        obj.updated_by = request.user

        if not obj.owner:
            obj.owner = request.user

        super().save_model(request, obj, form, change)

    @admin.action(description="Activate selected companies")
    def activate_companies(self, request: HttpRequest, queryset) -> None:
        for company in queryset:
            company.activate(user=request.user)

    @admin.action(description="Suspend selected companies")
    def suspend_companies(self, request: HttpRequest, queryset) -> None:
        for company in queryset:
            company.suspend(reason="Suspended from admin panel.", user=request.user)

    @admin.action(description="Mark selected companies as expired")
    def mark_companies_expired(self, request: HttpRequest, queryset) -> None:
        for company in queryset:
            company.mark_expired(user=request.user)


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = (
        "company",
        "default_language",
        "timezone_name",
        "enable_vat",
        "default_vat_percentage",
        "enable_inventory_tracking",
        "enable_pos",
        "enable_purchases",
        "enable_hr",
        "updated_at",
    )
    list_filter = (
        "default_language",
        "timezone_name",
        "enable_vat",
        "enable_inventory_tracking",
        "enable_pos",
        "enable_purchases",
        "enable_hr",
        "created_at",
        "updated_at",
    )
    search_fields = (
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "invoice_prefix",
        "quotation_prefix",
        "purchase_prefix",
        "receipt_prefix",
        "payment_prefix",
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
    ordering = ("-updated_at",)
    list_per_page = 25

    fieldsets = (
        (
            "Company",
            {
                "fields": (
                    "company",
                )
            },
        ),
        (
            "Localization",
            {
                "fields": (
                    "default_language",
                    "timezone_name",
                    "date_format",
                    "time_format",
                )
            },
        ),
        (
            "Fiscal Year",
            {
                "fields": (
                    "fiscal_year_start_month",
                    "fiscal_year_start_day",
                )
            },
        ),
        (
            "Document Prefixes",
            {
                "fields": (
                    "invoice_prefix",
                    "quotation_prefix",
                    "purchase_prefix",
                    "receipt_prefix",
                    "payment_prefix",
                )
            },
        ),
        (
            "Operational Modules",
            {
                "fields": (
                    "enable_inventory_tracking",
                    "allow_negative_stock",
                    "enable_pos",
                    "enable_purchases",
                    "enable_hr",
                )
            },
        ),
        (
            "Tax / Sales / Purchases Rules",
            {
                "fields": (
                    "enable_vat",
                    "default_vat_percentage",
                    "require_customer_for_sales",
                    "require_supplier_for_purchases",
                )
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
                )
            },
        ),
        (
            "Advanced Data",
            {
                "classes": ("collapse",),
                "fields": (
                    "settings_data",
                ),
            },
        ),
    )

    def save_model(
        self,
        request: HttpRequest,
        obj: CompanySettings,
        form,
        change: bool,
    ) -> None:
        if not change and not obj.created_by:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()

        super().save_model(request, obj, form, change)


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = (
        "branch_code",
        "display_name",
        "company",
        "branch_type",
        "status",
        "is_active",
        "is_default",
        "city",
        "district",
        "postal_code",
        "manager_name",
        "phone",
        "created_at",
    )
    list_filter = (
        "status",
        "is_active",
        "is_default",
        "branch_type",
        "country",
        "region",
        "city",
        "district",
        "created_at",
    )
    search_fields = (
        "name",
        "name_ar",
        "name_en",
        "branch_code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "manager_name",
        "email",
        "phone",
        "mobile",
        "whatsapp_number",
        "building_number",
        "street_name",
        "district",
        "city",
        "region",
        "postal_code",
        "short_address",
    )
    readonly_fields = (
        "national_address_line",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "created_by",
        "updated_by",
    )
    ordering = (
        "company",
        "-is_default",
        "name",
    )
    list_per_page = 25
    actions = (
        "activate_branches",
        "deactivate_branches",
        "set_as_default_branch",
    )

    fieldsets = (
        (
            "Company",
            {
                "fields": (
                    "company",
                )
            },
        ),
        (
            "Basic Information",
            {
                "fields": (
                    "name",
                    "name_ar",
                    "name_en",
                    "branch_code",
                    "branch_type",
                    "status",
                    "is_active",
                    "is_default",
                )
            },
        ),
        (
            "Manager / Contact",
            {
                "fields": (
                    "manager_name",
                    "email",
                    "phone",
                    "mobile",
                    "whatsapp_number",
                )
            },
        ),
        (
            "Saudi National Address",
            {
                "fields": (
                    "country",
                    "building_number",
                    "street_name",
                    "district",
                    "city",
                    "region",
                    "postal_code",
                    "short_address",
                    "national_address_line",
                    "address",
                )
            },
        ),
        (
            "Location",
            {
                "fields": (
                    "latitude",
                    "longitude",
                )
            },
        ),
        (
            "Working Hours",
            {
                "fields": (
                    "opening_time",
                    "closing_time",
                )
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
                )
            },
        ),
        (
            "Advanced Data",
            {
                "classes": ("collapse",),
                "fields": (
                    "settings_data",
                    "extra_data",
                    "notes",
                ),
            },
        ),
    )

    def save_model(
        self,
        request: HttpRequest,
        obj: Branch,
        form,
        change: bool,
    ) -> None:
        if not change and not obj.created_by:
            obj.created_by = request.user

        obj.updated_by = request.user
        obj.full_clean()

        super().save_model(request, obj, form, change)

    @admin.action(description="Activate selected branches")
    def activate_branches(self, request: HttpRequest, queryset) -> None:
        for branch in queryset:
            branch.activate(user=request.user)

    @admin.action(description="Deactivate selected branches")
    def deactivate_branches(self, request: HttpRequest, queryset) -> None:
        for branch in queryset:
            branch.deactivate(user=request.user)

    @admin.action(description="Set selected branch as default")
    def set_as_default_branch(self, request: HttpRequest, queryset) -> None:
        for branch in queryset:
            branch.is_default = True
            branch.updated_by = request.user
            branch.save(
                update_fields=[
                    "is_default",
                    "updated_by",
                    "updated_at",
                ]
            )