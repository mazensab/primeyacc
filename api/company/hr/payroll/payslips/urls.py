# ============================================================
# ?? api/company/hr/payroll/payslips/urls.py
# ?? PrimeyAcc | Payroll Payslips API URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    payslip_approve,
    payslip_cancel,
    payslip_pay,
)
from .detail import payslip_detail
from .list import payslips_list
from .update import payslip_update

urlpatterns = [
    path("", payslips_list, name="company_hr_payroll_payslips_list"),
    path("<int:payslip_id>/", payslip_detail, name="company_hr_payroll_payslips_detail"),
    path("<int:payslip_id>/update/", payslip_update, name="company_hr_payroll_payslips_update"),
    path("<int:payslip_id>/approve/", payslip_approve, name="company_hr_payroll_payslips_approve"),
    path("<int:payslip_id>/pay/", payslip_pay, name="company_hr_payroll_payslips_pay"),
    path("<int:payslip_id>/cancel/", payslip_cancel, name="company_hr_payroll_payslips_cancel"),
]
