# ============================================================
# 📂 api/company/business_controls/urls.py
# 🧠 Mhamcloud | Company Business Controls URLs V1.0
# ------------------------------------------------------------
# ✅ Production hardening summary
# ✅ Business audit event APIs
# ✅ Idempotency tracking APIs
# ✅ Reference sequence APIs
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - جميع المسارات تعمل داخل الشركة الحالية فقط
# - لا نقبل company_id من الواجهة
# - هذه الوحدة رقابية ولا تكسر منجزات الأعمال السابقة
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .summary import company_business_controls_summary


app_name = "company_business_controls"


urlpatterns = [
    path("summary/", company_business_controls_summary, name="summary"),
    path("audit-events/", include("api.company.business_controls.audit_events.urls")),
    path("idempotency/", include("api.company.business_controls.idempotency.urls")),
    path("references/", include("api.company.business_controls.references.urls")),
]
