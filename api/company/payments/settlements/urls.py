# ============================================================
# 📂 api/company/payments/settlements/urls.py
# 🧠 PrimeyAcc | Company Payment Settlements URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import payment_settlement_detail
from .items import payment_settlement_add_item
from .list import payment_settlements_list
from .status import payment_settlement_status


app_name = "company_payment_settlements"

urlpatterns = [
    path("", payment_settlements_list, name="list"),
    path("<int:batch_id>/", payment_settlement_detail, name="detail"),
    path("<int:batch_id>/items/", payment_settlement_add_item, name="items"),
    path("<int:batch_id>/status/", payment_settlement_status, name="status"),
]
