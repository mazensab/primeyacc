# ============================================================
# ?? api/company/inventory/reservations/urls.py
# ?? Mhamcloud | Company Stock Reservations URLs V1.0
# ------------------------------------------------------------
# ? List and create
# ? Detail
# ? Allocate
# ? Release allocation
# ? Cancel and expire
# ============================================================

from __future__ import annotations

from django.urls import path

from .allocate import stock_reservation_allocate
from .cancel import stock_reservation_cancel
from .create import stock_reservation_create
from .detail import stock_reservation_detail
from .expire import stock_reservation_expire
from .list import stock_reservations_list
from .release import (
    stock_reservation_allocation_release,
)


urlpatterns = [
    path(
        "",
        stock_reservations_list,
        name="company_inventory_reservations_list",
    ),
    path(
        "create/",
        stock_reservation_create,
        name="company_inventory_reservation_create",
    ),
    path(
        "<int:reservation_id>/",
        stock_reservation_detail,
        name="company_inventory_reservation_detail",
    ),
    path(
        "<int:reservation_id>/allocate/",
        stock_reservation_allocate,
        name="company_inventory_reservation_allocate",
    ),
    path(
        (
            "<int:reservation_id>/allocations/"
            "<int:allocation_id>/release/"
        ),
        stock_reservation_allocation_release,
        name=(
            "company_inventory_reservation_"
            "allocation_release"
        ),
    ),
    path(
        "<int:reservation_id>/cancel/",
        stock_reservation_cancel,
        name="company_inventory_reservation_cancel",
    ),
    path(
        "<int:reservation_id>/expire/",
        stock_reservation_expire,
        name="company_inventory_reservation_expire",
    ),
]
