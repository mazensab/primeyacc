# ============================================================
# 📂 api/company/business_controls/references/urls.py
# 🧠 PrimeyAcc | Company Reference Sequences URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import path

from .list import company_reference_sequences_list
from .preview import company_reference_sequence_preview


app_name = "company_business_references"


urlpatterns = [
    path("", company_reference_sequences_list, name="list"),
    path("preview/", company_reference_sequence_preview, name="preview"),
]
