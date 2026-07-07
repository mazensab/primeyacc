# ============================================================
# 📂 api/company/accounting/reports/cash_flow.py
# 🧠 Mhamcloud | Company Accounting Cash Flow API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Posted entries only
# ✅ Cash Flow Statement / قائمة التدفقات النقدية
# ✅ Operating / Investing / Financing sections
# ============================================================
from __future__ import annotations
from collections import defaultdict
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
def _cash_account_filter() -> Q:
    return (
        Q(code__startswith="101")
        | Q(code__startswith="102")
        | Q(code__startswith="1101")
        | Q(code__startswith="1102")
        | Q(name__icontains="نقد")
        | Q(name__icontains="صندوق")
        | Q(name__icontains="خزينة")
        | Q(name__icontains="بنك")
        | Q(name__icontains="مصرف")
        | Q(name_en__icontains="cash")
        | Q(name_en__icontains="bank")
        | Q(description__icontains="نقد")
        | Q(description__icontains="صندوق")
        | Q(description__icontains="بنك")
        | Q(purpose__icontains="cash")
        | Q(purpose__icontains="bank")
    )
def _cash_balance(company, cash_ids: list[int], *, before=None, to_date=None) -> Decimal:
    qs = JournalEntryLine.objects.filter(
        company=company,
        journal_entry__status=JournalEntryStatus.POSTED,
        account_id__in=cash_ids,
    )
    if before:
        qs = qs.filter(journal_entry__entry_date__lt=before)
    if to_date:
        qs = qs.filter(journal_entry__entry_date__lte=to_date)
    totals = qs.aggregate(
        debit=Sum("debit_amount"),
        credit=Sum("credit_amount"),
    )
    return _money(_money(totals.get("debit")) - _money(totals.get("credit")))
def _classify_counterpart(account: Account | None) -> str:
    if not account:
        return "OPERATING"
    text = " ".join(
        [
            account.code or "",
            account.name or "",
            account.name_en or "",
            account.description or "",
        ]
    ).lower()
    if account.account_type in {"REVENUE", "EXPENSE"}:
        return "OPERATING"
    if account.account_type == "EQUITY":
        return "FINANCING"
    if account.account_type == "LIABILITY":
        financing_words = [
            "قرض",
            "تمويل",
            "loan",
            "finance",
            "capital lease",
            "long term",
            "طويل",
        ]
        if any(word in text for word in financing_words):
            return "FINANCING"
        return "OPERATING"
    if account.account_type == "ASSET":
        investing_words = [
            "أصل ثابت",
            "اصول ثابتة",
            "استثمار",
            "عقار",
            "معدات",
            "سيارة",
            "اثاث",
            "أثاث",
            "property",
            "equipment",
            "investment",
            "vehicle",
            "furniture",
            "fixed asset",
        ]
        if any(word in text for word in investing_words):
            return "INVESTING"
        return "OPERATING"
    return "OPERATING"
def _section_label(section: str) -> tuple[str, str]:
    if section == "OPERATING":
        return "الأنشطة التشغيلية", "Operating activities"
    if section == "INVESTING":
        return "الأنشطة الاستثمارية", "Investing activities"
    return "الأنشطة التمويلية", "Financing activities"
def _section_row(section: str, amount: Decimal) -> dict[str, Any]:
    name_ar, name_en = _section_label(section)
    return {
        "id": f"section-{section}",
        "row_type": "section",
        "section": section,
        "code": "",
        "name": name_ar,
        "name_en": name_en,
        "depth": 0,
        "inflow": str(_money(amount if amount > MONEY_ZERO else MONEY_ZERO)),
        "outflow": str(_money(abs(amount) if amount < MONEY_ZERO else MONEY_ZERO)),
        "net": str(_money(amount)),
        "parent": None,
    }
def _total_row(section: str, amount: Decimal) -> dict[str, Any]:
    label_ar, label_en = _section_label(section)
    return {
        "id": f"total-{section}",
        "row_type": "total",
        "section": section,
        "code": "",
        "name": f"صافي {label_ar}",
        "name_en": f"Net {label_en}",
        "depth": 0,
        "inflow": str(_money(amount if amount > MONEY_ZERO else MONEY_ZERO)),
        "outflow": str(_money(abs(amount) if amount < MONEY_ZERO else MONEY_ZERO)),
        "net": str(_money(amount)),
        "parent": None,
    }
