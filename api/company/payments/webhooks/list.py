# ============================================================
# 📂 api/company/payments/webhooks/list.py
# 🧠 PrimeyAcc | Company Payment Webhooks API V1.0
# ------------------------------------------------------------
# ✅ Record gateway webhook events
# ✅ Idempotency protection
# ✅ Optional checkout payment status processing
# ✅ Company-scoped diagnostic listing
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.checkout.detail import get_checkout_session_or_raise
from api.company.payments.gateways.detail import get_payment_gateway_or_raise
from api.permissions import HasAnyCompanyPermission
from payments.models import PaymentWebhookEvent
from payments.services import (
    process_payment_webhook_event,
    record_payment_webhook_event,
    serialize_webhook_event,
)


class PaymentWebhookAPIError(Exception):
    pass


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentWebhookAPIError("Current company context was not resolved.")
    return company


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    if number < 1:
        number = default
    if maximum is not None:
        number = min(number, maximum)
    return number


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_webhooks_list(request: Request) -> Response:
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            data = request.data or {}
            gateway = get_payment_gateway_or_raise(company, int(data.get("gateway_id") or data.get("gateway")))
            checkout_session = None

            if data.get("checkout_session_id"):
                checkout_session = get_checkout_session_or_raise(company, int(data.get("checkout_session_id")))

            event = record_payment_webhook_event(
                company,
                {
                    "gateway": gateway,
                    "checkout_session": checkout_session,
                    "event_type": data.get("event_type") or "payment.event",
                    "external_event_id": data.get("external_event_id") or "",
                    "external_payment_id": data.get("external_payment_id") or "",
                    "idempotency_key": data.get("idempotency_key") or "",
                    "payload": data.get("payload") or {},
                    "headers": data.get("headers") or {},
                    "signature": data.get("signature") or "",
                },
            )

            payment_status = data.get("payment_status") or ""
            if payment_status:
                event = process_payment_webhook_event(
                    event,
                    checkout_session=checkout_session,
                    payment_status=payment_status,
                    external_payment_id=data.get("external_payment_id") or "",
                )

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment webhook event recorded successfully.",
                    "item": serialize_webhook_event(event),
                    "result": serialize_webhook_event(event),
                },
                status=201,
            )

        page = _clean_positive_int(request.query_params.get("page"), 1)
        page_size = _clean_positive_int(request.query_params.get("page_size") or request.query_params.get("per_page"), 25, 100)
        search = _clean_text(request.query_params.get("search") or request.query_params.get("q") or "")
        status = _clean_text(request.query_params.get("status") or "").upper()
        gateway_id = request.query_params.get("gateway_id") or ""

        queryset = PaymentWebhookEvent.objects.filter(company=company).select_related("gateway", "checkout_session")

        if search:
            queryset = queryset.filter(
                Q(event_type__icontains=search)
                | Q(external_event_id__icontains=search)
                | Q(external_payment_id__icontains=search)
                | Q(idempotency_key__icontains=search)
            )

        if status:
            queryset = queryset.filter(status=status)

        if gateway_id:
            queryset = queryset.filter(gateway_id=gateway_id)

        queryset = queryset.order_by("-created_at", "-id")
        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        items = [serialize_webhook_event(event) for event in page_obj.object_list]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment webhook events loaded successfully.",
                "summary": {
                    "total_events": queryset.count(),
                    "received_events": queryset.filter(status=PaymentWebhookEvent.Status.RECEIVED).count(),
                    "processed_events": queryset.filter(status=PaymentWebhookEvent.Status.PROCESSED).count(),
                    "failed_events": queryset.filter(status=PaymentWebhookEvent.Status.FAILED).count(),
                    "ignored_events": queryset.filter(status=PaymentWebhookEvent.Status.IGNORED).count(),
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": items,
                "results": items,
            },
            status=200,
        )

    except (PaymentWebhookAPIError, ValueError, TypeError) as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=400)
    except ValidationError as exc:
        return Response({"ok": False, "success": False, "message": "Payment webhook validation failed.", "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages}}, status=400)


payment_webhooks_list.required_company_permissions = [
    "company.payments.webhooks.view",
    "company.payments.webhooks.create",
]
