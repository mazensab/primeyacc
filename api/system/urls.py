# ============================================================
# ظ‹ع؛â€œâ€ڑ api/system/urls.py
# ظ‹ع؛آ§آ  PrimeyAcc | System Workspace API URLs V1.5
# ------------------------------------------------------------
# أ¢إ“â€¦ Central routes for system workspace APIs
# أ¢إ“â€¦ Includes system companies APIs
# أ¢إ“â€¦ Includes SaaS subscription plans APIs
# أ¢إ“â€¦ Includes company subscriptions APIs
# أ¢إ“â€¦ Includes platform billing documents APIs
# أ¢إ“â€¦ Each module owns its own urls.py
# أ¢إ“â€¦ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# ط·آ§ط¸â€‍ط¸â€ڑط·آ§ط·آ¹ط·آ¯ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ط·آ©:
# - ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط¸â€،ط¸ث† ط¸â€ ط¸â€ڑط·آ·ط·آ© ط·ع¾ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ APIs ط·آ§ط¸â€‍ط·آ®ط·آ§ط·آµط·آ© ط·آ¨ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط¸â€ ط·آ¸ط·آ§ط¸â€¦
# - ط¸â€‍ط·آ§ ط¸â€ ط·آ¶ط·آ¹ ط¸â€¦ط¸â€ ط·آ·ط¸â€ڑ business ط·آ¯ط·آ§ط·آ®ط¸â€‍ urls.py
# - ط¸ئ’ط¸â€‍ ط¸ث†ط·آ­ط·آ¯ط·آ© ط·آ¯ط·آ§ط·آ®ط¸â€‍ /api/system/ ط¸ظ¹ط¸ئ’ط¸ث†ط¸â€  ط¸â€‍ط¸â€،ط·آ§ urls.py ط¸â€¦ط·آ³ط·ع¾ط¸â€ڑط¸â€‍
# - ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ Views ط·آ¯ط·آ§ط·آ®ط¸â€‍ /api/system/ ط¸ظ¹ط·آ¬ط·آ¨ ط·آ£ط¸â€  ط·ع¾ط·ع¾ط·آ­ط¸â€ڑط¸â€ڑ ط¸â€¦ط¸â€  ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط¸â€ ط·آ¸ط·آ§ط¸â€¦
# - ط·آ§ط¸â€‍ط·آµط¸â€‍ط·آ§ط·آ­ط¸ظ¹ط·آ§ط·ع¾ ط·ع¾ط·آ·ط·آ¨ط¸â€ڑ ط·آ¯ط·آ§ط·آ®ط¸â€‍ views ط·آ¹ط·آ¨ط·آ± api/permissions.py
# - ط¸â€¦ط·آ³ط·ع¾ط¸â€ ط·آ¯ط·آ§ط·ع¾ ط¸ظ¾ط¸ث†ط·ع¾ط·آ±ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط¸â€ ط·آµط·آ© ط¸â€¦ط·آ³ط·ع¾ط¸â€ڑط¸â€‍ط·آ© ط·آ¹ط¸â€  ط¸â€¦ط·آ³ط·ع¾ط¸â€ ط·آ¯ط·آ§ط·ع¾ ط¸ث†ط¸â€¦ط·آ¯ط¸ظ¾ط¸ث†ط·آ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ§ط·ع¾
# ============================================================

from __future__ import annotations

from django.urls import include, path


app_name = "system"


urlpatterns = [
    path("settings/", include(("settings_center.urls", "settings_center"), namespace="settings_center")),
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

