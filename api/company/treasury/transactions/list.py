# ============================================================
# 📂 api/company/treasury/transactions/list.py
# 🧠 PrimeyAcc | Company Treasury Transactions List/Create API V1.0
# ------------------------------------------------------------
# ✅ List treasury transactions for current company only
# ✅ Create draft/posted treasury transactions for current company only
# ✅ Tenant isolation through request.company
# ✅ Account and counterparty account must belong to current company
# ✅ Search, type, status, source, account and date filters
# ✅ Safe pagination and ordering
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي حساب خزينة يجب أن يكون داخل نفس شركة العضوية الحالية
# - الرصيد لا يتغير عند إنشاء Draft
# - الرصيد يتغير فقط عند POSTED عبر treasury/services.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import IntegrityError
from django.db.models import Q
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.models import TreasuryAccount, TreasuryTransaction
from treasury.services import (
    create_treasury_transaction,
    get_treasury_account_or_raise,
    get_treasury_transactions_queryset,
)


class TreasuryTransactionListAPIError(Exception):
    """
    Small API-level error for treasury transaction list/create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise TreasuryTransactionListAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    return _clean_text(value).upper()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _to_int(value: Any) -> int | None:
    if value in [None, ""]:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def serialize_treasury_transaction(
    treasury_transaction: TreasuryTransaction,
) -> dict[str, Any]:
    """
    Serialize treasury transaction for frontend responses.
    """
    account = treasury_transaction.account
    counterparty_account = treasury_transaction.counterparty_account

    return {
        "id": treasury_transaction.id,
        "company_id": treasury_transaction.company_id,
        "transaction_number": treasury_transaction.transaction_number,
        "transaction_type": treasury_transaction.transaction_type,
        "transaction_type_display": treasury_transaction.get_transaction_type_display(),
        "status": treasury_transaction.status,
        "status_display": treasury_transaction.get_status_display(),
        "source_type": treasury_transaction.source_type,
        "source_type_display": treasury_transaction.get_source_type_display(),
        "account": (
            {
                "id": account.id,
                "name": account.name,
                "code": account.code,
                "account_type": account.account_type,
                "currency": account.currency,
            }
            if account
            else None
        ),
        "counterparty_account": (
            {
                "id": counterparty_account.id,
                "name": counterparty_account.name,
                "code": counterparty_account.code,
                "account_type": counterparty_account.account_type,
                "currency": counterparty_account.currency,
            }
            if counterparty_account
            else None
        ),
        "amount": str(treasury_transaction.amount),
        "currency": treasury_transaction.currency,
        "transaction_date": (
            treasury_transaction.transaction_date.isoformat()
            if treasury_transaction.transaction_date
            else None
        ),
        "reference": treasury_transaction.reference,
        "description": treasury_transaction.description,
        "notes": treasury_transaction.notes,
        "source_app": treasury_transaction.source_app,
        "source_model": treasury_transaction.source_model,
        "source_object_id": treasury_transaction.source_object_id,
        "balance_before": (
            str(treasury_transaction.balance_before)
            if treasury_transaction.balance_before is not None
            else None
        ),
        "balance_after": (
            str(treasury_transaction.balance_after)
            if treasury_transaction.balance_after is not None
            else None
        ),
        "accounting_entry_id": treasury_transaction.accounting_entry_id,
        "is_accounting_posted": treasury_transaction.is_accounting_posted,
        "accounting_posted_at": (
            treasury_transaction.accounting_posted_at.isoformat()
            if treasury_transaction.accounting_posted_at
            else None
        ),
        "posted_at": (
            treasury_transaction.posted_at.isoformat()
            if treasury_transaction.posted_at
            else None
        ),
        "posted_by": (
            {
                "id": treasury_transaction.posted_by_id,
                "username": treasury_transaction.posted_by.username,
                "email": treasury_transaction.posted_by.email,
            }
            if treasury_transaction.posted_by_id and treasury_transaction.posted_by
            else None
        ),
        "cancelled_at": (
            treasury_transaction.cancelled_at.isoformat()
            if treasury_transaction.cancelled_at
            else None
        ),
        "cancelled_by": (
            {
                "id": treasury_transaction.cancelled_by_id,
                "username": treasury_transaction.cancelled_by.username,
                "email": treasury_transaction.cancelled_by.email,
            }
            if treasury_transaction.cancelled_by_id and treasury_transaction.cancelled_by
            else None
        ),
        "cancellation_reason": treasury_transaction.cancellation_reason,
        "created_by": (
            {
                "id": treasury_transaction.created_by_id,
                "username": treasury_transaction.created_by.username,
                "email": treasury_transaction.created_by.email,
            }
            if treasury_transaction.created_by_id and treasury_transaction.created_by
            else None
        ),
        "updated_by": (
            {
                "id": treasury_transaction.updated_by_id,
                "username": treasury_transaction.updated_by.username,
                "email": treasury_transaction.updated_by.email,
            }
            if treasury_transaction.updated_by_id and treasury_transaction.updated_by
            else None
        ),
        "created_at": (
            treasury_transaction.created_at.isoformat()
            if treasury_transaction.created_at
            else None
        ),
        "updated_at": (
            treasury_transaction.updated_at.isoformat()
            if treasury_transaction.updated_at
            else None
        ),
    }


def serialize_treasury_transaction_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "transaction_types": [
            {"value": value, "label": label}
            for value, label in TreasuryTransaction.TransactionType.choices
        ],
        "statuses": [
            {"value": value, "label": label}
            for value, label in TreasuryTransaction.TransactionStatus.choices
        ],
        "source_types": [
            {"value": value, "label": label}
            for value, label in TreasuryTransaction.SourceType.choices
        ],
        "ordering": [
            {"value": "-transaction_date", "label": "Newest transaction date"},
            {"value": "transaction_date", "label": "Oldest transaction date"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "-amount", "label": "Amount high to low"},
            {"value": "amount", "label": "Amount low to high"},
            {"value": "transaction_number", "label": "Number A-Z"},
            {"value": "-transaction_number", "label": "Number Z-A"},
        ],
    }


def _apply_transaction_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to treasury transactions queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    transaction_type = _clean_upper(
        request.query_params.get("transaction_type")
        or request.query_params.get("type")
        or ""
    )
    status = _clean_upper(request.query_params.get("status") or "")
    source_type = _clean_upper(request.query_params.get("source_type") or "")
    account_id = _to_int(request.query_params.get("account_id"))
    counterparty_account_id = _to_int(
        request.query_params.get("counterparty_account_id")
    )
    date_from = parse_date(_clean_text(request.query_params.get("date_from") or ""))
    date_to = parse_date(_clean_text(request.query_params.get("date_to") or ""))
    is_accounting_posted = _clean_text(
        request.query_params.get("is_accounting_posted") or ""
    ).lower()

    if search:
        queryset = queryset.filter(
            Q(transaction_number__icontains=search)
            | Q(reference__icontains=search)
            | Q(description__icontains=search)
            | Q(notes__icontains=search)
            | Q(account__name__icontains=search)
            | Q(account__code__icontains=search)
            | Q(counterparty_account__name__icontains=search)
            | Q(counterparty_account__code__icontains=search)
            | Q(source_app__icontains=search)
            | Q(source_model__icontains=search)
        )

    if transaction_type:
        queryset = queryset.filter(transaction_type=transaction_type)

    if status:
        queryset = queryset.filter(status=status)

    if source_type:
        queryset = queryset.filter(source_type=source_type)

    if account_id is not None:
        queryset = queryset.filter(account_id=account_id)

    if counterparty_account_id is not None:
        queryset = queryset.filter(counterparty_account_id=counterparty_account_id)

    if date_from:
        queryset = queryset.filter(transaction_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(transaction_date__lte=date_to)

    if is_accounting_posted in {"1", "true", "yes", "y", "on"}:
        queryset = queryset.filter(is_accounting_posted=True)

    if is_accounting_posted in {"0", "false", "no", "n", "off"}:
        queryset = queryset.filter(is_accounting_posted=False)

    return queryset


def _apply_transaction_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "transaction_date": "transaction_date",
        "-transaction_date": "-transaction_date",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "amount": "amount",
        "-amount": "-amount",
        "transaction_number": "transaction_number",
        "-transaction_number": "-transaction_number",
        "status": "status",
        "-status": "-status",
        "transaction_type": "transaction_type",
        "-transaction_type": "-transaction_type",
    }

    selected_ordering = allowed_ordering.get(ordering, "-transaction_date")

    return queryset.order_by(selected_ordering, "-id")


def _build_transaction_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered transaction queryset.
    """
    inflow_total = sum(
        (
            item.amount
            for item in queryset.filter(
                status=TreasuryTransaction.TransactionStatus.POSTED,
                transaction_type=TreasuryTransaction.TransactionType.INFLOW,
            )
        ),
        start=0,
    )
    outflow_total = sum(
        (
            item.amount
            for item in queryset.filter(
                status=TreasuryTransaction.TransactionStatus.POSTED,
                transaction_type=TreasuryTransaction.TransactionType.OUTFLOW,
            )
        ),
        start=0,
    )

    return {
        "total_transactions": queryset.count(),
        "draft_transactions": queryset.filter(
            status=TreasuryTransaction.TransactionStatus.DRAFT
        ).count(),
        "posted_transactions": queryset.filter(
            status=TreasuryTransaction.TransactionStatus.POSTED
        ).count(),
        "cancelled_transactions": queryset.filter(
            status=TreasuryTransaction.TransactionStatus.CANCELLED
        ).count(),
        "inflow_transactions": queryset.filter(
            transaction_type=TreasuryTransaction.TransactionType.INFLOW
        ).count(),
        "outflow_transactions": queryset.filter(
            transaction_type=TreasuryTransaction.TransactionType.OUTFLOW
        ).count(),
        "transfer_transactions": queryset.filter(
            transaction_type=TreasuryTransaction.TransactionType.TRANSFER
        ).count(),
        "adjustment_transactions": queryset.filter(
            transaction_type=TreasuryTransaction.TransactionType.ADJUSTMENT
        ).count(),
        "posted_inflow_total": str(inflow_total),
        "posted_outflow_total": str(outflow_total),
    }


