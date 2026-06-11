# ============================================================
# 📂 api/company/activity_profiles/urls.py
# 🧠 PrimeyAcc | Company Activity Profiles URLs
# ------------------------------------------------------------
# ✅ /api/company/activity-profiles/
# ✅ /api/company/activity-profiles/current/
# ✅ /api/company/activity-profiles/update/
# ============================================================

from __future__ import annotations

from django.urls import path

from .current import current_activity_profile
from .list import activity_profiles_list
from .update import update_current_activity_profile


app_name = "activity_profiles"


urlpatterns = [
    path("", activity_profiles_list, name="list"),
    path("current/", current_activity_profile, name="current"),
    path("update/", update_current_activity_profile, name="update"),
]
