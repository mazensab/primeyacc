# ============================================================
# 📂 api/company/notifications/mark_read.py
# 🧠 PrimeyAcc | Company Notifications Mark Read API V1.0
# ------------------------------------------------------------
# ✅ POST /api/company/notifications/<id>/read/
# ✅ Tenant-isolated by request.company
# ✅ Current user can mark own + company-wide notifications as read
# ✅ Protected by company.notifications.read
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - لا يمكن تعليم إشعار كمقروء إلا إذا كان ضمن الشركة الحالية
# - المستخدم لا يصل إلا لإشعاراته وإشعارات الشركة العامة
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from notifications.services import (
    mark_notification_as_read,
    serialize_notification,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_notification_mark_read(request, notification_id: int):
    """
    Mark one notification as read safely.
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
        notification = mark_notification_as_read(
            company=company,
            notification_id=notification_id,
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

    return Response(
        {
            "success": True,
            "message": "Notification marked as read.",
            "notification": serialize_notification(notification),
        }
    )


company_notification_mark_read.required_company_permissions = [
    "company.notifications.read",
]