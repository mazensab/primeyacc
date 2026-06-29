# ============================================================
# 📂 api/company/payments/settlements/detail.py
# 🧠 Mhamcloud | Company Payment Settlement Detail API V1.0
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.settlements.list import (
    PaymentSettlementListAPIError,
    get_settlement_batch_or_raise,
)
from api.permissions import HasAnyCompanyPermission
from payments.services import serialize_settlement_batch


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentSettlementListAPIError("Current company context was not resolved.")
    return company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payment_settlement_detail(request: Request, batch_id: int) -> Response:
    try:
        company = _get_request_company(request)
        batch = get_settlement_batch_or_raise(company, batch_id)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment settlement batch loaded successfully.",
                "item": serialize_settlement_batch(batch, include_items=True),
                "result": serialize_settlement_batch(batch, include_items=True),
            },
            status=200,
        )

    except PaymentSettlementListAPIError as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=404)


payment_settlement_detail.required_company_permissions = [
    "company.payments.settlements.view",
]
