# ============================================================
# 📂 api/company/treasury/urls.py
# 🧠 Mhamcloud | Company Treasury URLs V1.3
# ------------------------------------------------------------
# ✅ Treasury summary route
# ✅ Treasury accounts routes
# ✅ Treasury transactions routes
# ✅ Customer payments routes
# ✅ Supplier payments routes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل endpoints تعمل داخل /company
# - العزل الحقيقي يتم من request.company داخل views
# - لا يتم قبول company_id من الواجهة كمصدر للشركة
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .summary import treasury_summary


app_name = "company_treasury"

urlpatterns = [
    path("summary/", treasury_summary, name="summary"),
    path("accounts/", include("api.company.treasury.accounts.urls")),
    path("transactions/", include("api.company.treasury.transactions.urls")),
    path("customer-payments/", include("api.company.treasury.customer_payments.urls")),
    path("supplier-payments/", include("api.company.treasury.supplier_payments.urls")),
]