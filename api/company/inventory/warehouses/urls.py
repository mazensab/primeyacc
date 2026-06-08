# ============================================================
# 📂 api/company/inventory/warehouses/urls.py
# 🧠 PrimeyAcc | Company Inventory Warehouses URLs V1.0
# ------------------------------------------------------------
# ✅ Warehouses API routing
# ✅ List, create, detail, update, status
# ✅ Company-scoped under /api/company/inventory/warehouses/
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.inventory.warehouses.create import warehouse_create
from api.company.inventory.warehouses.detail import warehouse_detail
from api.company.inventory.warehouses.list import warehouses_list
from api.company.inventory.warehouses.status import warehouse_status
from api.company.inventory.warehouses.update import warehouse_update


urlpatterns = [
    path("", warehouses_list, name="company_inventory_warehouses_list"),
    path("create/", warehouse_create, name="company_inventory_warehouse_create"),
    path("<int:warehouse_id>/", warehouse_detail, name="company_inventory_warehouse_detail"),
    path("<int:warehouse_id>/update/", warehouse_update, name="company_inventory_warehouse_update"),
    path("<int:warehouse_id>/status/", warehouse_status, name="company_inventory_warehouse_status"),
]