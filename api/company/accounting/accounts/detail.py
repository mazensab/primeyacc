# ============================================================
# 📂 api/company/accounting/accounts/detail.py
# 🧠 Mhamcloud | Company Accounting Account Detail API
# ------------------------------------------------------------
# ✅ عرض تفاصيل حساب محاسبي داخل الشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ يعرض الأبناء والحركة المختصرة والملخص
# ✅ يمنع الوصول لحسابات شركات أخرى
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import Count, Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import Account, JournalEntryLine, JournalEntryStatus
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

def _money(value: Any) -> Decimal:
    return Decimal(str(value or "0.00")).quantize(Decimal("0.01"))


def _serialize_parent(account: Account | None) -> dict[str, Any] | None:
    if not account:
        return None

    return {
        "id": account.id,
        "code": account.code,
        "name": account.name,
        "name_en": account.name_en,
        "account_type": account.account_type,
        "nature": account.nature,
        "level": account.level,
        "is_group": account.is_group,
        "is_active": account.is_active,
    }


def _serialize_child(account: Account) -> dict[str, Any]:
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
        "allow_manual_posting": account.allow_manual_posting,
        "can_post": account.can_post,
        "currency": account.currency,
    }


def _serialize_line(line: JournalEntryLine) -> dict[str, Any]:
    entry = line.journal_entry

    return {
        "id": line.id,
        "journal_entry": {
            "id": entry.id,
            "entry_number": entry.entry_number,
            "entry_date": entry.entry_date.isoformat() if entry.entry_date else None,
            "status": entry.status,
            "status_display": entry.get_status_display(),
            "posting_source": entry.posting_source,
            "posting_source_display": entry.get_posting_source_display(),
            "reference": entry.reference,
            "source_type": entry.source_type,
            "source_id": entry.source_id,
            "source_number": entry.source_number,
            "description": entry.description,
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
        "created_at": line.created_at.isoformat() if line.created_at else None,
    }


def _build_account_summary(account: Account) -> dict[str, Any]:
    posted_lines = JournalEntryLine.objects.filter(
        company=account.company,
        account=account,
        journal_entry__status=JournalEntryStatus.POSTED,
    )

    all_lines = JournalEntryLine.objects.filter(
        company=account.company,
        account=account,
    )

    totals = posted_lines.aggregate(
        debit=Sum("debit_amount"),
        credit=Sum("credit_amount"),
    )

    total_debit = _money(totals.get("debit"))
    total_credit = _money(totals.get("credit"))

    if account.nature == "DEBIT":
        balance = _money(total_debit - total_credit)
    else:
        balance = _money(total_credit - total_debit)

    return {
        "all_lines_count": all_lines.count(),
        "posted_lines_count": posted_lines.count(),
        "draft_lines_count": all_lines.filter(
            journal_entry__status=JournalEntryStatus.DRAFT,
        ).count(),
        "cancelled_lines_count": all_lines.filter(
            journal_entry__status=JournalEntryStatus.CANCELLED,
        ).count(),
        "reversed_lines_count": all_lines.filter(
            journal_entry__status=JournalEntryStatus.REVERSED,
        ).count(),
        "total_debit": str(total_debit),
        "total_credit": str(total_credit),
        "balance": str(balance),
        "normal_balance": account.nature,
        "children_count": account.children.count(),
    }


def _serialize_account_detail(account: Account) -> dict[str, Any]:
    return {
        "id": account.id,
        "company_id": account.company_id,
        "code": account.code,
        "name": account.name,
        "name_en": account.name_en,
        "account_type": account.account_type,
        "account_type_display": account.get_account_type_display(),
        "nature": account.nature,
        "nature_display": account.get_nature_display(),
        "purpose": account.purpose,
        "purpose_display": account.get_purpose_display(),
        "parent": _serialize_parent(account.parent),
        "level": account.level,
        "is_group": account.is_group,
        "is_active": account.is_active,
        "is_system": account.is_system,
        "allow_manual_posting": account.allow_manual_posting,
        "can_post": account.can_post,
        "opening_balance": str(account.opening_balance),
        "currency": account.currency,
        "description": account.description,
        "metadata": account.metadata or {},
        "summary": _build_account_summary(account),
        "children": [
            _serialize_child(child)
            for child in account.children.all().order_by("code", "id")
        ],
        "created_at": account.created_at.isoformat() if account.created_at else None,
        "updated_at": account.updated_at.isoformat() if account.updated_at else None,
    }


# ============================================================
# API
# ============================================================

@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_account_detail(request, account_id: int):
    """
    GET /api/company/accounting/accounts/<account_id>/
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

    account = (
        Account.objects.filter(
            company=company,
            pk=account_id,
        )
        .select_related("company", "parent")
        .first()
    )

    if not account:
        return Response(
            {
                "success": False,
                "message": "الحساب غير موجود أو لا يتبع الشركة الحالية.",
            },
            status=404,
        )

    recent_lines = (
        JournalEntryLine.objects.filter(
            company=company,
            account=account,
        )
        .select_related(
            "journal_entry",
            "account",
            "cost_center",
            "tax_rate",
        )
        .order_by("-journal_entry__entry_date", "-journal_entry_id", "-id")[:20]
    )

    return Response(
        {
            "success": True,
            "message": "تم جلب تفاصيل الحساب بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "account": _serialize_account_detail(account),
            "recent_lines": [_serialize_line(line) for line in recent_lines],
        }
    )


accounting_account_detail.required_company_permissions = [
    "company.accounting.accounts.view",
]