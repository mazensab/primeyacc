# ============================================================
# 📂 api/company/hr/attendance/create.py
# 🧠 Mhamcloud | Company HR Attendance Create API V1.0
# ------------------------------------------------------------
# ✅ Create company-scoped attendance record
# ✅ Tenant isolation through request.company
# ✅ Ignores frontend company_id
# ✅ Validates employee inside current company
# ✅ Validates branch inside current company
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - employee_id يجب أن يكون داخل الشركة الحالية
# - branch_id إن وجد يجب أن يكون داخل الشركة الحالية
# - منطق الإنشاء يتم عبر hr.services.create_attendance_record
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_attendance_record

from .serializers import (
    build_attendance_data_from_request,
    serialize_attendance_record,
)


def _validation_errors_payload(exc: ValidationError):
    """
    Convert Django ValidationError into API-friendly errors payload.
    """

    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {
            "detail": exc.messages,
        }

    return {
        "detail": [str(exc)],
    }


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_attendance_create(request: Request) -> Response:
    """
    POST /api/company/hr/attendance/create/

    Create attendance record inside the current company.
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
        employee, data = build_attendance_data_from_request(
            company=company,
            payload=request.data,
        )

        record = create_attendance_record(
            company=company,
            employee=employee,
            created_by=request.user,
            data=data,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Attendance record created successfully.",
                "attendance": serialize_attendance_record(record),
                "record": serialize_attendance_record(record),
                "data": serialize_attendance_record(record),
            },
            status=201,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Attendance data is invalid.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_attendance_create.required_company_permissions = [
    "company.hr.attendance.create",
]