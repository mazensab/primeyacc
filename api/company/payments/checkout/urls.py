# ============================================================
# 📂 api/company/payments/checkout/urls.py
# 🧠 Mhamcloud | Company Payment Checkout URLs V1.0
# ------------------------------------------------------------
# ✅ List/create checkout sessions
# ✅ Retrieve checkout session
# ✅ Mark checkout session processing/paid/failed
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import payment_checkout_detail
from .list import payment_checkout_list
from .status import payment_checkout_status


app_name = "company_payment_checkout"

urlpatterns = [
    path("", payment_checkout_list, name="list"),
    path("<int:session_id>/", payment_checkout_detail, name="detail"),
    path("<int:session_id>/status/", payment_checkout_status, name="status"),
]
