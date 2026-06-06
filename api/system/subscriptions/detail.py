# ============================================================
# 📂 api/system/subscriptions/detail.py
# 🧠 PrimeyAcc | System Company Subscription Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one company subscription for system workspace
# ✅ Returns company, plan, lifecycle, financial and audit summary
# ✅ Includes other subscriptions for the same company
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - جميع APIs داخل /api/system/ تتطلب can_access_system=True
# - تفاصيل الاشتراك تعرض بيانات حقيقية فقط من قاعدة البيانات
# - لا يتم وضع منطق الدفع أو الفواتير داخل ملف تفاصيل الاشتراك
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from subscriptions.models import CompanySubscription


def _user_can_access_system(request: HttpRequest) -> bool:
    """
    يتحقق من صلاحية دخول مساحة النظام.
    """

    user = request.user

    if not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    profile = getattr(user, "profile", None)
    return bool(profile and profile.can_access_system)


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{value:.2f}"


def _date_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _company_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع بيانات الشركة المرتبطة بالاشتراك.
    """

    company = subscription.company

    return {
        "id": company.id,
        "name": getattr(company, "name", ""),
        "code": getattr(company, "code", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "website": getattr(company, "website", ""),
        "commercial_registration": getattr(company, "commercial_registration", ""),
        "tax_number": getattr(company, "tax_number", ""),
        "country": getattr(company, "country", ""),
        "city": getattr(company, "city", ""),
        "district": getattr(company, "district", ""),
        "street": getattr(company, "street", ""),
        "building_number": getattr(company, "building_number", ""),
        "postal_code": getattr(company, "postal_code", ""),
        "additional_number": getattr(company, "additional_number", ""),
        "is_active": getattr(company, "is_active", True),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


def _plan_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع بيانات الباقة المرتبطة بالاشتراك.
    """

    plan = subscription.plan

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
    }


def _created_by_payload(subscription: CompanySubscription) -> dict[str, Any] | None:
    """
    يرجع بيانات المستخدم الذي أنشأ الاشتراك إن وجد.
    """

    user = subscription.created_by

    if not user:
        return None

    full_name = user.get_full_name().strip()

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": full_name or user.username,
        "is_active": user.is_active,
    }


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON كامل للواجهة.
    """

    return {
        "id": subscription.id,
        "company": _company_payload(subscription),
        "plan": _plan_payload(subscription),
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "notes": subscription.notes,
        "created_by": _created_by_payload(subscription),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


def _subscription_summary_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    ملخص مختصر لاشتراكات أخرى لنفس الشركة.
    """

    return {
        "id": subscription.id,
        "plan": {
            "id": subscription.plan_id,
            "name": subscription.plan.name,
            "code": subscription.plan.code,
            "slug": subscription.plan.slug,
        },
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "created_at": _datetime_to_string(subscription.created_at),
    }


@login_required
@require_GET
def system_subscription_detail(request: HttpRequest, subscription_id: int) -> JsonResponse:
    """
    GET /api/system/subscriptions/<subscription_id>/

    يعرض تفاصيل اشتراك شركة واحد لمساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى تفاصيل الاشتراك.",
            },
            status=403,
        )

    subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "created_by",
        ),
        id=subscription_id,
    )

    company_subscriptions = (
        CompanySubscription.objects.filter(company_id=subscription.company_id)
        .select_related("plan")
        .order_by("-created_at", "-id")
    )

    other_subscriptions = [
        _subscription_summary_payload(item)
        for item in company_subscriptions
        if item.id != subscription.id
    ]

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب تفاصيل الاشتراك بنجاح.",
            "data": {
                "subscription": _subscription_payload(subscription),
                "company_subscriptions": [
                    _subscription_summary_payload(item)
                    for item in company_subscriptions
                ],
                "other_subscriptions": other_subscriptions,
            },
        },
        status=200,
    )