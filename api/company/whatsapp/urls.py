# ============================================================
# 📂 api/company/whatsapp/urls.py
# 🧠 Mhamcloud | Company WhatsApp URLs V1.0
# ------------------------------------------------------------
# ✅ Settings endpoints
# ✅ Templates endpoints
# ✅ Messages endpoints
# ============================================================

from __future__ import annotations

from .connection import (
    company_whatsapp_connection,
    company_whatsapp_connection_disconnect,
    company_whatsapp_connection_pairing,
    company_whatsapp_connection_qr,
    company_whatsapp_connection_status,
    company_whatsapp_connection_test,
)

from .inbox import (
    company_whatsapp_conversation_detail,
    company_whatsapp_conversation_messages,
    company_whatsapp_conversation_reply,
    company_whatsapp_conversations_list,
)

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
    path("connection/", company_whatsapp_connection, name="connection"),
    path("connection/status/", company_whatsapp_connection_status, name="connection-status"),
    path("connection/qr/", company_whatsapp_connection_qr, name="connection-qr"),
    path("connection/pairing/", company_whatsapp_connection_pairing, name="connection-pairing"),
    path("connection/disconnect/", company_whatsapp_connection_disconnect, name="connection-disconnect"),
    path("connection/test/", company_whatsapp_connection_test, name="connection-test"),

    path("templates/", company_whatsapp_templates_list, name="templates-list"),
    path("templates/create/", company_whatsapp_template_create, name="templates-create"),
    path("templates/<int:template_id>/", company_whatsapp_template_detail, name="templates-detail"),
    path("templates/<int:template_id>/update/", company_whatsapp_template_update, name="templates-update"),
    path("templates/<int:template_id>/status/", company_whatsapp_template_status, name="templates-status"),

    path("conversations/", company_whatsapp_conversations_list, name="conversations-list"),
    path("conversations/<int:conversation_id>/", company_whatsapp_conversation_detail, name="conversations-detail"),
    path("conversations/<int:conversation_id>/messages/", company_whatsapp_conversation_messages, name="conversations-messages"),
    path("conversations/<int:conversation_id>/reply/", company_whatsapp_conversation_reply, name="conversations-reply"),
    # Backward-compatible aliases for older inbox bundle while the browser refreshes.
    path("messages/<int:conversation_id>/messages/", company_whatsapp_conversation_messages, name="messages-conversation-messages"),
    path("messages/<int:conversation_id>/reply/", company_whatsapp_conversation_reply, name="messages-conversation-reply"),
    path("messages/", company_whatsapp_messages_list, name="messages-list"),
    path("messages/send/", company_whatsapp_message_send, name="messages-send"),
    path("messages/<int:message_id>/", company_whatsapp_message_detail, name="messages-detail"),
]
