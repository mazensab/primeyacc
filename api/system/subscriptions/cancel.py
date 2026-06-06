# ============================================================
# 📂 api/system/subscriptions/cancel.py
# 🧠 PrimeyAcc | System Company Subscription Cancel API V1.1
# ------------------------------------------------------------
# ✅ Cancel company subscriptions from system workspace
# ✅ Supports cancellation notes and auto-renew disabling
# ✅ Preserves subscription history without deleting records
# ✅ Protected by system permission: system.subscriptions.cancel
# ✅ Uses central api/permissions.py guard
# ✅ Safe update fields based on the current CompanySubscription model
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 1: نواة SaaS
# - تم تحديثه في المرحلة 2 لاستخدام حارس الصلاحيات المركزي
# - إلغاء اشتراكات الشركات لا يسمح لمستخدم company فقط
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

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription


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


def _get_value(
    request: HttpRequest,
    payload: dict[str, Any],
    key: str,
    default: Any = None,
) -> Any:
    """
    يدعم JSON و form-data بنفس الوقت.
    """

    if key in payload:
        return payload.get(key)

    return request.POST.get(key, default)


def _clean_text(value: Any) -> str:
    """
    ينظف النصوص القادمة من الطلب.
    """

    return str(value or "").strip()


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


def _model_has_field(field_name: str) -> bool:
    """
    يتحقق من وجود الحقل داخل CompanySubscription.
    """

    return any(field.name == field_name for field in CompanySubscription._meta.fields)


def _set_subscription_field(
    subscription: CompanySubscription,
    field_name: str,
    value: Any,
    update_fields: set[str],
) -> None:
    """
    يعدل الحقل فقط إذا كان موجودًا في موديل CompanySubscription.
    """

    if _model_has_field(field_name):
        setattr(subscription, field_name, value)
        update_fields.add(field_name)


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
            "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
            "display_name": getattr(company, "display_name", None) or getattr(company, "name", ""),
            "company_code": getattr(company, "company_code", ""),
            "code": getattr(company, "company_code", ""),
            "email": getattr(company, "email", ""),
            "phone": getattr(company, "phone", ""),
            "mobile": getattr(company, "mobile", ""),
            "city": getattr(company, "city", ""),
            "status": getattr(company, "status", ""),
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
        "amount_before_tax": _money_to_string(subscription.amount_before_tax),
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
def system_subscription_cancel(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    POST /api/system/subscriptions/<subscription_id>/cancel/

    يلغي اشتراك شركة من مساحة النظام.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.cancel"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإلغاء اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_CANCEL_PERMISSION_REQUIRED",
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

    cancel_note = _clean_text(_get_value(request, payload, "notes", ""))
    now = timezone.now()

    with transaction.atomic():
        update_fields: set[str] = set()

        _set_subscription_field(
            subscription,
            "status",
            CompanySubscription.Status.CANCELLED,
            update_fields,
        )
        _set_subscription_field(subscription, "auto_renew", False, update_fields)
        _set_subscription_field(subscription, "cancelled_at", now, update_fields)

        if cancel_note:
            current_notes = _clean_text(getattr(subscription, "notes", ""))
            notes = (
                f"{current_notes}\n\nسبب الإلغاء: {cancel_note}".strip()
                if current_notes
                else f"سبب الإلغاء: {cancel_note}"
            )
            _set_subscription_field(subscription, "notes", notes, update_fields)

        if _model_has_field("updated_by"):
            _set_subscription_field(subscription, "updated_by", request.user, update_fields)

        if update_fields:
            update_fields.add("updated_at")
            subscription.save(update_fields=list(update_fields))
        else:
            subscription.save()

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