def _account_row(*, section: str, account: Account, amount: Decimal) -> dict[str, Any]:
    return {
        "id": f"{section}-{account.id}",
        "row_type": "account",
        "section": section,
        "code": account.code,
        "name": account.name,
        "name_en": account.name_en,
        "depth": max(account.level, 1),
        "inflow": str(_money(amount if amount > MONEY_ZERO else MONEY_ZERO)),
        "outflow": str(_money(abs(amount) if amount < MONEY_ZERO else MONEY_ZERO)),
        "net": str(_money(amount)),
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
def _summary_row(row_id: str, name: str, name_en: str, amount: Decimal) -> dict[str, Any]:
    return {
        "id": row_id,
        "row_type": "summary",
        "section": "SUMMARY",
        "code": "",
        "name": name,
        "name_en": name_en,
        "depth": 0,
        "inflow": str(_money(amount if amount > MONEY_ZERO else MONEY_ZERO)),
        "outflow": str(_money(abs(amount) if amount < MONEY_ZERO else MONEY_ZERO)),
        "net": str(_money(amount)),
        "parent": None,
    }
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_cash_flow(request):
    """
    GET /api/company/accounting/reports/cash-flow/
    Query params:
    - date_from=YYYY-MM-DD
    - date_to=YYYY-MM-DD
    - section=ALL|OPERATING|INVESTING|FINANCING
    - level=summary|detailed|leaf
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
    date_to = _to_date(params.get("date_to")) or datetime.now().date()
    date_from = _to_date(params.get("date_from")) or date_to.replace(month=1, day=1)
    if date_to < date_from:
        return Response(
            {
                "success": False,
                "message": "تاريخ النهاية لا يمكن أن يكون قبل تاريخ البداية.",
            },
            status=400,
        )
    section_filter = str(params.get("section") or "ALL").strip().upper()
    level = str(params.get("level") or "summary").strip().lower()
    q = str(params.get("q") or params.get("search") or "").strip()
    include_zero = _to_bool(params.get("include_zero"), default=False)
    if section_filter not in {"ALL", "OPERATING", "INVESTING", "FINANCING"}:
        return Response(
            {
                "success": False,
                "message": "قسم التدفقات النقدية غير صحيح.",
            },
            status=400,
        )
    cash_accounts = Account.objects.filter(
        company=company,
        is_active=True,
        is_group=False,
        account_type="ASSET",
    ).filter(_cash_account_filter())
    cash_ids = list(cash_accounts.values_list("id", flat=True))
    opening_cash = _cash_balance(company, cash_ids, before=date_from) if cash_ids else MONEY_ZERO
    closing_cash = _cash_balance(company, cash_ids, to_date=date_to) if cash_ids else MONEY_ZERO
    cash_lines = list(
        JournalEntryLine.objects.filter(
            company=company,
            journal_entry__status=JournalEntryStatus.POSTED,
            journal_entry__entry_date__gte=date_from,
            journal_entry__entry_date__lte=date_to,
            account_id__in=cash_ids,
        ).select_related("journal_entry", "account")
    )
    entry_ids = [line.journal_entry_id for line in cash_lines]
    counterpart_lines = list(
        JournalEntryLine.objects.filter(
            company=company,
            journal_entry_id__in=entry_ids,
        )
        .exclude(account_id__in=cash_ids)
        .select_related("account", "account__parent")
    )
    counterparts_by_entry: dict[int, list[JournalEntryLine]] = defaultdict(list)
    for line in counterpart_lines:
        counterparts_by_entry[line.journal_entry_id].append(line)
    movement_by_key: dict[tuple[str, int], Decimal] = defaultdict(lambda: MONEY_ZERO)
    account_by_id: dict[int, Account] = {}
    for cash_line in cash_lines:
        cash_amount = _money(cash_line.debit_amount - cash_line.credit_amount)
        if cash_amount == MONEY_ZERO:
            continue
        counterparts = counterparts_by_entry.get(cash_line.journal_entry_id, [])
        if not counterparts:
            continue
        total_abs = sum(
            abs(_money(line.debit_amount - line.credit_amount))
            for line in counterparts
        )
        if total_abs == MONEY_ZERO:
            main = counterparts[0]
            section = _classify_counterpart(main.account)
            if section_filter not in {"ALL", section}:
                continue
            account_by_id[main.account_id] = main.account
            movement_by_key[(section, main.account_id)] = _money(
                movement_by_key[(section, main.account_id)] + cash_amount
            )
            continue
        for counterpart in counterparts:
            counterpart_abs = abs(_money(counterpart.debit_amount - counterpart.credit_amount))
            if counterpart_abs == MONEY_ZERO:
                continue
            allocated = _money(cash_amount * counterpart_abs / total_abs)
            section = _classify_counterpart(counterpart.account)
            if section_filter not in {"ALL", section}:
                continue
            account_by_id[counterpart.account_id] = counterpart.account
            movement_by_key[(section, counterpart.account_id)] = _money(
                movement_by_key[(section, counterpart.account_id)] + allocated
            )
    section_totals = {
        "OPERATING": MONEY_ZERO,
        "INVESTING": MONEY_ZERO,
        "FINANCING": MONEY_ZERO,
    }
    for (section, _account_id), amount in movement_by_key.items():
        section_totals[section] = _money(section_totals[section] + amount)
    rows: list[dict[str, Any]] = []
    for section in ["OPERATING", "INVESTING", "FINANCING"]:
        if section_filter not in {"ALL", section}:
            continue
        section_amount = section_totals[section]
        if include_zero or section_amount != MONEY_ZERO or level == "summary":
            rows.append(_section_row(section, section_amount))
        if level not in {"summary", ""}:
            section_keys = [
                key
                for key in movement_by_key.keys()
                if key[0] == section
            ]
            for key in sorted(section_keys, key=lambda item: account_by_id[item[1]].code):
                amount = movement_by_key[key]
                account = account_by_id[key[1]]
                if q:
                    q_lower = q.lower()
                    haystack = " ".join(
                        [
                            account.code or "",
                            account.name or "",
                            account.name_en or "",
                            account.description or "",
                            section,
                        ]
                    ).lower()
                    if q_lower not in haystack:
                        continue
                if not include_zero and amount == MONEY_ZERO:
                    continue
                rows.append(_account_row(section=section, account=account, amount=amount))
        if include_zero or section_amount != MONEY_ZERO or level == "summary":
            rows.append(_total_row(section, section_amount))
    net_cash_flow = _money(
        section_totals["OPERATING"]
        + section_totals["INVESTING"]
        + section_totals["FINANCING"]
    )
    calculated_closing_cash = _money(opening_cash + net_cash_flow)
    if section_filter == "ALL":
        rows.extend(
            [
                _summary_row("opening-cash", "رصيد النقد أول الفترة", "Opening cash balance", opening_cash),
                _summary_row("net-cash-flow", "صافي التدفق النقدي", "Net cash flow", net_cash_flow),
                _summary_row("closing-cash", "رصيد النقد آخر الفترة", "Closing cash balance", calculated_closing_cash),
            ]
        )
    return Response(
        {
            "success": True,
            "message": "تم جلب قائمة التدفقات النقدية بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "filters": {
                "date_from": date_from.isoformat(),
                "date_to": date_to.isoformat(),
                "section": section_filter,
                "level": level,
                "q": q,
                "include_zero": include_zero,
            },
            "summary": {
                "rows_count": len(rows),
                "cash_accounts_count": len(cash_ids),
                "opening_cash": str(opening_cash),
                "operating_cash_flow": str(section_totals["OPERATING"]),
                "investing_cash_flow": str(section_totals["INVESTING"]),
                "financing_cash_flow": str(section_totals["FINANCING"]),
                "net_cash_flow": str(net_cash_flow),
                "closing_cash": str(closing_cash),
                "calculated_closing_cash": str(calculated_closing_cash),
                "difference": str(_money(closing_cash - calculated_closing_cash)),
            },
            "results": rows,
        }
    )
accounting_cash_flow.required_company_permissions = [
    "company.accounting.reports.view",
]
