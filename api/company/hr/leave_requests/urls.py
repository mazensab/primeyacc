# ============================================================
# 📂 api/company/hr/leave_requests/urls.py
# 🧠 Mhamcloud | Company HR Leave Requests URLs V1.1
# ============================================================

from __future__ import annotations

from django.urls import path

from .actions import (
    company_hr_leave_request_approve,
    company_hr_leave_request_cancel,
    company_hr_leave_request_reject,
    company_hr_leave_request_submit,
)
from .create import company_hr_leave_request_create
from .detail import company_hr_leave_request_detail
from .list import company_hr_leave_requests_list
from .update import company_hr_leave_request_update


app_name = "company_hr_leave_requests"


urlpatterns = [
    path("", company_hr_leave_requests_list, name="list"),
    path("create/", company_hr_leave_request_create, name="create"),
    path("<int:leave_request_id>/", company_hr_leave_request_detail, name="detail"),
    path("<int:leave_request_id>/update/", company_hr_leave_request_update, name="update"),
    path("<int:leave_request_id>/submit/", company_hr_leave_request_submit, name="submit"),
    path("<int:leave_request_id>/approve/", company_hr_leave_request_approve, name="approve"),
    path("<int:leave_request_id>/reject/", company_hr_leave_request_reject, name="reject"),
    path("<int:leave_request_id>/cancel/", company_hr_leave_request_cancel, name="cancel"),
]