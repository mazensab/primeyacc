# ============================================================
# 📂 api/auth/whoami.py
# 🧠 Mhamcloud | Auth Whoami API V2
# ------------------------------------------------------------
# ✅ Current User Session Snapshot
# ✅ System Access Detection
# ✅ Company Access Detection
# ✅ System Permissions Snapshot
# ✅ Company Permissions Snapshot
# ✅ Safe Current Company Resolver
# ✅ Active Company Memberships Only
# ✅ Workspace / Dashboard Path Resolver
# ✅ Anonymous-safe Response
# ✅ Session Auth Compatible
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - User = حساب دخول فقط
# - UserProfile = ملف المستخدم العام داخل Mhamcloud
# - CompanyMembership = علاقة المستخدم بالشركة ودوره داخلها
# - /system لا يفتح إلا لمستخدم نظام مصرح
# - /company لا يفتح إلا بعضوية شركة فعالة
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# - whoami هو مصدر الحقيقة للواجهة
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import CompanyMembership, UserProfile, WorkspaceType


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value)


def _company_payload(company) -> dict[str, Any] | None:
    if not company:
        return None

    return {
        "id": company.id,
        "name": company.display_name,
        "name_ar": company.name_ar,
        "name_en": company.name_en,
        "company_code": company.company_code,
        "activity_profile": company.activity_profile,
        "status": company.status,
        "is_active": company.is_active,
        "city": company.city,
        "district": company.district,
        "postal_code": company.postal_code,
        "short_address": company.short_address,
        "currency_code": company.currency_code,
        "vat_percentage": _safe_str(company.vat_percentage),
    }


def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
    return {
        "id": membership.id,
        "company": _company_payload(membership.company),
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
    }


def _resolve_workspace_and_dashboard(
    *,
    profile: UserProfile,
    current_membership: CompanyMembership | None,
) -> tuple[str | None, str | None]:
    """
    Resolve the safest frontend workspace and dashboard path.

    Priority:
    1. Respect default_workspace if the user can access it.
    2. Fallback to system if available.
    3. Fallback to company if available.
    4. Return None when no workspace is available.
    """
    can_access_system = profile.can_access_system
    can_access_company = bool(current_membership)

    if profile.default_workspace == WorkspaceType.SYSTEM and can_access_system:
        return WorkspaceType.SYSTEM, "/system"

    if profile.default_workspace == WorkspaceType.COMPANY and can_access_company:
        return WorkspaceType.COMPANY, "/company"

    if can_access_system:
        return WorkspaceType.SYSTEM, "/system"

    if can_access_company:
        return WorkspaceType.COMPANY, "/company"

    return None, None


def _profile_payload(profile: UserProfile) -> dict[str, Any]:
    """
    Build a safe profile payload for the frontend.

    Important:
    - memberships returned here are active memberships only.
    - current_company is resolved from CompanyMembership, not direct company access.
    - inactive/suspended/expired/cancelled companies are not used for /company access.
    """
    active_memberships = list(profile.active_company_memberships())
    current_membership = profile.get_default_company_membership()

    workspace, dashboard_path = _resolve_workspace_and_dashboard(
        profile=profile,
        current_membership=current_membership,
    )

    current_company = (
        _company_payload(current_membership.company)
        if current_membership
        else None
    )

    current_membership_payload = (
        _membership_payload(current_membership)
        if current_membership
        else None
    )

    return {
        "id": profile.id,
        "display_name": profile.display_name,
        "status": profile.status,
        "default_workspace": profile.default_workspace,
        "workspace": workspace,
        "dashboard_path": dashboard_path,
        "is_system_user": profile.is_system_user,
        "system_role": profile.system_role,
        "system_permissions": profile.system_permissions,
        "can_access_system": profile.can_access_system,
        "can_access_company": bool(current_membership),
        "default_company": current_company,
        "current_company": current_company,
        "current_membership": current_membership_payload,
        "memberships": [
            _membership_payload(membership)
            for membership in active_memberships
        ],
        "language": profile.language,
        "timezone": profile.timezone,
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def whoami(request: Request) -> Response:
    user = request.user

    if not user or not user.is_authenticated:
        return Response(
            {
                "authenticated": False,
                "user": None,
                "profile": None,
                "workspace": None,
                "dashboard_path": None,
                "can_access_system": False,
                "can_access_company": False,
                "system_permissions": [],
                "company_permissions": [],
                "current_company": None,
                "current_membership": None,
                "default_company": None,
                "memberships": [],
            }
        )

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": user.get_full_name() or user.get_username(),
        },
    )

    profile_data = _profile_payload(profile)

    company_permissions = []
    current_membership = profile_data.get("current_membership")
    if current_membership:
        company_permissions = current_membership.get("permissions", [])

    return Response(
        {
            "authenticated": True,
            "user": {
                "id": user.id,
                "username": user.get_username(),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
            },
            "profile": profile_data,
            "workspace": profile_data["workspace"],
            "dashboard_path": profile_data["dashboard_path"],
            "can_access_system": profile_data["can_access_system"],
            "can_access_company": profile_data["can_access_company"],
            "system_permissions": profile_data["system_permissions"],
            "company_permissions": company_permissions,
            "default_company": profile_data["default_company"],
            "current_company": profile_data["current_company"],
            "current_membership": profile_data["current_membership"],
            "memberships": profile_data["memberships"],
        }
    )