# ============================================================
# 📂 api/company/business_controls/audit_events/urls.py
# 🧠 PrimeyAcc | Company Audit Events URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import company_audit_event_detail
from .list import company_audit_events_list


app_name = "company_business_audit_events"


urlpatterns = [
    path("", company_audit_events_list, name="list"),
    path("<int:event_id>/", company_audit_event_detail, name="detail"),
]
