# ============================================================
# 📂 reports/financial.py
# 🧠 PrimeyAcc | Financial Reports Services - Phase 16.2
# ------------------------------------------------------------
# ✅ Trial Balance report
# ✅ Uses posted journal entries only
# ✅ Tenant-safe company input
# ✅ Date filters
# ✅ include_zero support
# ✅ No frontend company_id trust
# ============================================================

from __future__ import annotations

from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.core.exceptions import ValidationError
from django.db.models import Sum
from django.utils import timezone

from accounting.models import (
    Account,
    JournalEntryLine,
    JournalEntryStatus,
)


MONEY_ZERO = Decimal("0.00")
MONEY_QUANT = Decimal("0.01")


class FinancialReportError(Exception):
    """Base financial reports error."""


def _money(value: Any) -> Decimal:
    return Decimal(str(value or "0.00")).quantize(
        MONEY_QUANT,
        rounding=ROUND_HALF_UP,
    )


def _money_str(value: Any) -> str:
    return str(_money(value))


def _validate_company(company: Any) -> None:
    if not company:
        raise ValidationError("الشركة مطلوبة.")


def _parse_date(value: Any, *, field_name: str) -> date | None:
    if value in [None, ""]:
        return None

    if isinstance(value, date):
        return value

    try:
        return date.fromisoformat(str(value))
    except ValueError as exc:
        raise ValidationError(
            {
                field_name: "صيغة التاريخ غير صحيحة. استخدم YYYY-MM-DD.",
            }
        ) from exc


def _parse_bool(value: Any, *, default: bool = False) -> bool:
    if value in [None, ""]:
        return default

    if isinstance(value, bool):
        return value

    normalized = str(value).strip().lower()

    if normalized in {"1", "true", "yes", "y", "on"}:
        return True

    if normalized in {"0", "false", "no", "n", "off"}:
        return False

    return default


def build_trial_balance_report(
    company: Any,
    *,
    date_from: Any = None,
    date_to: Any = None,
    include_zero: Any = False,
) -> dict[str, Any]:
    """
    Build trial balance report for the current company.

    Rules:
    - Only POSTED journal entries are included.
    - Draft / cancelled / reversed entries are ignored.
    - Accounts are scoped by company.
    - Query filters never trust company_id from frontend.
    """
    _validate_company(company)

    parsed_date_from = _parse_date(date_from, field_name="date_from")
    parsed_date_to = _parse_date(date_to, field_name="date_to")

    if parsed_date_from and parsed_date_to and parsed_date_to < parsed_date_from:
        raise ValidationError(
            {
                "date_to": "تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.",
            }
        )

    include_zero_bool = _parse_bool(include_zero, default=False)

    lines_qs = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
    )

    if parsed_date_from:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__gte=parsed_date_from,
        )

    if parsed_date_to:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__lte=parsed_date_to,
        )

    line_totals = {
        row["account_id"]: {
            "total_debit": _money(row["total_debit"]),
            "total_credit": _money(row["total_credit"]),
        }
        for row in lines_qs.values("account_id").annotate(
            total_debit=Sum("debit_amount"),
            total_credit=Sum("credit_amount"),
        )
    }

    accounts_qs = (
        Account.objects.filter(company=company)
        .select_related("parent")
        .order_by("code", "id")
    )

    results: list[dict[str, Any]] = []

    summary_total_debit = MONEY_ZERO
    summary_total_credit = MONEY_ZERO

    for account in accounts_qs:
        totals = line_totals.get(
            account.pk,
            {
                "total_debit": MONEY_ZERO,
                "total_credit": MONEY_ZERO,
            },
        )

        total_debit = _money(totals["total_debit"])
        total_credit = _money(totals["total_credit"])
        balance = _money(total_debit - total_credit)

        if (
            not include_zero_bool
            and total_debit == MONEY_ZERO
            and total_credit == MONEY_ZERO
        ):
            continue

        summary_total_debit += total_debit
        summary_total_credit += total_credit

        results.append(
            {
                "account": {
                    "id": account.pk,
                    "code": account.code,
                    "name": account.name,
                    "name_en": account.name_en,
                    "type": account.account_type,
                    "nature": account.nature,
                    "level": account.level,
                    "is_group": account.is_group,
                    "parent_id": account.parent_id,
                },
                "total_debit": _money_str(total_debit),
                "total_credit": _money_str(total_credit),
                "balance": _money_str(balance),
                "balance_type": "DEBIT" if balance >= MONEY_ZERO else "CREDIT",
            }
        )

    summary_total_debit = _money(summary_total_debit)
    summary_total_credit = _money(summary_total_credit)
    difference = _money(summary_total_debit - summary_total_credit)

    return {
        "report": {
            "key": "trial_balance",
            "name": "ميزان المراجعة",
            "phase": "16.2",
            "generated_at": timezone.now().isoformat(),
        },
        "filters": {
            "date_from": parsed_date_from.isoformat() if parsed_date_from else None,
            "date_to": parsed_date_to.isoformat() if parsed_date_to else None,
            "include_zero": include_zero_bool,
        },
        "summary": {
            "total_debit": _money_str(summary_total_debit),
            "total_credit": _money_str(summary_total_credit),
            "difference": _money_str(difference),
            "is_balanced": difference == MONEY_ZERO,
            "accounts_count": len(results),
        },
        "results": results,
    }

