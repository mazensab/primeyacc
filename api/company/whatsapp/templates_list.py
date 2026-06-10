# ============================================================
# 📂 api/company/whatsapp/templates_list.py
# 🧠 PrimeyAcc | Company WhatsApp Templates List API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/whatsapp/templates/
# ✅ Tenant-isolated by request.company
# ✅ Supports filters: status, category, language, q
# ✅ Safe pagination foundation
# ✅ Protected by company.whatsapp.templates.manage
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - كل القوالب محصورة في الشركة الحالية فقط
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    get_company_templates_queryset,
    serialize_whatsapp_template,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_templates_list(request):
    """
    Return WhatsApp templates for current company.

    Query params:
        status=DRAFT|ACTIVE|INACTIVE|ARCHIVED
        category=GENERAL|SALES|PURCHASES|...
        language=ar|en
        q=search text
        limit=50
        offset=0
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

    queryset = get_company_templates_queryset(company=company)

    status_value = (request.query_params.get("status") or "").strip().upper()
    if status_value:
        queryset = queryset.filter(status=status_value)

    category = (request.query_params.get("category") or "").strip().upper()
    if category:
        queryset = queryset.filter(category=category)

    language = (request.query_params.get("language") or "").strip()
    if language:
        queryset = queryset.filter(language=language)

    search = (request.query_params.get("q") or "").strip()
    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(body__icontains=search)
            | Q(external_template_name__icontains=search)
        )

    try:
        limit = int(request.query_params.get("limit", 50))
    except (TypeError, ValueError):
        limit = 50

    try:
        offset = int(request.query_params.get("offset", 0))
    except (TypeError, ValueError):
        offset = 0

    limit = max(1, min(limit, 100))
    offset = max(0, offset)

    total_count = queryset.count()
    results = queryset[offset : offset + limit]

    return Response(
        {
            "success": True,
            "count": total_count,
            "limit": limit,
            "offset": offset,
            "results": [
                serialize_whatsapp_template(template)
                for template in results
            ],
        }
    )


company_whatsapp_templates_list.required_company_permissions = [
    "company.whatsapp.templates.manage",
]