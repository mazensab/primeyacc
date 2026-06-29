# Mhamcloud WhatsApp Session Gateway
This service keeps the WhatsApp Web session outside Django memory.
Important:
- Restarting Django does not disconnect WhatsApp.
- Restarting this Gateway should reconnect from storage/sessions.
- The disconnect endpoint logs out and removes the saved session.
- Do not delete storage/sessions unless you want to link WhatsApp again.
Default URL:
http://127.0.0.1:3100
Django .env:
WHATSAPP_SESSION_GATEWAY_URL=http://127.0.0.1:3100
