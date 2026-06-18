# ============================================================
# ?? api/company/inventory/reservations/cancel.py
# ?? PrimeyAcc | Stock Reservation Cancel API V1.0
# ------------------------------------------------------------
# ? Cancel reservation
# ? Release outstanding allocations
# ? Company-scoped lifecycle action
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import cancel_stock_reservation

from .common import (
    StockReservationAPIError,
    get_company_reservation,
    get_request_company,
    validation_errors,
)
from .serializers import serialize_stock_reservation


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservation_cancel(
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

        cancel_stock_reservation(
            company=company,
            reservation=reservation,
            reason=request.data.get("reason") or "",
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
                    "Stock reservation cancelled successfully."
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
                    "Stock reservation cancellation failed."
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


stock_reservation_cancel.required_company_permissions = [
    "company.inventory.reservations.cancel",
]
