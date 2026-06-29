# ============================================================
# 📂 api/company/whatsapp/messages_send.py
# 🧠 Mhamcloud | Company WhatsApp Messages Send API V1.0
# ------------------------------------------------------------
# ✅ POST /api/company/whatsapp/messages/send/
# ✅ Tenant-isolated by request.company
# ✅ Mock send only in Phase 14
# ✅ Supports direct body or active template
# ✅ Protected by company.whatsapp.messages.send
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - الإرسال الحالي Mock آمن فقط ولا يتصل بمزود خارجي
# - template_id لا يستخدم إلا بعد التحقق أنه داخل الشركة الحالية
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.models import WhatsAppMessageSourceType
from whatsapp.services import (
    get_whatsapp_template_for_company,
    send_mock_whatsapp_message,
    serialize_whatsapp_message_log,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_message_send(request):
    """
    Send a mock WhatsApp message for current company.

    Body options:
        recipient_phone: required
        recipient_name: optional
        message_body: required if no template_id
        template_id: optional
        template_variables: optional dict
        source_type: optional
        source_id: optional
    """
    company = getattr(request, "company", None)

    if not company:
        return Response(
            {
                "success": False,
                "message": "Company context was not resolved.",
            },
            status=403,
        )

    recipient_phone = (request.data.get("recipient_phone") or "").strip()
    recipient_name = (request.data.get("recipient_name") or "").strip()
    message_body = (request.data.get("message_body") or "").strip()
    template_variables = request.data.get("template_variables") or {}

    source_type = (
        request.data.get("source_type")
        or WhatsAppMessageSourceType.MANUAL
    )
    source_id = request.data.get("source_id") or ""

    template = None
    template_id = request.data.get("template_id")

    if template_id:
        try:
            template_id = int(template_id)
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "Invalid template_id.",
                },
                status=400,
            )

        template = get_whatsapp_template_for_company(
            company=company,
            template_id=template_id,
        )

        if not template:
            return Response(
                {
                    "success": False,
                    "message": "WhatsApp template was not found.",
                },
                status=404,
            )

    if not recipient_phone:
        return Response(
            {
                "success": False,
                "message": "Recipient phone number is required.",
            },
            status=400,
        )

    if not template and not message_body:
        return Response(
            {
                "success": False,
                "message": "Message body is required when template_id is not provided.",
            },
            status=400,
        )

    try:
        message_log = send_mock_whatsapp_message(
            company=company,
            recipient_phone=recipient_phone,
            recipient_name=recipient_name,
            message_body=message_body,
            template=template,
            template_variables=template_variables,
            source_type=source_type,
            source_id=source_id,
            created_by=request.user,
        )
    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    return Response(
        {
            "success": True,
            "message": "WhatsApp message logged as sent in mock mode.",
            "message_log": serialize_whatsapp_message_log(message_log),
        },
        status=201,
    )


company_whatsapp_message_send.required_company_permissions = [
    "company.whatsapp.messages.send",
]