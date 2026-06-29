# ============================================================
# ?? api/company/hr/payroll/urls.py
# ?? Mhamcloud | Payroll API URLs
# ============================================================

from __future__ import annotations

from django.urls import include, path

urlpatterns = [
    path("payslip-items/", include("api.company.hr.payroll.payslip_items.urls")),
    path("payslips/", include("api.company.hr.payroll.payslips.urls")),
    path("runs/", include("api.company.hr.payroll.runs.urls")),
    path("periods/", include("api.company.hr.payroll.periods.urls")),
    path("profiles/", include("api.company.hr.payroll.profiles.urls")),
    path("components/", include("api.company.hr.payroll.components.urls")),
]
