# ============================================================
# File: api/system/users/detail.py
# Module: Mhamcloud System User Detail / Update API
# Endpoints:
# - GET   /api/system/users/<user_id>/
# - PATCH /api/system/users/<user_id>/
# Purpose:
# - Return one Mhamcloud profile with memberships.
# - Update safe identity/system-role fields for system users.
# - Never mutates password, username, Django staff/superuser flags, or status.
# ============================================================
from __future__ import annotations

import json
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_http_methods

from accounts.models import CompanyMembership, SystemRole
from api.permissions import user_has_system_permission

from .list import _datetime_to_string, _profile_payload
from .security import (
    is_last_active_super_admin,
    is_super_admin_target,
    is_system_user_target,
    requester_is_super_admin,
)

SYSTEM_USERS_VIEW_PERMISSION = "system.users.view"
SYSTEM_USERS_UPDATE_PERMISSION = "system.users.update"

UserModel = get_user_model()

_ALLOWED_ROLES = {
    SystemRole.SUPER_ADMIN,
    SystemRole.SYSTEM_ADMIN,
    SystemRole.SUPPORT,
    SystemRole.BILLING_MANAGER,
}
_ALLOWED_UPDATE_FIELDS = {
    "first_name",
    "last_name",
    "email",
    "display_name",
    "phone",
    "system_role",
}
_FORBIDDEN_UPDATE_FIELDS = {
    "username",
    "password",
    "is_staff",
    "is_superuser",
    "is_active",
    "status",
    "is_system_user",
    "default_workspace",
}


def _membership_payload(
    membership: CompanyMembership,
) -> dict[str, Any]:
    company = membership.company
    return {
        "id": membership.id,
        "company": {
            "id": company.id,
            "name": getattr(company, "display_name", str(company)),
            "slug": getattr(company, "slug", ""),
            "status": getattr(company, "status", ""),
        },
        "role": membership.role,
        "status": membership.status,
        "is_active": membership.is_active_membership,
        "is_primary": membership.is_primary,
        "job_title": membership.job_title or "",
        "department": membership.department or "",
        "permissions": membership.company_permissions,
        "joined_at": _datetime_to_string(membership.joined_at),
        "created_at": _datetime_to_string(membership.created_at),
        "updated_at": _datetime_to_string(membership.updated_at),
    }


def _detail_payload(user: Any, profile: Any) -> dict[str, Any]:
    payload = _profile_payload(profile)
    memberships = (
        CompanyMembership.objects.filter(user=user)
        .select_related("company")
        .order_by("-is_primary", "-created_at", "-id")
    )
    payload["memberships"] = [
        _membership_payload(membership)
        for membership in memberships
    ]
    payload["memberships_count"] = len(payload["memberships"])
    payload["active_memberships_count"] = sum(
        1
        for membership in payload["memberships"]
        if membership["is_active"]
    )
    return payload


def _json_body(request: HttpRequest) -> dict[str, Any]:
    if request.content_type and "application/json" in request.content_type.lower():
        try:
            payload = json.loads((request.body or b"{}").decode("utf-8"))
        except json.JSONDecodeError:
            return {}
        return payload if isinstance(payload, dict) else {}
    return {}


def _clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


