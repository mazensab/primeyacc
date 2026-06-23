# ============================================================
# ًں“‚ api/urls.py
# ًں§  PrimeyAcc | Main API URLs V1.1
# ------------------------------------------------------------
# âœ… API Root Router
# âœ… Auth Routes
# âœ… System Routes
# âœ… Company Routes
# âœ… Clean API Separation
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - /api/auth/ ظ„ظ„ط¬ظ„ط³ط© ظˆط§ظ„ظ…ط³طھط®ط¯ظ… ط§ظ„ط­ط§ظ„ظٹ
# - /api/system/ ظ„ط¥ط¯ط§ط±ط© ط§ظ„ظ…ظ†طµط©
# - /api/company/ ظ„ط¥ط¯ط§ط±ط© ط¨ظٹط§ظ†ط§طھ ط´ط±ظƒط© ظˆط§ط­ط¯ط© ظپظ‚ط·
# - ظƒظ„ ظ…ط³ط§ط± طھط´ط؛ظٹظ„ظٹ ظ„ط§ط­ظ‚ظ‹ط§ ظٹط¬ط¨ ط£ظ† ظٹط­طھط±ظ… ط¹ط²ظ„ ط§ظ„ط´ط±ظƒط§طھ
# ============================================================

from django.urls import include, path


urlpatterns = [
    path("auth/", include("api.auth.urls")),
    path("system/", include("api.system.urls")),
    path("users/", include("api.system.users.urls")),
    path("company/", include("api.company.urls")),
]
