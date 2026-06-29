# ============================================================
# 📂 api/company/treasury/customer_payments/cancel.py
# 🧠 Mhamcloud | Company Treasury Customer Payment Cancel API V1.1
# ------------------------------------------------------------
# ✅ Cancel customer payment for current company only
# ✅ Cancels linked treasury transaction and reverses balance through services.py
# ✅ Creates accounting reversal entry when payment is accounting-posted
# ✅ Reverses linked SalesInvoice allocation if present
# ✅ Returns enhanced accounting/treasury/invoice snapshot through list serializer
# ✅ Returns company payload and safe allowed actions for frontend
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - الإلغاء يتم من services.py حتى يتم عكس أثر الخزينة بأمان
# - إذا كانت الدفعة مرحلة محاسبيًا يتم عكس القيد من طبقة الخدمات
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
def customer_payment_cancel(request: Request, payment_id: int) -> Response:
    """
    POST /api/company/treasury/customer-payments/<payment_id>/cancel/
    """
    try:
        company = _get_request_company(request)
        payment = get_customer_payment_or_raise(company, payment_id)

        payload = request.data or {}
        reason = str(
            payload.get("reason")
            or payload.get("cancellation_reason")
            or ""
        ).strip()

        payment = cancel_customer_payment(
            company=company,
            payment=payment,
            user=request.user,
            reason=reason,
        )

        payment = get_customer_payment_or_raise(company, payment.id)

        return _success_response(
            company=company,
            payment=payment,
            message="Customer payment cancelled successfully.",
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