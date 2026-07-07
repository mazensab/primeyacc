# ============================================================
# 📂 api/company/accounting/reports/financial_position.py
# 🧠 Mhamcloud | Company Accounting Financial Position API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Posted entries only
# ✅ Financial Position / المركز المالي
# ✅ Supports summary, detailed, and account levels
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
def _year_start(value):
    return value.replace(month=1, day=1)
def _collect_leaf_ids(account: Account, children_by_parent: dict[int | None, list[Account]]) -> list[int]:
    children = children_by_parent.get(account.id, [])
    if not children:
        return [] if account.is_group else [account.id]
    leaf_ids: list[int] = []
    for child in children:
        leaf_ids.extend(_collect_leaf_ids(child, children_by_parent))
    return leaf_ids
def _balance_amount(account_type: str, debit: Decimal, credit: Decimal) -> Decimal:
    debit = _money(debit)
    credit = _money(credit)
    if account_type == "ASSET":
        return _money(debit - credit)
    return _money(credit - debit)
def _income_amount(account_type: str, debit: Decimal, credit: Decimal) -> Decimal:
    debit = _money(debit)
    credit = _money(credit)
    if account_type == "REVENUE":
        return _money(credit - debit)
    return _money(debit - credit)
def _serialize_account_row(*, account: Account, amount: Decimal, side: str) -> dict[str, Any]:
    return {
        "id": f"{side}-{account.id}",
        "row_type": "group" if account.is_group else "account",
        "side": side,
        "section": account.account_type,
        "code": account.code,
        "name": account.name,
        "name_en": account.name_en,
        "account_type": account.account_type,
        "account_type_display": account.get_account_type_display(),
        "nature": account.nature,
        "level": account.level,
        "is_group": account.is_group,
        "depth": max(account.level, 1),
        "amount": str(_money(amount)),
        "parent": (
            {
                "id": account.parent_id,
                "code": account.parent.code,
                "name": account.parent.name,
            }
            if account.parent_id
            else None
        ),
    }
def _section_row(side: str, section: str, label_ar: str, label_en: str, amount: Decimal) -> dict[str, Any]:
    return {
        "id": f"section-{side}-{section}",
        "row_type": "section",
        "side": side,
        "section": section,
        "code": "",
        "name": label_ar,
        "name_en": label_en,
        "account_type": section,
        "account_type_display": label_ar,
        "nature": "DEBIT" if section == "ASSET" else "CREDIT",
        "level": 0,
        "is_group": True,
        "depth": 0,
        "amount": str(_money(amount)),
        "parent": None,
    }
def _total_row(side: str, section: str, label_ar: str, label_en: str, amount: Decimal) -> dict[str, Any]:
    return {
        "id": f"total-{side}-{section}",
        "row_type": "total",
        "side": side,
        "section": section,
        "code": "",
        "name": label_ar,
        "name_en": label_en,
        "account_type": section,
        "account_type_display": label_ar,
        "nature": "DEBIT" if section == "ASSET" else "CREDIT",
        "level": 0,
        "is_group": True,
        "depth": 0,
        "amount": str(_money(amount)),
        "parent": None,
    }
