# ============================================================
# File: api/system/users/detail.py
# Module: PrimeyAcc System User Detail API
# Endpoint: GET /api/system/users/<user_id>/ and /api/users/<user_id>/
# Purpose:
# - Return one PrimeyAcc user profile for the system workspace.
# - Includes company memberships for detail pages.
# - Protected by system permission: system.users.view.
# ============================================================
from __future__ import annotations
from typing import Any
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET
from accounts.models import CompanyMembership
from api.permissions import user_has_system_permission
from .list import _datetime_to_string, _profile_payload
SYSTEM_USERS_VIEW_PERMISSION = "system.users.view"
UserModel = get_user_model()
def _membership_payload(membership: CompanyMembership) -> dict[str, Any]:
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
@login_required
@require_GET
def system_user_detail(request: HttpRequest, user_id: int) -> JsonResponse:
    if not user_has_system_permission(request.user, SYSTEM_USERS_VIEW_PERMISSION):
        return JsonResponse(
            {
                "detail": "You do not have permission to view system users.",
                "code": "system_users_view_forbidden",
            },
            status=403,
        )
    user = (
        UserModel.objects.filter(id=user_id)
        .select_related("primeyacc_profile")
        .first()
    )
    if not user:
        return JsonResponse(
            {"detail": "User was not found.", "code": "system_user_not_found"},
            status=404,
        )
    profile = getattr(user, "primeyacc_profile", None)
    if not profile:
        return JsonResponse(
            {
                "detail": "User profile was not found.",
                "code": "system_user_profile_not_found",
            },
            status=404,
        )
    payload = _profile_payload(profile)
    memberships = (
        CompanyMembership.objects.filter(user=user)
        .select_related("company")
        .order_by("-is_primary", "-created_at", "-id")
    )
    payload["memberships"] = [
        _membership_payload(membership) for membership in memberships
    ]
    payload["memberships_count"] = len(payload["memberships"])
    payload["active_memberships_count"] = sum(
        1 for membership in payload["memberships"] if membership["is_active"]
    )
    return JsonResponse(payload)
