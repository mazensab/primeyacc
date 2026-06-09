# ============================================================
# 📂 api/company/treasury/transactions/detail.py
# 🧠 PrimeyAcc | Company Treasury Transaction Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve treasury transaction for current company only
# ✅ Update draft treasury transaction for current company only
# ✅ Return enhanced accounting/source snapshot through list serializer
# ✅ Return safe allowed actions for frontend
# ✅ Tenant isolation through request.company
# ✅ Posted/cancelled transactions are protected from direct edits
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا نسمح بتعديل حركة مرحلة أو ملغاة مباشرة
# - الترحيل والإلغاء لهم endpoints مستقلة
# - تفاصيل القيد المحاسبي والمصدر تعرض عبر serializer موحد من list.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.treasury.transactions.list import serialize_treasury_transaction
from api.permissions import HasAnyCompanyPermission
from treasury.models import TreasuryTransaction
from treasury.services import (
    get_treasury_account_or_raise,
    get_treasury_transaction_or_raise,
)


class TreasuryTransactionDetailAPIError(Exception):
    """
    Small API-level error for treasury transaction detail endpoint.
    """


def _get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise TreasuryTransactionDetailAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    return _clean_text(value).upper()


def _to_int(value: Any) -> int | None:
    if value in [None, ""]:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


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


def _response_payload(
    *,
    company,
    treasury_transaction: TreasuryTransaction,
    message: str,
    status_code: int = 200,
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
        status=status_code,
    )


def _update_draft_transaction_from_request(
    *,
    request: Request,
    company,
    treasury_transaction: TreasuryTransaction,
) -> TreasuryTransaction:
    """
    Update draft transaction only.

    Balance effect is intentionally not changed here because draft has no effect.
    Posted/cancelled transactions must use dedicated workflows.
    """
    if treasury_transaction.status != TreasuryTransaction.TransactionStatus.DRAFT:
        raise ValidationError(
            {"status": "Only draft treasury transactions can be updated directly."}
        )

    data = request.data or {}

    if "account_id" in data or "account" in data:
        account_id = _to_int(data.get("account_id") or data.get("account"))
        if account_id is None:
            raise ValidationError({"account_id": "Invalid treasury account."})
        treasury_transaction.account = get_treasury_account_or_raise(company, account_id)

    if "counterparty_account_id" in data or "counterparty_account" in data:
        counterparty_account_id = _to_int(
            data.get("counterparty_account_id") or data.get("counterparty_account")
        )
        treasury_transaction.counterparty_account = (
            get_treasury_account_or_raise(company, counterparty_account_id)
            if counterparty_account_id is not None
            else None
        )

    if "transaction_number" in data:
        treasury_transaction.transaction_number = _clean_upper(data.get("transaction_number"))

    if "transaction_type" in data or "type" in data:
        treasury_transaction.transaction_type = (
            data.get("transaction_type")
            or data.get("type")
            or treasury_transaction.transaction_type
        )

    if "source_type" in data:
        treasury_transaction.source_type = data.get("source_type") or treasury_transaction.source_type

    if "source_app" in data:
        treasury_transaction.source_app = _clean_text(data.get("source_app"))

    if "source_model" in data:
        treasury_transaction.source_model = _clean_text(data.get("source_model"))

    if "source_object_id" in data:
        treasury_transaction.source_object_id = _to_int(data.get("source_object_id"))

    if "amount" in data:
        treasury_transaction.amount = data.get("amount")

    if "currency" in data:
        treasury_transaction.currency = _clean_upper(data.get("currency") or "SAR")

    if "transaction_date" in data:
        transaction_date = parse_date(str(data.get("transaction_date") or ""))
        if transaction_date is None:
            raise ValidationError({"transaction_date": "Invalid transaction date."})
        treasury_transaction.transaction_date = transaction_date

    if "reference" in data:
        treasury_transaction.reference = _clean_text(data.get("reference"))

    if "description" in data:
        treasury_transaction.description = _clean_text(data.get("description"))

    if "notes" in data:
        treasury_transaction.notes = _clean_text(data.get("notes"))

    treasury_transaction.updated_by = (
        request.user if getattr(request.user, "is_authenticated", False) else None
    )
    treasury_transaction.full_clean()
    treasury_transaction.save()

    return get_treasury_transaction_or_raise(company, treasury_transaction.id)


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def treasury_transaction_detail(
    request: Request,
    transaction_id: int,
) -> Response:
    """
    GET /api/company/treasury/transactions/<transaction_id>/
    PATCH /api/company/treasury/transactions/<transaction_id>/
    PUT /api/company/treasury/transactions/<transaction_id>/
    """
    try:
        company = _get_request_company(request)
        treasury_transaction = get_treasury_transaction_or_raise(
            company,
            transaction_id,
        )

        if request.method == "GET":
            return _response_payload(
                company=company,
                treasury_transaction=treasury_transaction,
                message="Treasury transaction loaded successfully.",
            )

        treasury_transaction = _update_draft_transaction_from_request(
            request=request,
            company=company,
            treasury_transaction=treasury_transaction,
        )

        return _response_payload(
            company=company,
            treasury_transaction=treasury_transaction,
            message="Treasury transaction updated successfully.",
        )

    except TreasuryTransactionDetailAPIError as exc:
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
                "message": "Treasury transaction validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )


treasury_transaction_detail.required_company_permissions = [
    "company.treasury.transactions.view",
    "company.treasury.transactions.update",
]