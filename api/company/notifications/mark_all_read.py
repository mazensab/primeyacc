# ============================================================
# 📂 api/company/notifications/mark_all_read.py
# 🧠 PrimeyAcc | Company Notifications Mark All Read API V1.0
# ------------------------------------------------------------
# ✅ POST /api/company/notifications/mark-all-read/
# ✅ Tenant-isolated by request.company
# ✅ Marks current user's notifications + company-wide notifications as read
# ✅ Protected by company.notifications.read
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - العملية محصورة في الشركة الحالية فقط
# - المستخدم يؤثر فقط على إشعاراته وإشعارات الشركة العامة
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from notifications.services import (
    get_unread_notifications_count,
    mark_all_notifications_as_read,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_notifications_mark_all_read(request):
    """
    Mark all current user notifications as read within current company.
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

    updated_count = mark_all_notifications_as_read(
        company=company,
        user=request.user,
        include_company_wide=True,
    )

    unread_count = get_unread_notifications_count(
        company=company,
        user=request.user,
        include_company_wide=True,
    )

    return Response(
        {
            "success": True,
            "message": "Notifications marked as read.",
            "updated_count": updated_count,
            "unread_count": unread_count,
        }
    )


company_notifications_mark_all_read.required_company_permissions = [
    "company.notifications.read",
]