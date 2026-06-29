# ============================================================
# 📂 api/company/whatsapp/templates_detail.py
# 🧠 Mhamcloud | Company WhatsApp Templates Detail API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/whatsapp/templates/<id>/
# ✅ Tenant-isolated by request.company
# ✅ Protected by company.whatsapp.templates.manage
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - template_id لا يكفي للوصول إلا بعد ربطه بالشركة الحالية
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    get_whatsapp_template_for_company,
    serialize_whatsapp_template,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_template_detail(request, template_id: int):
    """
    Return one WhatsApp template safely scoped by current company.
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

    return Response(
        {
            "success": True,
            "template": serialize_whatsapp_template(template),
        }
    )


company_whatsapp_template_detail.required_company_permissions = [
    "company.whatsapp.templates.manage",
]