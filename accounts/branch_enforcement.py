from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from accounts.branch_access import (
    BranchAccessDenied,
    accessible_branches,
    has_branch_permission,
    resolve_branch,
)


class BranchEnforcementError(BranchAccessDenied):
    """Raised when an operational branch boundary is violated."""


def resolve_operational_branch(
    membership,
    branch_id=None,
    *,
    permission: str | None = None,
):
    """
    Resolve one concrete active, authorized branch for an operational action.

    This is intentionally single-branch. Consolidated/all-branches mode is a
    read concern and must never be used as an implicit mutation branch.
    """
    try:
        branch = resolve_branch(membership, branch_id, required=True)
    except BranchAccessDenied as exc:
        raise BranchEnforcementError(str(exc)) from exc

    if permission and not has_branch_permission(
        membership,
        permission,
        branch_id=branch.id,
    ):
        raise BranchEnforcementError(
            "Branch permission is not authorized for this membership."
        )

    return branch


def scope_queryset_to_branch(
    queryset: QuerySet,
    membership,
    branch_id=None,
    *,
    branch_lookup: str = "branch_id",
    permission: str | None = None,
) -> QuerySet:
    """Scope an operational queryset to exactly one active authorized branch."""
    branch = resolve_operational_branch(
        membership,
        branch_id,
        permission=permission,
    )
    return queryset.filter(**{branch_lookup: branch.id})


def scope_queryset_to_accessible_branches(
    queryset: QuerySet,
    membership,
    *,
    branch_lookup: str = "branch_id",
    permission: str | None = None,
) -> QuerySet:
    """
    Scope a consolidated/read queryset to branches accessible to membership.

    This helper is not a mutation-context resolver.
    """
    branches = accessible_branches(membership)

    if permission:
        allowed_ids = [
            branch.id
            for branch in branches
            if has_branch_permission(
                membership,
                permission,
                branch_id=branch.id,
            )
        ]
        return queryset.filter(
            **{f"{branch_lookup}__in": allowed_ids}
        )

    return queryset.filter(
        **{f"{branch_lookup}__in": branches.values("id")}
    )


def object_branch_id(
    obj: Any,
    *,
    branch_attr: str = "branch_id",
) -> int | None:
    """
    Read a branch id through a dotted attribute path.

    Examples:
      branch_id
      warehouse.branch_id
      employee.branch_id
      register.branch_id
    """
    current = obj

    for part in branch_attr.split("."):
        if current is None:
            return None
        current = getattr(current, part, None)

    if current in (None, "", 0, "0"):
        return None

    try:
        return int(current)
    except (TypeError, ValueError) as exc:
        raise BranchEnforcementError(
            "Object branch context is invalid."
        ) from exc


def enforce_object_branch_access(
    obj: Any,
    membership,
    *,
    branch_attr: str = "branch_id",
    permission: str | None = None,
):
    """Reject direct-object access outside the membership branch boundary."""
    branch_id = object_branch_id(
        obj,
        branch_attr=branch_attr,
    )

    if branch_id is None:
        raise BranchEnforcementError(
            "Object has no branch context."
        )

    branch = resolve_operational_branch(
        membership,
        branch_id,
        permission=permission,
    )

    return branch
