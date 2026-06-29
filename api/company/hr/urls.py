# ============================================================
# 📂 api/company/hr/urls.py
# 🧠 Mhamcloud | Company HR URLs V1.2
# ------------------------------------------------------------
# ✅ HR module routes
# ✅ Employees routes include
# ✅ Attendance routes include
# ✅ Leave management routes include
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات HR داخل /api/company/hr/
# - لا نضع منطق business داخل urls.py
# - كل مورد HR له urls.py مستقل
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "company_hr"


urlpatterns = [
    path("payroll/", include("api.company.hr.payroll.urls")),
    path("performance/", include("api.company.hr.performance.urls")),
    path("employees/", include("api.company.hr.employees.urls")),
    path("attendance/", include("api.company.hr.attendance.urls")),
    path("leave-types/", include("api.company.hr.leave_types.urls")),
    path("leave-requests/", include("api.company.hr.leave_requests.urls")),
    path("leave-balances/", include("api.company.hr.leave_balances.urls")),
]