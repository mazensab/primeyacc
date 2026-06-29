# 📂 api/system/activity_profiles/urls.py
# 🧠 Mhamcloud | System Activity Profiles API URLs v1
# ============================================================
# ✅ /api/system/activity-profiles/
# ✅ /api/system/activity-profiles/list/
# ✅ /api/system/activity-profiles/<id>/
# ✅ /api/system/activity-profiles/<id>/companies/
# ============================================================
from django.urls import path
from . import views
app_name = "system_activity_profiles"
urlpatterns = [
    path("", views.system_activity_profiles_overview, name="overview"),
    path("list/", views.system_activity_profiles_list, name="list"),
    path("<int:profile_id>/", views.system_activity_profile_detail, name="detail"),
    path("<int:profile_id>/companies/", views.system_activity_profile_companies, name="companies"),
]
