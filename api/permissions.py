# ============================================================
# 📂 api/permissions.py
# 🧠 PrimeyAcc | API Permissions & Tenant Access V1
# ------------------------------------------------------------
# ✅ System API Guard
# ✅ Company API Guard
# ✅ Permission Code Guard
# ✅ Current Company Membership Resolver
# ✅ Company Tenant Isolation Foundation
# ✅ DRF Permission Classes
# ✅ Function Helpers for Views
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/system لا يدخله إلا مستخدم نظام مصرح
# - /api/company لا يدخله إلا مستخدم لديه عضوية شركة فعالة
# - الشركة الحالية لا تؤخذ من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - whoami يعرض الصلاحيات، وهذا الملف يطبقها فعليًا
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.models import AnonymousUser
from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from accounts.models import (
    COMPANY_PERMISSION_ALL,
    SYSTEM_PERMISSION_ALL,
    CompanyMembership,
    UserProfile,
)


# ============================================================
# Profile / Membership Resolvers
# ============================================================

def get_user_profile(user) -> UserProfile | None:
    """
    Return the PrimeyAcc profile for an authenticated user.

    This function does not auto-create profiles.
    Auto-creation remains in auth endpoints such as login/whoami.
    API guards should not silently create security records.
    """
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return None

    return getattr(user, "primeyacc_profile", None)


def get_current_company_membership(
    request: Request,
) -> CompanyMembership | None:
    """
    Resolve the current active company membership for the request.

    Priority:
    1. X-Company-ID header if it belongs to an active membership.
    2. company_id query param if it belongs to an active membership.
    3. profile default active membership.

    Important:
    The provided company_id is only a selector.
    It is never trusted unless a matching active CompanyMembership exists.
    """
    profile = get_user_profile(request.user)
    if not profile:
        return None

    memberships = profile.active_company_memberships()

    requested_company_id = (
        request.headers.get("X-Company-ID")
        or request.query_params.get("company_id")
        or request.data.get("company_id")
        if hasattr(request, "data")
        else None
    )

    if requested_company_id:
        try:
            requested_company_id_int = int(requested_company_id)
        except (TypeError, ValueError):
            requested_company_id_int = None

        if requested_company_id_int:
            membership = memberships.filter(
                company_id=requested_company_id_int
            ).first()
            if membership:
                return membership

    return profile.get_default_company_membership()


def get_current_company(request: Request):
    """
    Return the resolved current company for a request.
    """
    membership = get_current_company_membership(request)
    if not membership:
        return None

    return membership.company


def attach_company_context(request: Request) -> CompanyMembership | None:
    """
    Attach safe company context to request for use inside API views.

    Adds:
    - request.primeyacc_profile
    - request.company_membership
    - request.company

    Returns the resolved membership or None.
    """
    profile = get_user_profile(request.user)
    membership = get_current_company_membership(request)

    setattr(request, "primeyacc_profile", profile)
    setattr(request, "company_membership", membership)
    setattr(request, "company", membership.company if membership else None)

    return membership


# ============================================================
# Permission Check Helpers
# ============================================================

def user_can_access_system(user) -> bool:
    profile = get_user_profile(user)
    return bool(profile and profile.can_access_system)


def user_has_system_permission(user, permission: str) -> bool:
    profile = get_user_profile(user)
    if not profile or not profile.can_access_system:
        return False

    permissions = profile.system_permissions
    return SYSTEM_PERMISSION_ALL in permissions or permission in permissions


def request_has_company_access(request: Request) -> bool:
    membership = get_current_company_membership(request)
    return bool(membership and membership.is_active_membership)


def request_has_company_permission(
    request: Request,
    permission: str,
) -> bool:
    membership = get_current_company_membership(request)
    if not membership:
        return False

    permissions = membership.company_permissions
    return COMPANY_PERMISSION_ALL in permissions or permission in permissions


# ============================================================
# DRF Permission Classes
# ============================================================

class IsAuthenticatedPrimeyUser(BasePermission):
    """
    Basic authenticated PrimeyAcc user guard.
    """

    message = "Authentication is required."

    def has_permission(self, request: Request, view: Any) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and get_user_profile(request.user)
        )


class IsSystemUser(BasePermission):
    """
    Guard for /api/system endpoints.

    Allows only active users with system access.
    """

    message = "System access is required."

    def has_permission(self, request: Request, view: Any) -> bool:
        return user_can_access_system(request.user)


class HasSystemPermission(BasePermission):
    """
    Guard for a specific system permission.

    Usage inside a view:
        required_system_permission = "system.companies.view"
    """

    message = "You do not have the required system permission."

    def has_permission(self, request: Request, view: Any) -> bool:
        required_permission = getattr(view, "required_system_permission", None)

        if not required_permission:
            return user_can_access_system(request.user)

        return user_has_system_permission(
            request.user,
            required_permission,
        )


class HasAnySystemPermission(BasePermission):
    """
    Guard for at least one system permission.

    Usage inside a view:
        required_system_permissions = [
            "system.companies.view",
            "system.companies.update",
        ]
    """

    message = "You do not have any of the required system permissions."

    def has_permission(self, request: Request, view: Any) -> bool:
        required_permissions = getattr(view, "required_system_permissions", [])

        if not required_permissions:
            return user_can_access_system(request.user)

        return any(
            user_has_system_permission(request.user, permission)
            for permission in required_permissions
        )


class IsCompanyMember(BasePermission):
    """
    Guard for /api/company endpoints.

    Allows only requests with an active company membership.
    Also attaches safe company context to the request.
    """

    message = "Active company membership is required."

    def has_permission(self, request: Request, view: Any) -> bool:
        membership = attach_company_context(request)
        return bool(membership and membership.is_active_membership)


class HasCompanyPermission(BasePermission):
    """
    Guard for a specific company permission.

    Usage inside a view:
        required_company_permission = "company.sales.view"
    """

    message = "You do not have the required company permission."

    def has_permission(self, request: Request, view: Any) -> bool:
        membership = attach_company_context(request)
        if not membership:
            return False

        required_permission = getattr(view, "required_company_permission", None)

        if not required_permission:
            return membership.is_active_membership

        return membership.has_company_permission(required_permission)


class HasAnyCompanyPermission(BasePermission):
    """
    Guard for at least one company permission.

    Usage inside a view:
        required_company_permissions = [
            "company.sales.view",
            "company.sales.create",
        ]
    """

    message = "You do not have any of the required company permissions."

    def has_permission(self, request: Request, view: Any) -> bool:
        membership = attach_company_context(request)
        if not membership:
            return False

        required_permissions = getattr(view, "required_company_permissions", [])

        if not required_permissions:
            return membership.is_active_membership

        permissions = membership.company_permissions

        return (
            COMPANY_PERMISSION_ALL in permissions
            or any(permission in permissions for permission in required_permissions)
        )


# ============================================================
# View Decorator Helpers
# ============================================================

def require_system_permission(request: Request, permission: str) -> bool:
    """
    Simple helper for function-based views when decorators are not enough.
    """
    return user_has_system_permission(request.user, permission)


def require_company_permission(request: Request, permission: str) -> bool:
    """
    Simple helper for function-based company views.
    """
    return request_has_company_permission(request, permission)