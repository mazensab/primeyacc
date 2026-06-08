# ============================================================
# 📂 api/company/accounting/journal_entries/list.py
# 🧠 PrimeyAcc | Company Accounting Journal Entries List API
# ------------------------------------------------------------
# ✅ عرض قيود اليومية للشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ فلاتر حسب الحالة والمصدر والتاريخ والبحث
# ✅ ملخص سريع للقيود والإجماليات
# ============================================================

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any

from django.db.models import Count, Q, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import JournalEntry
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

def _to_int(value: Any) -> int | None:
    if value in [None, ""]:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _to_bool(value: Any) -> bool | None:
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _to_date(value: Any):
    if value in [None, ""]:
        return None

    text = str(value).strip()

    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _money(value: Any) -> Decimal:
    return Decimal(str(value or "0.00")).quantize(Decimal("0.01"))


def _serialize_entry(entry: JournalEntry) -> dict[str, Any]:
    period = entry.period

    return {
        "id": entry.id,
        "company_id": entry.company_id,
        "entry_number": entry.entry_number,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
        "period": (
            {
                "id": period.id,
                "name": period.name,
                "start_date": period.start_date.isoformat() if period.start_date else None,
                "end_date": period.end_date.isoformat() if period.end_date else None,
                "status": period.status,
            }
            if period
            else None
        ),
        "status": entry.status,
        "status_display": entry.get_status_display(),
        "posting_source": entry.posting_source,
        "posting_source_display": entry.get_posting_source_display(),
        "reference": entry.reference,
        "external_reference": entry.external_reference,
        "source_type": entry.source_type,
        "source_id": entry.source_id,
        "source_number": entry.source_number,
        "description": entry.description,
        "notes": entry.notes,
        "currency": entry.currency,
        "is_auto_posted": entry.is_auto_posted,
        "posted_at": entry.posted_at.isoformat() if entry.posted_at else None,
        "cancelled_at": entry.cancelled_at.isoformat() if entry.cancelled_at else None,
        "reversed_at": entry.reversed_at.isoformat() if entry.reversed_at else None,
        "reversal_of": (
            {
                "id": entry.reversal_of_id,
                "entry_number": entry.reversal_of.entry_number,
            }
            if entry.reversal_of_id
            else None
        ),
        "reversed_entry": (
            {
                "id": entry.reversed_entry_id,
                "entry_number": entry.reversed_entry.entry_number,
            }
            if entry.reversed_entry_id
            else None
        ),
        "total_debit": str(entry.total_debit),
        "total_credit": str(entry.total_credit),
        "is_balanced": entry.is_balanced,
        "can_edit": entry.can_edit,
        "lines_count": getattr(entry, "lines_count", 0),
        "created_by": (
            {
                "id": entry.created_by_id,
                "username": entry.created_by.get_username(),
            }
            if entry.created_by_id
            else None
        ),
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


def _build_summary(queryset) -> dict[str, Any]:
    totals = queryset.aggregate(
        total_debit=Sum("total_debit"),
        total_credit=Sum("total_credit"),
    )

    by_status = {
        row["status"]: row["count"]
        for row in queryset.values("status").annotate(count=Count("id"))
    }

    by_source = {
        row["posting_source"]: row["count"]
        for row in queryset.values("posting_source").annotate(count=Count("id"))
    }

    return {
        "total_entries": queryset.count(),
        "total_debit": str(_money(totals.get("total_debit"))),
        "total_credit": str(_money(totals.get("total_credit"))),
        "by_status": by_status,
        "by_source": by_source,
        "draft_count": by_status.get("DRAFT", 0),
        "posted_count": by_status.get("POSTED", 0),
        "cancelled_count": by_status.get("CANCELLED", 0),
        "reversed_count": by_status.get("REVERSED", 0),
        "auto_posted_count": queryset.filter(is_auto_posted=True).count(),
        "manual_count": queryset.filter(is_auto_posted=False).count(),
    }


# ============================================================
# API
# ============================================================

@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_journal_entries_list(request):
    """
    GET /api/company/accounting/journal-entries/

    Query params:
    - q
    - status
    - posting_source
    - date_from
    - date_to
    - is_auto_posted
    - source_type
    - source_id
    - source_number
    - limit
    - offset
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

    q = str(params.get("q") or "").strip()
    status_value = str(params.get("status") or "").strip()
    posting_source = str(params.get("posting_source") or "").strip()
    source_type = str(params.get("source_type") or "").strip()
    source_id = str(params.get("source_id") or "").strip()
    source_number = str(params.get("source_number") or "").strip()

    date_from = _to_date(params.get("date_from"))
    date_to = _to_date(params.get("date_to"))
    is_auto_posted = _to_bool(params.get("is_auto_posted"))

    limit = _to_int(params.get("limit")) or 100
    offset = _to_int(params.get("offset")) or 0

    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    queryset = (
        JournalEntry.objects.filter(company=company)
        .select_related(
            "company",
            "period",
            "created_by",
            "posted_by",
            "cancelled_by",
            "reversal_of",
            "reversed_entry",
        )
        .annotate(lines_count=Count("lines"))
        .order_by("-entry_date", "-id")
    )

    if q:
        queryset = queryset.filter(
            Q(entry_number__icontains=q)
            | Q(reference__icontains=q)
            | Q(external_reference__icontains=q)
            | Q(source_type__icontains=q)
            | Q(source_id__icontains=q)
            | Q(source_number__icontains=q)
            | Q(description__icontains=q)
            | Q(notes__icontains=q)
        )

    if status_value:
        queryset = queryset.filter(status=status_value)

    if posting_source:
        queryset = queryset.filter(posting_source=posting_source)

    if source_type:
        queryset = queryset.filter(source_type=source_type)

    if source_id:
        queryset = queryset.filter(source_id=source_id)

    if source_number:
        queryset = queryset.filter(source_number=source_number)

    if date_from:
        queryset = queryset.filter(entry_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(entry_date__lte=date_to)

    if is_auto_posted is not None:
        queryset = queryset.filter(is_auto_posted=is_auto_posted)

    total_count = queryset.count()
    summary = _build_summary(queryset)

    rows = queryset[offset : offset + limit]

    return Response(
        {
            "success": True,
            "message": "تم جلب قيود اليومية بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "filters": {
                "q": q,
                "status": status_value,
                "posting_source": posting_source,
                "source_type": source_type,
                "source_id": source_id,
                "source_number": source_number,
                "date_from": date_from.isoformat() if date_from else "",
                "date_to": date_to.isoformat() if date_to else "",
                "is_auto_posted": is_auto_posted,
                "limit": limit,
                "offset": offset,
            },
            "summary": summary,
            "count": total_count,
            "next_offset": offset + limit if offset + limit < total_count else None,
            "previous_offset": max(offset - limit, 0) if offset > 0 else None,
            "results": [_serialize_entry(entry) for entry in rows],
        }
    )


accounting_journal_entries_list.required_company_permissions = [
    "company.accounting.journals.view",
]