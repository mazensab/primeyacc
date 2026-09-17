# ============================================================
# ?? api/company/inventory/valuation/_shared.py
# ?? Mhamcloud | Inventory Valuation API Helpers V1.0
# ------------------------------------------------------------
# ? Request company resolution
# ? Stable filter parsing
# ? Company payload
# ? No frontend company_id trust
# ============================================================

from __future__ import annotations

from api.company.branch_enforcement import get_request_membership, require_operational_branch

from accounts.branch_access import accessible_branches

from typing import Any

from rest_framework.request import Request


class InventoryValuationAPIError(Exception):
    """
    Inventory valuation API context error.
    """


def get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise InventoryValuationAPIError(
            "Current company context was not resolved."
        )

    return company


def clean_text(value: Any) -> str:
    """
    Normalize optional request text.
    """
    return str(value or "").strip()


def clean_bool(
    value: Any,
    *,
    default: bool = True,
) -> bool:
    """
    Normalize common boolean values from query params.
    """
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    normalized = str(value).strip().lower()

    if normalized in {"1", "true", "yes", "y", "on"}:
        return True

    if normalized in {"0", "false", "no", "n", "off"}:
        return False

    return default


def company_payload(company) -> dict:
    """
    Serialize minimal company context.
    """
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }


def valuation_filters_from_request(request: Request) -> dict:
    """
    Extract supported valuation filters from query params.
    """
    membership = get_request_membership(request)
    requested_branch_id = clean_text(request.query_params.get("branch_id"))
    if requested_branch_id:
        branch = require_operational_branch(request, branch_id=requested_branch_id)
        branch_id = branch.id
        branch_ids = [branch.id]
    else:
        branch_id = None
        branch_ids = list(accessible_branches(membership).values_list("id", flat=True))

    return {
        "warehouse_id": clean_text(
            request.query_params.get("warehouse_id")
        ),
        "location_id": clean_text(
            request.query_params.get("location_id")
        ),
        "item_id": clean_text(
            request.query_params.get("item_id")
        ),
        "category_id": clean_text(
            request.query_params.get("category_id")
        ),
        "branch_id": branch_id,
        "branch_ids": branch_ids,
        "search": clean_text(
            request.query_params.get("search")
            or request.query_params.get("q")
        ),
        "include_zero_quantity": clean_bool(
            request.query_params.get("include_zero_quantity"),
            default=True,
        ),
    }