def _resolve_ledger_account(
    company: Any,
    *,
    account_id: Any = None,
    account_code: Any = None,
) -> Account:
    """
    Resolve account safely inside current company only.
    """
    if account_id in [None, ""] and account_code in [None, ""]:
        raise ValidationError(
            {
                "account": "يجب تحديد account_id أو account_code.",
            }
        )

    accounts_qs = Account.objects.filter(company=company)

    if account_id not in [None, ""]:
        try:
            return accounts_qs.get(pk=account_id)
        except Account.DoesNotExist as exc:
            raise ValidationError(
                {
                    "account_id": "الحساب غير موجود داخل هذه الشركة.",
                }
            ) from exc

    try:
        return accounts_qs.get(code=str(account_code).strip())
    except Account.DoesNotExist as exc:
        raise ValidationError(
            {
                "account_code": "كود الحساب غير موجود داخل هذه الشركة.",
            }
        ) from exc


def build_general_ledger_report(
    company: Any,
    *,
    account_id: Any = None,
    account_code: Any = None,
    date_from: Any = None,
    date_to: Any = None,
    include_opening: Any = True,
) -> dict[str, Any]:
    """
    Build general ledger report for one account.

    Rules:
    - Only POSTED journal entries are included.
    - Company is taken from request.company, never frontend company_id.
    - Account must belong to the current company.
    - Opening balance is calculated before date_from when enabled.
    """
    _validate_company(company)

    account = _resolve_ledger_account(
        company,
        account_id=account_id,
        account_code=account_code,
    )

    parsed_date_from = _parse_date(date_from, field_name="date_from")
    parsed_date_to = _parse_date(date_to, field_name="date_to")

    if parsed_date_from and parsed_date_to and parsed_date_to < parsed_date_from:
        raise ValidationError(
            {
                "date_to": "تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.",
            }
        )

    include_opening_bool = _parse_bool(include_opening, default=True)

    base_lines_qs = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account=account,
    ).select_related(
        "journal_entry",
        "account",
    )

    opening_debit = MONEY_ZERO
    opening_credit = MONEY_ZERO

    if include_opening_bool and parsed_date_from:
        opening_totals = base_lines_qs.filter(
            journal_entry__entry_date__lt=parsed_date_from,
        ).aggregate(
            total_debit=Sum("debit_amount"),
            total_credit=Sum("credit_amount"),
        )

        opening_debit = _money(opening_totals["total_debit"])
        opening_credit = _money(opening_totals["total_credit"])

    lines_qs = base_lines_qs

    if parsed_date_from:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__gte=parsed_date_from,
        )

    if parsed_date_to:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__lte=parsed_date_to,
        )

    lines_qs = lines_qs.order_by(
        "journal_entry__entry_date",
        "journal_entry_id",
        "id",
    )

    opening_balance = _money(opening_debit - opening_credit)
    running_balance = opening_balance

    entries: list[dict[str, Any]] = []

    for line in lines_qs:
        debit = _money(line.debit_amount)
        credit = _money(line.credit_amount)
        running_balance = _money(running_balance + debit - credit)

        entries.append(
            {
                "journal_entry": {
                    "id": line.journal_entry_id,
                    "entry_number": line.journal_entry.entry_number,
                    "entry_date": line.journal_entry.entry_date.isoformat(),
                    "status": line.journal_entry.status,
                    "description": line.journal_entry.description,
                    "source_type": line.journal_entry.source_type,
                    "source_id": line.journal_entry.source_id,
                },
                "line": {
                    "id": line.pk,
                    "description": line.description,
                    "debit": _money_str(debit),
                    "credit": _money_str(credit),
                    "running_balance": _money_str(running_balance),
                    "running_balance_type": "DEBIT"
                    if running_balance >= MONEY_ZERO
                    else "CREDIT",
                },
            }
        )

    period_totals = lines_qs.aggregate(
        total_debit=Sum("debit_amount"),
        total_credit=Sum("credit_amount"),
    )

    period_debit = _money(period_totals["total_debit"])
    period_credit = _money(period_totals["total_credit"])
    closing_balance = _money(opening_balance + period_debit - period_credit)

    return {
        "report": {
            "key": "general_ledger",
            "name": "دفتر الأستاذ",
            "phase": "16.3",
            "generated_at": timezone.now().isoformat(),
        },
        "filters": {
            "account_id": account.pk,
            "account_code": account.code,
            "date_from": parsed_date_from.isoformat() if parsed_date_from else None,
            "date_to": parsed_date_to.isoformat() if parsed_date_to else None,
            "include_opening": include_opening_bool,
        },
        "account": {
            "id": account.pk,
            "code": account.code,
            "name": account.name,
            "name_en": account.name_en,
            "type": account.account_type,
            "nature": account.nature,
            "level": account.level,
            "is_group": account.is_group,
            "parent_id": account.parent_id,
        },
        "summary": {
            "opening_debit": _money_str(opening_debit),
            "opening_credit": _money_str(opening_credit),
            "opening_balance": _money_str(opening_balance),
            "period_debit": _money_str(period_debit),
            "period_credit": _money_str(period_credit),
            "closing_balance": _money_str(closing_balance),
            "closing_balance_type": "DEBIT"
            if closing_balance >= MONEY_ZERO
            else "CREDIT",
            "entries_count": len(entries),
        },
        "entries": entries,
    }

