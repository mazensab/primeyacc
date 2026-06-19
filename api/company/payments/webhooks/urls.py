# ============================================================
# 📂 api/company/payments/webhooks/urls.py
# 🧠 PrimeyAcc | Company Payment Webhooks URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import path

from .list import payment_webhooks_list


app_name = "company_payment_webhooks"

urlpatterns = [
    path("", payment_webhooks_list, name="list"),
]
