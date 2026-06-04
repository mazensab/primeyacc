# ============================================================
# 📂 api/urls.py
# 🧠 PrimeyAcc | Main API URLs V1.1
# ------------------------------------------------------------
# ✅ API Root Router
# ✅ Auth Routes
# ✅ System Routes
# ✅ Company Routes
# ✅ Clean API Separation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - /api/auth/ للجلسة والمستخدم الحالي
# - /api/system/ لإدارة المنصة
# - /api/company/ لإدارة بيانات شركة واحدة فقط
# - كل مسار تشغيلي لاحقًا يجب أن يحترم عزل الشركات
# ============================================================

from django.urls import include, path


urlpatterns = [
    path("auth/", include("api.auth.urls")),
    path("system/", include("api.system.urls")),
    path("company/", include("api.company.urls")),
]