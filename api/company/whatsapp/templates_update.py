# ============================================================
# 📂 api/company/whatsapp/templates_update.py
# 🧠 Mhamcloud | Company WhatsApp Templates Update API V1.0
# ------------------------------------------------------------
# ✅ POST/PATCH /api/company/whatsapp/templates/<id>/update/
# ✅ Tenant-isolated by request.company
# ✅ Updates WhatsApp template for current company only
# ✅ Protected by company.whatsapp.templates.manage
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - template_id لا يكفي للتعديل إلا بعد ربطه بالشركة الحالية
# - code يبقى unique داخل الشركة فقط
# ============================================================

from __future__ import annotations

from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    serialize_whatsapp_template,
    update_whatsapp_template,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_template_update(request, template_id: int):
    """
    Update one WhatsApp template safely scoped by current company.
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

    try:
        template = update_whatsapp_template(
            company=company,
            template_id=template_id,
            data=request.data,
            user=request.user,
        )
    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=404,
        )
    except IntegrityError:
        return Response(
            {
                "success": False,
                "message": "Template code already exists for this company.",
            },
            status=400,
        )

    return Response(
        {
            "success": True,
            "message": "WhatsApp template updated successfully.",
            "template": serialize_whatsapp_template(template),
        }
    )


company_whatsapp_template_update.required_company_permissions = [
    "company.whatsapp.templates.manage",
]