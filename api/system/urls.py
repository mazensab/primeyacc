# ============================================================
# 📂 api/system/urls.py
# 🧠 PrimeyAcc | System Workspace API URLs V1.5
# ------------------------------------------------------------
# ✅ Central routes for system workspace APIs
# ✅ Includes system companies APIs
# ✅ Includes SaaS subscription plans APIs
# ✅ Includes company subscriptions APIs
# ✅ Includes platform billing documents APIs
# ✅ Each module owns its own urls.py
# ✅ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف هو نقطة تجميع APIs الخاصة بمساحة النظام
# - لا نضع منطق business داخل urls.py
# - كل وحدة داخل /api/system/ يكون لها urls.py مستقل
# - جميع Views داخل /api/system/ يجب أن تتحقق من صلاحيات النظام
# - الصلاحيات تطبق داخل views عبر api/permissions.py
# - مستندات فوترة المنصة مستقلة عن مستندات ومدفوعات الشركات
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "system"


urlpatterns = [
    path(
        "companies/",
        include("api.system.companies.urls"),
    ),
    path(
        "plans/",
        include("api.system.plans.urls"),
    ),
    path(
        "subscriptions/",
        include("api.system.subscriptions.urls"),
    ),
    path(
        "billing-documents/",
        include("api.system.billing_documents.urls"),
    ),
]