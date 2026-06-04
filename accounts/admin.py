# ============================================================
# 📂 accounts/admin.py
# 🧠 PrimeyAcc | Accounts Admin V1
# ------------------------------------------------------------
# ✅ Register UserProfile
# ✅ Register CompanyMembership
# ✅ Search + Filters
# ✅ Workspace / System Role Management
# ✅ Company Membership Management
# ✅ Status Lifecycle Admin Actions
# ✅ Audit Fields Auto-fill
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - User = حساب دخول فقط
# - UserProfile = ملف المستخدم العام داخل PrimeyAcc
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - /system لا يفتح إلا لمستخدم نظام مصرح
# - /company لا يفتح إلا بعضوية شركة فعالة
# - لا يتم الوصول لبيانات شركة إلا عبر CompanyMembership فعال
# ============================================================

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from .models import CompanyMembership, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "display_name",
        "status",
        "default_workspace",
        "is_system_user",
        "system_role",
        "default_company",
        "phone",
        "mobile",
        "last_seen_at",
        "created_at",
    )
    list_filter = (
        "status",
        "default_workspace",
        "is_system_user",
        "system_role",
        "language",
        "timezone",
        "created_at",
    )
    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "display_name",
        "phone",
        "mobile",
        "whatsapp_number",
        "default_company__name",
        "default_company__name_ar",
        "default_company__name_en",
        "default_company__company_code",
    )
    autocomplete_fields = (
        "user",
        "default_company",
    )
    readonly_fields = (
        "last_seen_at",
        "suspended_at",
        "created_at",
        "updated_at",
        "can_access_system_display",
        "can_access_company_display",
    )
    ordering = ("-created_at",)
    list_per_page = 25
    actions = (
        "activate_profiles",
        "suspend_profiles",
    )

    fieldsets = (
        (
            "User Account",
            {
                "fields": (
                    "user",
                    "display_name",
                    "status",
                )
            },
        ),
        (
            "Contact Information",
            {
                "fields": (
                    "phone",
                    "mobile",
                    "whatsapp_number",
                )
            },
        ),
        (
            "Workspace Access",
            {
                "fields": (
                    "default_workspace",
                    "is_system_user",
                    "system_role",
                    "default_company",
                    "can_access_system_display",
                    "can_access_company_display",
                )
            },
        ),
        (
            "Preferences",
            {
                "fields": (
                    "language",
                    "timezone",
                )
            },
        ),
        (
            "Status Tracking",
            {
                "fields": (
                    "last_seen_at",
                    "suspended_at",
                    "suspended_reason",
                )
            },
        ),
        (
            "Advanced Data",
            {
                "classes": ("collapse",),
                "fields": (
                    "extra_data",
                    "notes",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    @admin.display(description="Can access /system")
    def can_access_system_display(self, obj: UserProfile) -> bool:
        return obj.can_access_system

    @admin.display(description="Can access /company")
    def can_access_company_display(self, obj: UserProfile) -> bool:
        return obj.can_access_company

    @admin.action(description="Activate selected user profiles")
    def activate_profiles(self, request: HttpRequest, queryset) -> None:
        for profile in queryset:
            profile.activate()

    @admin.action(description="Suspend selected user profiles")
    def suspend_profiles(self, request: HttpRequest, queryset) -> None:
        for profile in queryset:
            profile.suspend(reason="Suspended from admin panel.")


@admin.register(CompanyMembership)
class CompanyMembershipAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "company",
        "role",
        "status",
        "is_primary",
        "job_title",
        "department",
        "joined_at",
        "created_at",
    )
    list_filter = (
        "status",
        "role",
        "is_primary",
        "company",
        "department",
        "created_at",
    )
    search_fields = (
        "user__username",
        "user__email",
        "user__first_name",
        "user__last_name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "job_title",
        "department",
    )
    autocomplete_fields = (
        "user",
        "company",
        "created_by",
        "updated_by",
    )
    readonly_fields = (
        "invited_at",
        "joined_at",
        "suspended_at",
        "created_at",
        "updated_at",
        "is_active_membership_display",
    )
    ordering = ("-created_at",)
    list_per_page = 25
    actions = (
        "activate_memberships",
        "suspend_memberships",
        "mark_memberships_inactive",
    )

    fieldsets = (
        (
            "Membership",
            {
                "fields": (
                    "user",
                    "company",
                    "role",
                    "status",
                    "is_primary",
                    "is_active_membership_display",
                )
            },
        ),
        (
            "Job Information",
            {
                "fields": (
                    "job_title",
                    "department",
                )
            },
        ),
        (
            "Status Tracking",
            {
                "fields": (
                    "invited_at",
                    "joined_at",
                    "suspended_at",
                    "suspended_reason",
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
                    "extra_data",
                    "notes",
                ),
            },
        ),
    )

    @admin.display(description="Active company access")
    def is_active_membership_display(self, obj: CompanyMembership) -> bool:
        return obj.is_active_membership

    def save_model(
        self,
        request: HttpRequest,
        obj: CompanyMembership,
        form,
        change: bool,
    ) -> None:
        if not change and not obj.created_by:
            obj.created_by = request.user

        obj.updated_by = request.user

        super().save_model(request, obj, form, change)

    @admin.action(description="Activate selected memberships")
    def activate_memberships(self, request: HttpRequest, queryset) -> None:
        for membership in queryset:
            membership.activate(user=request.user)

    @admin.action(description="Suspend selected memberships")
    def suspend_memberships(self, request: HttpRequest, queryset) -> None:
        for membership in queryset:
            membership.suspend(reason="Suspended from admin panel.", user=request.user)

    @admin.action(description="Mark selected memberships inactive")
    def mark_memberships_inactive(self, request: HttpRequest, queryset) -> None:
        for membership in queryset:
            membership.mark_inactive(user=request.user)