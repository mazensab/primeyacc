# ============================================================
# 📂 api/company/treasury/supplier_payments/confirm.py
# 🧠 PrimeyAcc | Company Treasury Supplier Payment Confirm API V1.0
# ------------------------------------------------------------
# ✅ Confirm supplier payment for current company only
# ✅ Creates/posts OUTFLOW treasury transaction through services.py
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
    confirm_supplier_payment,
    get_supplier_payment_or_raise,
)

from .list import serialize_supplier_payment


class SupplierPaymentConfirmAPIError(Exception):
    """
    Small API-level error for supplier payment confirm endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise SupplierPaymentConfirmAPIError("Current company context was not resolved.")

    return company


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def supplier_payment_confirm(request: Request, payment_id: int) -> Response:
    """
    POST /api/company/treasury/supplier-payments/<payment_id>/confirm/
    """
    try:
        company = _get_request_company(request)
        payment = get_supplier_payment_or_raise(company, payment_id)

        payment = confirm_supplier_payment(
            company=company,
            payment=payment,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Supplier payment confirmed successfully.",
                "item": serialize_supplier_payment(payment),
            },
            status=200,
        )

    except SupplierPaymentConfirmAPIError as exc:
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
                "message": "Supplier payment could not be confirmed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": str(exc)},
            },
            status=400,
        )


supplier_payment_confirm.required_company_permissions = [
    "company.treasury.supplier_payments.confirm",
]