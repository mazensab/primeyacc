from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db.models import Q
from django.http import HttpRequest, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_POST

from api.permissions import user_has_system_permission
from billing.models import (
    PlatformSubscriptionAdjustment,
    PlatformSubscriptionPayment,
)
from billing.payment_services import (
    cancel_subscription_payment_attempt,
    confirm_subscription_payment,
    create_or_get_subscription_payment,
    fail_subscription_payment,
)
from billing.adjustment_services import (
    create_or_get_platform_adjustment,
    reverse_platform_adjustment,
)
from billing.refund_services import (
    get_payment_refund_financial_summary,
)
from billing.void_services import (
    supports_platform_provider_void,
    void_platform_payment_attempt,
)
from subscriptions.models import CompanySubscription
from integrations.payments.platform_bridge import (
    verify_and_apply_gateway_payment,
)
from integrations.payments.platform_checkout import (
    attach_moyasar_client_payment,
    initiate_platform_checkout,
)


READ_PERMISSION = "system.subscriptions.view"
WRITE_PERMISSION = "system.subscriptions.update"


def _json_body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        value = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _errors(exc: ValidationError) -> dict[str, Any]:
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "messages"):
        return {"non_field_errors": exc.messages}
    return {"non_field_errors": [str(exc)]}


def _forbidden(message: str) -> JsonResponse:
    return JsonResponse(
        {"ok": False, "message": message, "code": "SYSTEM_SUBSCRIPTIONS_PERMISSION_REQUIRED"},
        status=403,
    )


def _user_payload(user) -> dict[str, Any] | None:
    if not user:
        return None
    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
    }


def _document_payload(document) -> dict[str, Any] | None:
    if not document:
        return None
    return {
        "id": document.id,
        "document_number": document.document_number,
        "document_type": document.document_type,
        "status": document.status,
        "total_amount": str(document.total_amount),
        "currency_code": document.currency_code,
    }


