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