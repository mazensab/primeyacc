# ============================================================
# 📂 api/company/accounting/journal_entries/detail.py
# 🧠 PrimeyAcc | Company Accounting Journal Entry Detail API
# ------------------------------------------------------------
# ✅ عرض تفاصيل قيد يومية داخل الشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ يعرض الأسطر والحسابات ومراكز التكلفة والضرائب
# ✅ يمنع الوصول لقيود شركات أخرى
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import JournalEntry, JournalEntryLine
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

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


def _serialize_account(account) -> dict[str, Any]:
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
        "is_group": account.is_group,
        "is_active": account.is_active,
        "can_post": account.can_post,
    }


def _serialize_line(line: JournalEntryLine) -> dict[str, Any]:
    return {
        "id": line.id,
        "company_id": line.company_id,
        "account": _serialize_account(line.account),
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
                "name_en": line.cost_center.name_en,
            }
            if line.cost_center_id
            else None
        ),
        "tax_rate": (
            {
                "id": line.tax_rate_id,
                "code": line.tax_rate.code,
                "name": line.tax_rate.name,
                "tax_type": line.tax_rate.tax_type,
                "direction": line.tax_rate.direction,
                "rate": str(line.tax_rate.rate),
            }
            if line.tax_rate_id
            else None
        ),
        "party_type": line.party_type,
        "party_id": line.party_id,
        "source_line_id": line.source_line_id,
        "sort_order": line.sort_order,
        "metadata": line.metadata or {},
        "created_at": line.created_at.isoformat() if line.created_at else None,
        "updated_at": line.updated_at.isoformat() if line.updated_at else None,
    }


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
                "status_display": period.get_status_display(),
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
        "posted_by": _serialize_user(entry.posted_by),
        "cancelled_at": entry.cancelled_at.isoformat() if entry.cancelled_at else None,
        "cancelled_by": _serialize_user(entry.cancelled_by),
        "reversal_of": (
            {
                "id": entry.reversal_of_id,
                "entry_number": entry.reversal_of.entry_number,
                "entry_date": entry.reversal_of.entry_date.isoformat() if entry.reversal_of.entry_date else None,
                "status": entry.reversal_of.status,
            }
            if entry.reversal_of_id
            else None
        ),
        "reversed_entry": (
            {
                "id": entry.reversed_entry_id,
                "entry_number": entry.reversed_entry.entry_number,
                "entry_date": entry.reversed_entry.entry_date.isoformat() if entry.reversed_entry.entry_date else None,
                "status": entry.reversed_entry.status,
            }
            if entry.reversed_entry_id
            else None
        ),
        "reversed_at": entry.reversed_at.isoformat() if entry.reversed_at else None,
        "total_debit": str(entry.total_debit),
        "total_credit": str(entry.total_credit),
        "is_balanced": entry.is_balanced,
        "can_edit": entry.can_edit,
        "metadata": entry.metadata or {},
        "created_by": _serialize_user(entry.created_by),
        "updated_by": _serialize_user(entry.updated_by),
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
        "lines": [
            _serialize_line(line)
            for line in entry.lines.select_related(
                "account",
                "cost_center",
                "tax_rate",
            ).order_by("sort_order", "id")
        ],
    }


# ============================================================
# API
# ============================================================

@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_journal_entry_detail(request, entry_id: int):
    """
    GET /api/company/accounting/journal-entries/<entry_id>/
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

    entry = (
        JournalEntry.objects.filter(
            company=company,
            pk=entry_id,
        )
        .select_related(
            "company",
            "period",
            "posted_by",
            "cancelled_by",
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

    return Response(
        {
            "success": True,
            "message": "تم جلب تفاصيل قيد اليومية بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "entry": _serialize_entry(entry),
        }
    )


accounting_journal_entry_detail.required_company_permissions = [
    "company.accounting.journals.view",
]