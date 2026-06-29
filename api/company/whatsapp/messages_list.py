# ============================================================
# 📂 api/company/whatsapp/messages_list.py
# 🧠 Mhamcloud | Company WhatsApp Messages List API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/whatsapp/messages/
# ✅ Tenant-isolated by request.company
# ✅ Supports filters: status, direction, provider, source_type, recipient_phone
# ✅ Safe pagination foundation
# ✅ Protected by company.whatsapp.messages.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - كل سجلات الرسائل محصورة في الشركة الحالية فقط
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from whatsapp.services import (
    get_company_message_logs_queryset,
    serialize_whatsapp_message_log,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_messages_list(request):
    """
    Return WhatsApp message logs for current company.

    Query params:
        status=DRAFT|QUEUED|SENT|DELIVERED|READ|FAILED|CANCELLED
        direction=OUTBOUND|INBOUND
        provider=MOCK|WHATSAPP_CLOUD|CUSTOM
        source_type=MANUAL|SALES_INVOICE|...
        recipient_phone=050...
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

    queryset = get_company_message_logs_queryset(company=company)

    status_value = (request.query_params.get("status") or "").strip().upper()
    if status_value:
        queryset = queryset.filter(status=status_value)

    direction = (request.query_params.get("direction") or "").strip().upper()
    if direction:
        queryset = queryset.filter(direction=direction)

    provider = (request.query_params.get("provider") or "").strip().upper()
    if provider:
        queryset = queryset.filter(provider=provider)

    source_type = (request.query_params.get("source_type") or "").strip().upper()
    if source_type:
        queryset = queryset.filter(source_type=source_type)

    recipient_phone = (request.query_params.get("recipient_phone") or "").strip()
    if recipient_phone:
        queryset = queryset.filter(recipient_phone__icontains=recipient_phone)

    search = (request.query_params.get("q") or "").strip()
    if search:
        queryset = queryset.filter(
            Q(recipient_name__icontains=search)
            | Q(recipient_phone__icontains=search)
            | Q(message_body__icontains=search)
            | Q(provider_message_id__icontains=search)
            | Q(source_id__icontains=search)
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
                serialize_whatsapp_message_log(message)
                for message in results
            ],
        }
    )


company_whatsapp_messages_list.required_company_permissions = [
    "company.whatsapp.messages.view",
]