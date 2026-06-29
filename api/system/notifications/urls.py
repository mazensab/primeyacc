# ============================================================
# 📂 api/system/notifications/urls.py
# 🧠 Mhamcloud | System Notifications URLs V1.0
# ------------------------------------------------------------
# ✅ GET  /api/system/notifications/
# ✅ GET  /api/system/notifications/unread-count/
# ✅ POST /api/system/notifications/mark-all-read/
# ✅ GET  /api/system/notifications/<id>/
# ✅ POST /api/system/notifications/<id>/read/
# ✅ POST /api/system/notifications/<id>/unread/
# ============================================================
from __future__ import annotations
from django.urls import path
from .views import (
    system_notification_detail,
    system_notification_mark_read,
    system_notification_mark_unread,
    system_notifications_list,
    system_notifications_mark_all_read,
    system_notifications_unread_count,
)
app_name = "system_notifications"
urlpatterns = [
    path("", system_notifications_list, name="list"),
    path("unread-count/", system_notifications_unread_count, name="unread-count"),
    path("mark-all-read/", system_notifications_mark_all_read, name="mark-all-read"),
    path("<int:notification_id>/", system_notification_detail, name="detail"),
    path("<int:notification_id>/read/", system_notification_mark_read, name="mark-read"),
    path("<int:notification_id>/unread/", system_notification_mark_unread, name="mark-unread"),
]
