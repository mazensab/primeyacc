# ============================================================
# 📂 api/company/treasury/accounts/list.py
# 🧠 Mhamcloud | Company Treasury Accounts List/Create API V1.0
# ------------------------------------------------------------
# ✅ List treasury accounts for current company only
# ✅ Create treasury accounts for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, type, status, default and currency filters
# ✅ Safe pagination and ordering
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي حساب خزينة يجب أن يكون داخل نفس شركة العضوية الحالية
# - منطق الإنشاء والتحديث يبقى داخل treasury/services.py
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import IntegrityError
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from accounting.models import Account
from treasury.models import TreasuryAccount
from treasury.services import (
    create_treasury_account,
    get_treasury_accounts_queryset,
)


class TreasuryAccountListAPIError(Exception):
    """
    Small API-level error for treasury account list/create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise TreasuryAccountListAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize query/body text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like text.
    """
    return _clean_text(value).upper()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean query/body values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None



def _serialize_accounting_account(account: Account | None) -> dict[str, Any] | None:
    if not account:
        return None
    return {
        "id": account.id,
        "code": account.code,
        "name": account.name,
        "account_type": account.account_type,
        "nature": account.nature,
        "purpose": account.purpose,
        "is_group": account.is_group,
        "is_active": account.is_active,
        "allow_manual_posting": account.allow_manual_posting,
    }
def _serialize_opening_accounting_entry(entry) -> dict[str, Any] | None:
    if not entry:
        return None
    return {
        "id": entry.id,
        "entry_number": entry.entry_number,
        "status": entry.status,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
        "total_debit": str(entry.total_debit),
        "total_credit": str(entry.total_credit),
        "posted_at": entry.posted_at.isoformat() if entry.posted_at else None,
    }
def _resolve_accounting_account_from_request(
    data: dict[str, Any],
    company,
) -> Account | None:
    raw_account_id = data.get("accounting_account_id") or data.get("accounting_account")
    if raw_account_id in (None, ""):
        return None
    try:
        account_id = int(raw_account_id)
    except (TypeError, ValueError) as exc:
        raise TreasuryAccountListAPIError(
            "accounting_account_id must be a valid accounting account id."
        ) from exc
    account = Account.objects.filter(
        company=company,
        id=account_id,
    ).first()
    if not account:
        raise TreasuryAccountListAPIError(
            "Accounting account was not found for this company."
        )
    return account
def _resolve_auto_create_accounting_account(data: dict[str, Any]) -> bool:
    if "auto_create_accounting_account" not in data:
        return True
    return bool(_to_bool(data.get("auto_create_accounting_account")))

def serialize_treasury_account(account: TreasuryAccount) -> dict[str, Any]:
    """
    Serialize treasury account for frontend responses.
    """
    accounting_account = getattr(account, "accounting_account", None)
    opening_accounting_entry = getattr(account, "opening_accounting_entry", None)
    return {
        "id": account.id,
        "company_id": account.company_id,
        # Accounting linkage
        "accounting_account_id": account.accounting_account_id,
        "accounting_account_code": getattr(accounting_account, "code", ""),
        "accounting_account_name": getattr(accounting_account, "name", ""),
        "accounting_account_type": getattr(accounting_account, "account_type", ""),
        "accounting_account_purpose": getattr(accounting_account, "purpose", ""),
        "has_accounting_account": bool(account.accounting_account_id),
        "accounting_account": _serialize_accounting_account(accounting_account),
        # Opening balance journal entry
        "opening_accounting_entry_id": account.opening_accounting_entry_id,
        "opening_accounting_entry_number": getattr(opening_accounting_entry, "entry_number", ""),
        "opening_accounting_entry_status": getattr(opening_accounting_entry, "status", ""),
        "has_opening_accounting_entry": bool(account.opening_accounting_entry_id),
        "opening_accounting_entry": _serialize_opening_accounting_entry(opening_accounting_entry),
        "name": account.name,
        "code": account.code,
        "account_type": account.account_type,
        "account_type_display": account.get_account_type_display(),
        "status": account.status,
        "status_display": account.get_status_display(),
        "is_active": account.is_active,
        "currency": account.currency,
        "opening_balance": str(account.opening_balance),
        "current_balance": str(account.current_balance),
        "bank_name": account.bank_name,
        "bank_account_number": account.bank_account_number,
        "iban": account.iban,
        "is_default": account.is_default,
        "notes": account.notes,
        "created_by": (
            {
                "id": account.created_by_id,
                "username": account.created_by.username,
                "email": account.created_by.email,
            }
            if account.created_by_id and account.created_by
            else None
        ),
        "updated_by": (
            {
                "id": account.updated_by_id,
                "username": account.updated_by.username,
                "email": account.updated_by.email,
            }
            if account.updated_by_id and account.updated_by
            else None
        ),
        "created_at": account.created_at.isoformat() if account.created_at else None,
        "updated_at": account.updated_at.isoformat() if account.updated_at else None,
    }


