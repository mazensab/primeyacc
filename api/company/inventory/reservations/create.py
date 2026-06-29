# ============================================================
# ?? api/company/inventory/reservations/create.py
# ?? Mhamcloud | Stock Reservation Create API V1.0
# ------------------------------------------------------------
# ? Create reservation from confirmed sales order
# ? Company-scoped sales order lookup
# ? No frontend company trust
# ? Service-layer creation
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import SalesOrder
from inventory.services import (
    create_sales_order_stock_reservation,
)

from .common import (
    StockReservationAPIError,
    get_request_company,
    validation_errors,
)
from .serializers import serialize_stock_reservation


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservation_create(request):
    try:
        company = get_request_company(request)
        payload = request.data.copy()

        sales_order_id = (
            payload.get("sales_order_id")
            or payload.get("sales_order")
        )

        if not sales_order_id:
            raise ValidationError(
                {
                    "sales_order_id": (
                        "Sales order is required."
                    )
                }
            )

        sales_order = (
            SalesOrder.objects
            .filter(
                id=sales_order_id,
                company=company,
            )
            .first()
        )

        if sales_order is None:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Sales order was not found."
                    ),
                },
                status=404,
            )

        expires_at = payload.get("expires_at")

        if isinstance(expires_at, str) and expires_at:
            expires_at = parse_datetime(expires_at)

            if expires_at is None:
                raise ValidationError(
                    {
                        "expires_at": (
                            "Expiry date must be a valid "
                            "ISO datetime."
                        )
                    }
                )

        reservation = (
            create_sales_order_stock_reservation(
                company=company,
                sales_order=sales_order,
                reservation_number=(
                    payload.get("reservation_number")
                    or None
                ),
                expires_at=expires_at or None,
                notes=payload.get("notes") or "",
                extra_data=(
                    payload.get("extra_data")
                    if isinstance(
                        payload.get("extra_data"),
                        dict,
                    )
                    else {}
                ),
                user=request.user,
            )
        )

        reservation.refresh_from_db()

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Stock reservation created successfully."
                ),
                "reservation": serialize_stock_reservation(
                    reservation,
                    include_allocations=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Stock reservation could not be created."
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


stock_reservation_create.required_company_permissions = [
    "company.inventory.reservations.create",
]
