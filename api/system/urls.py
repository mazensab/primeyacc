# ============================================================
# ًں“‚ api/system/urls.py
# ًں§  PrimeyAcc | System Workspace API URLs V1.5
# ------------------------------------------------------------
# âœ… Central routes for system workspace APIs
# âœ… Includes system companies APIs
# âœ… Includes SaaS subscription plans APIs
# âœ… Includes company subscriptions APIs
# âœ… Includes platform billing documents APIs
# âœ… Each module owns its own urls.py
# âœ… Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ‡ط°ط§ ط§ظ„ظ…ظ„ظپ ظ‡ظˆ ظ†ظ‚ط·ط© طھط¬ظ…ظٹط¹ APIs ط§ظ„ط®ط§طµط© ط¨ظ…ط³ط§ط­ط© ط§ظ„ظ†ط¸ط§ظ…
# - ظ„ط§ ظ†ط¶ط¹ ظ…ظ†ط·ظ‚ business ط¯ط§ط®ظ„ urls.py
# - ظƒظ„ ظˆط­ط¯ط© ط¯ط§ط®ظ„ /api/system/ ظٹظƒظˆظ† ظ„ظ‡ط§ urls.py ظ…ط³طھظ‚ظ„
# - ط¬ظ…ظٹط¹ Views ط¯ط§ط®ظ„ /api/system/ ظٹط¬ط¨ ط£ظ† طھطھط­ظ‚ظ‚ ظ…ظ† طµظ„ط§ط­ظٹط§طھ ط§ظ„ظ†ط¸ط§ظ…
# - ط§ظ„طµظ„ط§ط­ظٹط§طھ طھط·ط¨ظ‚ ط¯ط§ط®ظ„ views ط¹ط¨ط± api/permissions.py
# - ظ…ط³طھظ†ط¯ط§طھ ظپظˆطھط±ط© ط§ظ„ظ…ظ†طµط© ظ…ط³طھظ‚ظ„ط© ط¹ظ† ظ…ط³طھظ†ط¯ط§طھ ظˆظ…ط¯ظپظˆط¹ط§طھ ط§ظ„ط´ط±ظƒط§طھ
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "system"


urlpatterns = [
    path("release-readiness/", include("api.system.release_readiness.urls")),

    path(
        "companies/",
        include("api.system.companies.urls"),
    ),
    path(
        "plans/",
        include("api.system.plans.urls"),
    ),
    path(
        "subscriptions/",
        include("api.system.subscriptions.urls"),
    ),
    path(
        "billing-documents/",
        include("api.system.billing_documents.urls"),
    ),
    path(
        "users/",
        include("api.system.users.urls"),
    ),
]

