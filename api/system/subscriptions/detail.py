# ============================================================
# 📂 api/system/subscriptions/detail.py
# 🧠 PrimeyAcc | System Company Subscription Detail API V1.2
# ------------------------------------------------------------
# ✅ Retrieve one company subscription for system workspace
# ✅ Returns company, plan, lifecycle, financial and audit summary
# ✅ Includes Phase 19 billing/payment lifecycle fields
# ✅ Includes previous subscription link for renewal/change-plan flows
# ✅ Includes other subscriptions for the same company
# ✅ Protected by system permission: system.subscriptions.view
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة في Phase 19:
# - تفاصيل الاشتراك تعرض بيانات حقيقية فقط من قاعدة البيانات
# - لا يتم وضع منطق الدفع أو الفواتير داخل ملف تفاصيل الاشتراك
# - يعرض هذا الملف حالة PENDING_PAYMENT ومسار التفعيل بعد الدفع
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_GET

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription
from subscriptions.services import money


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{money(value):.2f}"


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
        "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "name_ar": getattr(company, "name_ar", ""),
        "name_en": getattr(company, "name_en", ""),
        "company_code": getattr(company, "company_code", ""),
        "code": getattr(company, "company_code", ""),
        "activity_profile": getattr(company, "activity_profile", ""),
        "status": getattr(company, "status", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "mobile": getattr(company, "mobile", ""),
        "whatsapp_number": getattr(company, "whatsapp_number", ""),
        "website": getattr(company, "website", ""),
        "commercial_registration": getattr(company, "commercial_registration", ""),
        "tax_number": getattr(company, "tax_number", ""),
        "country": getattr(company, "country", ""),
        "city": getattr(company, "city", ""),
        "region": getattr(company, "region", ""),
        "district": getattr(company, "district", ""),
        "street_name": getattr(company, "street_name", ""),
        "street": getattr(company, "street_name", ""),
        "building_number": getattr(company, "building_number", ""),
        "postal_code": getattr(company, "postal_code", ""),
        "short_address": getattr(company, "short_address", ""),
        "national_address_line": getattr(company, "national_address_line", ""),
        "address": getattr(company, "address", ""),
        "currency_code": getattr(company, "currency_code", "SAR"),
        "vat_percentage": _money_to_string(getattr(company, "vat_percentage", None)),
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


def _previous_subscription_payload(
    subscription: CompanySubscription,
) -> dict[str, Any] | None:
    """
    يرجع ملخص الاشتراك السابق المستخدم في التجديد أو تغيير الباقة.
    """

    previous = subscription.previous_subscription

    if not previous:
        return None

    return {
        "id": previous.id,
        "plan": {
            "id": previous.plan_id,
            "name": previous.plan.name if previous.plan_id else "",
            "code": previous.plan.code if previous.plan_id else "",
            "slug": previous.plan.slug if previous.plan_id else "",
        },
        "status": previous.status,
        "action": previous.action,
        "billing_cycle": previous.billing_cycle,
        "start_date": _date_to_string(previous.start_date),
        "end_date": _date_to_string(previous.end_date),
        "days_remaining": previous.days_remaining,
        "is_current": previous.is_current,
        "is_pending_payment": previous.is_pending_payment,
        "is_expired_by_date": previous.is_expired_by_date,
        "total_amount": _money_to_string(previous.total_amount),
        "auto_renew": previous.auto_renew,
        "billing_reference": previous.billing_reference,
        "paid_at": _datetime_to_string(previous.paid_at),
        "activated_at": _datetime_to_string(previous.activated_at),
        "cancelled_at": _datetime_to_string(previous.cancelled_at),
        "suspended_at": _datetime_to_string(previous.suspended_at),
        "created_at": _datetime_to_string(previous.created_at),
        "updated_at": _datetime_to_string(previous.updated_at),
    }


def _lifecycle_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يرجع ملخص دورة حياة الاشتراك.
    """

    return {
        "status": subscription.status,
        "action": subscription.action,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "days_remaining": subscription.days_remaining,
        "auto_renew": subscription.auto_renew,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "can_confirm_payment": subscription.status == CompanySubscription.Status.PENDING_PAYMENT,
        "can_renew": subscription.status
        in {
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
            CompanySubscription.Status.EXPIRED,
        },
        "can_change_plan": subscription.status
        in {
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        },
        "can_cancel": subscription.status
        in {
            CompanySubscription.Status.PENDING_PAYMENT,
            CompanySubscription.Status.TRIAL,
            CompanySubscription.Status.ACTIVE,
        },
    }


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON كامل للواجهة.
    """

    return {
        "id": subscription.id,
        "company": _company_payload(subscription),
        "plan": _plan_payload(subscription),
        "previous_subscription": _previous_subscription_payload(subscription),
        "lifecycle": _lifecycle_payload(subscription),
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "billing_reference": subscription.billing_reference,
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "notes": subscription.notes,
        "created_by": _created_by_payload(subscription),
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
        "previous_subscription_id": subscription.previous_subscription_id,
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_pending_payment": subscription.is_pending_payment,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "billing_reference": subscription.billing_reference,
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


@login_required
@require_GET
def system_subscription_detail(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    GET /api/system/subscriptions/<subscription_id>/

    يعرض تفاصيل اشتراك شركة واحد لمساحة النظام فقط.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.view"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بالوصول إلى تفاصيل الاشتراك.",
                "code": "SYSTEM_SUBSCRIPTIONS_VIEW_PERMISSION_REQUIRED",
            },
            status=403,
        )

    subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "created_by",
            "previous_subscription",
            "previous_subscription__plan",
        ),
        id=subscription_id,
    )

    company_subscriptions = (
        CompanySubscription.objects.filter(company_id=subscription.company_id)
        .select_related(
            "plan",
            "previous_subscription",
            "previous_subscription__plan",
        )
        .order_by("-created_at", "-id")
    )

    company_subscriptions_list = list(company_subscriptions)

    other_subscriptions = [
        _subscription_summary_payload(item)
        for item in company_subscriptions_list
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
                    for item in company_subscriptions_list
                ],
                "other_subscriptions": other_subscriptions,
            },
        },
        status=200,
    )