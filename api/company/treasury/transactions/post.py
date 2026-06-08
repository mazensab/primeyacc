# ============================================================
# 📂 api/company/treasury/transactions/post.py
# 🧠 PrimeyAcc | Company Treasury Transaction Post API V1.0
# ------------------------------------------------------------
# ✅ Post treasury transaction for current company only
# ✅ Updates treasury account balance safely through services.py
# ✅ Prevents duplicate posting
# ✅ Prevents posting cancelled transactions
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
    get_treasury_transaction_or_raise,
    post_treasury_transaction,
)


class TreasuryTransactionPostAPIError(Exception):
    """
    Small API-level error for treasury transaction post endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise TreasuryTransactionPostAPIError("Current company context was not resolved.")

    return company


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def treasury_transaction_post(
    request: Request,
    transaction_id: int,
) -> Response:
    """
    POST /api/company/treasury/transactions/<transaction_id>/post/
    """
    try:
        company = _get_request_company(request)
        treasury_transaction = get_treasury_transaction_or_raise(
            company,
            transaction_id,
        )

        treasury_transaction = post_treasury_transaction(
            company=company,
            treasury_transaction=treasury_transaction,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Treasury transaction posted successfully.",
                "item": serialize_treasury_transaction(treasury_transaction),
                "result": serialize_treasury_transaction(treasury_transaction),
            },
            status=200,
        )

    except TreasuryTransactionPostAPIError as exc:
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
                "message": "Treasury transaction posting failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )


treasury_transaction_post.required_company_permissions = [
    "company.treasury.transactions.post",
]