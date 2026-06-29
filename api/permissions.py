# ============================================================
# 📂 api/permissions.py
# 🧠 Mhamcloud | API Permissions & Tenant Access V1.3
# ------------------------------------------------------------
# ✅ System API Guard
# ✅ Company API Guard
# ✅ Permission Code Guard
# ✅ Current Company Membership Resolver
# ✅ Company Tenant Isolation Foundation
# ✅ DRF Permission Classes
# ✅ Function Helpers for Views
# ✅ Safe fallback to active CompanyMembership when UserProfile is missing
# ✅ Fixed permission attribute lookup for DRF function-based views
# ✅ Safe request query support for DRF Request and Django WSGIRequest
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/system لا يدخله إلا مستخدم نظام مصرح
# - /api/company لا يدخله إلا مستخدم لديه عضوية شركة فعالة
# - الشركة الحالية لا تؤخذ من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - whoami يعرض الصلاحيات، وهذا الملف يطبقها فعليًا
# - لا يتم إنشاء UserProfile تلقائيًا داخل guards
# - required_*_permission(s) يجب أن تعمل مع @api_view function views
# - request قد يكون DRF Request أو Django WSGIRequest، لذلك لا نعتمد على query_params فقط
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth.models import AnonymousUser
from django.db.models import QuerySet
from rest_framework.permissions import BasePermission
from rest_framework.request import Request

from accounts.models import (
    COMPANY_PERMISSION_ALL,
    SYSTEM_PERMISSION_ALL,
    CompanyMembership,
    MembershipStatus,
    UserProfile,
)
from companies.models import CompanyStatus


# ============================================================
# Profile / Membership Resolvers
# ============================================================

def get_user_profile(user) -> UserProfile | None:
    """
    Return the Mhamcloud profile for an authenticated user.

    This function does not auto-create profiles.
    Auto-creation remains in auth endpoints such as login/whoami.
    API guards should not silently create security records.
    """
    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return None

    return getattr(user, "Mhamcloud_profile", None)


def get_active_company_memberships(user) -> QuerySet[CompanyMembership]:
    """
    Return active company memberships for an authenticated user.

    CompanyMembership is the official /company access boundary.
    UserProfile is preferred when available, but /company access must still
    be resolvable from active memberships without silently creating profiles.
    """
    return (
        CompanyMembership.objects.select_related("company")
        .filter(
            user=user,
            status=MembershipStatus.ACTIVE,
            company__is_active=True,
        )
        .exclude(
            company__status__in=[
                CompanyStatus.SUSPENDED,
                CompanyStatus.EXPIRED,
                CompanyStatus.CANCELLED,
            ]
        )
        .order_by("-is_primary", "-created_at")
    )


def _get_request_query_value(request: Request, key: str) -> Any:
    """
    Read query value safely from DRF Request or Django WSGIRequest.

    DRF Request:
        request.query_params

    Django WSGIRequest:
        request.GET

    Some existing Mhamcloud company endpoints are regular Django function
    views, so tests can pass WSGIRequest without query_params.
    """
    query_params = getattr(request, "query_params", None)
    if query_params is not None:
        value = query_params.get(key)
        if value not in [None, ""]:
            return value

    get_params = getattr(request, "GET", None)
    if get_params is not None:
        value = get_params.get(key)
        if value not in [None, ""]:
            return value

    django_request = getattr(request, "_request", None)
    if django_request is not None:
        django_get_params = getattr(django_request, "GET", None)
        if django_get_params is not None:
            value = django_get_params.get(key)
            if value not in [None, ""]:
                return value

    return None


def _get_request_data_value(request: Request, key: str) -> Any:
    """
    Read body value safely from DRF Request or Django WSGIRequest.

    DRF Request:
        request.data

    Django WSGIRequest:
        request.POST

    JSON parsing for raw WSGIRequest bodies should remain in the view layer.
    This helper only reads already-parsed request data safely.
    """
    data = getattr(request, "data", None)
    if data is not None:
        try:
            value = data.get(key)
            if value not in [None, ""]:
                return value
        except Exception:
            pass

    post_data = getattr(request, "POST", None)
    if post_data is not None:
        value = post_data.get(key)
        if value not in [None, ""]:
            return value

    django_request = getattr(request, "_request", None)
    if django_request is not None:
        django_post_data = getattr(django_request, "POST", None)
        if django_post_data is not None:
            value = django_post_data.get(key)
            if value not in [None, ""]:
                return value

    return None


