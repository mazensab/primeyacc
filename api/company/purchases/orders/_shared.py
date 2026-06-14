from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from purchases.models import PurchaseOrder


class PurchaseOrderAPIError(Exception):
    """
    Purchase order API-level error.
    """


def get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseOrderAPIError(
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


def get_company_purchase_order(
    *,
    company,
    order_id: int | str,
) -> PurchaseOrder | None:
    return (
        PurchaseOrder.objects
        .select_related(
            "company",
            "branch",
            "supplier",
            "created_by",
            "updated_by",
            "approved_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__item",
            "bills",
        )
        .filter(
            company=company,
            id=order_id,
        )
        .first()
    )
