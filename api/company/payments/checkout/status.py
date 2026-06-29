# ============================================================
# 📂 api/company/payments/checkout/status.py
# 🧠 Mhamcloud | Company Payment Checkout Status API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.checkout.detail import (
    PaymentCheckoutDetailAPIError,
    get_checkout_session_or_raise,
)
from api.permissions import HasAnyCompanyPermission
from payments.models import PaymentCheckoutSession
from payments.services import (
    complete_checkout_session,
    fail_checkout_session,
    mark_checkout_session_processing,
    serialize_checkout_session,
)


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentCheckoutDetailAPIError("Current company context was not resolved.")
    return company


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payment_checkout_status(request: Request, session_id: int) -> Response:
    try:
        company = _get_request_company(request)
        session = get_checkout_session_or_raise(company, session_id)
        data = request.data or {}
        status = str(data.get("status") or "").strip().upper()

        if status == PaymentCheckoutSession.Status.PROCESSING:
            session = mark_checkout_session_processing(
                session,
                external_checkout_id=data.get("external_checkout_id") or "",
                checkout_url=data.get("checkout_url") or "",
            )
        elif status == PaymentCheckoutSession.Status.PAID:
            session = complete_checkout_session(
                session,
                external_payment_id=data.get("external_payment_id") or "",
            )
        elif status == PaymentCheckoutSession.Status.FAILED:
            session = fail_checkout_session(
                session,
                reason=data.get("failure_reason") or data.get("reason") or "",
            )
        else:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Unsupported checkout status.",
                    "errors": {"status": "Send status=PROCESSING, PAID, or FAILED."},
                },
                status=400,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment checkout status updated successfully.",
                "item": serialize_checkout_session(session),
                "result": serialize_checkout_session(session),
            },
            status=200,
        )

    except PaymentCheckoutDetailAPIError as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=404)
    except ValidationError as exc:
        return Response({"ok": False, "success": False, "message": "Payment checkout status validation failed.", "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages}}, status=400)


payment_checkout_status.required_company_permissions = [
    "company.payments.checkout.status",
    "company.payments.checkout.update",
]
