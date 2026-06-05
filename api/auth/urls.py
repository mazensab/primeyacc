# ============================================================
# 📂 api/auth/urls.py
# 🧠 PrimeyAcc | Auth API URLs V1.1
# ------------------------------------------------------------
# ✅ Auth Route Group
# ✅ CSRF Endpoint
# ✅ Login Endpoint
# ✅ Logout Endpoint
# ✅ Whoami Endpoint
# ✅ Session Auth Ready
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/auth/csrf/ يجهز CSRF cookie
# - /api/auth/login/ ينشئ Session
# - /api/auth/logout/ ينهي Session
# - /api/auth/whoami/ هو مصدر الواجهة لمعرفة المستخدم والمساحة والشركة
# - لا تعتمد الواجهة على تخمين الصلاحيات محليًا
# ============================================================

from django.urls import path

from .csrf import csrf_token
from .login import login
from .logout import logout
from .whoami import whoami


app_name = "auth"

urlpatterns = [
    path("csrf/", csrf_token, name="csrf"),
    path("login/", login, name="login"),
    path("logout/", logout, name="logout"),
    path("whoami/", whoami, name="whoami"),
]