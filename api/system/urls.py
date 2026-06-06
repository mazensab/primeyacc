# ============================================================
# 📂 api/system/urls.py
# 🧠 PrimeyAcc | System Workspace API URLs V1.3
# ------------------------------------------------------------
# ✅ Central routes for system workspace APIs
# ✅ Includes system companies APIs
# ✅ Includes SaaS subscription plans APIs
# ✅ Includes company subscriptions APIs
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف هو نقطة تجميع APIs الخاصة بمساحة النظام
# - لا نضع منطق business داخل urls.py
# - كل وحدة داخل /api/system/ يكون لها urls.py مستقل
# - جميع Views داخل /api/system/ يجب أن تتحقق من can_access_system=True
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "system"


urlpatterns = [
    path("companies/", include("api.system.companies.urls")),
    path("plans/", include("api.system.plans.urls")),
    path("subscriptions/", include("api.system.subscriptions.urls")),
]