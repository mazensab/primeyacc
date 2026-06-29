# ============================================================
# 📂 api/system/release_readiness/urls.py
# 🧠 Mhamcloud | System Release Readiness API URLs v1
# ============================================================
# ✅ /api/system/release-readiness/
# ✅ Read-only release readiness payload
# ============================================================

from django.urls import path

from .views import release_readiness_overview


app_name = "release_readiness"

urlpatterns = [
    path("", release_readiness_overview, name="overview"),
]
