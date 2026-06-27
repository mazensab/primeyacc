# ============================================================
# ?? api/system/whatsapp/urls.py
# ?? PrimeyAcc | System WhatsApp API URLs V1.1
# ------------------------------------------------------------
# ? Existing settings/templates/messages routes
# ? System connection routes: settings/status/QR/pairing/disconnect/test
# ============================================================
from django.urls import path
from .views import (
    system_whatsapp_connection,
    system_whatsapp_connection_disconnect,
    system_whatsapp_connection_pairing,
    system_whatsapp_connection_qr,
    system_whatsapp_connection_status,
    system_whatsapp_connection_test,
    system_whatsapp_inbox_webhook,
    system_whatsapp_message_detail,
    system_whatsapp_messages_list,
    system_whatsapp_overview,
    system_whatsapp_settings_list,
    system_whatsapp_template_detail,
    system_whatsapp_template_status,
    system_whatsapp_templates_list,
)
app_name = "system_whatsapp"
urlpatterns = [
    path("", system_whatsapp_overview, name="overview"),
    path("connection/", system_whatsapp_connection, name="connection"),
    path("connection/status/", system_whatsapp_connection_status, name="connection-status"),
    path("connection/qr/", system_whatsapp_connection_qr, name="connection-qr"),
    path("connection/pairing/", system_whatsapp_connection_pairing, name="connection-pairing"),
    path("connection/disconnect/", system_whatsapp_connection_disconnect, name="connection-disconnect"),
    path("connection/test/", system_whatsapp_connection_test, name="connection-test"),
    path("settings/", system_whatsapp_settings_list, name="settings"),
    path("templates/", system_whatsapp_templates_list, name="templates"),
    path("templates/<int:template_id>/", system_whatsapp_template_detail, name="template-detail"),
    path("templates/<int:template_id>/status/", system_whatsapp_template_status, name="template-status"),
    path("messages/", system_whatsapp_messages_list, name="messages"),
    path("messages/<int:message_id>/", system_whatsapp_message_detail, name="message-detail"),
    path("inbox/webhook/", system_whatsapp_inbox_webhook, name="inbox-webhook"),
]
