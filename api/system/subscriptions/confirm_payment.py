# ============================================================
# api/system/subscriptions/confirm_payment.py
# Mhamcloud | Phase 19 Compatibility Payment Confirmation API
# ------------------------------------------------------------
# Legacy route kept:
# POST /api/system/subscriptions/<id>/confirm-payment/
#
# It no longer activates a subscription directly.
# It creates/gets a PlatformSubscriptionPayment and delegates
# success to billing.payment_services.confirm_subscription_payment.
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
from billing.models import PlatformSubscriptionPayment
from billing.payment_services import (
    confirm_subscription_payment,
    create_or_get_subscription_payment,
)
from subscriptions.models import CompanySubscription
def _json_body(
    request: HttpRequest,
) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        payload = json.loads(
            request.body.decode("utf-8")
        )
    except (json.JSONDecodeError, UnicodeDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}
def _value(
    request,
    payload,
    key,
    default=None,
):
    if key in payload:
        return payload.get(key)
    return request.POST.get(key, default)
def _clean(value):
    return str(value or "").strip()
def _parse_datetime(value):
    if value in {None, ""}:
        return timezone.now()
    if isinstance(value, datetime):
        parsed = value
    else:
        raw = _clean(value)
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            parsed = datetime.fromisoformat(raw)
        except ValueError as exc:
            raise ValidationError({
                "paid_at": (
                    "صيغة التاريخ والوقت غير صحيحة."
                )
            }) from exc
    if timezone.is_naive(parsed):
        parsed = timezone.make_aware(
            parsed,
            timezone.get_current_timezone(),
        )
    return parsed
def _errors(exc):
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "messages"):
        return {"detail": exc.messages}
    return {"detail": str(exc)}
def _payment_payload(payment):
    return {
        "id": payment.id,
        "payment_reference": (
            payment.payment_reference
        ),
        "status": payment.status,
        "attempt_number": (
            payment.attempt_number
        ),
        "gateway": payment.gateway,
        "payment_method": (
            payment.payment_method
        ),
        "amount": f"{payment.amount:.2f}",
        "currency_code": (
            payment.currency_code
        ),
        "transaction_reference": (
            payment.transaction_reference
        ),
        "billing_reference": (
            payment.billing_reference
        ),
        "invoice_id": payment.invoice_id,
        "receipt_id": payment.receipt_id,
        "paid_at": (
            payment.paid_at.isoformat()
            if payment.paid_at
            else None
        ),
    }
