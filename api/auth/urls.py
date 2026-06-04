# ============================================================
# 📂 api/auth/urls.py
# 🧠 PrimeyAcc | Auth API URLs V1
# ------------------------------------------------------------
# ✅ Auth Route Group
# ✅ Whoami Endpoint
# ✅ Session Auth Ready
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/auth/ يحتوي مسارات الجلسة والمستخدم الحالي
# - whoami هو مصدر الواجهة لمعرفة المستخدم والمساحة والشركة
# - لا تعتمد الواجهة على تخمين الصلاحيات محليًا
# ============================================================

from django.urls import path

from .whoami import whoami


app_name = "auth"

urlpatterns = [
    path("whoami/", whoami, name="whoami"),
]