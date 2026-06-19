# ============================================================
# 📂 api/company/payments/checkout/detail.py
# 🧠 PrimeyAcc | Company Payment Checkout Detail API V1.0
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from payments.models import PaymentCheckoutSession
from payments.services import serialize_checkout_session


class PaymentCheckoutDetailAPIError(Exception):
    pass


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentCheckoutDetailAPIError("Current company context was not resolved.")
    return company


def get_checkout_session_or_raise(company, session_id: int) -> PaymentCheckoutSession:
    session = PaymentCheckoutSession.objects.select_related(
        "gateway",
        "payment_method",
        "terminal",
    ).filter(company=company, id=session_id).first()
    if not session:
        raise PaymentCheckoutDetailAPIError("Payment checkout session was not found.")
    return session


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payment_checkout_detail(request: Request, session_id: int) -> Response:
    try:
        company = _get_request_company(request)
        session = get_checkout_session_or_raise(company, session_id)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment checkout session loaded successfully.",
                "item": serialize_checkout_session(session),
                "result": serialize_checkout_session(session),
            },
            status=200,
        )

    except PaymentCheckoutDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404,
        )


payment_checkout_detail.required_company_permissions = [
    "company.payments.checkout.view",
]
