# ============================================================
# 📂 api/company/treasury/customer_payments/detail.py
# 🧠 Mhamcloud | Company Treasury Customer Payment Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve one customer payment for current company only
# ✅ Update draft customer payment only
# ✅ Return enhanced accounting/treasury/invoice snapshot through list serializer
# ✅ Return company payload and safe allowed actions for frontend
# ✅ Tenant isolation through request.company
# ✅ Uses treasury/services.py payment layer
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم تعديل دفعة مؤكدة أو ملغاة مباشرة
# - التأكيد والإلغاء لهم endpoints مستقلة
# - sales_invoice_id إن وجد يجب أن يكون داخل نفس الشركة فقط
# - تفاصيل القيد المحاسبي وحركة الخزينة والفاتورة تعرض عبر serializer موحد من list.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.models import PaymentMethod, PaymentStatus
from treasury.services import (
    get_customer_payment_or_raise,
    get_sales_invoice_or_raise,
    get_treasury_account_or_raise,
    update_customer_payment,
)

from .list import serialize_customer_payment


class CustomerPaymentDetailAPIError(Exception):
    """
    Small API-level error for customer payment detail endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise CustomerPaymentDetailAPIError("Current company context was not resolved.")

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


def _choices_payload() -> dict[str, Any]:
    return {
        "payment_methods": [
            {"value": value, "label": label}
            for value, label in PaymentMethod.choices
        ],
        "statuses": [
            {"value": value, "label": label}
            for value, label in PaymentStatus.choices
        ],
    }


def _response_payload(
    *,
    company,
    payment,
    message: str,
    status_code: int = 200,
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
            "choices": _choices_payload(),
        },
        status=status_code,
    )


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def customer_payment_detail(request: Request, payment_id: int) -> Response:
    """
    GET /api/company/treasury/customer-payments/<payment_id>/
    PATCH /api/company/treasury/customer-payments/<payment_id>/
    PUT /api/company/treasury/customer-payments/<payment_id>/
    """
    try:
        company = _get_request_company(request)
        payment = get_customer_payment_or_raise(company, payment_id)

        if request.method == "GET":
            return _response_payload(
                company=company,
                payment=payment,
                message="Customer payment loaded successfully.",
            )

        payload = request.data or {}

        treasury_account = None
        treasury_account_id = payload.get("treasury_account_id") or payload.get("account_id")
        if treasury_account_id not in (None, ""):
            treasury_account = get_treasury_account_or_raise(company, int(treasury_account_id))

        sales_invoice = None
        sales_invoice_key_exists = "sales_invoice_id" in payload or "invoice_id" in payload

        if sales_invoice_key_exists:
            sales_invoice_id = payload.get("sales_invoice_id") or payload.get("invoice_id")
            if sales_invoice_id not in (None, ""):
                sales_invoice = get_sales_invoice_or_raise(company, int(sales_invoice_id))

        payment_date = None
        if payload.get("payment_date"):
            payment_date = parse_date(str(payload.get("payment_date")))
            if not payment_date:
                raise CustomerPaymentDetailAPIError("payment_date is invalid.")

        payment = update_customer_payment(
            company=company,
            payment=payment,
            user=request.user,
            treasury_account=treasury_account,
            amount=payload.get("amount") if "amount" in payload else None,
            payment_method=payload.get("payment_method") if "payment_method" in payload else None,
            payment_date=payment_date,
            customer_id=payload.get("customer_id") if "customer_id" in payload else None,
            customer_name=payload.get("customer_name") if "customer_name" in payload else None,
            customer_phone=payload.get("customer_phone") if "customer_phone" in payload else None,
            sales_invoice=sales_invoice if sales_invoice_key_exists else None,
            currency=payload.get("currency") if "currency" in payload else None,
            reference=payload.get("reference") if "reference" in payload else None,
            description=payload.get("description") if "description" in payload else None,
            notes=payload.get("notes") if "notes" in payload else None,
        )

        payment = get_customer_payment_or_raise(company, payment.id)

        return _response_payload(
            company=company,
            payment=payment,
            message="Customer payment updated successfully.",
        )

    except CustomerPaymentDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except (ValidationError, ValueError) as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Customer payment request is invalid.",
                "errors": getattr(exc, "message_dict", None) or {"detail": str(exc)},
            },
            status=400,
        )


customer_payment_detail.required_company_permissions = [
    "company.treasury.customer_payments.view",
    "company.treasury.customer_payments.update",
]