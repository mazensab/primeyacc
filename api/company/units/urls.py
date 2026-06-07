# ============================================================
# 📂 api/company/units/urls.py
# 🧠 PrimeyAcc | Company Catalog Units URLs V1.0
# ------------------------------------------------------------
# ✅ Company catalog units routes
# ✅ List units
# ✅ Create unit
# ✅ Retrieve/update unit
# ✅ Change unit status
# ✅ Tenant isolation handled inside views/services
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل مسارات /company/units تعمل داخل الشركة الحالية فقط
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يمكن الوصول أو تعديل وحدة تابعة لشركة أخرى
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_unit_create
from .detail import company_unit_detail
from .list import company_units_list
from .status import company_unit_status


app_name = "company_units"


urlpatterns = [
    path(
        "",
        company_units_list,
        name="list",
    ),
    path(
        "create/",
        company_unit_create,
        name="create",
    ),
    path(
        "<int:unit_id>/",
        company_unit_detail,
        name="detail",
    ),
    path(
        "<int:unit_id>/status/",
        company_unit_status,
        name="status",
    ),
]