# ============================================================
# 📂 api/company/treasury/transactions/cancel.py
# 🧠 PrimeyAcc | Company Treasury Transaction Cancel API V1.1
# ------------------------------------------------------------
# ✅ Cancel treasury transaction for current company only
# ✅ Reverses balance effect for posted transactions safely through services.py
# ✅ Prevents unsafe direct cancellation if treasury transaction is accounting-posted
# ✅ Returns enhanced transaction serializer with accounting/source snapshot
# ✅ Returns company payload and safe allowed actions for frontend
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إلغاء حركة الخزينة يتم من treasury/services.py فقط
# - الرصيد لا يتغير من الـ API مباشرة
# - الحركات المرحلة محاسبيًا لا تُلغى مباشرة من هذا endpoint
# - دفعات العملاء/الموردين لها مسار إلغاء خاص يعكس القيد المحاسبي ثم يلغي حركة الخزينة
# - تفاصيل القيد المحاسبي والمصدر تعرض عبر serializer موحد من list.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.treasury.transactions.list import serialize_treasury_transaction
from api.permissions import HasAnyCompanyPermission
from treasury.models import TreasuryTransaction
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


def _company_payload(company) -> dict[str, Any]:
    return {
        "id": company.id,
        "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
    }


def _allowed_actions_payload(
    treasury_transaction: TreasuryTransaction,
) -> dict[str, bool]:
    is_draft = treasury_transaction.status == TreasuryTransaction.TransactionStatus.DRAFT
    is_posted = treasury_transaction.status == TreasuryTransaction.TransactionStatus.POSTED
    is_cancelled = treasury_transaction.status == TreasuryTransaction.TransactionStatus.CANCELLED

    return {
        "can_view": True,
        "can_update": is_draft,
        "can_post": is_draft,
        "can_cancel": not is_cancelled,
        "can_direct_edit": is_draft,
        "requires_reversal_for_cancel": bool(
            treasury_transaction.is_accounting_posted
            or treasury_transaction.accounting_entry_id
        ),
        "is_draft": is_draft,
        "is_posted": is_posted,
        "is_cancelled": is_cancelled,
    }


def _success_response(
    *,
    company,
    treasury_transaction: TreasuryTransaction,
    message: str,
) -> Response:
    serialized = serialize_treasury_transaction(treasury_transaction)

    return Response(
        {
            "ok": True,
            "success": True,
            "message": message,
            "company": _company_payload(company),
            "allowed_actions": _allowed_actions_payload(treasury_transaction),
            "item": serialized,
            "result": serialized,
        },
        status=200,
    )


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

        treasury_transaction = get_treasury_transaction_or_raise(
            company,
            treasury_transaction.id,
        )

        return _success_response(
            company=company,
            treasury_transaction=treasury_transaction,
            message="Treasury transaction cancelled successfully.",
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