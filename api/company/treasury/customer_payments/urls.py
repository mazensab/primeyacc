# ============================================================
# 📂 api/company/treasury/customer_payments/urls.py
# 🧠 Mhamcloud | Company Treasury Customer Payments URLs V1.0
# ------------------------------------------------------------
# ✅ Customer payments list/create route
# ✅ Customer payment detail/update route
# ✅ Customer payment confirm route
# ✅ Customer payment cancel route
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل endpoints تعمل داخل /company
# - العزل الحقيقي يتم من request.company داخل views
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import customer_payment_cancel
from .confirm import customer_payment_confirm
from .detail import customer_payment_detail
from .list import customer_payments_list


app_name = "company_treasury_customer_payments"

urlpatterns = [
    path("", customer_payments_list, name="list"),
    path("<int:payment_id>/", customer_payment_detail, name="detail"),
    path("<int:payment_id>/confirm/", customer_payment_confirm, name="confirm"),
    path("<int:payment_id>/cancel/", customer_payment_cancel, name="cancel"),
]