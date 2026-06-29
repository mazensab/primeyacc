# ============================================================
# 📂 api/company/notifications/list.py
# 🧠 Mhamcloud | Company Notifications List API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/notifications/
# ✅ Tenant-isolated by request.company
# ✅ Shows current user's notifications + company-wide notifications
# ✅ Supports filters: is_read, channel, notification_type, priority, source_type
# ✅ Safe pagination foundation
# ✅ Protected by company.notifications.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - الشركة الحالية تأتي من api/permissions.py عبر CompanyMembership
# - المستخدم يرى إشعاراته وإشعارات الشركة العامة فقط
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from notifications.services import (
    get_company_notifications_queryset,
    get_unread_notifications_count,
    serialize_notification,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_notifications_list(request):
    """
    Return current company notifications for the current user.

    Query params:
        is_read=true|false
        channel=IN_APP|EMAIL|WHATSAPP|SYSTEM
        notification_type=INFO|SUCCESS|WARNING|ERROR
        priority=LOW|NORMAL|HIGH|URGENT
        source_type=sales_invoice|purchase_bill|...
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

    queryset = get_company_notifications_queryset(
        company=company,
        user=request.user,
        include_company_wide=True,
    )

    is_read = request.query_params.get("is_read")
    if is_read in ["true", "1", "yes"]:
        queryset = queryset.filter(is_read=True)
    elif is_read in ["false", "0", "no"]:
        queryset = queryset.filter(is_read=False)

    channel = (request.query_params.get("channel") or "").strip().upper()
    if channel:
        queryset = queryset.filter(channel=channel)

    notification_type = (
        request.query_params.get("notification_type") or ""
    ).strip().upper()
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)

    priority = (request.query_params.get("priority") or "").strip().upper()
    if priority:
        queryset = queryset.filter(priority=priority)

    source_type = (request.query_params.get("source_type") or "").strip()
    if source_type:
        queryset = queryset.filter(source_type=source_type)

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

    unread_count = get_unread_notifications_count(
        company=company,
        user=request.user,
        include_company_wide=True,
    )

    return Response(
        {
            "success": True,
            "count": total_count,
            "unread_count": unread_count,
            "limit": limit,
            "offset": offset,
            "results": [
                serialize_notification(notification)
                for notification in results
            ],
        }
    )


company_notifications_list.required_company_permissions = [
    "company.notifications.view",
]