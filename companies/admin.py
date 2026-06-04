# ============================================================
# 📂 companies/admin.py
# 🧠 PrimeyAcc | Companies Admin V1.1
# ------------------------------------------------------------
# ✅ Register Company Model
# ✅ Search + Filters
# ✅ Saudi National Address Fields
# ✅ Readable Admin Sections
# ✅ Status Lifecycle Admin Actions
# ✅ Audit Fields Auto-fill
# ✅ Safe System Owner Management
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company = حدود العزل الأساسية للنظام
# - /system يدير الشركات والاشتراكات من جهة مالك المنصة
# - /company يدير بيانات شركة واحدة فقط
# - Admin هنا للإدارة الداخلية وليس واجهة تشغيل نهائية
# - العنوان الأساسي للشركات في السعودية = العنوان الوطني
# - أي تعديل مهم يجب أن يحافظ على عزل الشركات
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from .models import Company


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