# ============================================================
# ?? api/company/inventory/valuation/urls.py
# ?? Mhamcloud | Inventory Valuation URLs V1.0
# ------------------------------------------------------------
# ? Valuation summary endpoint
# ? Stock item valuation rows
# ? Item, warehouse, and location grouped valuation endpoints
# ============================================================

from __future__ import annotations

from django.urls import path

from .items import inventory_valuation_items
from .locations import inventory_valuation_locations
from .stock_items import inventory_valuation_stock_items
from .summary import inventory_valuation_summary
from .warehouses import inventory_valuation_warehouses


urlpatterns = [
    path(
        "",
        inventory_valuation_summary,
        name="company_inventory_valuation_summary",
    ),
    path(
        "stock-items/",
        inventory_valuation_stock_items,
        name="company_inventory_valuation_stock_items",
    ),
    path(
        "items/",
        inventory_valuation_items,
        name="company_inventory_valuation_items",
    ),
    path(
        "warehouses/",
        inventory_valuation_warehouses,
        name="company_inventory_valuation_warehouses",
    ),
    path(
        "locations/",
        inventory_valuation_locations,
        name="company_inventory_valuation_locations",
    ),
]
