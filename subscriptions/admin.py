# ============================================================
# 📂 subscriptions/admin.py
# 🧠 PrimeyAcc | SaaS Subscriptions Admin V1.0
# ------------------------------------------------------------
# ✅ Manage SaaS subscription plans from Django Admin
# ✅ Manage company subscriptions with clear filters/search
# ✅ Quick admin actions for activating, suspending, cancelling
# ✅ Readable financial and lifecycle fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - Django Admin يستخدم للإدارة والاختبار الداخلي فقط
# - منطق الدفع والفواتير لا يوضع هنا
# - لا يتم كسر قاعدة اشتراك نشط/تجريبي واحد لكل شركة
# ============================================================

from __future__ import annotations

from django.contrib import admin, messages
from django.db.models import QuerySet
from django.http import HttpRequest

from .models import CompanySubscription, SubscriptionPlan


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "code",
        "slug",
        "monthly_price",
        "yearly_price",
        "max_users",
        "max_branches",
        "is_active",
        "is_public",
        "sort_order",
        "created_at",
    )
    list_display_links = ("id", "name")
    list_filter = (
        "code",
        "is_active",
        "is_public",
        "created_at",
    )
    search_fields = (
        "name",
        "slug",
        "description",
    )
    ordering = (
        "sort_order",
        "monthly_price",
        "id",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
    )
    list_editable = (
        "is_active",
        "is_public",
        "sort_order",
    )

    fieldsets = (
        (
            "بيانات الباقة",
            {
                "fields": (
                    "name",
                    "code",
                    "slug",
                    "description",
                )
            },
        ),
        (
            "الأسعار",
            {
                "fields": (
                    "monthly_price",
                    "yearly_price",
                )
            },
        ),
        (
            "حدود الاستخدام",
            {
                "fields": (
                    "max_users",
                    "max_branches",
                    "max_warehouses",
                    "max_pos",
                )
            },
        ),
        (
            "المميزات والظهور",
            {
                "fields": (
                    "features",
                    "is_active",
                    "is_public",
                    "sort_order",
                )
            },
        ),
        (
            "التواريخ",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = (
        "activate_plans",
        "deactivate_plans",
        "publish_plans",
        "hide_plans",
    )

    @admin.action(description="تفعيل الباقات المحددة")
    def activate_plans(self, request: HttpRequest, queryset: QuerySet[SubscriptionPlan]) -> None:
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"تم تفعيل {updated} باقة بنجاح.",
            messages.SUCCESS,
        )

    @admin.action(description="إيقاف الباقات المحددة")
    def deactivate_plans(self, request: HttpRequest, queryset: QuerySet[SubscriptionPlan]) -> None:
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"تم إيقاف {updated} باقة بنجاح.",
            messages.WARNING,
        )

    @admin.action(description="إظهار الباقات للاشتراك")
    def publish_plans(self, request: HttpRequest, queryset: QuerySet[SubscriptionPlan]) -> None:
        updated = queryset.update(is_public=True)
        self.message_user(
            request,
            f"تم إظهار {updated} باقة للاشتراك.",
            messages.SUCCESS,
        )

    @admin.action(description="إخفاء الباقات من الاشتراك")
    def hide_plans(self, request: HttpRequest, queryset: QuerySet[SubscriptionPlan]) -> None:
        updated = queryset.update(is_public=False)
        self.message_user(
            request,
            f"تم إخفاء {updated} باقة من الاشتراك.",
            messages.WARNING,
        )


