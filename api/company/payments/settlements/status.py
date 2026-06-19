# ============================================================
# 📂 api/company/payments/settlements/status.py
# 🧠 PrimeyAcc | Company Payment Settlement Status API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.payments.settlements.list import (
    PaymentSettlementListAPIError,
    get_settlement_batch_or_raise,
)
from api.permissions import HasAnyCompanyPermission
from payments.models import PaymentSettlementBatch
from payments.services import (
    cancel_settlement_batch,
    finalize_settlement_batch,
    serialize_settlement_batch,
)


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentSettlementListAPIError("Current company context was not resolved.")
    return company


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payment_settlement_status(request: Request, batch_id: int) -> Response:
    try:
        company = _get_request_company(request)
        batch = get_settlement_batch_or_raise(company, batch_id)
        data = request.data or {}
        status = str(data.get("status") or "").strip().upper()

        if status in {"POSTED", "FINALIZE", "FINALIZED"}:
            batch = finalize_settlement_batch(batch)
        elif status in {"CANCELLED", "CANCELED", "CANCEL"}:
            batch = cancel_settlement_batch(batch, reason=data.get("reason") or "")
        else:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Unsupported settlement status.",
                    "errors": {"status": "Send status=POSTED or CANCELLED."},
                },
                status=400,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment settlement status updated successfully.",
                "item": serialize_settlement_batch(batch, include_items=True),
                "result": serialize_settlement_batch(batch, include_items=True),
            },
            status=200,
        )

    except PaymentSettlementListAPIError as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=404)
    except ValidationError as exc:
        return Response({"ok": False, "success": False, "message": "Payment settlement status validation failed.", "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages}}, status=400)


payment_settlement_status.required_company_permissions = [
    "company.payments.settlements.status",
    "company.payments.settlements.update",
]
