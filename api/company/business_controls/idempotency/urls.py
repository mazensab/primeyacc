# ============================================================
# 📂 api/company/business_controls/idempotency/urls.py
# 🧠 Mhamcloud | Company Idempotency URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import path

from .list import company_idempotency_keys_list


app_name = "company_business_idempotency"


urlpatterns = [
    path("", company_idempotency_keys_list, name="list"),
]
