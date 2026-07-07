# ============================================================
# 📂 api/company/accounting/reports/ledger.py
# 🧠 Mhamcloud | Company Accounting Ledger API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Posted entries only affect the ledger
# ✅ SMACC-like grouped ledger sections
# ✅ Opening balance / movements / totals / closing balance
# ✅ Backward compatible flat lines/results/items payload
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
def _money_text(value: Any) -> str:
    return str(_money(value))
def _to_date(value: Any):
    if value in [None, ""]:
        return None
    text = str(value).strip()[:10]
    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None
def _to_bool(value: Any, *, default: bool = False) -> bool:
    if value in [None, ""]:
        return default
    text = str(value).strip().lower()
    if text in {"1", "true", "yes", "y", "on"}:
        return True
    if text in {"0", "false", "no", "n", "off"}:
        return False
    return default
def _balance_side(account: Account, balance: Decimal) -> str:
    balance = _money(balance)
    if balance > MONEY_ZERO:
        return "DEBIT"
    if balance < MONEY_ZERO:
        return "CREDIT"
    return account.nature
def _serialize_account(account: Account) -> dict[str, Any]:
    return {
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
                "name_en": account.parent.name_en,
            }
            if account.parent_id
            else None
        ),
    }
def _serialize_line(line: JournalEntryLine, running_balance: Decimal) -> dict[str, Any]:
    entry = line.journal_entry
    account = line.account
    cost_center = line.cost_center
    debit = _money(line.debit_amount)
    credit = _money(line.credit_amount)
    return {
        "id": line.id,
        "line_id": line.id,
        "date": entry.entry_date.isoformat() if entry.entry_date else "",
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else "",
        "operation_number": entry.id,
        "entry_id": entry.id,
        "entry_number": entry.entry_number,
        "journal_entry_number": entry.entry_number,
        "reference_number": entry.entry_number,
        "account_id": account.id,
        "account_code": account.code,
        "account_name": account.name,
        "account_name_en": account.name_en,
        "cost_center_id": cost_center.id if cost_center else None,
        "cost_center_code": cost_center.code if cost_center else "",
        "cost_center_name": cost_center.name if cost_center else "",
        "description": line.description or entry.description or "",
        "debit_amount": _money_text(debit),
        "credit_amount": _money_text(credit),
        "debit": _money_text(debit),
        "credit": _money_text(credit),
        "running_balance": _money_text(running_balance),
        "balance": _money_text(running_balance),
        "currency": line.currency or getattr(entry, "currency", "SAR") or "SAR",
        "status": entry.status,
        "source": getattr(entry, "posting_source", "") or getattr(entry, "source_type", "") or "",
        "sort_order": line.sort_order,
    }
def _collect_leaf_ids(account: Account, children_by_parent: dict[int | None, list[Account]]) -> list[int]:
    children = children_by_parent.get(account.id, [])
    if not children:
        return [] if account.is_group else [account.id]
    ids: list[int] = []
    for child in children:
        ids.extend(_collect_leaf_ids(child, children_by_parent))
    return ids
