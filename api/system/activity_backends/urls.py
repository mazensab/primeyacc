# 📂 api/system/activity_backends/urls.py
# 🧠 Mhamcloud | System Activity Backends API URLs v1
# ============================================================
# ✅ /api/system/activity-backends/
# ============================================================
from django.urls import path
from . import views
app_name = "system_activity_backends"
urlpatterns = [
    path("", views.system_activity_backends_overview, name="overview"),
]
