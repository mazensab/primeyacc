# ============================================================
# ?? api/company/inventory/reservations/common.py
# ?? PrimeyAcc | Stock Reservation API Helpers V1.0
# ------------------------------------------------------------
# ? Request company resolution
# ? Stable validation error payloads
# ? Company-scoped reservation queries
# ? Safe integer and text normalization
# ============================================================
# ??????? ????????:
# - ?????? ???? ?? request.company ???
# - ?? ??? ?????? ?? company_id ?? ???????
# - ?? lookup ??? ?? ???? ???? ?????? ???????
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError

from inventory.models import StockReservation


class StockReservationAPIError(Exception):
    """
    Stable API-level reservation error.
    """


def get_request_company(request):
    """
    Return the company attached by the company permission layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockReservationAPIError(
            "Current company context was not resolved."
        )

    return company


def validation_errors(
    exc: ValidationError,
) -> dict[str, Any]:
    """
    Normalize Django ValidationError for API responses.
    """
    if hasattr(exc, "message_dict"):
        result = {}

        for field, messages in exc.message_dict.items():
            if not isinstance(messages, (list, tuple)):
                messages = [messages]

            result[field] = [
                str(message)
                for message in messages
            ]

        return result

    if hasattr(exc, "messages"):
        return {
            "detail": [
                str(message)
                for message in exc.messages
            ]
        }

    return {
        "detail": [str(exc)],
    }


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def clean_positive_int(
    value: Any,
    *,
    default: int,
    maximum: int | None = None,
) -> int:
    try:
        result = int(value)
    except (TypeError, ValueError):
        result = default

    if result < 1:
        result = default

    if maximum is not None:
        result = min(result, maximum)

    return result


def get_company_reservation(
    *,
    company,
    reservation_id,
    include_allocations: bool = False,
) -> StockReservation | None:
    """
    Resolve one reservation inside the current company.
    """
    queryset = (
        StockReservation.objects
        .filter(
            id=reservation_id,
            company=company,
        )
        .select_related(
            "company",
            "sales_order",
            "sales_order__branch",
            "created_by",
            "updated_by",
            "allocated_by",
            "cancelled_by",
        )
    )

    if include_allocations:
        queryset = queryset.prefetch_related(
            "allocations__sales_order_item",
            "allocations__warehouse",
            "allocations__location",
            "allocations__stock_item",
            "allocations__item",
            "allocations__batch",
            "allocations__serial_number",
            "allocations__created_by",
            "allocations__updated_by",
        )

    return queryset.first()
