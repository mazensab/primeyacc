# ============================================================
# 📂 api/company/urls.py
# 🧠 PrimeyAcc | Company Workspace API URLs V1.6
# ------------------------------------------------------------
# ✅ Central routes for company workspace APIs
# ✅ Current company endpoint /api/company/me/
# ✅ Company profile endpoint /api/company/profile/
# ✅ Company settings endpoint /api/company/settings/
# ✅ Company branches endpoint /api/company/branches/
# ✅ Company context comes from active CompanyMembership
# ✅ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف هو نقطة تجميع APIs الخاصة بمساحة الشركة
# - لا نضع منطق business داخل urls.py
# - كل وحدة داخل /api/company/ يكون لها urls.py مستقل عند إنشائها
# - جميع Views داخل /api/company/ يجب أن تستخدم api/permissions.py
# - الشركة الحالية لا تؤخذ من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .me import company_me
from .profile import company_profile


app_name = "company"


urlpatterns = [
    path("me/", company_me, name="me"),
    path("profile/", company_profile, name="profile"),
    path("settings/", include("api.company.settings.urls")),
    path("branches/", include("api.company.branches.urls")),
]