# ============================================================
# ?? api/company/hr/payroll/payslip_items/urls.py
# ?? PrimeyAcc | Payroll Payslip Items API URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import payslip_item_detail
from .list import payslip_items_list
from .update import payslip_item_update

urlpatterns = [
    path("", payslip_items_list, name="company_hr_payroll_payslip_items_list"),
    path("<int:item_id>/", payslip_item_detail, name="company_hr_payroll_payslip_items_detail"),
    path("<int:item_id>/update/", payslip_item_update, name="company_hr_payroll_payslip_items_update"),
]
