# ============================================================
# ?? api/company/inventory/reservations/expire.py
# ?? Mhamcloud | Stock Reservation Expire API V1.0
# ------------------------------------------------------------
# ? Expire reservation
# ? Optional forced expiry
# ? Release outstanding allocations
# ? Tenant-isolated lifecycle action
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import expire_stock_reservation

from .common import (
    StockReservationAPIError,
    get_company_reservation,
    get_request_company,
    validation_errors,
)
from .serializers import serialize_stock_reservation


def _as_bool(value) -> bool:
    return str(value or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservation_expire(
    request,
    reservation_id,
):
    try:
        company = get_request_company(request)

        reservation = get_company_reservation(
            company=company,
            reservation_id=reservation_id,
        )

        if reservation is None:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Stock reservation was not found."
                    ),
                },
                status=404,
            )

        expire_stock_reservation(
            company=company,
            reservation=reservation,
            reason=request.data.get("reason") or "",
            force=_as_bool(request.data.get("force")),
            user=request.user,
        )

        reservation = get_company_reservation(
            company=company,
            reservation_id=reservation.id,
            include_allocations=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Stock reservation expired successfully."
                ),
                "reservation": serialize_stock_reservation(
                    reservation,
                    include_allocations=True,
                ),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Stock reservation expiry failed."
                ),
                "errors": validation_errors(exc),
            },
            status=400,
        )

    except StockReservationAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": [str(exc)]},
            },
            status=400,
        )


stock_reservation_expire.required_company_permissions = [
    "company.inventory.reservations.expire",
]
