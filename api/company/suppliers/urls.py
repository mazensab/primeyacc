# ============================================================
# 📂 api/company/suppliers/urls.py
# 🧠 PrimeyAcc | Company Suppliers API URLs V1.0
# ------------------------------------------------------------
# ✅ Supplier list route
# ✅ Supplier create route
# ✅ Supplier detail/update route
# ✅ Supplier status actions route
# ✅ Alias over BusinessParty
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات الموردين فقط
# - الموردون مبنيون فوق BusinessParty
# - لا نضع منطق business داخل urls.py
# - كل View يجب أن يعتمد على request.company
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_supplier_create
from .detail import company_supplier_detail
from .list import company_suppliers_list
from .status import company_supplier_status


app_name = "company_suppliers"


urlpatterns = [
    path("", company_suppliers_list, name="list"),
    path("create/", company_supplier_create, name="create"),
    path("<int:supplier_id>/", company_supplier_detail, name="detail"),
    path("<int:supplier_id>/<str:action>/", company_supplier_status, name="status"),
]