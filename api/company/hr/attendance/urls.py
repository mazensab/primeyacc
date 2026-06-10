# ============================================================
# 📂 api/company/hr/attendance/urls.py
# 🧠 PrimeyAcc | Company HR Attendance URLs V1.4
# ------------------------------------------------------------
# ✅ Attendance list route
# ✅ Attendance create route
# ✅ Attendance detail route
# ✅ Attendance check-in/check-out/cancel routes
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يجمع مسارات حضور وانصراف الشركة
# - لا نضع منطق business داخل urls.py
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    company_hr_attendance_cancel,
    company_hr_attendance_check_in,
    company_hr_attendance_check_out,
    company_hr_attendance_missing_check_out,
)
from .create import company_hr_attendance_create
from .detail import company_hr_attendance_detail
from .list import company_hr_attendance_list


app_name = "company_hr_attendance"


urlpatterns = [
    path("", company_hr_attendance_list, name="list"),
    path("create/", company_hr_attendance_create, name="create"),
    path("check-in/", company_hr_attendance_check_in, name="check_in"),
    path("<int:attendance_id>/", company_hr_attendance_detail, name="detail"),
    path("<int:attendance_id>/check-out/", company_hr_attendance_check_out, name="check_out"),
    path("<int:attendance_id>/missing-check-out/", company_hr_attendance_missing_check_out, name="missing_check_out"),
    path("<int:attendance_id>/cancel/", company_hr_attendance_cancel, name="cancel"),
]