# ============================================================
# ?? api/company/inventory/reservations/release.py
# ?? Mhamcloud | Reservation Allocation Release API V1.0
# ------------------------------------------------------------
# ? Partial/full allocation release
# ? Batch and serial lifecycle compatibility
# ? Company-scoped allocation lookup
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import StockReservationAllocation
from inventory.services import (
    release_stock_reservation_allocation,
)

from .common import (
    StockReservationAPIError,
    get_company_reservation,
    get_request_company,
    validation_errors,
)
from .serializers import serialize_stock_reservation


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservation_allocation_release(
    request,
    reservation_id,
    allocation_id,
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

        allocation = (
            StockReservationAllocation.objects
            .filter(
                id=allocation_id,
                company=company,
                reservation=reservation,
            )
            .first()
        )

        if allocation is None:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Reservation allocation was not found."
                    ),
                },
                status=404,
            )

        release_stock_reservation_allocation(
            company=company,
            allocation=allocation,
            quantity=request.data.get("quantity") or None,
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
                    "Reservation allocation released "
                    "successfully."
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
                    "Reservation allocation release failed."
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


stock_reservation_allocation_release.required_company_permissions = [
    "company.inventory.reservations.release",
]
