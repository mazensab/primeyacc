# ============================================================
# 📂 api/company/inventory/locations/urls.py
# 🧠 PrimeyAcc | Company Inventory Locations URLs V1.2
# ------------------------------------------------------------
# ✅ Inventory locations API routing
# ✅ List, create, detail, update and status
# ✅ Company-scoped under /api/company/inventory/locations/
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.inventory.locations.create import (
    inventory_location_create,
)
from api.company.inventory.locations.detail import (
    inventory_location_detail,
)
from api.company.inventory.locations.list import (
    inventory_locations_list,
)
from api.company.inventory.locations.status import (
    inventory_location_status,
)
from api.company.inventory.locations.update import (
    inventory_location_update,
)


urlpatterns = [
    path(
        "",
        inventory_locations_list,
        name="company_inventory_locations_list",
    ),
    path(
        "create/",
        inventory_location_create,
        name="company_inventory_location_create",
    ),
    path(
        "<int:location_id>/",
        inventory_location_detail,
        name="company_inventory_location_detail",
    ),
    path(
        "<int:location_id>/update/",
        inventory_location_update,
        name="company_inventory_location_update",
    ),
    path(
        "<int:location_id>/status/",
        inventory_location_status,
        name="company_inventory_location_status",
    ),
]