@login_required
@csrf_protect
@require_POST
def system_subscription_confirm_payment(
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
                "message": (
                    "غير مصرح لك بتأكيد "
                    "دفع اشتراكات الشركات."
                ),
                "code": (
                    "SYSTEM_SUBSCRIPTIONS_"
                    "UPDATE_PERMISSION_REQUIRED"
                ),
            },
            status=403,
        )
    subscription = get_object_or_404(
        CompanySubscription.objects
        .select_related(
            "company",
            "plan",
            "previous_subscription",
            "previous_subscription__plan",
        ),
        id=subscription_id,
    )
    payload = _json_body(request)
    # If the subscription is already active and a paid platform
    # payment exists, return that result idempotently.
    if subscription.status == (
        CompanySubscription.Status.ACTIVE
    ):
        existing_paid = (
            PlatformSubscriptionPayment.objects
            .select_related(
                "invoice",
                "receipt",
            )
            .filter(
                subscription=subscription,
                status=(
                    PlatformSubscriptionPayment
                    .Status
                    .PAID
                ),
            )
            .order_by("-paid_at", "-id")
            .first()
        )
        if existing_paid:
            return JsonResponse({
                "ok": True,
                "idempotent": True,
                "message": (
                    "الدفع مؤكد مسبقًا "
                    "والاشتراك نشط."
                ),
                "data": {
                    "payment": _payment_payload(
                        existing_paid
                    ),
                    "subscription": {
                        "id": subscription.id,
                        "status": (
                            subscription.status
                        ),
                    },
                },
            })
    if subscription.status != (
        CompanySubscription.Status.PENDING_PAYMENT
    ):
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "لا يمكن تأكيد الدفع إلا "
                    "لاشتراك بانتظار الدفع."
                ),
                "errors": {
                    "status": (
                        "الاشتراك يجب أن يكون "
                        "PENDING_PAYMENT."
                    )
                },
            },
            status=400,
        )
    idempotency_key = _clean(
        _value(
            request,
            payload,
            "idempotency_key",
        )
    )
    transaction_reference = _clean(
        _value(
            request,
            payload,
            "transaction_reference",
        )
    )
    billing_reference = _clean(
        _value(
            request,
            payload,
            "billing_reference",
            subscription.billing_reference,
        )
    )
    if not idempotency_key:
        stable_reference = (
            transaction_reference
            or billing_reference
        )
        if stable_reference:
            idempotency_key = (
                f"legacy-confirm:"
                f"{subscription.id}:"
                f"{stable_reference}"
            )
    try:
        paid_at = _parse_datetime(
            _value(
                request,
                payload,
                "paid_at",
            )
        )
        payment, _ = (
            create_or_get_subscription_payment(
                subscription=subscription,
                idempotency_key=idempotency_key,
                gateway=_clean(
                    _value(
                        request,
                        payload,
                        "gateway",
                        "MANUAL",
                    )
                ),
                payment_method=_clean(
                    _value(
                        request,
                        payload,
                        "payment_method",
                        "MANUAL",
                    )
                ),
                gateway_payment_id=_clean(
                    _value(
                        request,
                        payload,
                        "gateway_payment_id",
                    )
                ),
                transaction_reference=(
                    transaction_reference
                ),
                billing_reference=(
                    billing_reference
                ),
                provider_request_snapshot=(
                    payload.get(
                        "provider_request_snapshot"
                    )
                ),
                provider_response_snapshot=(
                    payload.get(
                        "provider_response_snapshot"
                    )
                ),
                metadata={
                    "source": (
                        "legacy-subscription-"
                        "confirm-payment"
                    ),
                },
                created_by=request.user,
            )
        )
        (
            payment,
            activated_subscription,
            receipt,
        ) = confirm_subscription_payment(
            payment=payment,
            actor=request.user,
            paid_at=paid_at,
            transaction_reference=(
                transaction_reference
            ),
            gateway_payment_id=_clean(
                _value(
                    request,
                    payload,
                    "gateway_payment_id",
                )
            ),
            billing_reference=(
                billing_reference
            ),
            payment_method=_clean(
                _value(
                    request,
                    payload,
                    "payment_method",
                    "MANUAL",
                )
            ),
            provider_response_snapshot=(
                payload.get(
                    "provider_response_snapshot"
                )
            ),
            payment_extra=payload.get(
                "payment_extra"
            ),
            cancel_previous=str(
                _value(
                    request,
                    payload,
                    "cancel_previous",
                    "true",
                )
            ).strip().lower()
            not in {
                "0",
                "false",
                "no",
                "off",
            },
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": (
                    "تعذر تأكيد الدفع "
                    "وتفعيل الاشتراك."
                ),
                "errors": _errors(exc),
            },
            status=400,
        )
    payment.refresh_from_db()
    activated_subscription.refresh_from_db()
    return JsonResponse({
        "ok": True,
        "message": (
            "تم تأكيد الدفع وإنشاء سجل "
            "الدفع وتفعيل الاشتراك بنجاح."
        ),
        "data": {
            "payment": _payment_payload(payment),
            "subscription": {
                "id": (
                    activated_subscription.id
                ),
                "company_id": (
                    activated_subscription.company_id
                ),
                "plan_id": (
                    activated_subscription.plan_id
                ),
                "status": (
                    activated_subscription.status
                ),
                "billing_reference": (
                    activated_subscription
                    .billing_reference
                ),
                "paid_at": (
                    activated_subscription.paid_at
                    .isoformat()
                    if activated_subscription.paid_at
                    else None
                ),
                "activated_at": (
                    activated_subscription
                    .activated_at
                    .isoformat()
                    if activated_subscription
                    .activated_at
                    else None
                ),
            },
            "receipt": (
                {
                    "id": receipt.id,
                    "document_number": (
                        receipt.document_number
                    ),
                }
                if receipt
                else None
            ),
        },
    })
