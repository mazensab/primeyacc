# ============================================================
# 📂 api/company/hr/leave_types/detail.py
# 🧠 Mhamcloud | Company HR Leave Types Detail API V1.0
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveType

from .serializers import serialize_leave_type, serialize_leave_type_choices


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_type_detail(request: Request, leave_type_id: int) -> Response:
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Active company context is required.",
            },
            status=401,
        )

    try:
        leave_type = LeaveType.objects.get(id=leave_type_id, company=company)
    except LeaveType.DoesNotExist:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave type was not found.",
            },
            status=404,
        )

    serialized = serialize_leave_type(leave_type)

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Leave type loaded successfully.",
            "leave_type": serialized,
            "data": serialized,
            "choices": serialize_leave_type_choices(),
        },
        status=200,
    )


company_hr_leave_type_detail.required_company_permissions = [
    "company.hr.leave_types.view",
]