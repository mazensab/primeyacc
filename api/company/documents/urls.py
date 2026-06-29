# ============================================================
# 📂 api/company/documents/urls.py
# 🧠 Mhamcloud | Company Documents URLs V1.1
# ------------------------------------------------------------
# ✅ Document templates routes
# ✅ Document render payload endpoint
# ✅ Web print endpoint
# ✅ Thermal print endpoint
# ✅ PDF endpoint
# ✅ Print jobs/options foundation endpoint
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يربط endpoints فقط
# - لا يحتوي منطق أعمال
# - لا يقبل company_id في المسارات
# - كل العزل والصلاحيات داخل ملفات API نفسها
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .pdf import company_document_pdf
from .print_jobs import company_document_print_jobs
from .render import company_document_render
from .thermal import company_document_thermal
from .web_print import company_document_web_print


app_name = "company_documents"


urlpatterns = [
    path("templates/", include("api.company.documents.templates.urls")),
    path("render/", company_document_render, name="render"),
    path("web-print/", company_document_web_print, name="web_print"),
    path("thermal/", company_document_thermal, name="thermal"),
    path("pdf/", company_document_pdf, name="pdf"),
    path("print-jobs/", company_document_print_jobs, name="print_jobs"),
]
