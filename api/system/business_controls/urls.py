# 📂 api/system/business_controls/urls.py
# 🧠 PrimeyAcc | System Business Controls API URLs v1
# ============================================================
# ✅ /api/system/business-controls/
# ✅ /api/system/business-controls/audit-events/
# ✅ /api/system/business-controls/idempotency/
# ✅ /api/system/business-controls/reference-sequences/
# ============================================================
from django.urls import path
from . import views
app_name = "system_business_controls"
urlpatterns = [
    path("", views.system_business_controls_overview, name="overview"),
    path("audit-events/", views.system_business_audit_events, name="audit_events"),
    path("idempotency/", views.system_business_idempotency_keys, name="idempotency"),
    path("reference-sequences/", views.system_business_reference_sequences, name="reference_sequences"),
]
