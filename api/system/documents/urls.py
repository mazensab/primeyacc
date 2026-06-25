# 📂 api/system/documents/urls.py
# 🧠 PrimeyAcc | System Documents API URLs v1
# ============================================================
# ✅ /api/system/documents/
# ✅ /api/system/documents/templates/
# ✅ /api/system/documents/rendering/
# ✅ /api/system/documents/thermal/
# ✅ /api/system/documents/settings/
# ✅ /api/system/documents/print-jobs/
# ============================================================
from django.urls import path
from . import views
app_name = "system_documents"
urlpatterns = [
    path("", views.system_documents_overview, name="overview"),
    path("templates/", views.system_document_templates, name="templates"),
    path("rendering/", views.system_document_rendering, name="rendering"),
    path("thermal/", views.system_document_thermal, name="thermal"),
    path("settings/", views.system_document_settings, name="settings"),
    path("print-jobs/", views.system_document_print_jobs, name="print_jobs"),
]