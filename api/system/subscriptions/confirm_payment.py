# ============================================================
# 📂 api/system/subscriptions/confirm_payment.py
# 🧠 Mhamcloud | System Subscription Confirm Payment API V1.0
# ------------------------------------------------------------
# ✅ Confirms platform subscription payment from system workspace
# ✅ Activates only PENDING_PAYMENT subscriptions
# ✅ Cancels previous active/trial subscription after payment success
# ✅ Uses subscriptions.services.activate_pending_subscription
# ✅ Protected by system permission: system.subscriptions.update
# ✅ Keeps platform billing separated from company payment methods
# ------------------------------------------------------------
# القاعدة المعتمدة في Phase 19:
# - هذا الملف لا ينشئ Payment حقيقي
# - هذا الملف لا يستخدم payments/models.py لأنها تخص /company
# - هذا الملف يفعّل الاشتراك فقط بعد تأكيد نجاح الدفع من النظام
# - عند التفعيل يتم إغلاق الاشتراك السابق إن وجد
# ============================================================

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from api.permissions import user_has_system_permission
from subscriptions.models import CompanySubscription
from subscriptions.services import activate_pending_subscription, money


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


def _parse_datetime(value: Any, field_name: str):
    """
    يحول ISO datetime إلى aware datetime.

    يقبل:
    - 2026-06-11T20:30:00
    - 2026-06-11T20:30:00+03:00
    - قيمة فارغة = timezone.now()
    """

    if value in {None, ""}:
        return timezone.now()

    if isinstance(value, datetime):
        parsed = value
    else:
        raw_value = str(value).strip()

        if raw_value.endswith("Z"):
            raw_value = raw_value[:-1] + "+00:00"

        try:
            parsed = datetime.fromisoformat(raw_value)
        except ValueError:
            raise ValidationError({field_name: "صيغة التاريخ والوقت غير صحيحة."})

    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.get_current_timezone())

    return parsed


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


def _validation_errors(exc: ValidationError) -> dict[str, Any] | list[Any] | str:
    """
    يحول ValidationError إلى صيغة JSON آمنة.
    """

    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


def _subscription_payload(subscription: CompanySubscription) -> dict[str, Any]:
    """
    يحول كائن الاشتراك إلى JSON نظيف للواجهة.
    """

    company = subscription.company
    plan = subscription.plan
    previous_subscription = getattr(subscription, "previous_subscription", None)
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
        "previous_subscription": {
            "id": previous_subscription.id,
            "status": previous_subscription.status,
            "plan_id": previous_subscription.plan_id,
            "billing_cycle": previous_subscription.billing_cycle,
            "start_date": _date_to_string(previous_subscription.start_date),
            "end_date": _date_to_string(previous_subscription.end_date),
            "cancelled_at": _datetime_to_string(previous_subscription.cancelled_at),
        }
        if previous_subscription
        else None,
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


@login_required
@csrf_protect
@require_POST
def system_subscription_confirm_payment(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    """
    POST /api/system/subscriptions/<subscription_id>/confirm-payment/

    يؤكد دفع اشتراك المنصة ويفعّل الاشتراك المنتظر.
    """

    if not user_has_system_permission(request.user, "system.subscriptions.update"):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بتأكيد دفع اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
            "previous_subscription",
            "previous_subscription__plan",
        ),
        id=subscription_id,
    )

    if subscription.status != CompanySubscription.Status.PENDING_PAYMENT:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن تأكيد الدفع إلا لاشتراك بانتظار الدفع.",
                "errors": {
                    "status": "الاشتراك يجب أن يكون في حالة PENDING_PAYMENT."
                },
            },
            status=400,
        )

    payload = _json_body(request)

    try:
        paid_at = _parse_datetime(
            _get_value(request, payload, "paid_at", None),
            "paid_at",
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر قراءة تاريخ الدفع.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    billing_reference = _clean_text(
        _get_value(
            request,
            payload,
            "billing_reference",
            subscription.billing_reference,
        )
    )

    cancel_previous = str(
        _get_value(request, payload, "cancel_previous", "true")
    ).strip().lower() not in {"0", "false", "no", "off"}

    try:
        activated_subscription = activate_pending_subscription(
            subscription=subscription,
            paid_at=paid_at,
            billing_reference=billing_reference,
            cancel_previous=cancel_previous,
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر تأكيد الدفع وتفعيل الاشتراك.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    activated_subscription.refresh_from_db()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم تأكيد الدفع وتفعيل الاشتراك بنجاح.",
            "data": {
                "subscription": _subscription_payload(activated_subscription),
            },
        },
        status=200,
    )