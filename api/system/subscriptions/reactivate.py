from __future__ import annotations

import json
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


def _json_body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}

    return payload if isinstance(payload, dict) else {}


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _datetime_to_string(value: Any) -> str | None:
    return value.isoformat() if value else None


def _date_to_string(value: Any) -> str | None:
    return value.isoformat() if value else None


def _validation_errors(
    exc: ValidationError,
) -> dict[str, Any]:
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": str(exc)}


def _subscription_action_payload(
    subscription: CompanySubscription,
) -> dict[str, Any]:
    subscription.refresh_from_db()

    return {
        "id": subscription.id,
        "company_id": subscription.company_id,
        "company": {
            "id": subscription.company_id,
            "name": (
                getattr(subscription.company, "display_name", None)
                or getattr(subscription.company, "name", "")
            ),
            "code": getattr(subscription.company, "company_code", ""),
        },
        "plan": {
            "id": subscription.plan_id,
            "name": getattr(subscription.plan, "name", ""),
            "code": getattr(subscription.plan, "code", ""),
        },
        "status": subscription.status,
        "action": subscription.action,
        "billing_cycle": subscription.billing_cycle,
        "start_date": _date_to_string(subscription.start_date),
        "end_date": _date_to_string(subscription.end_date),
        "paid_at": _datetime_to_string(subscription.paid_at),
        "activated_at": _datetime_to_string(subscription.activated_at),
        "cancelled_at": _datetime_to_string(subscription.cancelled_at),
        "suspended_at": _datetime_to_string(subscription.suspended_at),
        "auto_renew": subscription.auto_renew,
        "billing_reference": subscription.billing_reference,
        "notes": subscription.notes,
    }


@login_required
@csrf_protect
@require_POST
def system_subscription_reactivate(
    request: HttpRequest,
    subscription_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        "system.subscriptions.update",
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": "غير مصرح لك بإعادة تفعيل اشتراكات الشركات.",
                "code": "SYSTEM_SUBSCRIPTIONS_UPDATE_PERMISSION_REQUIRED",
            },
            status=403,
        )

    subscription = get_object_or_404(
        CompanySubscription.objects.select_related(
            "company",
            "plan",
        ),
        pk=subscription_id,
    )

    if subscription.status in {
        CompanySubscription.Status.TRIAL,
        CompanySubscription.Status.ACTIVE,
    }:
        return JsonResponse(
            {
                "ok": True,
                "idempotent": True,
                "message": "الاشتراك مفعل بالفعل.",
                "data": {
                    "subscription": _subscription_action_payload(
                        subscription
                    ),
                },
            },
            status=200,
        )

    if subscription.status != CompanySubscription.Status.SUSPENDED:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا يمكن إعادة تفعيل الاشتراك من حالته الحالية.",
                "errors": {
                    "status": (
                        "يجب أن يكون الاشتراك SUSPENDED "
                        "حتى يمكن إعادة تفعيله."
                    ),
                },
            },
            status=400,
        )

    payload = _json_body(request)
    reason = _clean_text(payload.get("reason"))

    if reason:
        current_notes = _clean_text(subscription.notes)
        note = f"Reactivation reason: {reason}"
        subscription.notes = (
            f"{current_notes}\n{note}".strip()
            if current_notes
            else note
        )
        subscription.save(
            update_fields=[
                "notes",
                "updated_at",
            ]
        )

    try:
        subscription.activate(
            paid_at=subscription.paid_at or timezone.now(),
            save=True,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "تعذر إعادة تفعيل الاشتراك.",
                "errors": _validation_errors(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم إعادة تفعيل الاشتراك بنجاح.",
            "data": {
                "subscription": _subscription_action_payload(
                    subscription
                ),
            },
        },
        status=200,
    )
