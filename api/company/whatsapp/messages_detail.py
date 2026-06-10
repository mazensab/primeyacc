# ============================================================
# 📂 api/company/whatsapp/messages_detail.py
# 🧠 PrimeyAcc | Company WhatsApp Messages Detail API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/whatsapp/messages/<id>/
# ✅ Tenant-isolated by request.company
# ✅ Protected by company.whatsapp.messages.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - message_id لا يكفي للوصول إلا بعد ربطه بالشركة الحالية
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    get_message_log_for_company,
    serialize_whatsapp_message_log,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_message_detail(request, message_id: int):
    """
    Return one WhatsApp message log safely scoped by current company.
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

    message = get_message_log_for_company(
        company=company,
        message_id=message_id,
    )

    if not message:
        return Response(
            {
                "success": False,
                "message": "WhatsApp message was not found.",
            },
            status=404,
        )

    return Response(
        {
            "success": True,
            "message_log": serialize_whatsapp_message_log(message),
        }
    )


company_whatsapp_message_detail.required_company_permissions = [
    "company.whatsapp.messages.view",
]