# ============================================================
# 📂 api/company/treasury/customer_payments/confirm.py
# 🧠 PrimeyAcc | Company Treasury Customer Payment Confirm API V1.0
# ------------------------------------------------------------
# ✅ Confirm customer payment for current company only
# ✅ Creates/posts INFLOW treasury transaction through services.py
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - التأكيد يتم من services.py حتى يتم تحديث الخزينة بأمان
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.services import (
    confirm_customer_payment,
    get_customer_payment_or_raise,
)

from .list import serialize_customer_payment


class CustomerPaymentConfirmAPIError(Exception):
    """
    Small API-level error for customer payment confirm endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise CustomerPaymentConfirmAPIError("Current company context was not resolved.")

    return company


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def customer_payment_confirm(request: Request, payment_id: int) -> Response:
    """
    POST /api/company/treasury/customer-payments/<payment_id>/confirm/
    """
    try:
        company = _get_request_company(request)
        payment = get_customer_payment_or_raise(company, payment_id)

        payment = confirm_customer_payment(
            company=company,
            payment=payment,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Customer payment confirmed successfully.",
                "item": serialize_customer_payment(payment),
            },
            status=200,
        )

    except CustomerPaymentConfirmAPIError as exc:
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
                "message": "Customer payment could not be confirmed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": str(exc)},
            },
            status=400,
        )


customer_payment_confirm.required_company_permissions = [
    "company.treasury.customer_payments.confirm",
]