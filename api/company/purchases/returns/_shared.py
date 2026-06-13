from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from purchases.models import PurchaseReturn


class PurchaseReturnAPIError(Exception):
    """
    Purchase return API context error.
    """


def get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseReturnAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
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
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }


def get_company_purchase_return(
    *,
    company,
    purchase_return_id: int | str,
) -> PurchaseReturn | None:
    return (
        PurchaseReturn.objects
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
            "created_by",
            "updated_by",
            "confirmed_by",
            "posted_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__bill_item",
            "items__item",
        )
        .filter(
            company=company,
            id=purchase_return_id,
        )
        .first()
    )