def get_requested_company_id(request: Request) -> int | None:
    """
    Read requested company selector safely.

    This value is only a selector. It is trusted only if the user has a
    matching active CompanyMembership.

    Supports both:
    - DRF Request
    - Django WSGIRequest
    """
    headers = getattr(request, "headers", {}) or {}

    raw_company_id = (
        headers.get("X-Company-ID")
        or _get_request_query_value(request, "company_id")
    )

    method = getattr(request, "method", "GET")
    if raw_company_id in [None, ""] and method not in ["GET", "HEAD", "OPTIONS"]:
        raw_company_id = _get_request_data_value(request, "company_id")

    if raw_company_id in [None, ""]:
        return None

    try:
        return int(raw_company_id)
    except (TypeError, ValueError):
        return None


def get_current_company_membership(
    request: Request,
) -> CompanyMembership | None:
    """
    Resolve the current active company membership for the request.

    Priority:
    1. X-Company-ID header if it belongs to an active membership.
    2. company_id query/body selector if it belongs to an active membership.
    3. profile default active membership when UserProfile exists.
    4. primary/latest active CompanyMembership fallback.

    Important:
    The provided company_id is only a selector.
    It is never trusted unless a matching active CompanyMembership exists.
    """
    user = request.user

    if not user or isinstance(user, AnonymousUser) or not user.is_authenticated:
        return None

    profile = get_user_profile(user)

    if profile:
        memberships = profile.active_company_memberships()
    else:
        memberships = get_active_company_memberships(user)

    requested_company_id = get_requested_company_id(request)

    if requested_company_id:
        membership = memberships.filter(
            company_id=requested_company_id,
        ).first()

        if membership:
            return membership

    if profile:
        default_membership = profile.get_default_company_membership()
        if default_membership:
            return default_membership

    return memberships.first()


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
    - request.Mhamcloud_profile
    - request.company_membership
    - request.company

    Returns the resolved membership or None.
    """
    profile = get_user_profile(request.user)
    membership = get_current_company_membership(request)

    setattr(request, "Mhamcloud_profile", profile)
    setattr(request, "company_membership", membership)
    setattr(request, "company", membership.company if membership else None)

    return membership


# ============================================================
# Permission Attribute Resolver
# ============================================================

def get_view_required_attribute(
    *,
    request: Request,
    view: Any,
    attribute_name: str,
    default: Any,
) -> Any:
    """
    Resolve required permission attributes safely for both DRF class views
    and @api_view function-based views.

    Why:
    With @api_view, custom attributes such as required_company_permissions
    may exist on the resolved function instead of the APIView instance.
    This helper checks all practical locations.
    """
    value = getattr(view, attribute_name, None)
    if value not in [None, ""]:
        return value

    view_class = getattr(view, "__class__", None)
    if view_class:
        value = getattr(view_class, attribute_name, None)
        if value not in [None, ""]:
            return value

    django_request = getattr(request, "_request", None)
    resolver_match = getattr(django_request, "resolver_match", None)

    if resolver_match is None:
        resolver_match = getattr(request, "resolver_match", None)

    resolved_func = getattr(resolver_match, "func", None)

    if resolved_func:
        value = getattr(resolved_func, attribute_name, None)
        if value not in [None, ""]:
            return value

        resolved_cls = getattr(resolved_func, "cls", None)
        if resolved_cls:
            value = getattr(resolved_cls, attribute_name, None)
            if value not in [None, ""]:
                return value

    return default


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
    Basic authenticated Mhamcloud user guard.

    This guard requires UserProfile because it represents Mhamcloud user
    initialization, not tenant membership access.
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
        required_permission = get_view_required_attribute(
            request=request,
            view=view,
            attribute_name="required_system_permission",
            default=None,
        )

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
        required_permissions = get_view_required_attribute(
            request=request,
            view=view,
            attribute_name="required_system_permissions",
            default=[],
        )

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

        required_permission = get_view_required_attribute(
            request=request,
            view=view,
            attribute_name="required_company_permission",
            default=None,
        )

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

        required_permissions = get_view_required_attribute(
            request=request,
            view=view,
            attribute_name="required_company_permissions",
            default=[],
        )

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