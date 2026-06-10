# ============================================================
# 📂 api/company/notifications/urls.py
# 🧠 PrimeyAcc | Company Notifications URLs V1.0
# ------------------------------------------------------------
# ✅ GET  /api/company/notifications/
# ✅ GET  /api/company/notifications/<id>/
# ✅ POST /api/company/notifications/<id>/read/
# ✅ POST /api/company/notifications/mark-all-read/
# ✅ GET  /api/company/notifications/unread-count/
# ============================================================

from __future__ import annotations

from django.urls import path

from .detail import company_notification_detail
from .list import company_notifications_list
from .mark_all_read import company_notifications_mark_all_read
from .mark_read import company_notification_mark_read
from .unread_count import company_notifications_unread_count


app_name = "company_notifications"


urlpatterns = [
    path("", company_notifications_list, name="list"),
    path("unread-count/", company_notifications_unread_count, name="unread-count"),
    path("mark-all-read/", company_notifications_mark_all_read, name="mark-all-read"),
    path("<int:notification_id>/", company_notification_detail, name="detail"),
    path("<int:notification_id>/read/", company_notification_mark_read, name="mark-read"),
]