def build_profit_loss_report(
    company: Any,
    *,
    date_from: Any = None,
    date_to: Any = None,
    include_zero: Any = False,
) -> dict[str, Any]:
    """
    Build Profit & Loss report.

    Rules:
    - Only POSTED journal entries are included.
    - Company is taken from request.company, never frontend company_id.
    - Revenue accounts increase by credit - debit.
    - Expense accounts increase by debit - credit.
    """
    _validate_company(company)

    parsed_date_from = _parse_date(date_from, field_name="date_from")
    parsed_date_to = _parse_date(date_to, field_name="date_to")

    if parsed_date_from and parsed_date_to and parsed_date_to < parsed_date_from:
        raise ValidationError(
            {
                "date_to": "End date cannot be before start date.",
            }
        )

    include_zero_bool = _parse_bool(include_zero, default=False)

    profit_loss_account_types = ["REVENUE", "EXPENSE"]

    lines_qs = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account__account_type__in=profit_loss_account_types,
    )

    if parsed_date_from:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__gte=parsed_date_from,
        )

    if parsed_date_to:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__lte=parsed_date_to,
        )

    line_totals = {
        row["account_id"]: {
            "total_debit": _money(row["total_debit"]),
            "total_credit": _money(row["total_credit"]),
        }
        for row in lines_qs.values("account_id").annotate(
            total_debit=Sum("debit_amount"),
            total_credit=Sum("credit_amount"),
        )
    }

    accounts_qs = (
        Account.objects.filter(
            company=company,
            account_type__in=profit_loss_account_types,
        )
        .select_related("parent")
        .order_by("account_type", "code", "id")
    )

    revenues: list[dict[str, Any]] = []
    expenses: list[dict[str, Any]] = []

    total_revenue = MONEY_ZERO
    total_expense = MONEY_ZERO

    for account in accounts_qs:
        totals = line_totals.get(
            account.pk,
            {
                "total_debit": MONEY_ZERO,
                "total_credit": MONEY_ZERO,
            },
        )

        total_debit = _money(totals["total_debit"])
        total_credit = _money(totals["total_credit"])

        if account.account_type == "REVENUE":
            amount = _money(total_credit - total_debit)
            section = "revenue"
        else:
            amount = _money(total_debit - total_credit)
            section = "expense"

        if not include_zero_bool and amount == MONEY_ZERO:
            continue

        row = {
            "account": {
                "id": account.pk,
                "code": account.code,
                "name": account.name,
                "name_en": account.name_en,
                "type": account.account_type,
                "nature": account.nature,
                "level": account.level,
                "is_group": account.is_group,
                "parent_id": account.parent_id,
            },
            "total_debit": _money_str(total_debit),
            "total_credit": _money_str(total_credit),
            "amount": _money_str(amount),
        }

        if section == "revenue":
            total_revenue = _money(total_revenue + amount)
            revenues.append(row)
        else:
            total_expense = _money(total_expense + amount)
            expenses.append(row)

    gross_profit = _money(total_revenue - total_expense)
    net_profit = gross_profit

    return {
        "report": {
            "key": "profit_loss",
            "name": "Profit and Loss",
            "phase": "16.4",
            "generated_at": timezone.now().isoformat(),
        },
        "filters": {
            "date_from": parsed_date_from.isoformat() if parsed_date_from else None,
            "date_to": parsed_date_to.isoformat() if parsed_date_to else None,
            "include_zero": include_zero_bool,
        },
        "summary": {
            "total_revenue": _money_str(total_revenue),
            "total_expense": _money_str(total_expense),
            "gross_profit": _money_str(gross_profit),
            "net_profit": _money_str(net_profit),
            "is_profit": net_profit >= MONEY_ZERO,
            "revenues_count": len(revenues),
            "expenses_count": len(expenses),
        },
        "sections": {
            "revenues": revenues,
            "expenses": expenses,
        },
    }

