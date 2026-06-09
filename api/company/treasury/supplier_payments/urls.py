# ============================================================
# 📂 api/company/treasury/supplier_payments/urls.py
# 🧠 PrimeyAcc | Company Treasury Supplier Payments URLs V1.0
# ------------------------------------------------------------
# ✅ Supplier payments list/create route
# ✅ Supplier payment detail/update route
# ✅ Supplier payment confirm route
# ✅ Supplier payment cancel route
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل endpoints تعمل داخل /company
# - العزل الحقيقي يتم من request.company داخل views
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import supplier_payment_cancel
from .confirm import supplier_payment_confirm
from .detail import supplier_payment_detail
from .list import supplier_payments_list


app_name = "company_treasury_supplier_payments"

urlpatterns = [
    path("", supplier_payments_list, name="list"),
    path("<int:payment_id>/", supplier_payment_detail, name="detail"),
    path("<int:payment_id>/confirm/", supplier_payment_confirm, name="confirm"),
    path("<int:payment_id>/cancel/", supplier_payment_cancel, name="cancel"),
]