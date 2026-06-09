# ============================================================
# 📂 api/company/treasury/customer_payments/cancel.py
# 🧠 PrimeyAcc | Company Treasury Customer Payment Cancel API V1.0
# ------------------------------------------------------------
# ✅ Cancel customer payment for current company only
# ✅ Cancels linked treasury transaction and reverses balance through services.py
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - الإلغاء يتم من services.py حتى يتم عكس أثر الخزينة بأمان
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.services import (
    cancel_customer_payment,
    get_customer_payment_or_raise,
)

from .list import serialize_customer_payment


class CustomerPaymentCancelAPIError(Exception):
    """
    Small API-level error for customer payment cancel endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise CustomerPaymentCancelAPIError("Current company context was not resolved.")

    return company


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def customer_payment_cancel(request: Request, payment_id: int) -> Response:
    """
    POST /api/company/treasury/customer-payments/<payment_id>/cancel/
    """
    try:
        company = _get_request_company(request)
        payment = get_customer_payment_or_raise(company, payment_id)

        payload = request.data or {}
        reason = payload.get("reason") or payload.get("cancellation_reason") or ""

        payment = cancel_customer_payment(
            company=company,
            payment=payment,
            user=request.user,
            reason=reason,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Customer payment cancelled successfully.",
                "item": serialize_customer_payment(payment),
            },
            status=200,
        )

    except CustomerPaymentCancelAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Customer payment could not be cancelled.",
                "errors": getattr(exc, "message_dict", None) or {"detail": str(exc)},
            },
            status=400,
        )


customer_payment_cancel.required_company_permissions = [
    "company.treasury.customer_payments.cancel",
]