# ============================================================
# 📂 api/company/treasury/urls.py
# 🧠 PrimeyAcc | Company Treasury URLs V1.2
# ------------------------------------------------------------
# ✅ Treasury accounts routes
# ✅ Treasury transactions routes
# ✅ Treasury summary route
# ✅ Mounted under /api/company/treasury/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف نقطة تجميع APIs الخزينة داخل /company
# - لا نضع منطق business داخل urls.py
# - كل قسم داخل الخزينة يكون له urls.py مستقل
# - الشركة الحالية لا تؤخذ من الفرونت كمصدر ثقة
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .summary import treasury_summary


app_name = "treasury"


urlpatterns = [
    path("summary/", treasury_summary, name="summary"),
    path("accounts/", include("api.company.treasury.accounts.urls")),
    path("transactions/", include("api.company.treasury.transactions.urls")),
]