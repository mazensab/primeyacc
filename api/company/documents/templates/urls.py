# ============================================================
# 📂 api/company/documents/templates/urls.py
# 🧠 Mhamcloud | Company Document Templates URLs V1.0
# ============================================================

from __future__ import annotations

from django.urls import path

from .default import company_default_document_template
from .detail import company_document_template_detail
from .list import company_document_templates
from .set_default import company_document_template_set_default
from .status import (
    company_document_template_activate,
    company_document_template_deactivate,
)


app_name = "company_document_templates"


urlpatterns = [
    path("", company_document_templates, name="list_create"),
    path("default/", company_default_document_template, name="default"),
    path("<int:template_id>/", company_document_template_detail, name="detail"),
    path("<int:template_id>/set-default/", company_document_template_set_default, name="set_default"),
    path("<int:template_id>/activate/", company_document_template_activate, name="activate"),
    path("<int:template_id>/deactivate/", company_document_template_deactivate, name="deactivate"),
]

