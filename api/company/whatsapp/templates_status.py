# ============================================================
# 📂 api/company/whatsapp/templates_status.py
# 🧠 PrimeyAcc | Company WhatsApp Templates Status API V1.0
# ------------------------------------------------------------
# ✅ POST /api/company/whatsapp/templates/<id>/status/
# ✅ Tenant-isolated by request.company
# ✅ Updates template status safely
# ✅ Protected by company.whatsapp.templates.manage
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - template_id لا يكفي للتعديل إلا بعد ربطه بالشركة الحالية
# - الحالات المسموحة تأتي من services.py
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    serialize_whatsapp_template,
    set_whatsapp_template_status,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_template_status(request, template_id: int):
    """
    Update WhatsApp template status safely scoped by current company.
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

    status_value = (request.data.get("status") or "").strip().upper()

    if not status_value:
        return Response(
            {
                "success": False,
                "message": "Template status is required.",
            },
            status=400,
        )

    try:
        template = set_whatsapp_template_status(
            company=company,
            template_id=template_id,
            status=status_value,
            user=request.user,
        )
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "not found" in message.lower() else 400

        return Response(
            {
                "success": False,
                "message": message,
            },
            status=status_code,
        )

    return Response(
        {
            "success": True,
            "message": "WhatsApp template status updated successfully.",
            "template": serialize_whatsapp_template(template),
        }
    )


company_whatsapp_template_status.required_company_permissions = [
    "company.whatsapp.templates.manage",
]