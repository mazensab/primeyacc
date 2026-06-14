# ============================================================
# 📂 api/company/purchases/urls.py
# 🧠 PrimeyAcc | Company Purchases URLs V1.0
# ------------------------------------------------------------
# ✅ Purchases API routing under /api/company/purchases/
# ✅ Supplier bills routes
# ✅ Ready for future purchase orders, receipts, returns
# ============================================================

from __future__ import annotations

from django.urls import include, path


urlpatterns = [
    path(
        "receipts/",
        include(
            "api.company.purchases.receipts.urls"
        ),
    ),
    path("bills/", include("api.company.purchases.bills.urls")),
    path("returns/", include("api.company.purchases.returns.urls")),
    path(
        "debit-notes/",
        include(
            "api.company.purchases.debit_notes.urls"
        ),
    ),
]