def serialize_treasury_account_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "account_types": [
            {"value": value, "label": label}
            for value, label in TreasuryAccount.AccountType.choices
        ],
        "statuses": [
            {"value": value, "label": label}
            for value, label in TreasuryAccount.AccountStatus.choices
        ],
        "ordering": [
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "code", "label": "Code A-Z"},
            {"value": "-code", "label": "Code Z-A"},
            {"value": "account_type", "label": "Type A-Z"},
            {"value": "-account_type", "label": "Type Z-A"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
            {"value": "current_balance", "label": "Balance low to high"},
            {"value": "-current_balance", "label": "Balance high to low"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
        ],
    }


def _apply_account_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to treasury accounts queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    account_type = _clean_upper(
        request.query_params.get("account_type")
        or request.query_params.get("type")
        or ""
    )
    status = _clean_upper(request.query_params.get("status") or "")
    currency = _clean_upper(request.query_params.get("currency") or "")
    is_default = _to_bool(request.query_params.get("is_default"))
    is_active = _to_bool(request.query_params.get("is_active"))

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(bank_name__icontains=search)
            | Q(bank_account_number__icontains=search)
            | Q(iban__icontains=search)
            | Q(notes__icontains=search)
        )

    if account_type:
        queryset = queryset.filter(account_type=account_type)

    if status:
        queryset = queryset.filter(status=status)

    if currency:
        queryset = queryset.filter(currency=currency)

    if is_default is not None:
        queryset = queryset.filter(is_default=is_default)

    if is_active is True:
        queryset = queryset.filter(status=TreasuryAccount.AccountStatus.ACTIVE)

    if is_active is False:
        queryset = queryset.exclude(status=TreasuryAccount.AccountStatus.ACTIVE)

    return queryset


def _apply_account_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "name": "name",
        "-name": "-name",
        "code": "code",
        "-code": "-code",
        "account_type": "account_type",
        "-account_type": "-account_type",
        "status": "status",
        "-status": "-status",
        "current_balance": "current_balance",
        "-current_balance": "-current_balance",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "name")

    if selected_ordering == "name":
        return queryset.order_by("-is_default", "account_type", "name", "id")

    return queryset.order_by(selected_ordering, "-id")


def _build_account_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered account queryset.
    """
    total_balance = sum((account.current_balance for account in queryset), start=0)

    return {
        "total_accounts": queryset.count(),
        "active_accounts": queryset.filter(status=TreasuryAccount.AccountStatus.ACTIVE).count(),
        "inactive_accounts": queryset.filter(status=TreasuryAccount.AccountStatus.INACTIVE).count(),
        "cash_accounts": queryset.filter(account_type=TreasuryAccount.AccountType.CASH).count(),
        "bank_accounts": queryset.filter(account_type=TreasuryAccount.AccountType.BANK).count(),
        "wallet_accounts": queryset.filter(account_type=TreasuryAccount.AccountType.WALLET).count(),
        "default_accounts": queryset.filter(is_default=True).count(),
        "total_balance": str(total_balance),
    }


def _create_account_from_request(request: Request, company):
    """
    Create treasury account from request payload using treasury service layer.
    """
    data = request.data or {}

    return create_treasury_account(
        company=company,
        user=request.user,
        name=data.get("name") or "",
        code=data.get("code") or "",
        account_type=(
            data.get("account_type")
            or data.get("type")
            or TreasuryAccount.AccountType.CASH
        ),
        status=data.get("status") or TreasuryAccount.AccountStatus.ACTIVE,
        currency=data.get("currency") or "SAR",
        opening_balance=data.get("opening_balance") or "0.00",
        accounting_account=_resolve_accounting_account_from_request(data, company),
        auto_create_accounting_account=_resolve_auto_create_accounting_account(data),
        bank_name=data.get("bank_name") or "",
        bank_account_number=data.get("bank_account_number") or "",
        iban=data.get("iban") or "",
        is_default=bool(_to_bool(data.get("is_default"))),
        notes=data.get("notes") or "",
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def treasury_accounts_list(request: Request) -> Response:
    """
    GET /api/company/treasury/accounts/
    POST /api/company/treasury/accounts/
    """
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            account = _create_account_from_request(request, company)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Treasury account created successfully.",
                    "company": {
                        "id": company.id,
                        "name": getattr(company, "display_name", None)
                        or getattr(company, "name", ""),
                    },
                    "item": serialize_treasury_account(account),
                    "result": serialize_treasury_account(account),
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
            or "name"
        )

        queryset = get_treasury_accounts_queryset(company).select_related(
            "company",
            "created_by",
            "updated_by",
        )

        queryset = _apply_account_filters(queryset, request)
        queryset = _apply_account_ordering(queryset, ordering)

        summary = _build_account_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        accounts = [
            serialize_treasury_account(account)
            for account in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Treasury accounts loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "account_type": request.query_params.get("account_type")
                    or request.query_params.get("type")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "currency": request.query_params.get("currency") or "",
                    "is_default": request.query_params.get("is_default") or "",
                    "is_active": request.query_params.get("is_active") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": accounts,
                "results": accounts,
                "choices": serialize_treasury_account_choices(),
            },
            status=200,
        )

    except TreasuryAccountListAPIError as exc:
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
                "message": "Treasury account validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Treasury account already exists.",
                "errors": {
                    "detail": "Treasury account name or code already exists for this company.",
                },
            },
            status=400,
        )


treasury_accounts_list.required_company_permissions = [
    "company.treasury.accounts.view",
    "company.treasury.accounts.create",
]