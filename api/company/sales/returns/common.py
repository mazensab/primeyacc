from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.request import Request
from rest_framework.response import Response

from sales.models import SalesInvoice, SalesReturn


class SalesReturnAPIError(Exception):
    """
    API-level error for company sales return endpoints.
    """


def get_request_company(request: Request):
    """
    Return the company resolved by the company workspace layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesReturnAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
    """
    Return the authenticated request user when available.
    """
    user = getattr(request, "user", None)

    if (
        user
        and getattr(
            user,
            "is_authenticated",
            False,
        )
    ):
        return user

    return None


def get_payload(request: Request) -> dict[str, Any]:
    """
    Return request payload safely.
    """
    try:
        data = request.data
    except Exception:
        data = {}

    if isinstance(data, dict):
        return data

    return {}


def clean_text(value: Any) -> str:
    """
    Normalize text values.
    """
    return str(value or "").strip()


def clean_positive_int(
    value: Any,
    *,
    default: int,
    maximum: int | None = None,
) -> int:
    """
    Normalize positive integer query parameters.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(
            number,
            maximum,
        )

    return number


def validation_error_payload(
    exc: ValidationError,
) -> dict[str, Any]:
    """
    Convert Django ValidationError to an API-safe payload.
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


def error_response(
    message: str,
    *,
    status: int = 400,
    errors: dict[str, Any] | None = None,
) -> Response:
    """
    Build a consistent failed API response.
    """
    return Response(
        {
            "ok": False,
            "success": False,
            "message": message,
            "errors": (
                errors
                or {
                    "detail": message,
                }
            ),
        },
        status=status,
    )


def get_company_sales_return(
    *,
    company,
    return_id: int | str,
) -> SalesReturn | None:
    """
    Resolve one return inside the current company.
    """
    return (
        SalesReturn.objects
        .select_related(
            "company",
            "branch",
            "customer",
            "invoice",
            "return_warehouse",
            "created_by",
            "updated_by",
            "confirmed_by",
            "posted_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__invoice_item",
            "items__catalog_item",
        )
        .filter(
            company=company,
            id=return_id,
        )
        .first()
    )


def get_company_invoice(
    *,
    company,
    invoice_id: int | str,
) -> SalesInvoice | None:
    """
    Resolve one sales invoice inside the current company.
    """
    return (
        SalesInvoice.objects
        .select_related(
            "company",
            "branch",
            "customer",
        )
        .prefetch_related(
            "items",
            "items__catalog_item",
            "sales_returns",
            "sales_returns__items",
        )
        .filter(
            company=company,
            id=invoice_id,
        )
        .first()
    )