def _event_payload(event) -> dict[str, Any]:
    return {
        "id": event.id,
        "event_type": event.event_type,
        "from_status": event.from_status,
        "to_status": event.to_status,
        "message": event.message,
        "payload": dict(event.payload or {}),
        "actor": _user_payload(getattr(event, "actor", None)),
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def _payment_payload(
    payment: PlatformSubscriptionPayment,
    *,
    events: bool = False,
) -> dict[str, Any]:
    subscription = payment.subscription
    company = payment.company
    plan = getattr(subscription, "plan", None)

    payload = {
        "id": payment.id,
        "payment_reference": payment.payment_reference,
        "idempotency_key": payment.idempotency_key,
        "attempt_number": payment.attempt_number,
        "status": payment.status,
        "gateway": payment.gateway,
        "payment_method": payment.payment_method,
        "gateway_payment_id": payment.gateway_payment_id,
        "transaction_reference": payment.transaction_reference,
        "billing_reference": payment.billing_reference,
        "amount": str(payment.amount),
        "currency_code": payment.currency_code,
        "failure_code": payment.failure_code,
        "failure_message": payment.failure_message,
        "cancellation_reason": payment.cancellation_reason,
        "initiated_at": payment.initiated_at.isoformat() if payment.initiated_at else None,
        "processing_at": payment.processing_at.isoformat() if payment.processing_at else None,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
        "failed_at": payment.failed_at.isoformat() if payment.failed_at else None,
        "cancelled_at": payment.cancelled_at.isoformat() if payment.cancelled_at else None,
        "created_at": payment.created_at.isoformat() if payment.created_at else None,
        "updated_at": payment.updated_at.isoformat() if payment.updated_at else None,
        "company": {
            "id": company.id,
            "company_code": getattr(company, "company_code", ""),
            "display_name": getattr(company, "display_name", str(company)),
        },
        "subscription": {
            "id": subscription.id,
            "status": subscription.status,
            "action": subscription.action,
            "billing_cycle": subscription.billing_cycle,
            "billing_reference": subscription.billing_reference,
            "total_amount": str(subscription.total_amount),
            "plan": {
                "id": plan.id,
                "name": plan.name,
                "slug": plan.slug,
            } if plan else None,
        },
        "invoice": _document_payload(getattr(payment, "invoice", None)),
        "receipt": _document_payload(getattr(payment, "receipt", None)),
        "created_by": _user_payload(getattr(payment, "created_by", None)),
        "confirmed_by": _user_payload(getattr(payment, "confirmed_by", None)),
        "cancelled_by": _user_payload(getattr(payment, "cancelled_by", None)),
        "allowed_actions": {
            "confirm": payment.status in {
                PlatformSubscriptionPayment.Status.PENDING,
                PlatformSubscriptionPayment.Status.PROCESSING,
            },
            "fail": payment.status in {
                PlatformSubscriptionPayment.Status.PENDING,
                PlatformSubscriptionPayment.Status.PROCESSING,
            },
            "cancel": payment.status in {
                PlatformSubscriptionPayment.Status.PENDING,
                PlatformSubscriptionPayment.Status.PROCESSING,
                PlatformSubscriptionPayment.Status.FAILED,
            },
        },
    }

    if events:
        payload["events"] = [
            _event_payload(event)
            for event in payment.events.select_related("actor").all()
        ]

        payload["financial"] = (
            get_payment_refund_financial_summary(
                payment
            )
        )

        payload["refunds"] = [
            {
                "id": row.id,
                "refund_reference":
                    row.refund_reference,
                "status": row.status,
                "gateway": row.gateway,
                "provider_refund_id":
                    row.provider_refund_id,
                "amount": str(row.amount),
                "currency_code":
                    row.currency_code,
                "reason": row.reason,
                "refunded_at": (
                    row.refunded_at.isoformat()
                    if row.refunded_at
                    else None
                ),
                "created_at": (
                    row.created_at.isoformat()
                    if row.created_at
                    else None
                ),
            }
            for row in payment.refunds.all()
        ]

        payload["adjustments"] = [
            {
                "id": row.id,
                "adjustment_reference":
                    row.adjustment_reference,
                "adjustment_type":
                    row.adjustment_type,
                "status": row.status,
                "amount": str(row.amount),
                "currency_code":
                    row.currency_code,
                "reason": row.reason,
                "accounting_reference":
                    row.accounting_reference,
                "posted_at": (
                    row.posted_at.isoformat()
                    if row.posted_at
                    else None
                ),
                "reversed_at": (
                    row.reversed_at.isoformat()
                    if row.reversed_at
                    else None
                ),
            }
            for row in payment.adjustments.all()
        ]

        payload["allowed_actions"]["void"] = (
            supports_platform_provider_void(
                payment
            )
        )

        payload["allowed_actions"]["refund"] = (
            payment.status
            == PlatformSubscriptionPayment
            .Status
            .PAID
            and payload[
                "financial"
            ][
                "remaining_refundable_amount"
            ]
            != "0.00"
        )

        payload["allowed_actions"][
            "financial_adjustment"
        ] = True

    return payload


def _payment_queryset():
    return PlatformSubscriptionPayment.objects.select_related(
        "subscription",
        "subscription__plan",
        "company",
        "invoice",
        "receipt",
        "created_by",
        "confirmed_by",
        "cancelled_by",
    )


@login_required
@require_GET
def system_subscription_payments_list(request: HttpRequest) -> JsonResponse:
    if not user_has_system_permission(request.user, READ_PERMISSION):
        return _forbidden("غير مصرح لك بعرض مدفوعات الاشتراكات.")

    queryset = _payment_queryset()

    status_value = _clean(request.GET.get("status")).upper()
    if status_value:
        valid_statuses = {value for value, _ in PlatformSubscriptionPayment.Status.choices}
        if status_value not in valid_statuses:
            return JsonResponse(
                {"ok": False, "message": "حالة الدفع غير صحيحة.", "errors": {"status": ["Invalid payment status."]}},
                status=400,
            )
        queryset = queryset.filter(status=status_value)

    company_id = _clean(request.GET.get("company_id"))
    subscription_id = _clean(request.GET.get("subscription_id"))
    if company_id:
        if not company_id.isdigit():
            return JsonResponse({"ok": False, "message": "company_id غير صحيح."}, status=400)
        queryset = queryset.filter(company_id=int(company_id))
    if subscription_id:
        if not subscription_id.isdigit():
            return JsonResponse({"ok": False, "message": "subscription_id غير صحيح."}, status=400)
        queryset = queryset.filter(subscription_id=int(subscription_id))

    query = _clean(request.GET.get("q"))
    if query:
        queryset = queryset.filter(
            Q(payment_reference__icontains=query)
            | Q(transaction_reference__icontains=query)
            | Q(gateway_payment_id__icontains=query)
            | Q(billing_reference__icontains=query)
            | Q(company__name__icontains=query)
        )

    try:
        page_size = min(max(int(request.GET.get("page_size", 25)), 1), 100)
        page_number = max(int(request.GET.get("page", 1)), 1)
    except (TypeError, ValueError):
        return JsonResponse({"ok": False, "message": "بيانات الترقيم غير صحيحة."}, status=400)

    paginator = Paginator(queryset, page_size)
    page = paginator.get_page(page_number)

    return JsonResponse({
        "ok": True,
        "data": {
            "count": paginator.count,
            "page": page.number,
            "page_size": page_size,
            "pages": paginator.num_pages,
            "results": [_payment_payload(payment) for payment in page.object_list],
        },
    })


@login_required
@require_GET
def system_subscription_payment_detail(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(request.user, READ_PERMISSION):
        return _forbidden("غير مصرح لك بعرض تفاصيل الدفع.")
    payment = get_object_or_404(_payment_queryset(), pk=payment_id)
    return JsonResponse({"ok": True, "data": {"payment": _payment_payload(payment, events=True)}})


@login_required
@require_GET
def system_subscription_payment_events(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(request.user, READ_PERMISSION):
        return _forbidden("غير مصرح لك بعرض سجل الدفع.")
    payment = get_object_or_404(_payment_queryset(), pk=payment_id)
    event_rows = [
        _event_payload(event)
        for event in payment.events.select_related("actor").all()
    ]
    return JsonResponse({
        "ok": True,
        "data": {
            "payment_id": payment.id,
            "payment_reference": payment.payment_reference,
            "events": event_rows,
        },
    })


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_create(request: HttpRequest) -> JsonResponse:
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden("غير مصرح لك بإنشاء محاولة دفع.")

    payload = _json_body(request)
    subscription_id = payload.get("subscription_id")
    try:
        subscription_id = int(subscription_id)
    except (TypeError, ValueError):
        return JsonResponse(
            {"ok": False, "message": "subscription_id مطلوب وصحيح.", "errors": {"subscription_id": ["Required integer."]}},
            status=400,
        )

    subscription = get_object_or_404(CompanySubscription, pk=subscription_id)

    try:
        payment, created = create_or_get_subscription_payment(
            subscription=subscription,
            idempotency_key=_clean(payload.get("idempotency_key")),
            gateway=_clean(payload.get("gateway")) or "MANUAL",
            payment_method=_clean(payload.get("payment_method")) or "MANUAL",
            gateway_payment_id=_clean(payload.get("gateway_payment_id")),
            transaction_reference=_clean(payload.get("transaction_reference")),
            billing_reference=_clean(payload.get("billing_reference")),
            provider_request_snapshot=payload.get("provider_request_snapshot"),
            provider_response_snapshot=payload.get("provider_response_snapshot"),
            metadata=payload.get("metadata"),
            created_by=request.user,
        )
    except ValidationError as exc:
        return JsonResponse({"ok": False, "message": "تعذر إنشاء محاولة الدفع.", "errors": _errors(exc)}, status=400)

    payment = _payment_queryset().get(pk=payment.pk)
    return JsonResponse(
        {"ok": True, "created": created, "data": {"payment": _payment_payload(payment, events=True)}},
        status=201 if created else 200,
    )


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_confirm(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden("غير مصرح لك بتأكيد الدفع.")

    payment = get_object_or_404(_payment_queryset(), pk=payment_id)
    payload = _json_body(request)
    paid_at = None
    paid_at_value = _clean(payload.get("paid_at"))
    if paid_at_value:
        paid_at = parse_datetime(paid_at_value)
        if paid_at is None:
            return JsonResponse({"ok": False, "message": "paid_at غير صحيح."}, status=400)

    cancel_previous = payload.get("cancel_previous", True)
    if isinstance(cancel_previous, str):
        cancel_previous = cancel_previous.strip().lower() not in {"0", "false", "no", "off"}

    try:
        paid_payment, subscription, receipt = confirm_subscription_payment(
            payment=payment,
            actor=request.user,
            paid_at=paid_at,
            transaction_reference=_clean(payload.get("transaction_reference")),
            gateway_payment_id=_clean(payload.get("gateway_payment_id")),
            billing_reference=_clean(payload.get("billing_reference")),
            payment_method=_clean(payload.get("payment_method")),
            provider_response_snapshot=payload.get("provider_response_snapshot"),
            payment_extra=payload.get("payment_extra"),
            cancel_previous=bool(cancel_previous),
        )
    except ValidationError as exc:
        return JsonResponse({"ok": False, "message": "تعذر تأكيد الدفع.", "errors": _errors(exc)}, status=400)

    paid_payment = _payment_queryset().get(pk=paid_payment.pk)
    return JsonResponse({
        "ok": True,
        "data": {
            "payment": _payment_payload(paid_payment, events=True),
            "subscription": {
                "id": subscription.id,
                "status": subscription.status,
                "billing_reference": subscription.billing_reference,
            },
            "receipt": _document_payload(receipt),
        },
    })


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_fail(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden("غير مصرح لك بتسجيل فشل الدفع.")
    payment = get_object_or_404(_payment_queryset(), pk=payment_id)
    payload = _json_body(request)
    try:
        failed = fail_subscription_payment(
            payment=payment,
            actor=request.user,
            failure_code=_clean(payload.get("failure_code")),
            failure_message=_clean(payload.get("failure_message")),
            provider_response_snapshot=payload.get("provider_response_snapshot"),
        )
    except ValidationError as exc:
        return JsonResponse({"ok": False, "message": "تعذر تسجيل فشل الدفع.", "errors": _errors(exc)}, status=400)
    failed = _payment_queryset().get(pk=failed.pk)
    return JsonResponse({"ok": True, "data": {"payment": _payment_payload(failed, events=True)}})


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_cancel(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden("غير مصرح لك بإلغاء محاولة الدفع.")
    payment = get_object_or_404(_payment_queryset(), pk=payment_id)
    payload = _json_body(request)
    try:
        cancelled = cancel_subscription_payment_attempt(
            payment=payment,
            actor=request.user,
            reason=_clean(payload.get("reason")),
        )
    except ValidationError as exc:
        return JsonResponse({"ok": False, "message": "تعذر إلغاء محاولة الدفع.", "errors": _errors(exc)}, status=400)
    cancelled = _payment_queryset().get(pk=cancelled.pk)
    return JsonResponse({"ok": True, "data": {"payment": _payment_payload(cancelled, events=True)}})

@login_required
@csrf_protect
@require_POST
def system_subscription_payment_checkout(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    """
    Start provider checkout for an existing platform subscription payment.

    Financial values are always read from the persisted payment contract.
    The browser cannot override amount, currency, gateway, or payment status.
    """
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden("You are not authorized to start subscription checkout.")

    payment = get_object_or_404(
        _payment_queryset(),
        pk=payment_id,
    )

    payload = _json_body(request)

    metadata = payload.get("metadata")
    if metadata is not None and not isinstance(metadata, dict):
        return JsonResponse(
            {
                "ok": False,
                "message": "Invalid checkout metadata.",
                "errors": {
                    "metadata": ["Expected JSON object."],
                },
            },
            status=400,
        )

    description = _clean(payload.get("description"))

    try:
        result = initiate_platform_checkout(
            payment=payment,
            metadata=metadata,
            description=description,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to start subscription checkout.",
                "errors": _errors(exc),
            },
            status=400,
        )

    payment = _payment_queryset().get(pk=payment.pk)

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "checkout": result.as_dict(),
                "payment": _payment_payload(
                    payment,
                    events=True,
                ),
            },
        }
    )



@login_required
@csrf_protect
@require_POST
def system_subscription_payment_verify(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    """
    Verify a platform subscription payment against its configured provider.

    The request body cannot override payment status, amount, currency,
    gateway, provider payment ID, or merchant reference. Those values are
    taken from the persisted platform payment and the provider response.
    """
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden(
            "You are not authorized to verify subscription payment."
        )

    payment = get_object_or_404(
        _payment_queryset(),
        pk=payment_id,
    )

    try:
        result = verify_and_apply_gateway_payment(
            payment=payment,
            actor=request.user,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to verify subscription payment.",
                "errors": _errors(exc),
            },
            status=400,
        )
    except Exception as exc:
        from integrations.payments.exceptions import PaymentGatewayError

        if isinstance(exc, PaymentGatewayError):
            return JsonResponse(
                {
                    "ok": False,
                    "message": "Payment provider verification failed.",
                    "errors": {
                        "provider": [str(exc)],
                    },
                },
                status=400,
            )
        raise

    # Phase 19 confirmation returns:
    # (payment, subscription, receipt)
    if isinstance(result, tuple):
        verified_payment, subscription, receipt = result

        verified_payment = _payment_queryset().get(
            pk=verified_payment.pk
        )

        return JsonResponse(
            {
                "ok": True,
                "data": {
                    "payment": _payment_payload(
                        verified_payment,
                        events=True,
                    ),
                    "subscription": {
                        "id": subscription.id,
                        "status": subscription.status,
                        "billing_reference": (
                            subscription.billing_reference
                        ),
                    },
                    "receipt": _document_payload(receipt),
                },
            }
        )

    verified_payment = _payment_queryset().get(
        pk=result.pk
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "payment": _payment_payload(
                    verified_payment,
                    events=True,
                ),
            },
        }
    )



@login_required
@csrf_protect
@require_POST
def system_subscription_payment_moyasar_attach(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    """
    Attach the Moyasar payment ID created by the browser.

    This endpoint never marks a payment PAID. Final payment confirmation
    must come from provider verification/webhook processing.
    """
    if not user_has_system_permission(request.user, WRITE_PERMISSION):
        return _forbidden("You are not authorized to attach a Moyasar payment.")

    payment = get_object_or_404(
        _payment_queryset(),
        pk=payment_id,
    )

    payload = _json_body(request)
    provider_payment_id = _clean(
        payload.get("provider_payment_id")
    )

    if not provider_payment_id:
        return JsonResponse(
            {
                "ok": False,
                "message": "provider_payment_id is required.",
                "errors": {
                    "provider_payment_id": [
                        "Required value."
                    ],
                },
            },
            status=400,
        )

    try:
        result = attach_moyasar_client_payment(
            payment=payment,
            provider_payment_id=provider_payment_id,
        )
    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message": "Unable to attach Moyasar payment.",
                "errors": _errors(exc),
            },
            status=400,
        )

    payment = _payment_queryset().get(pk=payment.pk)

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "checkout": result.as_dict(),
                "payment": _payment_payload(
                    payment,
                    events=True,
                ),
            },
        }
    )


