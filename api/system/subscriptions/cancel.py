# ============================================================
# 📂 api/system/subscriptions/cancel.py
# 🧠 Mhamcloud | System Company Subscription Cancel API V1.2
# ------------------------------------------------------------
# ✅ Cancel company subscriptions from system workspace
# ✅ Supports PENDING_PAYMENT cancellation without touching old subscription
# ✅ Supports active/trial cancellation and auto-renew disabling
# ✅ Preserves subscription history without deleting records
# ✅ Includes Phase 19 billing/payment lifecycle fields
# ✅ Protected by system permission: system.subscriptions.cancel
# ✅ Uses central api/permissions.py guard
# ------------------------------------------------------------
# القاعدة المعتمدة في Phase 19:
# - إلغاء PENDING_PAYMENT يعني إلغاء طلب الدفع فقط
# - لا يتم لمس previous_subscription عند إلغاء طلب الدفع
# - إلغاء ACTIVE/TRIAL يوقف auto_renew ويحفظ cancelled_at
# - الإلغاء لا يحذف أي سجل من قاعدة البيانات
# - لا نستخدم payments/models.py هنا لأنها تخص مدفوعات /company
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
from subscriptions.services import money


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


def _previous_subscription_payload(
    subscription: CompanySubscription,
) -> dict[str, Any] | None:
    """
    يرجع ملخص الاشتراك السابق إن وجد.
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
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    company = subscription.company
    plan = subscription.plan
    created_by = getattr(subscription, "created_by", None)

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
            "monthly_price": _money_to_string(plan.monthly_price),
            "yearly_price": _money_to_string(plan.yearly_price),
        },
        "previous_subscription_id": subscription.previous_subscription_id,
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
        "created_by": {
            "id": created_by.id,
            "username": created_by.username,
            "email": created_by.email,
        }
        if created_by
        else None,
        "created_at": _datetime_to_string(subscription.created_at),
        "updated_at": _datetime_to_string(subscription.updated_at),
    }


def _append_cancel_note(
    *,
    subscription: CompanySubscription,
    cancel_note: str,
) -> str:
    """
    يبني ملاحظات الإلغاء بدون حذف الملاحظات السابقة.
    """

    current_notes = _clean_text(getattr(subscription, "notes", ""))

    if subscription.status == CompanySubscription.Status.PENDING_PAYMENT:
        default_note = "تم إلغاء طلب الدفع لهذا الاشتراك."
    else:
        default_note = "تم إلغاء الاشتراك."

    if cancel_note:
        new_note = f"{default_note}\nسبب الإلغاء: {cancel_note}"
    else:
        new_note = default_note

    return f"{current_notes}\n\n{new_note}".strip() if current_notes else new_note


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
            "previous_subscription",
            "previous_subscription__plan",
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

    if subscription.status in {
        CompanySubscription.Status.EXPIRED,
        CompanySubscription.Status.SUSPENDED,
    }:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن إلغاء هذا الاشتراك من حالته الحالية.",
                "errors": {
                    "status": "الإلغاء مسموح فقط للاشتراكات PENDING_PAYMENT أو TRIAL أو ACTIVE."
                },
            },
            status=400,
        )

    cancel_note = _clean_text(_get_value(request, payload, "notes", ""))
    now = timezone.now()

    with transaction.atomic():
        subscription = CompanySubscription.objects.select_for_update().select_related(
            "company",
            "plan",
            "created_by",
            "previous_subscription",
            "previous_subscription__plan",
        ).get(id=subscription.id)

        old_status = subscription.status

        subscription.status = CompanySubscription.Status.CANCELLED
        subscription.auto_renew = False
        subscription.cancelled_at = now
        subscription.notes = _append_cancel_note(
            subscription=subscription,
            cancel_note=cancel_note,
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

    if old_status == CompanySubscription.Status.PENDING_PAYMENT:
        message = "تم إلغاء طلب دفع الاشتراك بنجاح دون التأثير على الاشتراك السابق."
    else:
        message = "تم إلغاء اشتراك الشركة بنجاح."

    return JsonResponse(
        {
            "ok": True,
            "message": message,
            "data": {
                "subscription": _subscription_payload(subscription),
            },
        },
        status=200,
    )