@admin.register(CompanySubscription)
class CompanySubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "plan",
        "status",
        "billing_cycle",
        "start_date",
        "end_date",
        "days_remaining",
        "price",
        "discount_amount",
        "tax_amount",
        "total_amount",
        "auto_renew",
        "created_at",
    )
    list_display_links = (
        "id",
        "company",
    )
    list_filter = (
        "status",
        "billing_cycle",
        "auto_renew",
        "plan",
        "start_date",
        "end_date",
        "created_at",
    )
    search_fields = (
        "company__name",
        "company__code",
        "company__email",
        "plan__name",
        "plan__slug",
        "notes",
    )
    ordering = (
        "-created_at",
        "-id",
    )
    readonly_fields = (
        "days_remaining",
        "is_current",
        "is_expired_by_date",
        "amount_before_tax",
        "cancelled_at",
        "suspended_at",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = (
        "company",
        "plan",
        "created_by",
    )
    date_hierarchy = "created_at"

    fieldsets = (
        (
            "الشركة والباقة",
            {
                "fields": (
                    "company",
                    "plan",
                    "created_by",
                )
            },
        ),
        (
            "حالة الاشتراك",
            {
                "fields": (
                    "status",
                    "billing_cycle",
                    "start_date",
                    "end_date",
                    "auto_renew",
                )
            },
        ),
        (
            "المبالغ",
            {
                "fields": (
                    "price",
                    "discount_amount",
                    "amount_before_tax",
                    "tax_amount",
                    "total_amount",
                )
            },
        ),
        (
            "مؤشرات محسوبة",
            {
                "fields": (
                    "is_current",
                    "is_expired_by_date",
                    "days_remaining",
                )
            },
        ),
        (
            "الإلغاء والإيقاف",
            {
                "fields": (
                    "cancelled_at",
                    "suspended_at",
                    "notes",
                )
            },
        ),
        (
            "التواريخ",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    actions = (
        "activate_subscriptions",
        "suspend_subscriptions",
        "cancel_subscriptions",
        "mark_expired_if_needed",
    )

    def get_queryset(self, request: HttpRequest) -> QuerySet[CompanySubscription]:
        return (
            super()
            .get_queryset(request)
            .select_related(
                "company",
                "plan",
                "created_by",
            )
        )

    @admin.action(description="تفعيل الاشتراكات المحددة")
    def activate_subscriptions(
        self,
        request: HttpRequest,
        queryset: QuerySet[CompanySubscription],
    ) -> None:
        success_count = 0
        failed_count = 0

        for subscription in queryset:
            try:
                subscription.activate(save=True)
                success_count += 1
            except Exception:
                failed_count += 1

        if success_count:
            self.message_user(
                request,
                f"تم تفعيل {success_count} اشتراك بنجاح.",
                messages.SUCCESS,
            )

        if failed_count:
            self.message_user(
                request,
                f"تعذر تفعيل {failed_count} اشتراك. قد يكون السبب وجود اشتراك نشط آخر لنفس الشركة.",
                messages.ERROR,
            )

    @admin.action(description="إيقاف الاشتراكات المحددة مؤقتًا")
    def suspend_subscriptions(
        self,
        request: HttpRequest,
        queryset: QuerySet[CompanySubscription],
    ) -> None:
        success_count = 0
        failed_count = 0

        for subscription in queryset:
            try:
                subscription.suspend(save=True)
                success_count += 1
            except Exception:
                failed_count += 1

        if success_count:
            self.message_user(
                request,
                f"تم إيقاف {success_count} اشتراك مؤقتًا.",
                messages.WARNING,
            )

        if failed_count:
            self.message_user(
                request,
                f"تعذر إيقاف {failed_count} اشتراك.",
                messages.ERROR,
            )

    @admin.action(description="إلغاء الاشتراكات المحددة")
    def cancel_subscriptions(
        self,
        request: HttpRequest,
        queryset: QuerySet[CompanySubscription],
    ) -> None:
        success_count = 0
        failed_count = 0

        for subscription in queryset:
            try:
                subscription.cancel(save=True)
                success_count += 1
            except Exception:
                failed_count += 1

        if success_count:
            self.message_user(
                request,
                f"تم إلغاء {success_count} اشتراك.",
                messages.WARNING,
            )

        if failed_count:
            self.message_user(
                request,
                f"تعذر إلغاء {failed_count} اشتراك.",
                messages.ERROR,
            )

    @admin.action(description="تحويل المنتهي تاريخيًا إلى EXPIRED")
    def mark_expired_if_needed(
        self,
        request: HttpRequest,
        queryset: QuerySet[CompanySubscription],
    ) -> None:
        changed_count = 0

        for subscription in queryset:
            if subscription.mark_expired_if_needed(save=True):
                changed_count += 1

        self.message_user(
            request,
            f"تم تحديث {changed_count} اشتراك إلى منتهي.",
            messages.SUCCESS,
        )