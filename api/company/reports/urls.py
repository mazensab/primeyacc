# ============================================================
# 📂 api/company/reports/urls.py
# 🧠 PrimeyAcc | Company Reports URLs - Phase 16.2
# ------------------------------------------------------------
# ✅ Reports overview endpoint
# ✅ Trial balance endpoint
# ✅ Financial reports routes will be added gradually
# ============================================================

from __future__ import annotations

from django.urls import path

from .overview import reports_overview
from .trial_balance import trial_balance_report


app_name = "company_reports"


urlpatterns = [
    path("", reports_overview, name="overview"),
    path("trial-balance/", trial_balance_report, name="trial-balance"),
]