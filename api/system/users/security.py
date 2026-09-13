from __future__ import annotations

from typing import Any

from django.db.models import Q

from accounts.models import SystemRole, UserProfile, UserProfileStatus


def requester_is_super_admin(user: Any) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if not getattr(user, "is_active", False):
        return False
    if getattr(user, "is_superuser", False):
        return True

    profile = getattr(user, "Mhamcloud_profile", None)
    return bool(
        profile
        and profile.can_access_system
        and profile.system_role == SystemRole.SUPER_ADMIN
    )


def is_system_user_target(user: Any, profile: UserProfile) -> bool:
    return bool(
        getattr(user, "is_superuser", False)
        or (
            profile.is_system_user
            and profile.system_role != SystemRole.NONE
        )
    )


def is_super_admin_target(
    user: Any,
    profile: UserProfile,
) -> bool:
    """
    Structural super-admin classification.

    This deliberately ignores the current active/suspended state. An inactive
    SUPER_ADMIN is still a privileged account and lower roles must never be
    able to edit or reactivate it.
    """
    return bool(
        getattr(user, "is_superuser", False)
        or profile.system_role == SystemRole.SUPER_ADMIN
    )


def is_effective_active_super_admin(
    user: Any,
    profile: UserProfile,
) -> bool:
    if not getattr(user, "is_active", False):
        return False

    if getattr(user, "is_superuser", False):
        return True

    return bool(
        profile.status == UserProfileStatus.ACTIVE
        and profile.is_system_user
        and profile.system_role == SystemRole.SUPER_ADMIN
    )


def active_effective_super_admin_count() -> int:
    return (
        UserProfile.objects.filter(user__is_active=True)
        .filter(
            Q(user__is_superuser=True)
            | Q(
                status=UserProfileStatus.ACTIVE,
                is_system_user=True,
                system_role=SystemRole.SUPER_ADMIN,
            )
        )
        .distinct()
        .count()
    )


def is_last_active_super_admin(
    user: Any,
    profile: UserProfile,
) -> bool:
    return bool(
        is_effective_active_super_admin(user, profile)
        and active_effective_super_admin_count() <= 1
    )
