# ============================================================
# 📂 api/company/treasury/transactions/cancel.py
# 🧠 PrimeyAcc | Company Treasury Transaction Cancel API V1.0
# ------------------------------------------------------------
# ✅ Cancel treasury transaction for current company only
# ✅ Reverses balance effect for posted transactions safely
# ✅ Prevents unsafe cancellation if accounting-posted
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.treasury.transactions.list import serialize_treasury_transaction
from api.permissions import HasAnyCompanyPermission
from treasury.services import (
    cancel_treasury_transaction,
    get_treasury_transaction_or_raise,
)


class TreasuryTransactionCancelAPIError(Exception):
    """
    Small API-level error for treasury transaction cancel endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise TreasuryTransactionCancelAPIError("Current company context was not resolved.")

    return company


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def treasury_transaction_cancel(
    request: Request,
    transaction_id: int,
) -> Response:
    """
    POST /api/company/treasury/transactions/<transaction_id>/cancel/
    """
    try:
        company = _get_request_company(request)
        treasury_transaction = get_treasury_transaction_or_raise(
            company,
            transaction_id,
        )

        reason = str(
            request.data.get("reason")
            or request.data.get("cancellation_reason")
            or ""
        ).strip()

        treasury_transaction = cancel_treasury_transaction(
            company=company,
            treasury_transaction=treasury_transaction,
            user=request.user,
            reason=reason,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Treasury transaction cancelled successfully.",
                "item": serialize_treasury_transaction(treasury_transaction),
                "result": serialize_treasury_transaction(treasury_transaction),
            },
            status=200,
        )

    except TreasuryTransactionCancelAPIError as exc:
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
                "message": "Treasury transaction cancellation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )


treasury_transaction_cancel.required_company_permissions = [
    "company.treasury.transactions.cancel",
]