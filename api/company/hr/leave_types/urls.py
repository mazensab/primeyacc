# ============================================================
# 📂 api/company/hr/leave_types/urls.py
# 🧠 PrimeyAcc | Company HR Leave Types URLs V1.1
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    company_hr_leave_type_activate,
    company_hr_leave_type_deactivate,
)
from .create import company_hr_leave_type_create
from .detail import company_hr_leave_type_detail
from .list import company_hr_leave_types_list
from .update import company_hr_leave_type_update


app_name = "company_hr_leave_types"


urlpatterns = [
    path("", company_hr_leave_types_list, name="list"),
    path("create/", company_hr_leave_type_create, name="create"),
    path("<int:leave_type_id>/", company_hr_leave_type_detail, name="detail"),
    path("<int:leave_type_id>/update/", company_hr_leave_type_update, name="update"),
    path("<int:leave_type_id>/activate/", company_hr_leave_type_activate, name="activate"),
    path("<int:leave_type_id>/deactivate/", company_hr_leave_type_deactivate, name="deactivate"),
]