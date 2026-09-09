# ============================================================
# 📂 api/auth/login.py
# 🧠 Mhamcloud | Unified Session Login API V3
# ------------------------------------------------------------
# ✅ One login endpoint for system and company users
# ✅ Username / email / Saudi phone aliases
# ✅ Ambiguous identifiers fail closed
# ✅ Session + CSRF authentication
# ✅ Remember-me session expiry
# ✅ Authoritative dashboard_path from whoami contract
# ✅ Structured, non-sensitive error codes
# ------------------------------------------------------------
# Security rules:
# - The frontend never chooses the workspace.
# - Imported passwords are never inferred or bypassed.
# - Company access still requires an active CompanyMembership.
# ============================================================

from __future__ import annotations

from typing import Any

from django.conf import settings
from django.contrib.auth import authenticate, login as django_login
from django.views.decorators.csrf import csrf_protect
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from accounts.auth_identity import clean_login_identifier, resolve_login_identity
from accounts.models import UserProfile, UserProfileStatus
from api.auth.whoami import _profile_payload
from api.throttling import LoginRateThrottle


def _clean_password(value: Any) -> str:
    return value if isinstance(value, str) else str(value or "")


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
        "y",
        "نعم",
    }


def _error(
    *,
    code: str,
    detail: str,
    status: int,
) -> Response:
    return Response(
        {
            "authenticated": False,
            "code": code,
            "detail": detail,
        },
        status=status,
    )


def _user_payload(user) -> dict[str, Any]:
    return {
        "id": user.id,
        "username": user.get_username(),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "is_active": user.is_active,
    }


def _login_payload(user) -> dict[str, Any]:
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

    return {
        "authenticated": True,
        "code": "login_success",
        "detail": "Login successful.",
        "user": _user_payload(user),
        "profile": profile_data,
        "workspace": profile_data["workspace"],
        "dashboard_path": profile_data["dashboard_path"],
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


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
@csrf_protect
def login(request: Request) -> Response:
    identifier = clean_login_identifier(
        request.data.get("identifier")
        or request.data.get("username")
        or request.data.get("email")
        or request.data.get("phone")
        or request.data.get("mobile")
        or request.data.get("whatsapp_number")
        or ""
    )
    password = _clean_password(request.data.get("password"))
    remember = _as_bool(request.data.get("remember"))

    if not identifier or not password:
        return _error(
            code="credentials_required",
            detail="Username/email/phone and password are required.",
            status=400,
        )

    resolution = resolve_login_identity(identifier)

    if not resolution.found:
        # Run Django's authentication path once for timing consistency, but do
        # not accept an ambiguous or unresolved identity.
        authenticate(
            request=request,
            username=identifier,
            password=password,
        )
        return _error(
            code="invalid_credentials",
            detail="Invalid username/email/phone or password.",
            status=400,
        )

    resolved_user = resolution.user
    authenticated_user = authenticate(
        request=request,
        username=resolved_user.get_username(),
        password=password,
    )

    if authenticated_user is None:
        return _error(
            code="invalid_credentials",
            detail="Invalid username/email/phone or password.",
            status=400,
        )

    if not authenticated_user.is_active:
        return _error(
            code="account_inactive",
            detail="This user account is inactive.",
            status=403,
        )

    profile, _ = UserProfile.objects.get_or_create(
        user=authenticated_user,
        defaults={
            "display_name": (
                authenticated_user.get_full_name()
                or authenticated_user.get_username()
            ),
        },
    )

    if profile.status in {
        UserProfileStatus.SUSPENDED,
        UserProfileStatus.INACTIVE,
    }:
        return _error(
            code="profile_access_denied",
            detail="This user profile is not allowed to sign in.",
            status=403,
        )

    payload = _login_payload(authenticated_user)

    if not payload.get("dashboard_path"):
        return _error(
            code="workspace_access_denied",
            detail="No active system or company workspace is available.",
            status=403,
        )

    django_login(request, authenticated_user)
    request.session.set_expiry(
        settings.SESSION_COOKIE_AGE if remember else 0
    )
    request.session.modified = True

    profile.touch_last_seen()

    payload["session_persistent"] = remember
    return Response(payload)
