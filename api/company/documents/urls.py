# ============================================================
# 📂 api/company/documents/urls.py
# 🧠 PrimeyAcc | Company Documents URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "company_documents"


urlpatterns = [
    path("templates/", include("api.company.documents.templates.urls")),
]
