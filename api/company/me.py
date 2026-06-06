# ============================================================
# 📂 api/company/me.py
# 🧠 PrimeyAcc | Company Current Tenant API V1.0
# ------------------------------------------------------------
# ✅ Current company workspace snapshot
# ✅ Uses active CompanyMembership only
# ✅ Tenant isolation foundation for /api/company/
# ✅ Does not trust company_id from frontend as source of truth
# ✅ Returns membership, role, permissions and company profile
# ✅ Protected by authenticated company membership
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف جزء من المرحلة 2: المستخدمون والعضويات والصلاحيات
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - CompanyMembership هو حد العزل الرسمي للشركات
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from accounts.models import CompanyMembership
from api.permissions import attach_company_context


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _money_to_string(value: Any) -> str:
    """
    توحيد إخراج المبالغ والنسب كنص عشري آمن للواجهة.
    """

    if value is None:
        return "0.00"

    return f"{value:.2f}"


def _user_payload(user: Any) -> dict[str, Any]:
    """
    يرجع بيانات مستخدم مختصرة وآمنة.
    """

    full_name = user.get_full_name().strip()

    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": full_name or user.get_username(),
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
    }


def _company_payload(company: Any) -> dict[str, Any]:
    """
    يرجع بيانات الشركة الحالية المعزولة حسب العضوية.
    """

    return {
        "id": company.id,
        "name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "display_name": getattr(company, "display_name", None) or getattr(company, "name", ""),
        "name_ar": getattr(company, "name_ar", ""),
        "name_en": getattr(company, "name_en", ""),
        "company_code": getattr(company, "company_code", ""),
        "activity_profile": getattr(company, "activity_profile", ""),
        "status": getattr(company, "status", ""),
        "is_active": getattr(company, "is_active", True),
        "commercial_registration": getattr(company, "commercial_registration", ""),
        "tax_number": getattr(company, "tax_number", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "mobile": getattr(company, "mobile", ""),
        "whatsapp_number": getattr(company, "whatsapp_number", ""),
        "website": getattr(company, "website", ""),
        "country": getattr(company, "country", ""),
        "city": getattr(company, "city", ""),
        "region": getattr(company, "region", ""),
        "district": getattr(company, "district", ""),
        "street_name": getattr(company, "street_name", ""),
        "building_number": getattr(company, "building_number", ""),
        "postal_code": getattr(company, "postal_code", ""),
        "short_address": getattr(company, "short_address", ""),
        "national_address_line": getattr(company, "national_address_line", ""),
        "address": getattr(company, "address", ""),
        "currency_code": getattr(company, "currency_code", "SAR"),
        "vat_percentage": _money_to_string(getattr(company, "vat_percentage", None)),
        "created_at": _datetime_to_string(getattr(company, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(company, "updated_at", None)),
    }


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    """
    يرجع بيانات عضوية المستخدم داخل الشركة الحالية.
    """

    return {
        "id": membership.id,
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
        "joined_at": _datetime_to_string(getattr(membership, "joined_at", None)),
        "invited_at": _datetime_to_string(getattr(membership, "invited_at", None)),
        "suspended_at": _datetime_to_string(getattr(membership, "suspended_at", None)),
        "suspended_reason": getattr(membership, "suspended_reason", ""),
        "notes": getattr(membership, "notes", ""),
        "created_at": _datetime_to_string(getattr(membership, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(membership, "updated_at", None)),
    }


@login_required
@require_GET
def company_me(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/me/

    يرجع الشركة الحالية للمستخدم من عضويته الفعالة فقط.
    """

    membership = attach_company_context(request)

    if not membership or not membership.is_active_membership:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا توجد عضوية شركة فعالة لهذا المستخدم.",
                "code": "ACTIVE_COMPANY_MEMBERSHIP_REQUIRED",
            },
            status=403,
        )

    company = membership.company

    if not company or not getattr(company, "is_active", True):
        return JsonResponse(
            {
                "ok": False,
                "message": "الشركة الحالية غير فعالة.",
                "code": "CURRENT_COMPANY_INACTIVE",
            },
            status=403,
        )

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب بيانات الشركة الحالية بنجاح.",
            "data": {
                "user": _user_payload(request.user),
                "company": _company_payload(company),
                "membership": _membership_payload(membership),
                "company_id": company.id,
                "membership_id": membership.id,
                "role": membership.role,
                "permissions": membership.company_permissions,
            },
        },
        status=200,
    )