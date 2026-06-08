# ============================================================
# 📂 api/company/inventory/stock/urls.py
# 🧠 PrimeyAcc | Company Inventory Stock URLs V1.0
# ------------------------------------------------------------
# ✅ Stock balances API routing
# ✅ List and detail
# ✅ Company-scoped under /api/company/inventory/stock/
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.inventory.stock.detail import stock_item_detail
from api.company.inventory.stock.list import stock_items_list


urlpatterns = [
    path("", stock_items_list, name="company_inventory_stock_items_list"),
    path("<int:stock_item_id>/", stock_item_detail, name="company_inventory_stock_item_detail"),
]