# ============================================================
# 📂 api/company/accounting/reports/trial_balance.py
# 🧠 Mhamcloud | Company Accounting Trial Balance API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Posted entries only affect trial balance
# ✅ Supports account level selection like accounting reports
# ✅ Opening / period movement / closing columns
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
def _split_signed_balance(balance: Decimal) -> tuple[Decimal, Decimal]:
    balance = _money(balance)
    if balance >= MONEY_ZERO:
        return balance, MONEY_ZERO
    return MONEY_ZERO, _money(abs(balance))
def _serialize_account(
    account: Account,
    *,
    opening_debit: Decimal,
    opening_credit: Decimal,
    period_debit: Decimal,
    period_credit: Decimal,
) -> dict[str, Any]:
    opening_signed = _money(opening_debit - opening_credit)
    period_signed = _money(period_debit - period_credit)
    closing_signed = _money(opening_signed + period_signed)
    opening_debit_balance, opening_credit_balance = _split_signed_balance(opening_signed)
    closing_debit_balance, closing_credit_balance = _split_signed_balance(closing_signed)
    balance_side = "DEBIT" if closing_debit_balance > MONEY_ZERO else "CREDIT"
    if closing_debit_balance == MONEY_ZERO and closing_credit_balance == MONEY_ZERO:
        balance_side = account.nature
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
        "opening_debit": str(opening_debit_balance),
        "opening_credit": str(opening_credit_balance),
        "opening_balance": str(opening_signed),
        "period_debit": str(period_debit),
        "period_credit": str(period_credit),
        "period_balance": str(period_signed),
        "closing_debit": str(closing_debit_balance),
        "closing_credit": str(closing_credit_balance),
        "closing_balance": str(closing_signed),
        "total_debit": str(period_debit),
        "total_credit": str(period_credit),
        "balance": str(closing_signed),
        "balance_side": balance_side,
    }
