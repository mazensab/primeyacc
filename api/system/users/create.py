# ============================================================
# File: api/system/users/create.py
# Module: PrimeyAcc System Users Create API
# Endpoint:
# - POST /api/system/users/
# - POST /api/system/users/create/
# - POST /api/users/
# - POST /api/users/create/
# ------------------------------------------------------------
# Checklist:
# - Real API only
# - Session + CSRF protected
# - System permission guarded
# - Creates Django auth.User + accounts.UserProfile
# - Does not trust frontend company_id
# - No fake/demo data
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError, transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from accounts.models import SystemRole, UserProfile, UserProfileStatus
from api.permissions import user_has_system_permission
from .list import _profile_payload

SYSTEM_USERS_CREATE_PERMISSION = "system.users.create"

UserModel = get_user_model()


def _json_body(request: HttpRequest) -> dict[str, Any]:
    if request.content_type and "application/json" in request.content_type.lower():
        try:
            payload = json.loads((request.body or b"{}").decode("utf-8"))
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}
    return {}


def _get_value(
    request: HttpRequest,
    payload: dict[str, Any],
    key: str,
    default: Any = "",
) -> Any:
    if key in payload:
        return payload.get(key)
    return request.POST.get(key, default)


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _to_bool(value: Any, default: bool = False) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "active", "enabled"}


def _normalize_username(value: Any) -> str:
    username = _clean_text(value).replace(" ", ".").lower()
    while ".." in username:
        username = username.replace("..", ".")
    return username.strip(".")


def _normalize_role(value: Any) -> str:
    role = _clean_text(value).upper()
    valid_roles = {choice[0] for choice in SystemRole.choices}
    if role not in valid_roles or role == SystemRole.NONE:
        return ""
    return role


def _normalize_status(value: Any, is_active: bool) -> str:
    raw = _clean_text(value).upper()

    if raw in {"ACTIVE", "ACTIVATED", "ENABLED", "TRUE", "1"}:
        return UserProfileStatus.ACTIVE

    if raw in {"INACTIVE", "DISABLED", "FALSE", "0"}:
        return UserProfileStatus.INACTIVE

    if raw in {"SUSPENDED", "BLOCKED"}:
        return UserProfileStatus.SUSPENDED

    return UserProfileStatus.ACTIVE if is_active else UserProfileStatus.INACTIVE


def _set_profile_field(profile: UserProfile, field_name: str, value: Any) -> None:
    if hasattr(profile, field_name):
        setattr(profile, field_name, value)


@login_required
@csrf_protect
@require_POST
def system_user_create(request: HttpRequest) -> JsonResponse:
    """
    Create a PrimeyAcc system user.

    Expected frontend payload:
    {
        "username": "...",
        "password": "...",
        "email": "...",
        "first_name": "...",
        "last_name": "...",
        "phone": "...",
        "system_role": "SUPPORT",
        "access_type": "system",
        "is_active": true,
        "status_reason": "..."
    }
    """

    if not user_has_system_permission(request.user, SYSTEM_USERS_CREATE_PERMISSION):
        return JsonResponse(
            {
                "detail": "You do not have permission to create system users.",
                "code": "system_users_create_forbidden",
            },
            status=403,
        )

    payload = _json_body(request)

    username = _normalize_username(_get_value(request, payload, "username"))
    password = _clean_text(_get_value(request, payload, "password"))
    email = _clean_text(_get_value(request, payload, "email"))
    first_name = _clean_text(_get_value(request, payload, "first_name"))
    last_name = _clean_text(_get_value(request, payload, "last_name"))
    phone = _clean_text(_get_value(request, payload, "phone"))
    system_role = _normalize_role(_get_value(request, payload, "system_role"))
    is_active = _to_bool(_get_value(request, payload, "is_active", True), True)
    profile_status = _normalize_status(_get_value(request, payload, "status", ""), is_active)
    status_reason = _clean_text(
        _get_value(
            request,
            payload,
            "status_reason",
            _get_value(request, payload, "notes", ""),
        )
    )

    if not username:
        return JsonResponse(
            {"detail": "Username is required.", "code": "username_required"},
            status=400,
        )

    if len(password) < 8:
        return JsonResponse(
            {
                "detail": "Password must be at least 8 characters.",
                "code": "password_too_short",
            },
            status=400,
        )

    if not system_role:
        return JsonResponse(
            {
                "detail": "A valid system_role is required.",
                "code": "invalid_system_role",
                "allowed_roles": [
                    SystemRole.SUPER_ADMIN,
                    SystemRole.SYSTEM_ADMIN,
                    SystemRole.SUPPORT,
                    SystemRole.BILLING_MANAGER,
                ],
            },
            status=400,
        )

    if UserModel.objects.filter(username__iexact=username).exists():
        return JsonResponse(
            {
                "detail": "Username already exists.",
                "code": "username_already_exists",
                "username": username,
            },
            status=400,
        )

    if email and UserModel.objects.filter(email__iexact=email).exists():
        return JsonResponse(
            {
                "detail": "Email already exists.",
                "code": "email_already_exists",
                "email": email,
            },
            status=400,
        )

    try:
        with transaction.atomic():
            user = UserModel.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            user.is_active = is_active and profile_status == UserProfileStatus.ACTIVE
            user.is_staff = False
            user.is_superuser = False
            user.save(update_fields=["is_active", "is_staff", "is_superuser"])

            display_name = " ".join(part for part in [first_name, last_name] if part).strip()
            if not display_name:
                display_name = username

            profile, _ = UserProfile.objects.get_or_create(
                user=user,
                defaults={
                    "display_name": display_name,
                    "phone": phone,
                    "status": profile_status,
                    "system_role": system_role,
                    "is_system_user": True,
                    "language": "ar",
                    "timezone": "Asia/Riyadh",
                },
            )

            profile.display_name = display_name
            profile.phone = phone
            profile.status = profile_status
            profile.system_role = system_role
            profile.is_system_user = True
            _set_profile_field(profile, "language", "ar")
            _set_profile_field(profile, "timezone", "Asia/Riyadh")

            if status_reason:
                _set_profile_field(profile, "suspended_reason", status_reason)

            if profile_status == UserProfileStatus.SUSPENDED and hasattr(profile, "suspended_reason"):
                profile.suspended_reason = status_reason

            profile.save()

    except IntegrityError:
        return JsonResponse(
            {
                "detail": "User could not be created because of a database integrity conflict.",
                "code": "system_user_integrity_error",
            },
            status=400,
        )

    response_payload = _profile_payload(profile)
    response_payload["id"] = user.id
    response_payload["user_id"] = user.id
    response_payload["detail"] = "System user created successfully."

    return JsonResponse(response_payload, status=201)
