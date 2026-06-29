# ============================================================
# File: api/system/users/list.py
# Module: Mhamcloud System Users List API
# Endpoint: GET /api/system/users/ and /api/users/
# Purpose:
# - List Mhamcloud user profiles for the system workspace.
# - Supports search, status, role, access and pagination filters.
# - Protected by system permission: system.users.view.
# - Returns real database records only.
# ============================================================
from __future__ import annotations
from typing import Any
from django.contrib.auth.decorators import login_required
from django.db.models import Count, Q
from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET
from accounts.models import SystemRole, UserProfile, UserProfileStatus
from api.permissions import user_has_system_permission
SYSTEM_USERS_VIEW_PERMISSION = "system.users.view"
def _datetime_to_string(value: Any) -> str | None:
    return value.isoformat() if value else None
def _to_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    if parsed < 1:
        parsed = default
    if maximum is not None:
        parsed = min(parsed, maximum)
    return parsed
def _profile_payload(profile: UserProfile) -> dict[str, Any]:
    user = profile.user
    full_name = user.get_full_name().strip()
    display_name = profile.display_name or full_name or user.get_username()
    return {
        "id": user.id,
        "user_id": user.id,
        "profile_id": profile.id,
        "username": user.get_username(),
        "email": user.email or "",
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "full_name": full_name,
        "display_name": display_name,
        "name": display_name,
        "phone": profile.phone or "",
        "mobile": profile.mobile or "",
        "whatsapp_number": profile.whatsapp_number or "",
        "status": profile.status,
        "is_active": user.is_active,
        "is_staff": user.is_staff,
        "is_superuser": user.is_superuser,
        "default_workspace": profile.default_workspace,
        "system_role": profile.system_role,
        "role": profile.system_role,
        "is_system_user": profile.is_system_user,
        "can_access_system": profile.can_access_system,
        "access_type": "system" if profile.can_access_system else "company",
        "system_permissions": profile.system_permissions,
        "default_company_id": profile.default_company_id,
        "last_seen_at": _datetime_to_string(profile.last_seen_at),
        "suspended_at": _datetime_to_string(profile.suspended_at),
        "suspended_reason": profile.suspended_reason or "",
        "created_at": _datetime_to_string(profile.created_at),
        "updated_at": _datetime_to_string(profile.updated_at),
    }
def _stats_payload() -> dict[str, int]:
    data = UserProfile.objects.aggregate(
        total=Count("id"),
        active=Count("id", filter=Q(status=UserProfileStatus.ACTIVE)),
        suspended=Count("id", filter=Q(status=UserProfileStatus.SUSPENDED)),
        system_users=Count("id", filter=Q(is_system_user=True)),
        active_system_users=Count(
            "id",
            filter=Q(status=UserProfileStatus.ACTIVE, is_system_user=True)
            & ~Q(system_role=SystemRole.NONE),
        ),
    )
    return {key: int(value or 0) for key, value in data.items()}
def _apply_filters(queryset, request: HttpRequest):
    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status = (request.GET.get("status") or "").strip().upper()
    role = (request.GET.get("system_role") or request.GET.get("role") or "").strip().upper()
    access = (request.GET.get("access") or request.GET.get("is_system_user") or "").strip().lower()
    if search:
        queryset = queryset.filter(
            Q(display_name__icontains=search)
            | Q(phone__icontains=search)
            | Q(mobile__icontains=search)
            | Q(whatsapp_number__icontains=search)
            | Q(system_role__icontains=search)
            | Q(status__icontains=search)
            | Q(user__username__icontains=search)
            | Q(user__email__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
        )
    valid_statuses = {choice[0] for choice in UserProfileStatus.choices}
    if status in valid_statuses:
        queryset = queryset.filter(status=status)
    valid_roles = {choice[0] for choice in SystemRole.choices}
    if role in valid_roles:
        queryset = queryset.filter(system_role=role)
    if access in {"1", "true", "yes", "system"}:
        queryset = queryset.filter(is_system_user=True).exclude(system_role=SystemRole.NONE)
    elif access in {"0", "false", "no", "company"}:
        queryset = queryset.filter(Q(is_system_user=False) | Q(system_role=SystemRole.NONE))
    return queryset
def _apply_ordering(queryset, request: HttpRequest):
    ordering = (request.GET.get("ordering") or request.GET.get("sort") or "newest").strip().lower()
    ordering_map = {
        "newest": "-created_at",
        "-created_at": "-created_at",
        "oldest": "created_at",
        "created_at": "created_at",
        "name": "display_name",
        "username": "user__username",
        "email": "user__email",
        "role": "system_role",
        "status": "status",
    }
    return queryset.order_by(ordering_map.get(ordering, "-created_at"), "-id")
@login_required
@require_GET
def system_users_list(request: HttpRequest) -> JsonResponse:
    if not user_has_system_permission(request.user, SYSTEM_USERS_VIEW_PERMISSION):
        return JsonResponse(
            {
                "detail": "You do not have permission to view system users.",
                "code": "system_users_view_forbidden",
            },
            status=403,
        )
    queryset = UserProfile.objects.select_related("user").all()
    queryset = _apply_filters(queryset, request)
    queryset = _apply_ordering(queryset, request)
    total = queryset.count()
    page = _to_positive_int(request.GET.get("page"), 1)
    page_size = _to_positive_int(
        request.GET.get("page_size") or request.GET.get("limit"),
        20,
        maximum=100,
    )
    start = (page - 1) * page_size
    end = start + page_size
    return JsonResponse(
        {
            "results": [_profile_payload(profile) for profile in queryset[start:end]],
            "count": total,
            "total": total,
            "page": page,
            "page_size": page_size,
            "has_next": end < total,
            "has_previous": page > 1,
            "stats": _stats_payload(),
        }
    )
