from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from purchases.models import PurchaseReceipt


class PurchaseReceiptAPIError(Exception):
    """
    Purchase receipt API context error.
    """


def get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseReceiptAPIError(
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


def get_company_purchase_receipt(
    *,
    company,
    purchase_receipt_id: int | str,
) -> PurchaseReceipt | None:
    return (
        PurchaseReceipt.objects
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
            "warehouse",
            "created_by",
            "updated_by",
            "posted_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__bill_item",
            "items__item",
            "items__stock_movement",
        )
        .filter(
            company=company,
            id=purchase_receipt_id,
        )
        .first()
    )
