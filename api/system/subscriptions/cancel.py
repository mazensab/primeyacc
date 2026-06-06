# ============================================================
# 📂 api/system/subscriptions/cancel.py
# 🧠 PrimeyAcc | System Company Subscription Cancel API V1.0
# ------------------------------------------------------------
# ✅ Cancel company subscriptions from system workspace
# ✅ Supports cancellation notes and auto-renew disabling
# ✅ Preserves subscription history without deleting records
# ✅ Protected by authenticated system-access users only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - إلغاء الاشتراك لا يحذف السجل من قاعدة البيانات
# - الإلغاء يوقف auto_renew ويحفظ وقت الإلغاء
# - الدفع والفواتير لها وحدات مستقلة لاحقًا ولا توضع هنا
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

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


def _json_body(request: HttpRequest) -> dict[str, Any]:
    """
    يقرأ JSON body بأمان.
    """

    if not request.body:
        return {}

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        return {}

    return payload if isinstance(payload, dict) else {}


def _get_value(request: HttpRequest, payload: dict[str, Any], key: str, default: Any = None) -> Any:
    """
    يدعم JSON و form-data بنفس الوقت.
    """

    if key in payload:
        return payload.get(key)

    return request.POST.get(key, default)


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


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    company = subscription.company
    plan = subscription.plan

    return {
        "id": subscription.id,
        "company": {
            "id": company.id,
            "name": getattr(company, "name", ""),
            "code": getattr(company, "code", ""),
            "email": getattr(company, "email", ""),
            "phone": getattr(company, "phone", ""),
            "is_active": getattr(company, "is_active", True),
        },
        "plan": {
            "id": plan.id,
            "name": plan.name,
            "code": plan.code,
            "slug": plan.slug,
        },
        "status": subscription.status,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "days_remaining": subscription.days_remaining,
        "is_current": subscription.is_current,
        "is_expired_by_date": subscription.is_expired_by_date,
        "price": _money_to_string(subscription.price),
        "discount_amount": _money_to_string(subscription.discount_amount),
        "tax_amount": _money_to_string(subscription.tax_amount),
        "total_amount": _money_to_string(subscription.total_amount),
        "auto_renew": subscription.auto_renew,
        "notes": subscription.notes,
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


@login_required
@csrf_protect
@require_POST
def system_subscription_cancel(request: HttpRequest, subscription_id: int) -> JsonResponse:
    """
    POST /api/system/subscriptions/<subscription_id>/cancel/

    يلغي اشتراك شركة من مساحة النظام.
    """

    if not _user_can_access_system(request):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإلغاء اشتراكات الشركات.",
            },
            status=403,
        )

    payload = _json_body(request)

    subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "created_by",
        ),
        id=subscription_id,
    )

    if subscription.status == CompanySubscription.Status.CANCELLED:
        return JsonResponse(
            {
                "ok": True,
                "message": "الاشتراك ملغي بالفعل.",
                "data": {
                    "subscription": _subscription_payload(subscription),
                },
            },
            status=200,
        )

    cancel_note = str(_get_value(request, payload, "notes", "") or "").strip()
    now = timezone.now()

    with transaction.atomic():
        subscription.status = CompanySubscription.Status.CANCELLED
        subscription.auto_renew = False
        subscription.cancelled_at = now

        if cancel_note:
            current_notes = subscription.notes.strip()
            subscription.notes = (
                f"{current_notes}\n\nسبب الإلغاء: {cancel_note}".strip()
                if current_notes
                else f"سبب الإلغاء: {cancel_note}"
            )

        subscription.save(
            update_fields=[
                "status",
                "auto_renew",
                "cancelled_at",
                "notes",
                "updated_at",
            ]
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إلغاء اشتراك الشركة بنجاح.",
            "data": {
                "subscription": _subscription_payload(subscription),
            },
        },
        status=200,
    )