@login_required
@csrf_protect
@require_http_methods(["GET", "PATCH"])
def system_user_detail(
    request: HttpRequest,
    user_id: int,
) -> JsonResponse:
    required_permission = (
        SYSTEM_USERS_VIEW_PERMISSION
        if request.method == "GET"
        else SYSTEM_USERS_UPDATE_PERMISSION
    )

    if not user_has_system_permission(
        request.user,
        required_permission,
    ):
        action = "view" if request.method == "GET" else "update"
        return JsonResponse(
            {
                "detail": (
                    f"You do not have permission to {action} system users."
                ),
                "code": f"system_users_{action}_forbidden",
            },
            status=403,
        )

    user = (
        UserModel.objects.filter(id=user_id)
        .select_related("Mhamcloud_profile")
        .first()
    )
    if not user:
        return JsonResponse(
            {
                "detail": "User was not found.",
                "code": "system_user_not_found",
            },
            status=404,
        )

    profile = getattr(user, "Mhamcloud_profile", None)
    if not profile:
        return JsonResponse(
            {
                "detail": "User profile was not found.",
                "code": "system_user_profile_not_found",
            },
            status=404,
        )

    if request.method == "GET":
        return JsonResponse(_detail_payload(user, profile))

    if not is_system_user_target(user, profile):
        return JsonResponse(
            {
                "detail": "This update contract is limited to system users.",
                "code": "system_user_required",
            },
            status=400,
        )

    if (
        is_super_admin_target(user, profile)
        and not requester_is_super_admin(request.user)
    ):
        return JsonResponse(
            {
                "detail": "Only a super admin may update another super admin.",
                "code": "system_users_super_admin_target_forbidden",
            },
            status=403,
        )

    payload = _json_body(request)
    if not payload:
        return JsonResponse(
            {
                "detail": "At least one editable field is required.",
                "code": "system_user_update_empty",
            },
            status=400,
        )

    forbidden = sorted(
        field
        for field in payload
        if field in _FORBIDDEN_UPDATE_FIELDS
    )
    if forbidden:
        return JsonResponse(
            {
                "detail": "One or more immutable fields were supplied.",
                "code": "system_user_immutable_fields",
                "fields": forbidden,
            },
            status=400,
        )

    unsupported = sorted(
        field
        for field in payload
        if field not in _ALLOWED_UPDATE_FIELDS
    )
    if unsupported:
        return JsonResponse(
            {
                "detail": "One or more unsupported fields were supplied.",
                "code": "system_user_unsupported_fields",
                "fields": unsupported,
            },
            status=400,
        )

    desired_role = profile.system_role
    if "system_role" in payload:
        desired_role = _clean_text(payload.get("system_role")).upper()
        if desired_role not in _ALLOWED_ROLES:
            return JsonResponse(
                {
                    "detail": "A valid system_role is required.",
                    "code": "invalid_system_role",
                    "allowed_roles": sorted(_ALLOWED_ROLES),
                },
                status=400,
            )

        if (
            desired_role == SystemRole.SUPER_ADMIN
            and not requester_is_super_admin(request.user)
        ):
            return JsonResponse(
                {
                    "detail": (
                        "Only a super admin may assign the SUPER_ADMIN role."
                    ),
                    "code": "system_users_super_admin_assign_forbidden",
                },
                status=403,
            )

        if (
            getattr(user, "is_superuser", False)
            and desired_role != SystemRole.SUPER_ADMIN
        ):
            return JsonResponse(
                {
                    "detail": (
                        "Django superuser effective role cannot be demoted "
                        "through this contract."
                    ),
                    "code": "django_superuser_role_immutable",
                },
                status=400,
            )

        if (
            profile.system_role == SystemRole.SUPER_ADMIN
            and desired_role != SystemRole.SUPER_ADMIN
            and is_last_active_super_admin(user, profile)
        ):
            return JsonResponse(
                {
                    "detail": (
                        "The last active super admin cannot be demoted."
                    ),
                    "code": "last_active_super_admin_required",
                },
                status=400,
            )

    email = (
        _clean_text(payload.get("email"))
        if "email" in payload
        else user.email
    )
    if (
        "email" in payload
        and email
        and UserModel.objects.filter(email__iexact=email)
        .exclude(pk=user.pk)
        .exists()
    ):
        return JsonResponse(
            {
                "detail": "Email already exists.",
                "code": "email_already_exists",
                "email": email,
            },
            status=400,
        )

    user_update_fields: list[str] = []
    profile_update_fields: list[str] = []

    with transaction.atomic():
        for field in ("first_name", "last_name", "email"):
            if field in payload:
                setattr(user, field, _clean_text(payload.get(field)))
                user_update_fields.append(field)

        if "display_name" in payload:
            profile.display_name = _clean_text(
                payload.get("display_name")
            )
            profile_update_fields.append("display_name")

        if "phone" in payload:
            profile.phone = _clean_text(payload.get("phone"))
            profile_update_fields.append("phone")

        if "system_role" in payload:
            profile.system_role = desired_role
            profile_update_fields.append("system_role")

        if user_update_fields:
            user.save(update_fields=user_update_fields)

        if profile_update_fields:
            profile.save(
                update_fields=[
                    *profile_update_fields,
                    "updated_at",
                ]
            )

    response_payload = _detail_payload(user, profile)
    response_payload["detail"] = "System user updated successfully."

    return JsonResponse(response_payload)
