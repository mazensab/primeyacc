# ============================================================
# 📂 api/company/notifications/unread_count.py
# 🧠 PrimeyAcc | Company Notifications Unread Count API V1.0
# ------------------------------------------------------------
# ✅ GET /api/company/notifications/unread-count/
# ✅ Tenant-isolated by request.company
# ✅ Counts current user's unread + company-wide unread notifications
# ✅ Protected by company.notifications.view
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - العد يتم داخل الشركة الحالية فقط
# - المستخدم يرى عدد إشعاراته وإشعارات الشركة العامة فقط
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from notifications.services import get_unread_notifications_count


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_notifications_unread_count(request):
    """
    Return unread notifications count for current user within current company.
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

    unread_count = get_unread_notifications_count(
        company=company,
        user=request.user,
        include_company_wide=True,
    )

    return Response(
        {
            "success": True,
            "unread_count": unread_count,
        }
    )


company_notifications_unread_count.required_company_permissions = [
    "company.notifications.view",
]