# =====================================================================
# PHASE30_PAYMENT_FINANCIAL_OPERATIONS
# =====================================================================


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_void(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        WRITE_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to void subscription payments."
        )

    payment = get_object_or_404(
        _payment_queryset(),
        pk=payment_id,
    )

    payload = _json_body(
        request
    )

    try:
        payment = void_platform_payment_attempt(
            payment=payment,
            actor=request.user,
            reason=_clean(
                payload.get("reason")
            ),
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message":
                    "Unable to void subscription payment.",
                "errors": _errors(exc),
            },
            status=400,
        )

    payment = _payment_queryset().get(
        pk=payment.pk
    )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "payment": _payment_payload(
                    payment,
                    events=True,
                )
            },
        }
    )


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_adjustment_create(
    request: HttpRequest,
    payment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        WRITE_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to create financial adjustments."
        )

    payment = get_object_or_404(
        _payment_queryset(),
        pk=payment_id,
    )

    payload = _json_body(
        request
    )

    try:
        adjustment, created = (
            create_or_get_platform_adjustment(
                payment=payment,
                adjustment_type=_clean(
                    payload.get(
                        "adjustment_type"
                    )
                ),
                amount=payload.get(
                    "amount"
                ),
                idempotency_key=_clean(
                    payload.get(
                        "idempotency_key"
                    )
                ),
                reason=_clean(
                    payload.get(
                        "reason"
                    )
                ),
                accounting_reference=_clean(
                    payload.get(
                        "accounting_reference"
                    )
                ),
                metadata=payload.get(
                    "metadata"
                ),
                created_by=request.user,
            )
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message":
                    "Unable to create financial adjustment.",
                "errors": _errors(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "created": created,
            "data": {
                "adjustment": {
                    "id": adjustment.id,
                    "adjustment_reference":
                        adjustment.adjustment_reference,
                    "payment_id":
                        adjustment.payment_id,
                    "subscription_id":
                        adjustment.subscription_id,
                    "adjustment_type":
                        adjustment.adjustment_type,
                    "status":
                        adjustment.status,
                    "amount":
                        str(adjustment.amount),
                    "currency_code":
                        adjustment.currency_code,
                    "reason":
                        adjustment.reason,
                    "accounting_reference":
                        adjustment.accounting_reference,
                }
            },
        },
        status=201 if created else 200,
    )


@login_required
@csrf_protect
@require_POST
def system_subscription_payment_adjustment_reverse(
    request: HttpRequest,
    payment_id: int,
    adjustment_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        WRITE_PERMISSION,
    ):
        return _forbidden(
            "You are not authorized to reverse financial adjustments."
        )

    adjustment = get_object_or_404(
        PlatformSubscriptionAdjustment,
        pk=adjustment_id,
        payment_id=payment_id,
    )

    payload = _json_body(
        request
    )

    try:
        adjustment = (
            reverse_platform_adjustment(
                adjustment=adjustment,
                actor=request.user,
                reason=_clean(
                    payload.get("reason")
                ),
            )
        )

    except ValidationError as exc:
        return JsonResponse(
            {
                "ok": False,
                "message":
                    "Unable to reverse financial adjustment.",
                "errors": _errors(exc),
            },
            status=400,
        )

    return JsonResponse(
        {
            "ok": True,
            "data": {
                "adjustment": {
                    "id": adjustment.id,
                    "adjustment_reference":
                        adjustment.adjustment_reference,
                    "status":
                        adjustment.status,
                    "reversed_at": (
                        adjustment.reversed_at.isoformat()
                        if adjustment.reversed_at
                        else None
                    ),
                }
            },
        }
    )
