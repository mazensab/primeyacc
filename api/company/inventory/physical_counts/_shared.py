# ============================================================
# ?? api/company/inventory/physical_counts/_shared.py
# ?? PrimeyAcc | Physical Inventory Count API Helpers V1.0
# ------------------------------------------------------------
# ? Request company resolution
# ? Request user resolution
# ? Stable validation error payloads
# ? Company-scoped physical inventory count lookup
# ? No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from inventory.models import PhysicalInventoryCount


class PhysicalInventoryCountAPIError(Exception):
    """
    Physical inventory count API context error.
    """


def get_request_company(request: Request):
    """
    Resolve the active company from the permission/context layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PhysicalInventoryCountAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
    """
    Return authenticated request user or None.
    """
    user = getattr(request, "user", None)

    if (
        user
        and getattr(user, "is_authenticated", False)
    ):
        return user

    return None


def validation_error_payload(
    exc: ValidationError,
) -> dict:
    """
    Normalize Django ValidationError into a stable API payload.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {
            "detail": exc.messages,
        }

    return {
        "detail": str(exc),
    }


def company_payload(company) -> dict:
    """
    Serialize minimal company context.
    """
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }


def get_company_physical_inventory_count(
    *,
    company,
    count_id: int | str,
) -> PhysicalInventoryCount | None:
    """
    Resolve one physical inventory count inside the current company only.
    """
    return (
        PhysicalInventoryCount.objects
        .select_related(
            "company",
            "warehouse",
            "location",
            "started_by",
            "posted_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )
        .prefetch_related(
            "items",
            "items__warehouse",
            "items__location",
            "items__stock_item",
            "items__item",
            "items__item__unit",
            "items__stock_movement",
        )
        .filter(
            company=company,
            id=count_id,
        )
        .first()
    )
