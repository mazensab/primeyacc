# ============================================================
# ?? api/company/hr/payroll/runs/urls.py
# ?? PrimeyAcc | Payroll Runs API URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    payroll_run_approve,
    payroll_run_calculate,
    payroll_run_cancel,
    payroll_run_post,
)
from .create import payroll_run_create
from .detail import payroll_run_detail
from .list import payroll_runs_list
from .update import payroll_run_update

urlpatterns = [
    path("", payroll_runs_list, name="company_hr_payroll_runs_list"),
    path("create/", payroll_run_create, name="company_hr_payroll_runs_create"),
    path("<int:run_id>/", payroll_run_detail, name="company_hr_payroll_runs_detail"),
    path("<int:run_id>/update/", payroll_run_update, name="company_hr_payroll_runs_update"),
    path("<int:run_id>/calculate/", payroll_run_calculate, name="company_hr_payroll_runs_calculate"),
    path("<int:run_id>/approve/", payroll_run_approve, name="company_hr_payroll_runs_approve"),
    path("<int:run_id>/post/", payroll_run_post, name="company_hr_payroll_runs_post"),
    path("<int:run_id>/cancel/", payroll_run_cancel, name="company_hr_payroll_runs_cancel"),
]
