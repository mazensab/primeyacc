# ============================================================
# ?? api/company/inventory/reservations/allocate.py
# ?? PrimeyAcc | Stock Reservation Allocation API V1.0
# ------------------------------------------------------------
# ? Standard stock allocation
# ? Batch balance allocation
# ? Serial number allocation
# ? Tenant-isolated lookups
# ? Atomic service execution
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import (
    InventoryBatchBalance,
    InventorySerialNumber,
    StockItem,
)
from inventory.services import (
    allocate_batch_stock_reservation,
    allocate_serial_stock_reservation,
    allocate_stock_reservation,
)
from sales.models import SalesOrderItem

from .common import (
    StockReservationAPIError,
    get_company_reservation,
    get_request_company,
    validation_errors,
)
from .serializers import serialize_stock_reservation


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservation_allocate(
    request,
    reservation_id,
):
    try:
        company = get_request_company(request)
        payload = request.data.copy()

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

        order_item_id = (
            payload.get("sales_order_item_id")
            or payload.get("sales_order_item")
        )

        if not order_item_id:
            raise ValidationError(
                {
                    "sales_order_item_id": (
                        "Sales order item is required."
                    )
                }
            )

        order_item = (
            SalesOrderItem.objects
            .filter(
                id=order_item_id,
                company=company,
                order=reservation.sales_order,
            )
            .first()
        )

        if order_item is None:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Sales order item was not found."
                    ),
                },
                status=404,
            )

        allocation_type = str(
            payload.get("allocation_type")
            or payload.get("tracking_method")
            or "STANDARD"
        ).strip().upper()

        common = {
            "company": company,
            "reservation": reservation,
            "sales_order_item": order_item,
            "notes": payload.get("notes") or "",
            "extra_data": (
                payload.get("extra_data")
                if isinstance(
                    payload.get("extra_data"),
                    dict,
                )
                else {}
            ),
            "user": request.user,
        }

        if allocation_type == "BATCH":
            batch_balance_id = (
                payload.get("batch_balance_id")
                or payload.get("batch_balance")
            )

            batch_balance = (
                InventoryBatchBalance.objects
                .filter(
                    id=batch_balance_id,
                    company=company,
                )
                .first()
            )

            if batch_balance is None:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Inventory batch balance "
                            "was not found."
                        ),
                    },
                    status=404,
                )

            allocate_batch_stock_reservation(
                **common,
                batch_balance=batch_balance,
                quantity=payload.get("quantity"),
            )

        elif allocation_type == "SERIAL":
            serial_number_id = (
                payload.get("serial_number_id")
                or payload.get("serial_number")
            )

            serial_number = (
                InventorySerialNumber.objects
                .filter(
                    id=serial_number_id,
                    company=company,
                )
                .first()
            )

            if serial_number is None:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Inventory serial number "
                            "was not found."
                        ),
                    },
                    status=404,
                )

            allocate_serial_stock_reservation(
                **common,
                serial_number=serial_number,
            )

        elif allocation_type in {"STANDARD", "NONE"}:
            stock_item_id = (
                payload.get("stock_item_id")
                or payload.get("stock_item")
            )

            stock_item = (
                StockItem.objects
                .filter(
                    id=stock_item_id,
                    company=company,
                )
                .first()
            )

            if stock_item is None:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Stock balance was not found."
                        ),
                    },
                    status=404,
                )

            allocate_stock_reservation(
                **common,
                stock_item=stock_item,
                quantity=payload.get("quantity"),
            )

        else:
            raise ValidationError(
                {
                    "allocation_type": (
                        "Allocation type must be STANDARD, "
                        "BATCH, or SERIAL."
                    )
                }
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
                    "Stock reservation allocated successfully."
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
                    "Stock reservation allocation failed."
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


stock_reservation_allocate.required_company_permissions = [
    "company.inventory.reservations.allocate",
]