def _collect_leaf_ids(account: Account, children_by_parent: dict[int | None, list[Account]]) -> list[int]:
    children = children_by_parent.get(account.id, [])
    if not children:
        return [] if account.is_group else [account.id]
    ids: list[int] = []
    for child in children:
        ids.extend(_collect_leaf_ids(child, children_by_parent))
    return ids
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_trial_balance(request):
    """
    GET /api/company/accounting/reports/trial-balance/
    Query params:
    - date_from: YYYY-MM-DD
    - date_to: YYYY-MM-DD
    - account_type: ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE
    - level: leaf / all / 1 / 2 / 3 / 4 / 5
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
    level = str(params.get("level") or "leaf").strip().lower()
    include_zero = _to_bool(params.get("include_zero"), default=False)
    all_accounts = list(
        Account.objects.filter(
            company=company,
            is_active=True,
        )
        .select_related("parent")
        .order_by("code", "id")
    )
    children_by_parent: dict[int | None, list[Account]] = {}
    for account in all_accounts:
        children_by_parent.setdefault(account.parent_id, []).append(account)
    display_accounts = all_accounts
    if account_type:
        display_accounts = [
            account for account in display_accounts if account.account_type == account_type
        ]
    if level == "leaf":
        display_accounts = [account for account in display_accounts if not account.is_group]
    elif level not in {"all", ""}:
        try:
            selected_level = int(level)
        except ValueError:
            selected_level = 0
        if selected_level > 0:
            display_accounts = [
                account for account in display_accounts if account.level == selected_level
            ]
    if q:
        q_lower = q.lower()
        display_accounts = [
            account
            for account in display_accounts
            if q_lower in " ".join(
                [
                    account.code or "",
                    account.name or "",
                    account.name_en or "",
                    account.description or "",
                ]
            ).lower()
        ]
    all_leaf_ids: set[int] = set()
    account_leaf_map: dict[int, list[int]] = {}
    for account in display_accounts:
        leaf_ids = _collect_leaf_ids(account, children_by_parent)
        if not leaf_ids and not account.is_group:
            leaf_ids = [account.id]
        account_leaf_map[account.id] = leaf_ids
        all_leaf_ids.update(leaf_ids)
    opening_lines = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account_id__in=list(all_leaf_ids),
    )
    if date_from:
        opening_lines = opening_lines.filter(journal_entry__entry_date__lt=date_from)
    else:
        opening_lines = opening_lines.none()
    period_lines = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account_id__in=list(all_leaf_ids),
    )
    if date_from:
        period_lines = period_lines.filter(journal_entry__entry_date__gte=date_from)
    if date_to:
        period_lines = period_lines.filter(journal_entry__entry_date__lte=date_to)
    opening_totals = {
        row["account_id"]: {
            "debit": _money(row.get("debit")),
            "credit": _money(row.get("credit")),
        }
        for row in opening_lines.values("account_id").annotate(
            debit=Sum("debit_amount"),
            credit=Sum("credit_amount"),
        )
    }
    period_totals = {
        row["account_id"]: {
            "debit": _money(row.get("debit")),
            "credit": _money(row.get("credit")),
        }
        for row in period_lines.values("account_id").annotate(
            debit=Sum("debit_amount"),
            credit=Sum("credit_amount"),
        )
    }
    rows: list[dict[str, Any]] = []
    opening_debit_total = MONEY_ZERO
    opening_credit_total = MONEY_ZERO
    period_debit_total = MONEY_ZERO
    period_credit_total = MONEY_ZERO
    closing_debit_total = MONEY_ZERO
    closing_credit_total = MONEY_ZERO
    for account in display_accounts:
        leaf_ids = account_leaf_map.get(account.id, [])
        opening_debit = MONEY_ZERO
        opening_credit = MONEY_ZERO
        period_debit = MONEY_ZERO
        period_credit = MONEY_ZERO
        for leaf_id in leaf_ids:
            opening = opening_totals.get(
                leaf_id,
                {
                    "debit": MONEY_ZERO,
                    "credit": MONEY_ZERO,
                },
            )
            period = period_totals.get(
                leaf_id,
                {
                    "debit": MONEY_ZERO,
                    "credit": MONEY_ZERO,
                },
            )
            opening_debit = _money(opening_debit + opening["debit"])
            opening_credit = _money(opening_credit + opening["credit"])
            period_debit = _money(period_debit + period["debit"])
            period_credit = _money(period_credit + period["credit"])
        opening_signed = _money(opening_debit - opening_credit)
        closing_signed = _money(opening_signed + period_debit - period_credit)
        opening_debit_balance, opening_credit_balance = _split_signed_balance(opening_signed)
        closing_debit_balance, closing_credit_balance = _split_signed_balance(closing_signed)
        has_activity = any(
            value != MONEY_ZERO
            for value in [
                opening_debit_balance,
                opening_credit_balance,
                period_debit,
                period_credit,
                closing_debit_balance,
                closing_credit_balance,
            ]
        )
        if not include_zero and not has_activity:
            continue
        opening_debit_total = _money(opening_debit_total + opening_debit_balance)
        opening_credit_total = _money(opening_credit_total + opening_credit_balance)
        period_debit_total = _money(period_debit_total + period_debit)
        period_credit_total = _money(period_credit_total + period_credit)
        closing_debit_total = _money(closing_debit_total + closing_debit_balance)
        closing_credit_total = _money(closing_credit_total + closing_credit_balance)
        rows.append(
            _serialize_account(
                account,
                opening_debit=opening_debit,
                opening_credit=opening_credit,
                period_debit=period_debit,
                period_credit=period_credit,
            )
        )
    closing_difference = _money(closing_debit_total - closing_credit_total)
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
                "level": level,
                "q": q,
                "include_zero": include_zero,
            },
            "summary": {
                "rows_count": len(rows),
                "opening_debit_total": str(opening_debit_total),
                "opening_credit_total": str(opening_credit_total),
                "opening_difference": str(_money(opening_debit_total - opening_credit_total)),
                "period_debit_total": str(period_debit_total),
                "period_credit_total": str(period_credit_total),
                "period_difference": str(_money(period_debit_total - period_credit_total)),
                "closing_debit_total": str(closing_debit_total),
                "closing_credit_total": str(closing_credit_total),
                "closing_difference": str(closing_difference),
                "total_debit": str(period_debit_total),
                "total_credit": str(period_credit_total),
                "difference": str(closing_difference),
                "is_balanced": closing_difference == MONEY_ZERO,
                "debit_balance_total": str(closing_debit_total),
                "credit_balance_total": str(closing_credit_total),
            },
            "results": rows,
        }
    )
accounting_trial_balance.required_company_permissions = [
    "company.accounting.reports.view",
]
