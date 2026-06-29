# ============================================================
# 📂 api/company/permissions/snapshot.py
# 🧠 Mhamcloud | Company Permissions Snapshot API V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated company permissions snapshot
# ✅ Reads company only from active CompanyMembership
# ✅ Does not trust company_id from frontend
# ✅ Returns current membership permissions
# ✅ Returns available company roles
# ✅ Returns role permissions map
# ✅ Returns known company permissions list
# ✅ Returns JSON 401 instead of redirecting to /accounts/login/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/company لا يفتح إلا بعضوية شركة فعالة
# - الشركة الحالية تأتي من CompanyMembership وليس من الفرونت
# - CompanyMembership هو حد العزل الرسمي للشركات
# - whoami و permissions snapshot هما مصدر الحقيقة للواجهة
# - لا نقبل company_id من الواجهة كمصدر ثقة
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

from typing import Any

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET

from accounts.models import (
    COMPANY_PERMISSION_ALL,
    COMPANY_ROLE_PERMISSIONS,
    CompanyRole,
)
from api.permissions import attach_company_context


COMPANY_PERMISSION_LABELS: dict[str, str] = {
    "company.dashboard.view": "عرض لوحة الشركة",
    "company.users.view": "عرض مستخدمي الشركة",
    "company.users.create": "إنشاء مستخدمي الشركة",
    "company.users.update": "تعديل مستخدمي الشركة",
    "company.settings.view": "عرض إعدادات الشركة",
    "company.settings.update": "تعديل إعدادات الشركة",
    "company.branches.view": "عرض الفروع",
    "company.branches.create": "إنشاء الفروع",
    "company.branches.update": "تعديل الفروع",
    "company.products.view": "عرض المنتجات",
    "company.products.create": "إنشاء المنتجات",
    "company.products.update": "تعديل المنتجات",
    "company.customers.view": "عرض العملاء",
    "company.customers.create": "إنشاء العملاء",
    "company.customers.update": "تعديل العملاء",
    "company.suppliers.view": "عرض الموردين",
    "company.suppliers.create": "إنشاء الموردين",
    "company.suppliers.update": "تعديل الموردين",
    "company.sales.view": "عرض المبيعات",
    "company.sales.create": "إنشاء المبيعات",
    "company.sales.update": "تعديل المبيعات",
    "company.purchases.view": "عرض المشتريات",
    "company.purchases.create": "إنشاء المشتريات",
    "company.purchases.update": "تعديل المشتريات",
    "company.inventory.view": "عرض المخزون",
    "company.inventory.update": "تعديل المخزون",
    "company.accounting.view": "عرض المحاسبة",
    "company.accounting.create": "إنشاء المحاسبة",
    "company.accounting.update": "تعديل المحاسبة",
    "company.hr.view": "عرض الموارد البشرية",
    "company.hr.create": "إنشاء الموارد البشرية",
    "company.hr.update": "تعديل الموارد البشرية",
    "company.reports.view": "عرض التقارير",
}


def _datetime_to_string(value: Any) -> str | None:
    """
    توحيد إخراج التاريخ والوقت للواجهة.
    """

    if not value:
        return None

    return value.isoformat()


def _normalize_permissions(permissions: list[str]) -> list[str]:
    """
    توحيد وترتيب قائمة الصلاحيات.
    """

    return sorted(set(permissions or []))


def _known_permissions() -> list[str]:
    """
    يرجع كل الصلاحيات المعروفة من قاموس الأدوار مع استبعاد '*'.
    """

    permissions: set[str] = set()

    for role_permissions in COMPANY_ROLE_PERMISSIONS.values():
        for permission in role_permissions:
            if permission != COMPANY_PERMISSION_ALL:
                permissions.add(permission)

    permissions.update(COMPANY_PERMISSION_LABELS.keys())

    return sorted(permissions)


def _permission_payload(permission: str) -> dict[str, Any]:
    """
    يرجع تمثيل صلاحية واحدة للواجهة.
    """

    return {
        "code": permission,
        "label": COMPANY_PERMISSION_LABELS.get(permission, permission),
    }


def _role_payload(role: str) -> dict[str, Any]:
    """
    يرجع بيانات دور واحد وصلاحياته.
    """

    role_permissions = COMPANY_ROLE_PERMISSIONS.get(role, [])
    normalized_permissions = _normalize_permissions(role_permissions)

    return {
        "code": role,
        "label": CompanyRole(role).label if role in CompanyRole.values else role,
        "is_full_access": COMPANY_PERMISSION_ALL in normalized_permissions,
        "permissions": normalized_permissions,
        "permission_count": len(normalized_permissions),
    }


def _roles_payload() -> list[dict[str, Any]]:
    """
    يرجع أدوار الشركة المتاحة.
    """

    return [_role_payload(role_value) for role_value, _role_label in CompanyRole.choices]


def _role_permissions_map() -> dict[str, list[str]]:
    """
    يرجع خريطة role -> permissions.
    """

    return {
        role_value: _normalize_permissions(COMPANY_ROLE_PERMISSIONS.get(role_value, []))
        for role_value, _role_label in CompanyRole.choices
    }


def _membership_payload(membership) -> dict[str, Any]:
    """
    يرجع ملخص عضوية المستخدم الحالية داخل الشركة.
    """

    return {
        "id": membership.id,
        "company_id": membership.company_id,
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
        "permission_count": len(membership.company_permissions),
        "joined_at": _datetime_to_string(getattr(membership, "joined_at", None)),
        "created_at": _datetime_to_string(getattr(membership, "created_at", None)),
        "updated_at": _datetime_to_string(getattr(membership, "updated_at", None)),
    }


def _company_payload(company) -> dict[str, Any]:
    """
    يرجع ملخص الشركة الحالية.
    """

    return {
        "id": company.id,
        "name": company.display_name,
        "display_name": company.display_name,
        "company_code": company.company_code,
        "activity_profile": company.activity_profile,
        "status": company.status,
        "is_active": company.is_active,
    }


@require_GET
def company_permissions_snapshot(request: HttpRequest) -> JsonResponse:
    """
    GET /api/company/permissions/

    يرجع snapshot للأدوار والصلاحيات الخاصة بمساحة الشركة.
    """

    if not request.user.is_authenticated:
        return JsonResponse(
            {
                "ok": False,
                "message": "يجب تسجيل الدخول أولًا.",
                "code": "AUTHENTICATION_REQUIRED",
            },
            status=401,
        )

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

    known_permissions = _known_permissions()

    return JsonResponse(
        {
            "ok": True,
            "message": "تم جلب صلاحيات الشركة بنجاح.",
            "data": {
                "company": _company_payload(company),
                "membership": _membership_payload(membership),
                "current_role": membership.role,
                "current_permissions": membership.company_permissions,
                "roles": _roles_payload(),
                "role_permissions": _role_permissions_map(),
                "permissions": [
                    _permission_payload(permission)
                    for permission in known_permissions
                ],
                "permission_all": COMPANY_PERMISSION_ALL,
                "company_id": company.id,
                "membership_id": membership.id,
            },
        },
        status=200,
    )