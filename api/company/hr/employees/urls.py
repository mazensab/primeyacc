# ============================================================
# 📂 api/company/hr/employees/urls.py
# 🧠 Mhamcloud | Company HR Employees URLs V1.4
# ------------------------------------------------------------
# ✅ Employee list route
# ✅ Employee create route
# ✅ Employee detail route
# ✅ Employee update route
# ✅ Employee activate/deactivate routes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات موظفي الشركة
# - لا نضع منطق business داخل urls.py
# ============================================================

from __future__ import annotations

from django.urls import path

from .create import company_hr_employee_create
from .detail import company_hr_employee_detail
from .list import company_hr_employees_list
from .status import (
    company_hr_employee_activate,
    company_hr_employee_deactivate,
)
from .update import company_hr_employee_update


app_name = "company_hr_employees"


urlpatterns = [
    path("", company_hr_employees_list, name="list"),
    path("create/", company_hr_employee_create, name="create"),
    path("<int:employee_id>/", company_hr_employee_detail, name="detail"),
    path("<int:employee_id>/update/", company_hr_employee_update, name="update"),
    path("<int:employee_id>/activate/", company_hr_employee_activate, name="activate"),
    path("<int:employee_id>/deactivate/", company_hr_employee_deactivate, name="deactivate"),
]