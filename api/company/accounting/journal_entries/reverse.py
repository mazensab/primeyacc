# ============================================================
# 📂 api/company/accounting/journal_entries/reverse.py
# 🧠 Mhamcloud | Company Accounting Journal Entry Reverse API
# ------------------------------------------------------------
# ✅ عكس قيد يومية داخل الشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ يستخدم accounting.services بدل تكرار المنطق
# ✅ يمنع عكس قيود شركات أخرى
# ============================================================

from __future__ import annotations

from datetime import datetime
from typing import Any

from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import JournalEntry
from accounting.services import (
    AccountingConfigurationError,
    AccountingPostingError,
    reverse_journal_entry,
)
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _to_date(value: Any):
    if value in [None, ""]:
        return None

    text = str(value).strip()

    try:
        return datetime.strptime(text, "%Y-%m-%d").date()
    except ValueError:
        return None


def _serialize_user(user) -> dict[str, Any] | None:
    if not user:
        return None

    return {
        "id": user.id,
        "username": user.get_username(),
        "email": getattr(user, "email", ""),
        "name": (
            user.get_full_name()
            if hasattr(user, "get_full_name")
            else user.get_username()
        ),
    }


def _serialize_line(line) -> dict[str, Any]:
    return {
        "id": line.id,
        "account": {
            "id": line.account_id,
            "code": line.account.code,
            "name": line.account.name,
            "name_en": line.account.name_en,
        },
        "description": line.description,
        "debit_amount": str(line.debit_amount),
        "credit_amount": str(line.credit_amount),
        "tax_amount": str(line.tax_amount),
        "currency": line.currency,
        "cost_center": (
            {
                "id": line.cost_center_id,
                "code": line.cost_center.code,
                "name": line.cost_center.name,
            }
            if line.cost_center_id
            else None
        ),
        "tax_rate": (
            {
                "id": line.tax_rate_id,
                "code": line.tax_rate.code,
                "name": line.tax_rate.name,
                "rate": str(line.tax_rate.rate),
            }
            if line.tax_rate_id
            else None
        ),
        "party_type": line.party_type,
        "party_id": line.party_id,
        "source_line_id": line.source_line_id,
        "sort_order": line.sort_order,
    }


def _serialize_entry(entry: JournalEntry) -> dict[str, Any]:
    return {
        "id": entry.id,
        "company_id": entry.company_id,
        "entry_number": entry.entry_number,
        "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
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
        "posted_by": _serialize_user(entry.posted_by),
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
        "reversed_at": entry.reversed_at.isoformat() if entry.reversed_at else None,
        "total_debit": str(entry.total_debit),
        "total_credit": str(entry.total_credit),
        "is_balanced": entry.is_balanced,
        "can_edit": entry.can_edit,
        "lines": [
            _serialize_line(line)
            for line in entry.lines.select_related(
                "account",
                "cost_center",
                "tax_rate",
            ).order_by("sort_order", "id")
        ],
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


# ============================================================
# API
# ============================================================

@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
@transaction.atomic
def accounting_journal_entry_reverse(request, entry_id: int):
    """
    POST /api/company/accounting/journal-entries/<entry_id>/reverse/

    Body:
    {
      "reversal_date": "2026-06-08",
      "reason": "سبب العكس"
    }
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

    data = request.data if isinstance(request.data, dict) else {}

    reversal_date = _to_date(data.get("reversal_date"))
    if data.get("reversal_date") and not reversal_date:
        return Response(
            {
                "success": False,
                "message": "تاريخ العكس غير صحيح. استخدم الصيغة YYYY-MM-DD.",
            },
            status=400,
        )

    entry = (
        JournalEntry.objects.filter(
            company=company,
            pk=entry_id,
        )
        .select_related(
            "company",
            "period",
            "posted_by",
            "reversal_of",
            "reversed_entry",
            "created_by",
            "updated_by",
        )
        .first()
    )

    if not entry:
        return Response(
            {
                "success": False,
                "message": "القيد غير موجود أو لا يتبع الشركة الحالية.",
            },
            status=404,
        )

    try:
        reversal = reverse_journal_entry(
            entry,
            reversal_date=reversal_date,
            reason=_clean_text(data.get("reason")),
            actor=request.user,
        )

        entry.refresh_from_db()
        reversal.refresh_from_db()

        return Response(
            {
                "success": True,
                "message": "تم عكس قيد اليومية بنجاح.",
                "company": {
                    "id": company.id,
                    "name": company.name,
                    "company_code": getattr(company, "company_code", ""),
                },
                "original_entry": _serialize_entry(entry),
                "reversal_entry": _serialize_entry(reversal),
            }
        )

    except (AccountingPostingError, AccountingConfigurationError, ValueError) as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    except Exception as exc:
        return Response(
            {
                "success": False,
                "message": f"تعذر عكس قيد اليومية: {exc}",
            },
            status=400,
        )


accounting_journal_entry_reverse.required_company_permissions = [
    "company.accounting.journals.reverse",
]