from __future__ import annotations

import json
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.http import HttpRequest, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_POST

from accounts.models import UserProfileStatus
from api.permissions import user_has_system_permission

from .list import _profile_payload
from .security import (
    is_last_active_super_admin,
    is_super_admin_target,
    is_system_user_target,
    requester_is_super_admin,
)

SYSTEM_USERS_UPDATE_PERMISSION = "system.users.update"
UserModel = get_user_model()

_ALLOWED_ACTIONS = {"activate", "suspend", "deactivate"}


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
@require_POST
def system_user_status(
    request: HttpRequest,
    user_id: int,
) -> JsonResponse:
    if not user_has_system_permission(
        request.user,
        SYSTEM_USERS_UPDATE_PERMISSION,
    ):
        return JsonResponse(
            {
                "detail": "You do not have permission to update system users.",
                "code": "system_users_update_forbidden",
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

    if not is_system_user_target(user, profile):
        return JsonResponse(
            {
                "detail": "This action is limited to system users.",
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
                "detail": "Only a super admin may change another super admin.",
                "code": "system_users_super_admin_target_forbidden",
            },
            status=403,
        )

    payload = _json_body(request)
    action = _clean_text(
        payload.get("action", request.POST.get("action", ""))
    ).lower()
    reason = _clean_text(
        payload.get("reason", payload.get("status_reason", ""))
    )

    if action not in _ALLOWED_ACTIONS:
        return JsonResponse(
            {
                "detail": "A valid status action is required.",
                "code": "invalid_system_user_status_action",
                "allowed_actions": sorted(_ALLOWED_ACTIONS),
            },
            status=400,
        )

    if (
        action in {"suspend", "deactivate"}
        and request.user.pk == user.pk
    ):
        return JsonResponse(
            {
                "detail": "You cannot suspend or deactivate your own account.",
                "code": "system_user_self_disable_forbidden",
            },
            status=400,
        )

    if (
        action in {"suspend", "deactivate"}
        and is_last_active_super_admin(user, profile)
    ):
        return JsonResponse(
            {
                "detail": "The last active super admin cannot be disabled.",
                "code": "last_active_super_admin_required",
            },
            status=400,
        )

    if action in {"suspend", "deactivate"} and not reason:
        return JsonResponse(
            {
                "detail": (
                    "A reason is required when suspending or deactivating "
                    "a system user."
                ),
                "code": "system_user_status_reason_required",
            },
            status=400,
        )

    with transaction.atomic():
        if action == "activate":
            user.is_active = True
            profile.status = UserProfileStatus.ACTIVE
            profile.suspended_at = None
            profile.suspended_reason = ""
        elif action == "suspend":
            user.is_active = False
            profile.status = UserProfileStatus.SUSPENDED
            profile.suspended_at = timezone.now()
            profile.suspended_reason = reason
        else:
            user.is_active = False
            profile.status = UserProfileStatus.INACTIVE
            profile.suspended_at = None
            profile.suspended_reason = reason

        user.save(update_fields=["is_active"])
        profile.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_at",
            ]
        )

    response_payload = _profile_payload(profile)
    response_payload["detail"] = "System user status updated successfully."
    response_payload["action"] = action

    return JsonResponse(response_payload)
