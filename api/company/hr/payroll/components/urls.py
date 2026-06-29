# ============================================================
# ?? api/company/hr/payroll/components/urls.py
# ?? Mhamcloud | Salary Components API URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    salary_component_activate,
    salary_component_deactivate,
)
from .create import salary_component_create
from .detail import salary_component_detail
from .list import salary_components_list
from .update import salary_component_update

urlpatterns = [
    path("", salary_components_list, name="company_hr_payroll_components_list"),
    path("create/", salary_component_create, name="company_hr_payroll_components_create"),
    path("<int:component_id>/", salary_component_detail, name="company_hr_payroll_components_detail"),
    path("<int:component_id>/update/", salary_component_update, name="company_hr_payroll_components_update"),
    path("<int:component_id>/activate/", salary_component_activate, name="company_hr_payroll_components_activate"),
    path("<int:component_id>/deactivate/", salary_component_deactivate, name="company_hr_payroll_components_deactivate"),
]
