# ============================================================
# 📂 api/company/hr/leave_requests/detail.py
# 🧠 PrimeyAcc | Company HR Leave Requests Detail API V1.0
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveRequest

from .serializers import serialize_leave_request, serialize_leave_request_choices


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_detail(request: Request, leave_request_id: int) -> Response:
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
        leave_request = (
            LeaveRequest.objects.select_related(
                "company",
                "employee",
                "leave_type",
                "approved_by",
                "rejected_by",
                "cancelled_by",
            )
            .get(id=leave_request_id, company=company)
        )
    except LeaveRequest.DoesNotExist:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request was not found.",
            },
            status=404,
        )

    serialized = serialize_leave_request(leave_request)

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Leave request loaded successfully.",
            "leave_request": serialized,
            "data": serialized,
            "choices": serialize_leave_request_choices(),
        },
        status=200,
    )


company_hr_leave_request_detail.required_company_permissions = [
    "company.hr.leave_requests.view",
]