# ============================================================
# 📂 api/company/whatsapp/urls.py
# 🧠 Mhamcloud | Company WhatsApp URLs V1.0
# ------------------------------------------------------------
# ✅ Settings endpoints
# ✅ Templates endpoints
# ✅ Messages endpoints
# ============================================================

from __future__ import annotations

from django.urls import path

from .messages_detail import company_whatsapp_message_detail
from .messages_list import company_whatsapp_messages_list
from .messages_send import company_whatsapp_message_send
from .settings import company_whatsapp_settings
from .templates_create import company_whatsapp_template_create
from .templates_detail import company_whatsapp_template_detail
from .templates_list import company_whatsapp_templates_list
from .templates_status import company_whatsapp_template_status
from .templates_update import company_whatsapp_template_update


app_name = "company_whatsapp"


urlpatterns = [
    path("settings/", company_whatsapp_settings, name="settings"),

    path("templates/", company_whatsapp_templates_list, name="templates-list"),
    path("templates/create/", company_whatsapp_template_create, name="templates-create"),
    path("templates/<int:template_id>/", company_whatsapp_template_detail, name="templates-detail"),
    path("templates/<int:template_id>/update/", company_whatsapp_template_update, name="templates-update"),
    path("templates/<int:template_id>/status/", company_whatsapp_template_status, name="templates-status"),

    path("messages/", company_whatsapp_messages_list, name="messages-list"),
    path("messages/send/", company_whatsapp_message_send, name="messages-send"),
    path("messages/<int:message_id>/", company_whatsapp_message_detail, name="messages-detail"),
]