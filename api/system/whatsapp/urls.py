# ============================================================
# 📂 api/system/whatsapp/urls.py
# 🧠 PrimeyAcc | System WhatsApp API URLs V1.0
# ------------------------------------------------------------
# ✅ Overview
# ✅ Settings list
# ✅ Templates list/detail/status
# ✅ Messages list/detail
# ============================================================
from __future__ import annotations
from django.urls import path
from . import views
app_name = "system_whatsapp"
urlpatterns = [
    path("", views.system_whatsapp_overview, name="overview"),
    path("settings/", views.system_whatsapp_settings_list, name="settings-list"),
    path("templates/", views.system_whatsapp_templates_list, name="templates-list"),
    path("templates/<int:template_id>/", views.system_whatsapp_template_detail, name="templates-detail"),
    path("templates/<int:template_id>/status/", views.system_whatsapp_template_status, name="templates-status"),
    path("messages/", views.system_whatsapp_messages_list, name="messages-list"),
    path("messages/<int:message_id>/", views.system_whatsapp_message_detail, name="messages-detail"),
]
