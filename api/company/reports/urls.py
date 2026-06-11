# ============================================================
# 📂 api/company/reports/urls.py
# 🧠 PrimeyAcc | Company Reports URLs - Phase 16.1
# ------------------------------------------------------------
# ✅ Reports overview endpoint
# ✅ Financial reports routes will be added gradually
# ============================================================

from __future__ import annotations

from django.urls import path

from .overview import reports_overview


app_name = "company_reports"


urlpatterns = [
    path("", reports_overview, name="overview"),
]