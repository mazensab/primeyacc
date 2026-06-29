# ============================================================
# 📂 api/company/accounting/accounts/list.py
# 🧠 Mhamcloud | Company Accounting Accounts List API
# ------------------------------------------------------------
# ✅ عرض دليل حسابات الشركة الحالية
# ✅ عزل كامل حسب CompanyMembership
# ✅ لا يعتمد على company_id من الفرونت
# ✅ فلاتر حسب النوع والطبيعة والغرض والحالة والتجميع
# ✅ بحث بالكود والاسم العربي والإنجليزي والوصف
# ✅ ملخص سريع للحسابات
# ============================================================

from __future__ import annotations

from typing import Any

from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from accounting.models import Account
from api.permissions import HasAnyCompanyPermission


# ============================================================
# Helpers
# ============================================================

def _to_bool(value: Any) -> bool | None:
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _to_int(value: Any) -> int | None:
    if value in [None, ""]:
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _serialize_account(account: Account) -> dict[str, Any]:
    parent = account.parent

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
        "parent": (
            {
                "id": parent.id,
                "code": parent.code,
                "name": parent.name,
            }
            if parent
            else None
        ),
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
        "created_at": account.created_at.isoformat() if account.created_at else None,
        "updated_at": account.updated_at.isoformat() if account.updated_at else None,
    }


def _build_summary(queryset) -> dict[str, Any]:
    total_accounts = queryset.count()

    by_type = {
        row["account_type"]: row["count"]
        for row in queryset.values("account_type").annotate(count=Count("id"))
    }

    return {
        "total_accounts": total_accounts,
        "active_accounts": queryset.filter(is_active=True).count(),
        "inactive_accounts": queryset.filter(is_active=False).count(),
        "group_accounts": queryset.filter(is_group=True).count(),
        "postable_accounts": queryset.filter(is_active=True, is_group=False).count(),
        "system_accounts": queryset.filter(is_system=True).count(),
        "manual_posting_accounts": queryset.filter(allow_manual_posting=True).count(),
        "by_type": by_type,
    }


# ============================================================
# API
# ============================================================

@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def accounting_accounts_list(request):
    """
    GET /api/company/accounting/accounts/

    Query params:
    - q
    - account_type
    - nature
    - purpose
    - parent_id
    - level
    - is_group
    - is_active
    - is_system
    - can_post
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
    account_type = str(params.get("account_type") or "").strip()
    nature = str(params.get("nature") or "").strip()
    purpose = str(params.get("purpose") or "").strip()

    parent_id = _to_int(params.get("parent_id"))
    level = _to_int(params.get("level"))

    is_group = _to_bool(params.get("is_group"))
    is_active = _to_bool(params.get("is_active"))
    is_system = _to_bool(params.get("is_system"))
    can_post = _to_bool(params.get("can_post"))

    limit = _to_int(params.get("limit")) or 500
    offset = _to_int(params.get("offset")) or 0

    limit = max(1, min(limit, 1000))
    offset = max(0, offset)

    queryset = (
        Account.objects.filter(company=company)
        .select_related("company", "parent")
        .order_by("code", "id")
    )

    if q:
        queryset = queryset.filter(
            Q(code__icontains=q)
            | Q(name__icontains=q)
            | Q(name_en__icontains=q)
            | Q(description__icontains=q)
            | Q(parent__code__icontains=q)
            | Q(parent__name__icontains=q)
        )

    if account_type:
        queryset = queryset.filter(account_type=account_type)

    if nature:
        queryset = queryset.filter(nature=nature)

    if purpose:
        queryset = queryset.filter(purpose=purpose)

    if parent_id is not None:
        queryset = queryset.filter(parent_id=parent_id)

    if level is not None:
        queryset = queryset.filter(level=level)

    if is_group is not None:
        queryset = queryset.filter(is_group=is_group)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if is_system is not None:
        queryset = queryset.filter(is_system=is_system)

    if can_post is True:
        queryset = queryset.filter(is_active=True, is_group=False)

    if can_post is False:
        queryset = queryset.exclude(is_active=True, is_group=False)

    total_count = queryset.count()
    summary = _build_summary(queryset)

    rows = queryset[offset : offset + limit]

    return Response(
        {
            "success": True,
            "message": "تم جلب دليل الحسابات بنجاح.",
            "company": {
                "id": company.id,
                "name": company.name,
                "company_code": getattr(company, "company_code", ""),
            },
            "filters": {
                "q": q,
                "account_type": account_type,
                "nature": nature,
                "purpose": purpose,
                "parent_id": parent_id,
                "level": level,
                "is_group": is_group,
                "is_active": is_active,
                "is_system": is_system,
                "can_post": can_post,
                "limit": limit,
                "offset": offset,
            },
            "summary": summary,
            "count": total_count,
            "next_offset": offset + limit if offset + limit < total_count else None,
            "previous_offset": max(offset - limit, 0) if offset > 0 else None,
            "results": [_serialize_account(account) for account in rows],
        }
    )


accounting_accounts_list.required_company_permissions = [
    "company.accounting.accounts.view",
]