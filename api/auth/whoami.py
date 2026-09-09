# ============================================================
# 📂 api/auth/whoami.py
# 🧠 Mhamcloud | Authoritative Session Snapshot API V3
# ------------------------------------------------------------
# ✅ One workspace decision for frontend login and route guards
# ✅ System users always route to /system
# ✅ Company users route by subscription/onboarding policy
# ✅ Django superuser aligned with system API permission guards
# ✅ Active CompanyMembership remains the tenant boundary
# ✅ No company_id trust from the frontend
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.models import (
    SYSTEM_PERMISSION_ALL,
    CompanyMembership,
    SystemRole,
    UserProfile,
    WorkspaceType,
)
from companies.onboarding import get_company_onboarding_access
from subscriptions.access_policy import (
    SubscriptionWorkspaceAccess,
    evaluate_subscription_access,
)


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
        "company_id": membership.company_id,
        "company": _company_payload(membership.company),
        "role": membership.role,
        "status": membership.status,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title,
        "department": membership.department,
        "is_active_membership": membership.is_active_membership,
        "permissions": membership.company_permissions,
    }


def _is_active_django_superuser(profile: UserProfile) -> bool:
    user = profile.user
    return bool(
        user
        and user.is_active
        and getattr(user, "is_superuser", False)
    )


def _effective_system_access(profile: UserProfile) -> bool:
    return bool(
        _is_active_django_superuser(profile)
        or profile.can_access_system
    )


def _effective_system_role(profile: UserProfile) -> str:
    if _is_active_django_superuser(profile):
        return SystemRole.SUPER_ADMIN
    return profile.system_role


def _effective_system_permissions(profile: UserProfile) -> list[str]:
    if _is_active_django_superuser(profile):
        return [SYSTEM_PERMISSION_ALL]
    return profile.system_permissions


def _company_dashboard_path(
    *,
    current_membership: CompanyMembership | None,
    subscription_policy,
    onboarding_access,
) -> str:
    if (
        current_membership
        and subscription_policy.access
        == SubscriptionWorkspaceAccess.BILLING_ONLY
    ):
        return "/company/subscription"

    if (
        current_membership
        and subscription_policy.access
        == SubscriptionWorkspaceAccess.FULL
        and onboarding_access.required
    ):
        return "/company/setup"

    return "/company"


def _resolve_workspace_and_dashboard(
    *,
    can_access_system: bool,
    can_access_company: bool,
    company_dashboard_path: str,
) -> tuple[str | None, str | None]:
    """
    Resolve the single authoritative landing page.

    Platform access has priority by product rule:
    - super admin / system employee -> /system
    - company-only member -> the effective company path
    """
    if can_access_system:
        return WorkspaceType.SYSTEM, "/system"

    if can_access_company:
        return WorkspaceType.COMPANY, company_dashboard_path

    return None, None


def _profile_payload(profile: UserProfile) -> dict[str, Any]:
    """Build the authoritative frontend session snapshot."""
    active_memberships = list(profile.active_company_memberships())

    current_membership = None
    if profile.default_company_id:
        current_membership = next(
            (
                membership
                for membership in active_memberships
                if membership.company_id == profile.default_company_id
            ),
            None,
        )

    if current_membership is None and active_memberships:
        current_membership = active_memberships[0]

    company = current_membership.company if current_membership else None

    subscription_policy = evaluate_subscription_access(company)
    onboarding_access = get_company_onboarding_access(company)

    can_access_system = _effective_system_access(profile)
    can_access_company = bool(
        current_membership
        and subscription_policy.access
        in {
            SubscriptionWorkspaceAccess.FULL,
            SubscriptionWorkspaceAccess.BILLING_ONLY,
        }
    )
    can_use_company_workspace = bool(
        current_membership
        and subscription_policy.access
        == SubscriptionWorkspaceAccess.FULL
        and onboarding_access.ready
    )

    company_dashboard_path = _company_dashboard_path(
        current_membership=current_membership,
        subscription_policy=subscription_policy,
        onboarding_access=onboarding_access,
    )
    workspace, dashboard_path = _resolve_workspace_and_dashboard(
        can_access_system=can_access_system,
        can_access_company=can_access_company,
        company_dashboard_path=company_dashboard_path,
    )

    current_company = _company_payload(company)
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
        "is_system_user": bool(
            profile.is_system_user
            or _is_active_django_superuser(profile)
        ),
        "system_role": _effective_system_role(profile),
        "system_permissions": _effective_system_permissions(profile),
        "can_access_system": can_access_system,
        "can_access_company": can_access_company,
        "can_use_company_workspace": can_use_company_workspace,
        "subscription_access": subscription_policy.as_dict(),
        "onboarding": onboarding_access.as_dict(),
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


def _anonymous_payload() -> dict[str, Any]:
    return {
        "authenticated": False,
        "user": None,
        "profile": None,
        "workspace": None,
        "dashboard_path": None,
        "can_access_system": False,
        "can_access_company": False,
        "can_use_company_workspace": False,
        "subscription_access": None,
        "onboarding": None,
        "system_permissions": [],
        "company_permissions": [],
        "current_company": None,
        "current_membership": None,
        "default_company": None,
        "memberships": [],
    }


@api_view(["GET"])
@permission_classes([AllowAny])
def whoami(request: Request) -> Response:
    user = request.user

    if not user or not user.is_authenticated:
        return Response(_anonymous_payload())

    profile, _ = UserProfile.objects.get_or_create(
        user=user,
        defaults={
            "display_name": user.get_full_name() or user.get_username(),
        },
    )
    profile_data = _profile_payload(profile)
    current_membership = profile_data.get("current_membership")
    company_permissions = (
        current_membership.get("permissions", [])
        if current_membership
        else []
    )

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
            "is_system_user": profile_data["is_system_user"],
            "system_role": profile_data["system_role"],
            "can_access_system": profile_data["can_access_system"],
            "can_access_company": profile_data["can_access_company"],
            "can_use_company_workspace": profile_data[
                "can_use_company_workspace"
            ],
            "subscription_access": profile_data["subscription_access"],
            "onboarding": profile_data["onboarding"],
            "system_permissions": profile_data["system_permissions"],
            "company_permissions": company_permissions,
            "default_company": profile_data["default_company"],
            "current_company": profile_data["current_company"],
            "current_membership": profile_data["current_membership"],
            "memberships": profile_data["memberships"],
        }
    )
