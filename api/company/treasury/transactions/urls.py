# ============================================================
# 📂 api/company/treasury/transactions/urls.py
# 🧠 Mhamcloud | Company Treasury Transactions URLs V1.0
# ------------------------------------------------------------
# ✅ Treasury transactions list/create route
# ✅ Treasury transaction detail/update route
# ✅ Treasury transaction post route
# ✅ Treasury transaction cancel route
# ✅ Mounted under /api/company/treasury/transactions/
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import treasury_transaction_cancel
from .detail import treasury_transaction_detail
from .list import treasury_transactions_list
from .post import treasury_transaction_post


app_name = "treasury_transactions"


urlpatterns = [
    path("", treasury_transactions_list, name="list"),
    path("<int:transaction_id>/", treasury_transaction_detail, name="detail"),
    path("<int:transaction_id>/post/", treasury_transaction_post, name="post"),
    path("<int:transaction_id>/cancel/", treasury_transaction_cancel, name="cancel"),
]