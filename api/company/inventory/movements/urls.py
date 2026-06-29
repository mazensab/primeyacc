# ============================================================
# 📂 api/company/inventory/movements/urls.py
# 🧠 Mhamcloud | Company Inventory Movements URLs V1.0
# ------------------------------------------------------------
# ✅ Stock movements API routing
# ✅ List, create, detail
# ✅ Company-scoped under /api/company/inventory/movements/
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.inventory.movements.create import stock_movement_create
from api.company.inventory.movements.detail import stock_movement_detail
from api.company.inventory.movements.list import stock_movements_list


urlpatterns = [
    path("", stock_movements_list, name="company_inventory_stock_movements_list"),
    path("create/", stock_movement_create, name="company_inventory_stock_movement_create"),
    path("<int:movement_id>/", stock_movement_detail, name="company_inventory_stock_movement_detail"),
]