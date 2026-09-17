from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError

from accounts.branch_access import BranchAccessDenied
from accounts.branch_enforcement import (
    BranchEnforcementError,
    enforce_object_branch_access,
    resolve_operational_branch,
    scope_queryset_to_accessible_branches,
    scope_queryset_to_branch,
)
from api.permissions import get_current_company_membership


def get_request_membership(request):
    membership = (
        getattr(request, "company_membership", None)
        or get_current_company_membership(request)
    )
    if membership is None or not membership.is_active_membership:
        raise BranchEnforcementError(
            "Active company membership is required."
        )
    return membership


def get_request_branch_selector(request) -> Any:
    headers = getattr(request, "headers", {}) or {}
    raw = headers.get("X-Branch-ID")

    if raw in (None, ""):
        query = getattr(request, "query_params", None)
        if query is None:
            query = getattr(request, "GET", None)
        if query is not None:
            raw = query.get("branch_id") or query.get("branch")

    if raw in (None, "") and getattr(request, "method", "GET") not in (
        "GET", "HEAD", "OPTIONS"
    ):
        try:
            data = request.data
        except Exception:
            data = {}
        if isinstance(data, dict):
            raw = data.get("branch_id") or data.get("branch")

    return raw


def require_operational_branch(
    request,
    *,
    branch_id=None,
    permission: str | None = None,
):
    membership = get_request_membership(request)
    selector = (
        branch_id
        if branch_id not in (None, "")
        else get_request_branch_selector(request)
    )
    try:
        return resolve_operational_branch(
            membership,
            selector,
            permission=permission,
        )
    except (BranchAccessDenied, BranchEnforcementError) as exc:
        raise ValidationError({"branch": str(exc)}) from exc


def scope_operational_queryset(
    queryset,
    request,
    *,
    branch_lookup: str = "branch_id",
    branch_id=None,
    permission: str | None = None,
):
    membership = get_request_membership(request)
    selector = (
        branch_id
        if branch_id not in (None, "")
        else get_request_branch_selector(request)
    )
    if selector not in (None, ""):
        try:
            return scope_queryset_to_branch(
                queryset,
                membership,
                selector,
                branch_lookup=branch_lookup,
                permission=permission,
            )
        except (BranchAccessDenied, BranchEnforcementError) as exc:
            raise ValidationError({"branch": str(exc)}) from exc

    return scope_queryset_to_accessible_branches(
        queryset,
        membership,
        branch_lookup=branch_lookup,
        permission=permission,
    )


def require_object_branch(
    request,
    obj,
    *,
    branch_attr: str = "branch_id",
    permission: str | None = None,
):
    membership = get_request_membership(request)
    try:
        return enforce_object_branch_access(
            obj,
            membership,
            branch_attr=branch_attr,
            permission=permission,
        )
    except (BranchAccessDenied, BranchEnforcementError) as exc:
        raise ValidationError({"branch": str(exc)}) from exc


def require_payload_branch(
    request,
    payload: dict,
    *,
    permission: str | None = None,
):
    branch_id = payload.get("branch_id") or payload.get("branch")
    branch = require_operational_branch(
        request,
        branch_id=branch_id,
        permission=permission,
    )
    normalized = dict(payload)
    normalized["branch_id"] = branch.id
    normalized.pop("branch", None)
    return branch, normalized
