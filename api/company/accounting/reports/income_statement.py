# ============================================================
# 📂 api/company/accounting/reports/income_statement.py
# 🧠 Mhamcloud | Company Accounting Income Statement API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Posted entries only
# ✅ Income Statement / قائمة الدخل
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
def _collect_leaf_ids(account: Account, children_by_parent: dict[int | None, list[Account]]) -> list[int]:
    children = children_by_parent.get(account.id, [])
    if not children:
        return [] if account.is_group else [account.id]
    leaf_ids: list[int] = []
    for child in children:
        leaf_ids.extend(_collect_leaf_ids(child, children_by_parent))
    return leaf_ids
def _amount_for_type(account_type: str, debit: Decimal, credit: Decimal) -> Decimal:
    """
    Income statement presentation:
    - Revenue is credit-natural: credit - debit.
    - Expense is debit-natural: debit - credit.
    """
    debit = _money(debit)
    credit = _money(credit)
    if account_type == "REVENUE":
        return _money(credit - debit)
    return _money(debit - credit)
def _serialize_account_row(
    *,
    account: Account,
    amount: Decimal,
    row_type: str = "account",
    depth: int = 1,
) -> dict[str, Any]:
    return {
        "id": f"{row_type}-{account.id}",
        "row_type": row_type,
        "section": account.account_type,
        "code": account.code,
        "name": account.name,
        "name_en": account.name_en,
        "account_type": account.account_type,
        "account_type_display": account.get_account_type_display(),
        "nature": account.nature,
        "level": account.level,
        "is_group": account.is_group,
        "depth": depth,
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
def _section_row(section: str, label_ar: str, label_en: str, amount: Decimal) -> dict[str, Any]:
    return {
        "id": f"section-{section}",
        "row_type": "section",
        "section": section,
        "code": "",
        "name": label_ar,
        "name_en": label_en,
        "account_type": section,
        "account_type_display": label_ar,
        "nature": "CREDIT" if section == "REVENUE" else "DEBIT",
        "level": 0,
        "is_group": True,
        "depth": 0,
        "amount": str(_money(amount)),
        "parent": None,
    }
def _total_row(section: str, label_ar: str, label_en: str, amount: Decimal) -> dict[str, Any]:
    return {
        "id": f"total-{section}",
        "row_type": "total",
        "section": section,
        "code": "",
        "name": label_ar,
        "name_en": label_en,
        "account_type": section,
        "account_type_display": label_ar,
        "nature": "CREDIT" if section == "REVENUE" else "DEBIT",
        "level": 0,
        "is_group": True,
        "depth": 0,
        "amount": str(_money(amount)),
        "parent": None,
    }
def _net_row(net_income: Decimal) -> dict[str, Any]:
    is_profit = net_income >= MONEY_ZERO
    return {
        "id": "net-income",
        "row_type": "net",
        "section": "NET",
        "code": "",
        "name": "صافي ربح الفترة" if is_profit else "صافي خسارة الفترة",
        "name_en": "Net profit for the period" if is_profit else "Net loss for the period",
        "account_type": "NET",
        "account_type_display": "صافي نتيجة الفترة",
        "nature": "CREDIT" if is_profit else "DEBIT",
        "level": 0,
        "is_group": True,
        "depth": 0,
        "amount": str(_money(abs(net_income))),
        "signed_amount": str(_money(net_income)),
        "parent": None,
    }
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_income_statement(request):
    """
    GET /api/company/accounting/reports/income-statement/
    Query params:
    - date_from=YYYY-MM-DD
    - date_to=YYYY-MM-DD
    - section=all|REVENUE|EXPENSE
    - level=summary|leaf|all|1|2|3|4|5
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
    q = str(params.get("q") or params.get("search") or "").strip()
    section = str(params.get("section") or "all").strip().upper()
    level = str(params.get("level") or "summary").strip().lower()
    include_zero = _to_bool(params.get("include_zero"), default=False)
    if section not in {"ALL", "REVENUE", "EXPENSE"}:
        return Response(
            {
                "success": False,
                "message": "قسم قائمة الدخل غير صحيح.",
            },
            status=400,
        )
    all_accounts = list(
        Account.objects.filter(
            company=company,
            is_active=True,
            account_type__in=["REVENUE", "EXPENSE"],
        )
        .select_related("parent")
        .order_by("account_type", "code", "id")
    )
    children_by_parent: dict[int | None, list[Account]] = {}
    for account in all_accounts:
        children_by_parent.setdefault(account.parent_id, []).append(account)
    display_accounts = all_accounts
    if section != "ALL":
        display_accounts = [
            account for account in display_accounts if account.account_type == section
        ]
    if level == "summary":
        display_accounts = []
    elif level == "leaf":
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
    source_accounts = display_accounts if display_accounts else all_accounts
    for account in source_accounts:
        leaf_ids = _collect_leaf_ids(account, children_by_parent)
        if not leaf_ids and not account.is_group:
            leaf_ids = [account.id]
        account_leaf_map[account.id] = leaf_ids
        all_leaf_ids.update(leaf_ids)
    lines = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account_id__in=list(all_leaf_ids),
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
                + _amount_for_type(
                    account.account_type,
                    totals["debit"],
                    totals["credit"],
                )
            )
        return _money(amount)
    revenue_total = MONEY_ZERO
    expense_total = MONEY_ZERO
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
        amount = _amount_for_type(
            account.account_type,
            totals["debit"],
            totals["credit"],
        )
        if account.account_type == "REVENUE":
            revenue_total = _money(revenue_total + amount)
        elif account.account_type == "EXPENSE":
            expense_total = _money(expense_total + amount)
    rows: list[dict[str, Any]] = []
    show_expenses = section in {"ALL", "EXPENSE"}
    show_revenue = section in {"ALL", "REVENUE"}
    if show_expenses:
        rows.append(_section_row("EXPENSE", "المصروفات", "Expenses", expense_total))
        if level != "summary":
            for account in [item for item in display_accounts if item.account_type == "EXPENSE"]:
                amount = amount_for_account(account)
                if not include_zero and amount == MONEY_ZERO:
                    continue
                rows.append(
                    _serialize_account_row(
                        account=account,
                        amount=amount,
                        row_type="group" if account.is_group else "account",
                        depth=max(account.level, 1),
                    )
                )
        rows.append(_total_row("EXPENSE", "إجمالي المصروفات", "Total expenses", expense_total))
    if show_revenue:
        rows.append(_section_row("REVENUE", "الدخل", "Income", revenue_total))
        if level != "summary":
            for account in [item for item in display_accounts if item.account_type == "REVENUE"]:
                amount = amount_for_account(account)
                if not include_zero and amount == MONEY_ZERO:
                    continue
                rows.append(
                    _serialize_account_row(
                        account=account,
                        amount=amount,
                        row_type="group" if account.is_group else "account",
                        depth=max(account.level, 1),
                    )
                )
        rows.append(_total_row("REVENUE", "إجمالي الدخل", "Total income", revenue_total))
    net_income = _money(revenue_total - expense_total)
    if section == "ALL":
        rows.append(_net_row(net_income))
    return Response(
        {
            "success": True,
            "message": "تم جلب قائمة الدخل بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "filters": {
                "date_from": date_from.isoformat() if date_from else "",
                "date_to": date_to.isoformat() if date_to else "",
                "section": section,
                "level": level,
                "q": q,
                "include_zero": include_zero,
            },
            "summary": {
                "rows_count": len(rows),
                "total_revenue": str(revenue_total),
                "total_income": str(revenue_total),
                "total_expenses": str(expense_total),
                "net_income": str(net_income),
                "net_profit": str(net_income if net_income >= MONEY_ZERO else MONEY_ZERO),
                "net_loss": str(abs(net_income) if net_income < MONEY_ZERO else MONEY_ZERO),
                "is_profit": net_income >= MONEY_ZERO,
            },
            "results": rows,
        }
    )
accounting_income_statement.required_company_permissions = [
    "company.accounting.reports.view",
]
