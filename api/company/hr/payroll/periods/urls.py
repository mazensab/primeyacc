# ============================================================
# ?? api/company/hr/payroll/periods/urls.py
# ?? Mhamcloud | Payroll Periods API URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    payroll_period_close,
    payroll_period_open,
)
from .create import payroll_period_create
from .detail import payroll_period_detail
from .list import payroll_periods_list
from .update import payroll_period_update

urlpatterns = [
    path("", payroll_periods_list, name="company_hr_payroll_periods_list"),
    path("create/", payroll_period_create, name="company_hr_payroll_periods_create"),
    path("<int:period_id>/", payroll_period_detail, name="company_hr_payroll_periods_detail"),
    path("<int:period_id>/update/", payroll_period_update, name="company_hr_payroll_periods_update"),
    path("<int:period_id>/open/", payroll_period_open, name="company_hr_payroll_periods_open"),
    path("<int:period_id>/close/", payroll_period_close, name="company_hr_payroll_periods_close"),
]
