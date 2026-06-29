# ============================================================
# ?? api/company/hr/payroll/profiles/urls.py
# ?? Mhamcloud | Employee Salary Profiles API URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    salary_profile_activate,
    salary_profile_deactivate,
)
from .create import salary_profile_create
from .detail import salary_profile_detail
from .list import salary_profiles_list
from .update import salary_profile_update

urlpatterns = [
    path("", salary_profiles_list, name="company_hr_payroll_profiles_list"),
    path("create/", salary_profile_create, name="company_hr_payroll_profiles_create"),
    path("<int:profile_id>/", salary_profile_detail, name="company_hr_payroll_profiles_detail"),
    path("<int:profile_id>/update/", salary_profile_update, name="company_hr_payroll_profiles_update"),
    path("<int:profile_id>/activate/", salary_profile_activate, name="company_hr_payroll_profiles_activate"),
    path("<int:profile_id>/deactivate/", salary_profile_deactivate, name="company_hr_payroll_profiles_deactivate"),
]
