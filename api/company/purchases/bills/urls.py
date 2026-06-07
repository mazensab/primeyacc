# ============================================================
# 📂 api/company/purchases/bills/urls.py
# 🧠 PrimeyAcc | Company Purchase Bills URLs V1.0
# ------------------------------------------------------------
# ✅ Purchase bills API routing
# ✅ List, create, detail, update, post, cancel
# ✅ Company-scoped under /api/company/purchases/bills/
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.purchases.bills.cancel import purchase_bill_cancel
from api.company.purchases.bills.create import purchase_bill_create
from api.company.purchases.bills.detail import purchase_bill_detail
from api.company.purchases.bills.list import purchase_bills_list
from api.company.purchases.bills.post import purchase_bill_post
from api.company.purchases.bills.update import purchase_bill_update


urlpatterns = [
    path("", purchase_bills_list, name="company_purchase_bills_list"),
    path("create/", purchase_bill_create, name="company_purchase_bill_create"),
    path("<int:bill_id>/", purchase_bill_detail, name="company_purchase_bill_detail"),
    path("<int:bill_id>/update/", purchase_bill_update, name="company_purchase_bill_update"),
    path("<int:bill_id>/post/", purchase_bill_post, name="company_purchase_bill_post"),
    path("<int:bill_id>/cancel/", purchase_bill_cancel, name="company_purchase_bill_cancel"),
]