# ============================================================
# ?? api/company/purchases/requests/_shared.py
# ?? PrimeyAcc | Purchase Requests Shared API Helpers
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from purchases.models import PurchaseRequest


class PurchaseRequestAPIError(Exception):
    """
    Purchase request API-level error.
    """


def get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseRequestAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
    user = getattr(request, "user", None)

    if user and getattr(
        user,
        "is_authenticated",
        False,
    ):
        return user

    return None


def validation_error_payload(
    exc: ValidationError,
) -> dict:
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {
            "detail": exc.messages,
        }

    return {
        "detail": str(exc),
    }


def get_company_purchase_request(
    *,
    company,
    request_id: int | str,
) -> PurchaseRequest | None:
    return (
        PurchaseRequest.objects
        .select_related(
            "company",
            "branch",
            "created_by",
            "updated_by",
            "submitted_by",
            "approved_by",
            "rejected_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__item",
            "purchase_orders",
            "purchase_orders__supplier",
        )
        .filter(
            company=company,
            id=request_id,
        )
        .first()
    )
