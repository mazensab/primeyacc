# ============================================================
# 📂 api/company/customers/urls.py
# 🧠 Mhamcloud | Company Customers API URLs V1.0
# ------------------------------------------------------------
# ✅ Customer list route
# ✅ Customer create route
# ✅ Customer detail/update route
# ✅ Customer status actions route
# ✅ Alias over BusinessParty
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات العملاء فقط
# - العملاء مبنيون فوق BusinessParty
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يعتمد على request.company
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_customer_create
from .detail import company_customer_detail
from .list import company_customers_list
from .status import company_customer_status


app_name = "company_customers"


urlpatterns = [
    path("", company_customers_list, name="list"),
    path("create/", company_customer_create, name="create"),
    path("<int:customer_id>/", company_customer_detail, name="detail"),
    path("<int:customer_id>/<str:action>/", company_customer_status, name="status"),
]