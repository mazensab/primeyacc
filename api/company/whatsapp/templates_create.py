# ============================================================
# 📂 api/company/whatsapp/templates_create.py
# 🧠 Mhamcloud | Company WhatsApp Templates Create API V1.0
# ------------------------------------------------------------
# ✅ POST /api/company/whatsapp/templates/create/
# ✅ Tenant-isolated by request.company
# ✅ Creates WhatsApp template for current company only
# ✅ Protected by company.whatsapp.templates.manage
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - الشركة الحالية تأتي من request.company
# - code يكون unique داخل الشركة فقط
# ============================================================

from __future__ import annotations

from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    create_whatsapp_template,
    serialize_whatsapp_template,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_template_create(request):
    """
    Create a WhatsApp template for current company.
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
        template = create_whatsapp_template(
            company=company,
            name=request.data.get("name", ""),
            code=request.data.get("code", ""),
            body=request.data.get("body", ""),
            category=request.data.get("category", "GENERAL"),
            status=request.data.get("status", "DRAFT"),
            language=request.data.get("language", "ar"),
            footer=request.data.get("footer", ""),
            variables=request.data.get("variables"),
            external_template_name=request.data.get("external_template_name", ""),
            metadata=request.data.get("metadata") or {},
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
            "message": "WhatsApp template created successfully.",
            "template": serialize_whatsapp_template(template),
        },
        status=201,
    )


company_whatsapp_template_create.required_company_permissions = [
    "company.whatsapp.templates.manage",
]