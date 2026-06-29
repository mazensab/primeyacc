# ============================================================
# 📂 api/company/payments/settlements/items.py
# 🧠 Mhamcloud | Company Payment Settlement Items API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.checkout.detail import get_checkout_session_or_raise
from api.company.payments.settlements.list import (
    PaymentSettlementListAPIError,
    get_settlement_batch_or_raise,
)
from api.permissions import HasAnyCompanyPermission
from payments.models import PaymentWebhookEvent
from payments.services import add_settlement_item, serialize_settlement_batch


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentSettlementListAPIError("Current company context was not resolved.")
    return company


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_settlement_add_item(request: Request, batch_id: int) -> Response:
    try:
        company = _get_request_company(request)
        batch = get_settlement_batch_or_raise(company, batch_id)
        data = request.data or {}

        checkout_session = None
        webhook_event = None

        if data.get("checkout_session_id"):
            checkout_session = get_checkout_session_or_raise(company, int(data.get("checkout_session_id")))

        if data.get("webhook_event_id"):
            webhook_event = PaymentWebhookEvent.objects.filter(company=company, id=data.get("webhook_event_id")).first()
            if not webhook_event:
                raise ValidationError({"webhook_event_id": "Webhook event was not found."})

        add_settlement_item(
            batch,
            {
                "checkout_session": checkout_session,
                "webhook_event": webhook_event,
                "external_payment_id": data.get("external_payment_id") or "",
                "gross_amount": data.get("gross_amount") or (checkout_session.amount if checkout_session else "0"),
                "fee_amount": data.get("fee_amount") or (checkout_session.gateway_fee_amount if checkout_session else "0"),
                "notes": data.get("notes") or "",
            },
        )

        batch.refresh_from_db()

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment settlement item added successfully.",
                "item": serialize_settlement_batch(batch, include_items=True),
                "result": serialize_settlement_batch(batch, include_items=True),
            },
            status=201,
        )

    except (PaymentSettlementListAPIError, ValueError, TypeError) as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=400)
    except ValidationError as exc:
        return Response({"ok": False, "success": False, "message": "Payment settlement item validation failed.", "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages}}, status=400)


payment_settlement_add_item.required_company_permissions = [
    "company.payments.settlements.update",
]
