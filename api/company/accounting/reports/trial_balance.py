# ============================================================
# 📂 api/company/accounting/reports/trial_balance.py
# 🧠 Mhamcloud | Company Accounting Trial Balance API
# ------------------------------------------------------------
# ✅ ميزان مراجعة للشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ يعتمد فقط على القيود المرحلة POSTED
# ✅ يدعم date_from / date_to
# ✅ يدعم account_type / q / include_zero
# ✅ يعرض إجماليات المدين والدائن والرصيد
# ============================================================

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from django.db.models import Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import Account, JournalEntryLine, JournalEntryStatus
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

MONEY_ZERO = Decimal("0.00")
MONEY_QUANT = Decimal("0.01")


def _money(value: Any) -> Decimal:
    return Decimal(str(value or "0.00")).quantize(MONEY_QUANT)


def _to_bool(value: Any, *, default: bool = False) -> bool:
    if value in [None, ""]:
        return default

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return default


def _to_date(value: Any):
    if value in [None, ""]:
        return None

    text = str(value).strip()

    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _normal_balance(account: Account, debit: Decimal, credit: Decimal) -> Decimal:
    if account.nature == "DEBIT":
        return _money(debit - credit)

    return _money(credit - debit)


def _serialize_account_balance(
    *,
    account: Account,
    total_debit: Decimal,
    total_credit: Decimal,
) -> dict[str, Any]:
    balance = _normal_balance(account, total_debit, total_credit)

    return {
        "account": {
            "id": account.id,
            "code": account.code,
            "name": account.name,
            "name_en": account.name_en,
            "account_type": account.account_type,
            "account_type_display": account.get_account_type_display(),
            "nature": account.nature,
            "nature_display": account.get_nature_display(),
            "purpose": account.purpose,
            "purpose_display": account.get_purpose_display(),
            "level": account.level,
            "is_group": account.is_group,
            "is_active": account.is_active,
            "is_system": account.is_system,
            "parent": (
                {
                    "id": account.parent_id,
                    "code": account.parent.code,
                    "name": account.parent.name,
                }
                if account.parent_id
                else None
            ),
        },
        "total_debit": str(total_debit),
        "total_credit": str(total_credit),
        "balance": str(balance),
        "balance_side": account.nature,
    }


# ============================================================
# API
# ============================================================

@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_trial_balance(request):
    """
    GET /api/company/accounting/reports/trial-balance/

    Query params:
    - date_from: YYYY-MM-DD
    - date_to: YYYY-MM-DD
    - account_type: ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE
    - q: account code/name search
    - include_zero: true/false
    """
    company = getattr(request, "company", None)

    if not company:
        return Response(
            {
                "success": False,
                "message": "لا توجد شركة حالية مرتبطة بالمستخدم.",
            },
            status=403,
        )

    params = request.query_params

    raw_date_from = params.get("date_from")
    raw_date_to = params.get("date_to")

    date_from = _to_date(raw_date_from)
    date_to = _to_date(raw_date_to)

    if raw_date_from and not date_from:
        return Response(
            {
                "success": False,
                "message": "تاريخ البداية غير صحيح. استخدم الصيغة YYYY-MM-DD.",
            },
            status=400,
        )

    if raw_date_to and not date_to:
        return Response(
            {
                "success": False,
                "message": "تاريخ النهاية غير صحيح. استخدم الصيغة YYYY-MM-DD.",
            },
            status=400,
        )

    if date_from and date_to and date_to < date_from:
        return Response(
            {
                "success": False,
                "message": "تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.",
            },
            status=400,
        )

    q = str(params.get("q") or "").strip()
    account_type = str(params.get("account_type") or "").strip()
    include_zero = _to_bool(params.get("include_zero"), default=False)

    accounts = (
        Account.objects.filter(
            company=company,
            is_active=True,
            is_group=False,
        )
        .select_related("parent")
        .order_by("code", "id")
    )

    if q:
        accounts = accounts.filter(
            Q(code__icontains=q)
            | Q(name__icontains=q)
            | Q(name_en__icontains=q)
            | Q(description__icontains=q)
        )

    if account_type:
        accounts = accounts.filter(account_type=account_type)

    lines = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account__in=accounts,
    )

    if date_from:
        lines = lines.filter(journal_entry__entry_date__gte=date_from)

    if date_to:
        lines = lines.filter(journal_entry__entry_date__lte=date_to)

    line_totals = {
        row["account_id"]: {
            "debit": _money(row.get("debit")),
            "credit": _money(row.get("credit")),
        }
        for row in lines.values("account_id").annotate(
            debit=Sum("debit_amount"),
            credit=Sum("credit_amount"),
        )
    }

    rows: list[dict[str, Any]] = []

    total_debit = MONEY_ZERO
    total_credit = MONEY_ZERO

    debit_balance_total = MONEY_ZERO
    credit_balance_total = MONEY_ZERO

    for account in accounts:
        totals = line_totals.get(
            account.id,
            {
                "debit": MONEY_ZERO,
                "credit": MONEY_ZERO,
            },
        )

        account_debit = _money(totals["debit"])
        account_credit = _money(totals["credit"])

        if not include_zero and account_debit == MONEY_ZERO and account_credit == MONEY_ZERO:
            continue

        balance = _normal_balance(account, account_debit, account_credit)

        total_debit = _money(total_debit + account_debit)
        total_credit = _money(total_credit + account_credit)

        if account.nature == "DEBIT":
            debit_balance_total = _money(debit_balance_total + balance)
        else:
            credit_balance_total = _money(credit_balance_total + balance)

        rows.append(
            _serialize_account_balance(
                account=account,
                total_debit=account_debit,
                total_credit=account_credit,
            )
        )

    is_balanced = total_debit == total_credit

    return Response(
        {
            "success": True,
            "message": "تم جلب ميزان المراجعة بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "filters": {
                "date_from": date_from.isoformat() if date_from else "",
                "date_to": date_to.isoformat() if date_to else "",
                "account_type": account_type,
                "q": q,
                "include_zero": include_zero,
            },
            "summary": {
                "rows_count": len(rows),
                "total_debit": str(total_debit),
                "total_credit": str(total_credit),
                "difference": str(_money(total_debit - total_credit)),
                "is_balanced": is_balanced,
                "debit_balance_total": str(debit_balance_total),
                "credit_balance_total": str(credit_balance_total),
            },
            "results": rows,
        }
    )


accounting_trial_balance.required_company_permissions = [
    "company.accounting.reports.view",
]