def _line_search_filter(search: str) -> Q:
    return (
        Q(journal_entry__entry_number__icontains=search)
        | Q(journal_entry__description__icontains=search)
        | Q(account__code__icontains=search)
        | Q(account__name__icontains=search)
        | Q(account__name_en__icontains=search)
        | Q(cost_center__code__icontains=search)
        | Q(cost_center__name__icontains=search)
        | Q(description__icontains=search)
    )
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_ledger_report(request):
    """
    GET /api/company/accounting/reports/ledger/
    Query params:
    - date_from=YYYY-MM-DD
    - date_to=YYYY-MM-DD
    - account_code=110101
    - q/search=text
    - report_type=accounts/general
    - level=leaf/all/1/2/3/4
    - include_zero=true/false
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
    account_code = str(params.get("account_code") or "").strip()
    search = str(params.get("search") or params.get("q") or "").strip()
    report_type = str(params.get("report_type") or params.get("mode") or "accounts").strip().lower()
    level = str(params.get("level") or "").strip().lower()
    include_zero = _to_bool(params.get("include_zero"), default=False)
    if report_type not in {"accounts", "general"}:
        report_type = "accounts"
    all_accounts = list(
        Account.objects.filter(company=company)
        .select_related("parent")
        .order_by("code", "id")
    )
    account_by_id = {account.id: account for account in all_accounts}
    children_by_parent: dict[int | None, list[Account]] = {}
    for account in all_accounts:
        children_by_parent.setdefault(account.parent_id, []).append(account)
    selected_account = None
    if account_code:
        selected_account = (
            Account.objects.filter(company=company, code=account_code)
            .select_related("parent")
            .first()
        )
        if not selected_account:
            return Response(
                {
                    "success": False,
                    "message": "الحساب المحدد غير موجود في الشركة الحالية.",
                },
                status=404,
            )
    if selected_account:
        display_accounts = [selected_account]
    elif report_type == "general":
        selected_level = 2
        if level and level not in {"leaf", "all"}:
            try:
                selected_level = int(level)
            except ValueError:
                selected_level = 2
        if level == "all":
            display_accounts = [account for account in all_accounts if account.is_group]
        else:
            display_accounts = [
                account
                for account in all_accounts
                if account.is_group and account.level == selected_level
            ]
    else:
        display_accounts = [account for account in all_accounts if not account.is_group]
    base_lines = (
        JournalEntryLine.objects.select_related(
            "journal_entry",
            "account",
            "cost_center",
        )
        .filter(
            company=company,
            journal_entry__status=JournalEntryStatus.POSTED,
        )
    )
    if account_code and selected_account:
        selected_leaf_ids = _collect_leaf_ids(selected_account, children_by_parent)
        if not selected_leaf_ids and not selected_account.is_group:
            selected_leaf_ids = [selected_account.id]
        base_lines = base_lines.filter(account_id__in=selected_leaf_ids)
    if search:
        base_lines = base_lines.filter(_line_search_filter(search))
    period_lines = base_lines
    if date_from:
        period_lines = period_lines.filter(journal_entry__entry_date__gte=date_from)
    if date_to:
        period_lines = period_lines.filter(journal_entry__entry_date__lte=date_to)
    period_lines = period_lines.order_by(
        "account__code",
        "journal_entry__entry_date",
        "journal_entry__entry_number",
        "sort_order",
        "id",
    )[:5000]
    all_period_lines = list(period_lines)
    period_lines_by_account: dict[int, list[JournalEntryLine]] = {}
    for line in all_period_lines:
        period_lines_by_account.setdefault(line.account_id, []).append(line)
    opening_lines = (
        JournalEntryLine.objects.filter(
            company=company,
            journal_entry__status=JournalEntryStatus.POSTED,
        )
    )
    if date_from:
        opening_lines = opening_lines.filter(journal_entry__entry_date__lt=date_from)
    else:
        opening_lines = opening_lines.none()
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
    sections: list[dict[str, Any]] = []
    flat_rows: list[dict[str, Any]] = []
    summary_total_debit = MONEY_ZERO
    summary_total_credit = MONEY_ZERO
    summary_opening_balance = MONEY_ZERO
    summary_closing_balance = MONEY_ZERO
    for account in display_accounts:
        leaf_ids = _collect_leaf_ids(account, children_by_parent)
        if not leaf_ids and not account.is_group:
            leaf_ids = [account.id]
        leaf_ids = [leaf_id for leaf_id in leaf_ids if leaf_id in account_by_id]
        opening_balance = MONEY_ZERO
        for leaf_id in leaf_ids:
            leaf = account_by_id[leaf_id]
            opening_balance += _money(leaf.opening_balance)
            totals = opening_totals.get(leaf_id, {})
            opening_balance += _money(totals.get("debit")) - _money(totals.get("credit"))
        section_lines: list[dict[str, Any]] = []
        running_balance = _money(opening_balance)
        period_debit = MONEY_ZERO
        period_credit = MONEY_ZERO
        raw_lines: list[JournalEntryLine] = []
        for leaf_id in leaf_ids:
            raw_lines.extend(period_lines_by_account.get(leaf_id, []))
        raw_lines.sort(
            key=lambda line: (
                line.journal_entry.entry_date,
                line.journal_entry.entry_number,
                line.sort_order,
                line.id,
            )
        )
        for line in raw_lines:
            debit = _money(line.debit_amount)
            credit = _money(line.credit_amount)
            period_debit += debit
            period_credit += credit
            running_balance += debit - credit
            serialized = _serialize_line(line, running_balance)
            section_lines.append(serialized)
            flat_rows.append(serialized)
        closing_balance = _money(running_balance)
        period_balance = _money(period_debit - period_credit)
        if not include_zero and not selected_account:
            if (
                opening_balance == MONEY_ZERO
                and period_debit == MONEY_ZERO
                and period_credit == MONEY_ZERO
                and closing_balance == MONEY_ZERO
            ):
                continue
        summary_total_debit += period_debit
        summary_total_credit += period_credit
        summary_opening_balance += opening_balance
        summary_closing_balance += closing_balance
        section = {
            "account": _serialize_account(account),
            "account_id": account.id,
            "account_code": account.code,
            "account_name": account.name,
            "account_name_en": account.name_en,
            "opening_balance": _money_text(opening_balance),
            "opening_balance_abs": _money_text(abs(opening_balance)),
            "opening_balance_side": _balance_side(account, opening_balance),
            "period_debit": _money_text(period_debit),
            "period_credit": _money_text(period_credit),
            "period_balance": _money_text(period_balance),
            "closing_balance": _money_text(closing_balance),
            "closing_balance_abs": _money_text(abs(closing_balance)),
            "closing_balance_side": _balance_side(account, closing_balance),
            "line_count": len(section_lines),
            "lines": section_lines,
        }
        sections.append(section)
    summary = {
        "total_sections": len(sections),
        "total_lines": len(flat_rows),
        "total_debit": _money_text(summary_total_debit),
        "total_credit": _money_text(summary_total_credit),
        "net_balance": _money_text(summary_total_debit - summary_total_credit),
        "opening_balance": _money_text(summary_opening_balance),
        "closing_balance": _money_text(summary_closing_balance),
    }
    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Ledger loaded successfully.",
            "company": {
                "id": company.id,
                "name": getattr(company, "name", ""),
            },
            "filters": {
                "date_from": date_from.isoformat() if date_from else "",
                "date_to": date_to.isoformat() if date_to else "",
                "account_code": account_code,
                "search": search,
                "report_type": report_type,
                "level": level,
                "include_zero": include_zero,
            },
            "summary": summary,
            "count": len(flat_rows),
            "sections": sections,
            "groups": sections,
            "accounts": sections,
            "lines": flat_rows,
            "results": flat_rows,
            "items": flat_rows,
        }
    )
accounting_ledger_report.required_company_permissions = [
    "company.accounting.view",
    "company.accounting.journal_entries.view",
    "company.reports.view",
]