def build_balance_sheet_report(
    company: Any,
    *,
    date_to: Any = None,
    include_zero: Any = False,
) -> dict[str, Any]:
    """
    Build Balance Sheet report.

    Rules:
    - Only POSTED journal entries are included.
    - Company is taken from request.company, never frontend company_id.
    - Asset accounts increase by debit - credit.
    - Liability and equity accounts increase by credit - debit.
    """
    _validate_company(company)

    parsed_date_to = _parse_date(date_to, field_name="date_to")
    include_zero_bool = _parse_bool(include_zero, default=False)

    balance_sheet_account_types = ["ASSET", "LIABILITY", "EQUITY"]

    lines_qs = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account__account_type__in=balance_sheet_account_types,
    )

    if parsed_date_to:
        lines_qs = lines_qs.filter(
            journal_entry__entry_date__lte=parsed_date_to,
        )

    line_totals = {
        row["account_id"]: {
            "total_debit": _money(row["total_debit"]),
            "total_credit": _money(row["total_credit"]),
        }
        for row in lines_qs.values("account_id").annotate(
            total_debit=Sum("debit_amount"),
            total_credit=Sum("credit_amount"),
        )
    }

    accounts_qs = (
        Account.objects.filter(
            company=company,
            account_type__in=balance_sheet_account_types,
        )
        .select_related("parent")
        .order_by("account_type", "code", "id")
    )

    assets: list[dict[str, Any]] = []
    liabilities: list[dict[str, Any]] = []
    equity: list[dict[str, Any]] = []

    total_assets = MONEY_ZERO
    total_liabilities = MONEY_ZERO
    total_equity = MONEY_ZERO

    for account in accounts_qs:
        totals = line_totals.get(
            account.pk,
            {
                "total_debit": MONEY_ZERO,
                "total_credit": MONEY_ZERO,
            },
        )

        total_debit = _money(totals["total_debit"])
        total_credit = _money(totals["total_credit"])

        if account.account_type == "ASSET":
            amount = _money(total_debit - total_credit)
            section = "assets"
        elif account.account_type == "LIABILITY":
            amount = _money(total_credit - total_debit)
            section = "liabilities"
        else:
            amount = _money(total_credit - total_debit)
            section = "equity"

        if not include_zero_bool and amount == MONEY_ZERO:
            continue

        row = {
            "account": {
                "id": account.pk,
                "code": account.code,
                "name": account.name,
                "name_en": account.name_en,
                "type": account.account_type,
                "nature": account.nature,
                "level": account.level,
                "is_group": account.is_group,
                "parent_id": account.parent_id,
            },
            "total_debit": _money_str(total_debit),
            "total_credit": _money_str(total_credit),
            "amount": _money_str(amount),
        }

        if section == "assets":
            total_assets = _money(total_assets + amount)
            assets.append(row)
        elif section == "liabilities":
            total_liabilities = _money(total_liabilities + amount)
            liabilities.append(row)
        else:
            total_equity = _money(total_equity + amount)
            equity.append(row)

    liabilities_and_equity = _money(total_liabilities + total_equity)
    difference = _money(total_assets - liabilities_and_equity)

    return {
        "report": {
            "key": "balance_sheet",
            "name": "Balance Sheet",
            "phase": "16.5",
            "generated_at": timezone.now().isoformat(),
        },
        "filters": {
            "date_to": parsed_date_to.isoformat() if parsed_date_to else None,
            "include_zero": include_zero_bool,
        },
        "summary": {
            "total_assets": _money_str(total_assets),
            "total_liabilities": _money_str(total_liabilities),
            "total_equity": _money_str(total_equity),
            "liabilities_and_equity": _money_str(liabilities_and_equity),
            "difference": _money_str(difference),
            "is_balanced": difference == MONEY_ZERO,
            "assets_count": len(assets),
            "liabilities_count": len(liabilities),
            "equity_count": len(equity),
        },
        "sections": {
            "assets": assets,
            "liabilities": liabilities,
            "equity": equity,
        },
    }