def _net_income_row(net_income: Decimal) -> dict[str, Any]:
    is_profit = net_income >= MONEY_ZERO
    return {
        "id": "current-period-result",
        "row_type": "net_income",
        "side": "LIABILITIES_EQUITY",
        "section": "EQUITY",
        "code": "",
        "name": "صافي ربح الفترة" if is_profit else "صافي خسارة الفترة",
        "name_en": "Net profit for the period" if is_profit else "Net loss for the period",
        "account_type": "EQUITY",
        "account_type_display": "حقوق الملكية",
        "nature": "CREDIT" if is_profit else "DEBIT",
        "level": 0,
        "is_group": True,
        "depth": 1,
        "amount": str(_money(net_income)),
        "parent": None,
    }
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_financial_position(request):
    """
    GET /api/company/accounting/reports/financial-position/
    Query params:
    - as_of=YYYY-MM-DD
    - date_from=YYYY-MM-DD for current period result
    - level=summary|leaf|all|1|2|3|4|5
    - side=ALL|ASSET|LIABILITIES_EQUITY
    - include_zero=true/false
    - q=search
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
    as_of = _to_date(params.get("as_of") or params.get("date_to")) or datetime.now().date()
    date_from = _to_date(params.get("date_from")) or _year_start(as_of)
    if date_from > as_of:
        return Response(
            {
                "success": False,
                "message": "تاريخ بداية نتيجة الفترة لا يمكن أن يكون بعد تاريخ المركز المالي.",
            },
            status=400,
        )
    level = str(params.get("level") or "summary").strip().lower()
    side_filter = str(params.get("side") or "ALL").strip().upper()
    q = str(params.get("q") or params.get("search") or "").strip()
    include_zero = _to_bool(params.get("include_zero"), default=False)
    if side_filter not in {"ALL", "ASSET", "LIABILITIES_EQUITY"}:
        return Response(
            {
                "success": False,
                "message": "جانب المركز المالي غير صحيح.",
            },
            status=400,
        )
    all_accounts = list(
        Account.objects.filter(
            company=company,
            is_active=True,
            account_type__in=["ASSET", "LIABILITY", "EQUITY"],
        )
        .select_related("parent")
        .order_by("account_type", "code", "id")
    )
    children_by_parent: dict[int | None, list[Account]] = {}
    for account in all_accounts:
        children_by_parent.setdefault(account.parent_id, []).append(account)
    if level == "summary":
        display_accounts = [account for account in all_accounts if account.level == 2]
    elif level == "leaf":
        display_accounts = [account for account in all_accounts if not account.is_group]
    elif level == "all":
        display_accounts = all_accounts
    else:
        try:
            selected_level = int(level)
        except ValueError:
            selected_level = 0
        display_accounts = [
            account for account in all_accounts if selected_level > 0 and account.level == selected_level
        ]
    if side_filter == "ASSET":
        display_accounts = [account for account in display_accounts if account.account_type == "ASSET"]
    elif side_filter == "LIABILITIES_EQUITY":
        display_accounts = [
            account for account in display_accounts if account.account_type in ["LIABILITY", "EQUITY"]
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
    account_leaf_map: dict[int, list[int]] = {}
    all_leaf_ids: set[int] = set()
    for account in all_accounts:
        leaf_ids = _collect_leaf_ids(account, children_by_parent)
        if not leaf_ids and not account.is_group:
            leaf_ids = [account.id]
        account_leaf_map[account.id] = leaf_ids
        all_leaf_ids.update(leaf_ids)
    lines = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account_id__in=list(all_leaf_ids),
        journal_entry__entry_date__lte=as_of,
    )
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
    def amount_for_account(account: Account) -> Decimal:
        amount = MONEY_ZERO
        for leaf_id in account_leaf_map.get(account.id, []):
            totals = line_totals.get(
                leaf_id,
                {
                    "debit": MONEY_ZERO,
                    "credit": MONEY_ZERO,
                },
            )
            amount = _money(
                amount
                + _balance_amount(
                    account.account_type,
                    totals["debit"],
                    totals["credit"],
                )
            )
        return _money(amount)
    total_assets = MONEY_ZERO
    total_liabilities = MONEY_ZERO
    total_equity_raw = MONEY_ZERO
    for account in all_accounts:
        if account.is_group:
            continue
        totals = line_totals.get(
            account.id,
            {
                "debit": MONEY_ZERO,
                "credit": MONEY_ZERO,
            },
        )
        amount = _balance_amount(
            account.account_type,
            totals["debit"],
            totals["credit"],
        )
        if account.account_type == "ASSET":
            total_assets = _money(total_assets + amount)
        elif account.account_type == "LIABILITY":
            total_liabilities = _money(total_liabilities + amount)
        elif account.account_type == "EQUITY":
            total_equity_raw = _money(total_equity_raw + amount)
    income_lines = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        journal_entry__entry_date__gte=date_from,
        journal_entry__entry_date__lte=as_of,
        account__account_type__in=["REVENUE", "EXPENSE"],
    )
    income_totals = {
        row["account__account_type"]: {
            "debit": _money(row.get("debit")),
            "credit": _money(row.get("credit")),
        }
        for row in income_lines.values("account__account_type").annotate(
            debit=Sum("debit_amount"),
            credit=Sum("credit_amount"),
        )
    }
    revenue = _income_amount(
        "REVENUE",
        income_totals.get("REVENUE", {"debit": MONEY_ZERO, "credit": MONEY_ZERO})["debit"],
        income_totals.get("REVENUE", {"debit": MONEY_ZERO, "credit": MONEY_ZERO})["credit"],
    )
    expenses = _income_amount(
        "EXPENSE",
        income_totals.get("EXPENSE", {"debit": MONEY_ZERO, "credit": MONEY_ZERO})["debit"],
        income_totals.get("EXPENSE", {"debit": MONEY_ZERO, "credit": MONEY_ZERO})["credit"],
    )
    net_income = _money(revenue - expenses)
    total_equity = _money(total_equity_raw + net_income)
    total_liabilities_equity = _money(total_liabilities + total_equity)
    difference = _money(total_assets - total_liabilities_equity)
    asset_rows: list[dict[str, Any]] = []
    liabilities_equity_rows: list[dict[str, Any]] = []
    if side_filter in {"ALL", "ASSET"}:
        asset_rows.append(_section_row("ASSET", "ASSET", "الأصول", "Assets", total_assets))
        for account in [item for item in display_accounts if item.account_type == "ASSET"]:
            amount = amount_for_account(account)
            if not include_zero and amount == MONEY_ZERO:
                continue
            asset_rows.append(_serialize_account_row(account=account, amount=amount, side="ASSET"))
        asset_rows.append(_total_row("ASSET", "ASSET", "إجمالي الأصول", "Total assets", total_assets))
    if side_filter in {"ALL", "LIABILITIES_EQUITY"}:
        liabilities_equity_rows.append(
            _section_row(
                "LIABILITIES_EQUITY",
                "LIABILITY",
                "الالتزامات",
                "Liabilities",
                total_liabilities,
            )
        )
        for account in [item for item in display_accounts if item.account_type == "LIABILITY"]:
            amount = amount_for_account(account)
            if not include_zero and amount == MONEY_ZERO:
                continue
            liabilities_equity_rows.append(
                _serialize_account_row(
                    account=account,
                    amount=amount,
                    side="LIABILITIES_EQUITY",
                )
            )
        liabilities_equity_rows.append(
            _total_row(
                "LIABILITIES_EQUITY",
                "LIABILITY",
                "إجمالي الالتزامات",
                "Total liabilities",
                total_liabilities,
            )
        )
        liabilities_equity_rows.append(
            _section_row(
                "LIABILITIES_EQUITY",
                "EQUITY",
                "حقوق الملكية",
                "Equity",
                total_equity,
            )
        )
        for account in [item for item in display_accounts if item.account_type == "EQUITY"]:
            amount = amount_for_account(account)
            if not include_zero and amount == MONEY_ZERO:
                continue
            liabilities_equity_rows.append(
                _serialize_account_row(
                    account=account,
                    amount=amount,
                    side="LIABILITIES_EQUITY",
                )
            )
        if include_zero or net_income != MONEY_ZERO:
            liabilities_equity_rows.append(_net_income_row(net_income))
        liabilities_equity_rows.append(
            _total_row(
                "LIABILITIES_EQUITY",
                "EQUITY",
                "إجمالي حقوق الملكية",
                "Total equity",
                total_equity,
            )
        )
        liabilities_equity_rows.append(
            _total_row(
                "LIABILITIES_EQUITY",
                "LIABILITIES_EQUITY",
                "إجمالي الالتزامات وحقوق الملكية",
                "Total liabilities and equity",
                total_liabilities_equity,
            )
        )
    rows = asset_rows + liabilities_equity_rows
    return Response(
        {
            "success": True,
            "message": "تم جلب قائمة المركز المالي بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "filters": {
                "as_of": as_of.isoformat(),
                "date_from": date_from.isoformat(),
                "level": level,
                "side": side_filter,
                "q": q,
                "include_zero": include_zero,
            },
            "summary": {
                "rows_count": len(rows),
                "total_assets": str(total_assets),
                "total_liabilities": str(total_liabilities),
                "total_equity": str(total_equity),
                "total_equity_before_period_result": str(total_equity_raw),
                "net_income": str(net_income),
                "total_liabilities_equity": str(total_liabilities_equity),
                "difference": str(difference),
                "is_balanced": difference == MONEY_ZERO,
            },
            "assets": asset_rows,
            "liabilities_equity": liabilities_equity_rows,
            "results": rows,
        }
    )
accounting_financial_position.required_company_permissions = [
    "company.accounting.reports.view",
]
