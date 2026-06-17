# ============================================================
# 📂 api/company/inventory/urls.py
# 🧠 PrimeyAcc | Company Inventory URLs V2.0
# ------------------------------------------------------------
# ✅ Inventory API routing
# ✅ Warehouses endpoints
# ✅ Inventory locations and bins endpoints foundation
# ✅ Stock balances endpoints
# ✅ Stock movements endpoints
# ✅ Company-scoped under /api/company/inventory/
# ============================================================

from __future__ import annotations

from django.urls import include, path


urlpatterns = [
    path("warehouses/", include("api.company.inventory.warehouses.urls")),
    path("locations/", include("api.company.inventory.locations.urls")),
    path("stock/", include("api.company.inventory.stock.urls")),
    path("movements/", include("api.company.inventory.movements.urls")),
]