def build_cash_flow_report(
    company: Any,
    *,
    date_from: Any = None,
    date_to: Any = None,
) -> dict[str, Any]:
    """
    Build Cash Flow report.

    Rules:
    - Only POSTED journal entries are included.
    - Company is taken from request.company, never frontend company_id.
    - Cash accounts are detected by account purpose CASH or BANK, or by common cash/bank code prefixes.
    - Net cash flow is calculated from cash/bank account movement.
    """
    _validate_company(company)

    parsed_date_from = _parse_date(date_from, field_name="date_from")
    parsed_date_to = _parse_date(date_to, field_name="date_to")

    if parsed_date_from and parsed_date_to and parsed_date_to < parsed_date_from:
        raise ValidationError(
            {
                "date_to": "End date cannot be before start date.",
            }
        )

    cash_accounts_qs = Account.objects.filter(
        company=company,
        is_group=False,
    ).filter(
        purpose__in=["CASH", "BANK"],
    )

    if not cash_accounts_qs.exists():
        cash_accounts_qs = Account.objects.filter(
            company=company,
            is_group=False,
            code__startswith="1101",
        )

    cash_account_ids = list(cash_accounts_qs.values_list("id", flat=True))

    opening_cash = MONEY_ZERO

    base_cash_lines_qs = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account_id__in=cash_account_ids,
    )

    if parsed_date_from:
        opening_totals = base_cash_lines_qs.filter(
            journal_entry__entry_date__lt=parsed_date_from,
        ).aggregate(
            total_debit=Sum("debit_amount"),
            total_credit=Sum("credit_amount"),
        )

        opening_cash = _money(
            _money(opening_totals["total_debit"])
            - _money(opening_totals["total_credit"])
        )

    cash_lines_qs = base_cash_lines_qs

    if parsed_date_from:
        cash_lines_qs = cash_lines_qs.filter(
            journal_entry__entry_date__gte=parsed_date_from,
        )

    if parsed_date_to:
        cash_lines_qs = cash_lines_qs.filter(
            journal_entry__entry_date__lte=parsed_date_to,
        )

    period_totals = cash_lines_qs.aggregate(
        total_debit=Sum("debit_amount"),
        total_credit=Sum("credit_amount"),
    )

    cash_inflows = _money(period_totals["total_debit"])
    cash_outflows = _money(period_totals["total_credit"])
    net_cash_flow = _money(cash_inflows - cash_outflows)
    closing_cash = _money(opening_cash + net_cash_flow)

    cash_accounts = [
        {
            "id": account.pk,
            "code": account.code,
            "name": account.name,
            "name_en": account.name_en,
            "type": account.account_type,
            "nature": account.nature,
            "purpose": account.purpose,
        }
        for account in cash_accounts_qs.order_by("code", "id")
    ]

    return {
        "report": {
            "key": "cash_flow",
            "name": "Cash Flow",
            "phase": "16.6",
            "generated_at": timezone.now().isoformat(),
        },
        "filters": {
            "date_from": parsed_date_from.isoformat() if parsed_date_from else None,
            "date_to": parsed_date_to.isoformat() if parsed_date_to else None,
        },
        "summary": {
            "opening_cash": _money_str(opening_cash),
            "cash_inflows": _money_str(cash_inflows),
            "cash_outflows": _money_str(cash_outflows),
            "net_cash_flow": _money_str(net_cash_flow),
            "closing_cash": _money_str(closing_cash),
            "is_positive_flow": net_cash_flow >= MONEY_ZERO,
            "cash_accounts_count": len(cash_accounts),
        },
        "sections": {
            "operating": {
                "cash_inflows": _money_str(cash_inflows),
                "cash_outflows": _money_str(cash_outflows),
                "net_cash_flow": _money_str(net_cash_flow),
            },
            "cash_accounts": cash_accounts,
        },
    }
