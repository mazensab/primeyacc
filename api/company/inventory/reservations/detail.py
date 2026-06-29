# ============================================================
# ?? api/company/inventory/reservations/detail.py
# ?? Mhamcloud | Stock Reservation Detail API V1.0
# ------------------------------------------------------------
# ? Current-company reservation detail
# ? Allocation details
# ? Safe cross-company 404
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission

from .common import (
    StockReservationAPIError,
    get_company_reservation,
    get_request_company,
)
from .serializers import serialize_stock_reservation


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservation_detail(
    request,
    reservation_id,
):
    try:
        company = get_request_company(request)

        reservation = get_company_reservation(
            company=company,
            reservation_id=reservation_id,
            include_allocations=True,
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

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Stock reservation loaded successfully."
                ),
                "reservation": serialize_stock_reservation(
                    reservation,
                    include_allocations=True,
                ),
            },
            status=200,
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


stock_reservation_detail.required_company_permissions = [
    "company.inventory.reservations.view",
]
