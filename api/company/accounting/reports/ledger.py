# ============================================================
# 📂 api/company/accounting/reports/ledger.py
# 🧠 Mhamcloud | Company Accounting Ledger API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Direct JournalEntryLine ledger rows
# ✅ Posted entries only affect the ledger
# ============================================================
from __future__ import annotations
from datetime import date
from decimal import Decimal
from typing import Any
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from accounting.models import JournalEntryLine, JournalEntryStatus
from api.company.accounting.cost_centers.common import json_error, resolve_company
MONEY_QUANT = Decimal("0.01")
def _money(value: Any) -> str:
    return str((value or Decimal("0.00")).quantize(MONEY_QUANT))
def _parse_date(value: str | None, field: str) -> date | None:
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except ValueError as exc:
        raise ValidationError({field: "صيغة التاريخ يجب أن تكون YYYY-MM-DD."}) from exc
def _serialize_line(line: JournalEntryLine, running_balance: Decimal) -> dict[str, Any]:
    entry = line.journal_entry
    account = line.account
    cost_center = line.cost_center
    return {
        "id": line.id,
        "line_id": line.id,
        "date": entry.entry_date.isoformat() if entry.entry_date else "",
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else "",
        "entry_id": entry.id,
        "entry_number": entry.entry_number,
        "journal_entry_number": entry.entry_number,
        "account_id": account.id,
        "account_code": account.code,
        "account_name": account.name,
        "account_name_en": getattr(account, "name_en", "") or "",
        "cost_center_id": cost_center.id if cost_center else None,
        "cost_center_code": cost_center.code if cost_center else "",
        "cost_center_name": cost_center.name if cost_center else "",
        "description": line.description or entry.description or "",
        "debit_amount": _money(line.debit_amount),
        "credit_amount": _money(line.credit_amount),
        "debit": _money(line.debit_amount),
        "credit": _money(line.credit_amount),
        "running_balance": _money(running_balance),
        "balance": _money(running_balance),
        "currency": line.currency or getattr(entry, "currency", "SAR") or "SAR",
        "status": entry.status,
        "source": getattr(entry, "posting_source", "") or getattr(entry, "source_type", "") or "",
        "sort_order": line.sort_order,
    }
@require_GET
def accounting_ledger_report(request):
    """
    GET /api/company/accounting/reports/ledger/
    Query params:
    - date_from=YYYY-MM-DD
    - date_to=YYYY-MM-DD
    - account_code=110101
    - search=text
    """
    company = resolve_company(request)
    if company is None:
        return json_error("لا توجد شركة نشطة للمستخدم الحالي.", status=401)
    try:
        date_from = _parse_date(request.GET.get("date_from"), "date_from")
        date_to = _parse_date(request.GET.get("date_to"), "date_to")
    except ValidationError as exc:
        return json_error(
            "تعذر تحميل دفتر الأستاذ.",
            status=400,
            field_errors=getattr(exc, "message_dict", {"detail": exc.messages}),
        )
    account_code = (request.GET.get("account_code") or "").strip()
    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    queryset = (
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
    if date_from:
        queryset = queryset.filter(journal_entry__entry_date__gte=date_from)
    if date_to:
        queryset = queryset.filter(journal_entry__entry_date__lte=date_to)
    if account_code:
        queryset = queryset.filter(account__code=account_code)
    if search:
        queryset = queryset.filter(
            Q(journal_entry__entry_number__icontains=search)
            | Q(journal_entry__description__icontains=search)
            | Q(account__code__icontains=search)
            | Q(account__name__icontains=search)
            | Q(cost_center__code__icontains=search)
            | Q(cost_center__name__icontains=search)
            | Q(description__icontains=search)
        )
    queryset = queryset.order_by(
        "account__code",
        "journal_entry__entry_date",
        "journal_entry__entry_number",
        "sort_order",
        "id",
    )[:2000]
    balances_by_account: dict[str, Decimal] = {}
    rows = []
    total_debit = Decimal("0.00")
    total_credit = Decimal("0.00")
    for line in queryset:
        account_key = line.account.code
        debit = line.debit_amount or Decimal("0.00")
        credit = line.credit_amount or Decimal("0.00")
        total_debit += debit
        total_credit += credit
        balances_by_account[account_key] = balances_by_account.get(
            account_key,
            Decimal("0.00"),
        ) + debit - credit
        rows.append(_serialize_line(line, balances_by_account[account_key]))
    summary = {
        "total_lines": len(rows),
        "total_debit": _money(total_debit),
        "total_credit": _money(total_credit),
        "net_balance": _money(total_debit - total_credit),
    }
    return JsonResponse(
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
            },
            "summary": summary,
            "count": len(rows),
            "lines": rows,
            "results": rows,
            "items": rows,
        }
    )
accounting_ledger_report.required_company_permissions = [
    "company.accounting.view",
    "company.accounting.journal_entries.view",
    "company.reports.view",
]
