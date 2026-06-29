# ============================================================
# 📂 api/company/hr/leave_balances/urls.py
# 🧠 Mhamcloud | Company HR Leave Balances URLs V1.1
# ============================================================

from __future__ import annotations

from django.urls import path

from .list import company_hr_leave_balances_list
from .update import company_hr_leave_balance_update


app_name = "company_hr_leave_balances"


urlpatterns = [
    path("", company_hr_leave_balances_list, name="list"),
    path("update/", company_hr_leave_balance_update, name="update"),
]