def _create_transaction_from_request(request: Request, company):
    """
    Create treasury transaction from request payload using treasury service layer.
    """
    data = request.data or {}

    account_id = _to_int(data.get("account_id") or data.get("account"))
    if account_id is None:
        raise ValidationError({"account_id": "Treasury account is required."})

    account = get_treasury_account_or_raise(company, account_id)

    counterparty_account = None
    counterparty_account_id = _to_int(
        data.get("counterparty_account_id") or data.get("counterparty_account")
    )
    if counterparty_account_id is not None:
        counterparty_account = get_treasury_account_or_raise(
            company,
            counterparty_account_id,
        )

    transaction_date = None
    if data.get("transaction_date"):
        transaction_date = parse_date(str(data.get("transaction_date")))
        if transaction_date is None:
            raise ValidationError({"transaction_date": "Invalid transaction date."})

    return create_treasury_transaction(
        company=company,
        account=account,
        counterparty_account=counterparty_account,
        user=request.user,
        transaction_type=(
            data.get("transaction_type")
            or data.get("type")
            or TreasuryTransaction.TransactionType.INFLOW
        ),
        amount=data.get("amount"),
        transaction_date=transaction_date,
        source_type=data.get("source_type") or TreasuryTransaction.SourceType.MANUAL,
        source_app=data.get("source_app") or "",
        source_model=data.get("source_model") or "",
        source_object_id=_to_int(data.get("source_object_id")),
        reference=data.get("reference") or "",
        description=data.get("description") or "",
        notes=data.get("notes") or "",
        currency=data.get("currency") or account.currency,
        transaction_number=data.get("transaction_number") or "",
        status=data.get("status") or TreasuryTransaction.TransactionStatus.DRAFT,
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def treasury_transactions_list(request: Request) -> Response:
    """
    GET /api/company/treasury/transactions/
    POST /api/company/treasury/transactions/
    """
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            treasury_transaction = _create_transaction_from_request(request, company)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Treasury transaction created successfully.",
                    "company": {
                        "id": company.id,
                        "name": getattr(company, "display_name", None)
                        or getattr(company, "name", ""),
                    },
                    "item": serialize_treasury_transaction(treasury_transaction),
                    "result": serialize_treasury_transaction(treasury_transaction),
                },
                status=201,
            )

        page = _clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = _clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get("per_page"),
            default=25,
            maximum=100,
        )
        ordering = _clean_text(
            request.query_params.get("ordering")
            or request.query_params.get("order_by")
            or "-transaction_date"
        )

        queryset = get_treasury_transactions_queryset(company)

        queryset = _apply_transaction_filters(queryset, request)
        queryset = _apply_transaction_ordering(queryset, ordering)

        summary = _build_transaction_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        transactions = [
            serialize_treasury_transaction(item)
            for item in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Treasury transactions loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "transaction_type": request.query_params.get("transaction_type")
                    or request.query_params.get("type")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "source_type": request.query_params.get("source_type") or "",
                    "account_id": request.query_params.get("account_id") or "",
                    "counterparty_account_id": request.query_params.get(
                        "counterparty_account_id"
                    )
                    or "",
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "is_accounting_posted": request.query_params.get(
                        "is_accounting_posted"
                    )
                    or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": transactions,
                "results": transactions,
                "choices": serialize_treasury_transaction_choices(),
            },
            status=200,
        )

    except TreasuryTransactionListAPIError as exc:
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

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Treasury transaction already exists.",
                "errors": {
                    "detail": (
                        "Treasury transaction number or source reference already exists "
                        "for this company."
                    ),
                },
            },
            status=400,
        )


treasury_transactions_list.required_company_permissions = [
    "company.treasury.transactions.view",
    "company.treasury.transactions.create",
]