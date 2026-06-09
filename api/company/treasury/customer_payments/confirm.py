# ============================================================
# 📂 api/company/treasury/customer_payments/confirm.py
# 🧠 PrimeyAcc | Company Treasury Customer Payment Confirm API V1.1
# ------------------------------------------------------------
# ✅ Confirm customer payment for current company only
# ✅ Creates/posts INFLOW treasury transaction through services.py
# ✅ Posts automatic accounting entry through treasury/services.py
# ✅ Updates linked SalesInvoice allocation if present
# ✅ Returns enhanced accounting/treasury/invoice snapshot through list serializer
# ✅ Returns company payload and safe allowed actions for frontend
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - التأكيد يتم من services.py حتى يتم تحديث الخزينة بأمان
# - القيد المحاسبي التلقائي يتم من طبقة الخدمات وليس من الواجهة
# - تفاصيل القيد المحاسبي وحركة الخزينة والفاتورة تعرض عبر serializer موحد من list.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.models import PaymentStatus
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


def _company_payload(company) -> dict[str, Any]:
    return {
        "id": company.id,
        "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
    }


def _allowed_actions_payload(payment) -> dict[str, bool]:
    is_draft = payment.status == PaymentStatus.DRAFT
    is_confirmed = payment.status == PaymentStatus.CONFIRMED
    is_cancelled = payment.status == PaymentStatus.CANCELLED

    return {
        "can_view": True,
        "can_update": is_draft,
        "can_confirm": is_draft,
        "can_cancel": not is_cancelled,
        "can_direct_edit": is_draft,
        "requires_reversal_for_cancel": bool(
            payment.is_accounting_posted
            or payment.accounting_entry_id
        ),
        "is_draft": is_draft,
        "is_confirmed": is_confirmed,
        "is_cancelled": is_cancelled,
    }


def _success_response(
    *,
    company,
    payment,
    message: str,
) -> Response:
    serialized = serialize_customer_payment(payment)

    return Response(
        {
            "ok": True,
            "success": True,
            "message": message,
            "company": _company_payload(company),
            "allowed_actions": _allowed_actions_payload(payment),
            "item": serialized,
            "result": serialized,
        },
        status=200,
    )


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

        payment = get_customer_payment_or_raise(company, payment.id)

        return _success_response(
            company=company,
            payment=payment,
            message="Customer payment confirmed successfully.",
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