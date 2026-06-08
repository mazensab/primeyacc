# ============================================================
# 📂 api/company/treasury/accounts/urls.py
# 🧠 PrimeyAcc | Company Treasury Accounts URLs V1.0
# ------------------------------------------------------------
# ✅ Treasury accounts list/create route
# ✅ Treasury account detail/update/deactivate route
# ✅ Mounted under /api/company/treasury/accounts/
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف يحتوي مسارات حسابات الخزينة فقط
# - لا نضع منطق business داخل urls.py
# - العزل والصلاحيات داخل Views و services.py
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import treasury_account_detail
from .list import treasury_accounts_list


app_name = "treasury_accounts"


urlpatterns = [
    path("", treasury_accounts_list, name="list"),
    path("<int:account_id>/", treasury_account_detail, name="detail"),
]