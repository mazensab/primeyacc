# ============================================================
# 📂 api/company/notifications/detail.py
# 🧠 Mhamcloud | Company Notifications Detail API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/notifications/<id>/
# ✅ Tenant-isolated by request.company
# ✅ Current user can only access own + company-wide notifications
# ✅ Protected by company.notifications.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - notification_id لا يكفي للوصول إلا بعد ربطه بالشركة الحالية
# - المستخدم يرى إشعاراته وإشعارات الشركة العامة فقط
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from notifications.services import (
    get_notification_for_company,
    serialize_notification,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_notification_detail(request, notification_id: int):
    """
    Return one notification safely scoped by current company and current user.
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

    notification = get_notification_for_company(
        company=company,
        notification_id=notification_id,
        user=request.user,
        include_company_wide=True,
    )

    if not notification:
        return Response(
            {
                "success": False,
                "message": "Notification was not found.",
            },
            status=404,
        )

    return Response(
        {
            "success": True,
            "notification": serialize_notification(notification),
        }
    )


company_notification_detail.required_company_permissions = [
    "company.notifications.view",
]