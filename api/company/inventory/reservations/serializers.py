# ============================================================
# ?? api/company/inventory/reservations/serializers.py
# ?? PrimeyAcc | Stock Reservation API Serializers V1.0
# ------------------------------------------------------------
# ? Reservation serialization
# ? Allocation serialization
# ? Sales order snapshot
# ? Allowed lifecycle actions
# ============================================================
# ??????? ????????:
# - serializers ????? ???
# - ????? ???????? ???? ???? ???????
# ============================================================

from __future__ import annotations

from inventory.models import (
    StockReservation,
    StockReservationAllocation,
)
from inventory.services import (
    build_stock_reservation_allocation_payload,
    build_stock_reservation_payload,
)


def serialize_stock_reservation_allocation(
    allocation: StockReservationAllocation,
) -> dict:
    """
    Serialize one reservation allocation.
    """
    payload = build_stock_reservation_allocation_payload(
        allocation
    )

    payload["allowed_actions"] = {
        "view": True,
        "release": (
            allocation.remaining_reserved_quantity > 0
            and allocation.status
            not in {"RELEASED", "CANCELLED", "FULFILLED"}
        ),
    }

    return payload


def serialize_stock_reservation(
    reservation: StockReservation,
    *,
    include_allocations: bool = False,
) -> dict:
    """
    Serialize one stock reservation.
    """
    payload = build_stock_reservation_payload(
        reservation,
        include_allocations=False,
    )

    sales_order = reservation.sales_order

    payload["sales_order"] = {
        "id": sales_order.id,
        "order_number": sales_order.order_number,
        "status": sales_order.status,
        "branch_id": sales_order.branch_id,
    }

    payload["allowed_actions"] = {
        "view": True,
        "allocate": (
            reservation.status
            in {"DRAFT", "PARTIALLY_ALLOCATED"}
            and not reservation.is_expired_now
        ),
        "cancel": (
            reservation.status
            not in {
                "CANCELLED",
                "EXPIRED",
                "FULFILLED",
                "RELEASED",
            }
        ),
        "expire": (
            reservation.status
            not in {
                "CANCELLED",
                "EXPIRED",
                "FULFILLED",
                "RELEASED",
            }
        ),
    }

    if include_allocations:
        allocations = list(
            reservation.allocations.all()
        )

        payload["allocations"] = [
            serialize_stock_reservation_allocation(
                allocation
            )
            for allocation in allocations
        ]
        payload["allocations_count"] = len(allocations)

    return payload
