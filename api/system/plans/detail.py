# ============================================================
# 📂 api/system/plans/detail.py
# 🧠 PrimeyAcc | System Subscription Plan Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve one SaaS subscription plan by ID
# ✅ Returns usage counters and recent company subscriptions
# ✅ Protected by system permission: system.plans.view
# ✅ Uses central api/permissions.py guard
# ✅ Clean payload prepared for future plan details UI
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - تفاصيل الباقة لا تظهر لمستخدم company فقط
# - تفاصيل الباقة تعرض بيانات حقيقية فقط من قاعدة البيانات
# - لا يتم وضع منطق الدفع أو الفواتير داخل ملف الباقات
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription, SubscriptionPlan


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{value:.2f}"


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _date_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _plan_payload(plan: SubscriptionPlan) -> dict[str, Any]:
    """
    يحول الباقة إلى Payload كامل لصفحة التفاصيل.
    """

    subscriptions_total = getattr(plan, "subscriptions_total", 0)
    active_subscriptions = getattr(plan, "active_subscriptions", 0)
    trial_subscriptions = getattr(plan, "trial_subscriptions", 0)
    expired_subscriptions = getattr(plan, "expired_subscriptions", 0)
    cancelled_subscriptions = getattr(plan, "cancelled_subscriptions", 0)
    suspended_subscriptions = getattr(plan, "suspended_subscriptions", 0)

    return {
        "id": plan.id,
        "name": plan.name,
        "code": plan.code,
        "slug": plan.slug,
        "description": plan.description,
        "monthly_price": _money_to_string(plan.monthly_price),
        "yearly_price": _money_to_string(plan.yearly_price),
        "max_users": plan.max_users,
        "max_branches": plan.max_branches,
        "max_warehouses": plan.max_warehouses,
        "max_pos": plan.max_pos,
        "features": plan.features if isinstance(plan.features, list) else [],
        "is_active": plan.is_active,
        "is_public": plan.is_public,
        "sort_order": plan.sort_order,
        "stats": {
            "subscriptions_total": subscriptions_total,
            "active_subscriptions": active_subscriptions,
            "trial_subscriptions": trial_subscriptions,
            "expired_subscriptions": expired_subscriptions,
            "cancelled_subscriptions": cancelled_subscriptions,
            "suspended_subscriptions": suspended_subscriptions,
        },
        "created_at": _datetime_to_string(plan.created_at),
        "updated_at": _datetime_to_string(plan.updated_at),
    }


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع ملخص اشتراك شركة مرتبط بهذه الباقة.
    """

    company = subscription.company

    return {
        "id": subscription.id,
        "company": {
            "id": company.id,
            "name": getattr(company, "display_name", None) or company.name,
            "company_code": getattr(company, "company_code", ""),
            "code": getattr(company, "company_code", ""),
            "email": getattr(company, "email", ""),
            "phone": getattr(company, "phone", ""),
            "city": getattr(company, "city", ""),
            "status": getattr(company, "status", ""),
            "is_active": getattr(company, "is_active", True),
        },
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "is_current": subscription.is_current,
        "created_at": _datetime_to_string(subscription.created_at),
    }


@login_required
@require_GET
def system_plan_detail(request: HttpRequest, plan_id: int) -> JsonResponse:
    """
    GET /api/system/plans/<plan_id>/

    يعرض تفاصيل باقة واحدة مع ملخص الاشتراكات المرتبطة بها.
    """

    if not user_has_system_permission(request.user, "system.plans.view"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى تفاصيل الباقة.",
                "code": "SYSTEM_PLANS_VIEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    queryset = SubscriptionPlan.objects.annotate(
        subscriptions_total=Count("company_subscriptions", distinct=True),
        active_subscriptions=Count(
            "company_subscriptions",
            filter=Q(company_subscriptions__status=CompanySubscription.Status.ACTIVE),
            distinct=True,
        ),
        trial_subscriptions=Count(
            "company_subscriptions",
            filter=Q(company_subscriptions__status=CompanySubscription.Status.TRIAL),
            distinct=True,
        ),
        expired_subscriptions=Count(
            "company_subscriptions",
            filter=Q(company_subscriptions__status=CompanySubscription.Status.EXPIRED),
            distinct=True,
        ),
        cancelled_subscriptions=Count(
            "company_subscriptions",
            filter=Q(company_subscriptions__status=CompanySubscription.Status.CANCELLED),
            distinct=True,
        ),
        suspended_subscriptions=Count(
            "company_subscriptions",
            filter=Q(company_subscriptions__status=CompanySubscription.Status.SUSPENDED),
            distinct=True,
        ),
    )

    plan = get_object_or_404(queryset, id=plan_id)

    recent_subscriptions = (
        CompanySubscription.objects.filter(plan=plan)
        .select_related("company")
        .order_by("-created_at", "-id")[:10]
    )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب تفاصيل الباقة بنجاح.",
            "data": {
                "plan": _plan_payload(plan),
                "recent_subscriptions": [
                    _subscription_payload(subscription)
                    for subscription in recent_subscriptions
                ],
            },
        },
        status=200,
    )