# ============================================================
# 📂 api/company/hr/attendance/detail.py
# 🧠 PrimeyAcc | Company HR Attendance Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve company-scoped attendance record detail
# ✅ Tenant isolation through request.company
# ✅ Ignores frontend company_id
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن عرض سجل حضور خارج الشركة الحالية
# - صلاحية العرض المطلوبة: company.hr.attendance.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import AttendanceRecord

from .serializers import serialize_attendance_choices, serialize_attendance_record


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_attendance_detail(request: Request, attendance_id: int) -> Response:
    """
    GET /api/company/hr/attendance/<attendance_id>/

    Return one attendance record from the current company only.
    """

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
        record = (
            AttendanceRecord.objects.select_related(
                "company",
                "branch",
                "employee",
            )
            .get(
                id=attendance_id,
                company=company,
            )
        )
    except AttendanceRecord.DoesNotExist:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Attendance record was not found.",
            },
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Attendance record loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "attendance": serialize_attendance_record(record),
            "record": serialize_attendance_record(record),
            "data": serialize_attendance_record(record),
            "choices": serialize_attendance_choices(),
        },
        status=200,
    )


company_hr_attendance_detail.required_company_permissions = [
    "company.hr.attendance.view",
]