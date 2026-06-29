# ============================================================
# 📂 api/company/hr/attendance/actions.py
# 🧠 Mhamcloud | Company HR Attendance Actions APIs V1.0
# ------------------------------------------------------------
# ✅ Check-in employee
# ✅ Check-out attendance record
# ✅ Mark missing check-out
# ✅ Cancel attendance record
# ✅ Tenant isolation through request.company
# ✅ Ignores frontend company_id
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - employee_id يجب أن يكون داخل الشركة الحالية
# - attendance_id يجب أن يكون داخل الشركة الحالية
# - منطق التشغيل يتم عبر hr.services
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import AttendanceRecord
from hr.services import (
    cancel_attendance_record,
    check_in_employee,
    check_out_attendance_record,
    mark_attendance_missing_check_out,
)

from .serializers import (
    build_check_in_data_from_request,
    build_check_out_data_from_request,
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


def _get_company_attendance_or_response(*, request: Request, attendance_id: int):
    """
    Resolve attendance record inside current company or return an API response.
    """

    company = getattr(request, "company", None)
    if not company:
        return None, Response(
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
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Attendance record was not found.",
            },
            status=404,
        )

    return record, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_attendance_check_in(request: Request) -> Response:
    """
    POST /api/company/hr/attendance/check-in/

    Create open attendance record for an employee.
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
        employee, data = build_check_in_data_from_request(
            company=company,
            payload=request.data,
        )

        record = check_in_employee(
            company=company,
            employee=employee,
            created_by=request.user,
            **data,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Employee checked in successfully.",
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
                "message": "Check-in data is invalid.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_attendance_check_in.required_company_permissions = [
    "company.hr.attendance.check_in",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_attendance_check_out(request: Request, attendance_id: int) -> Response:
    """
    POST /api/company/hr/attendance/<attendance_id>/check-out/

    Close an open attendance record.
    """

    record, error_response = _get_company_attendance_or_response(
        request=request,
        attendance_id=attendance_id,
    )
    if error_response:
        return error_response

    try:
        data = build_check_out_data_from_request(request.data)

        updated = check_out_attendance_record(
            attendance_record=record,
            updated_by=request.user,
            **data,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Employee checked out successfully.",
                "attendance": serialize_attendance_record(updated),
                "record": serialize_attendance_record(updated),
                "data": serialize_attendance_record(updated),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Check-out data is invalid.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_attendance_check_out.required_company_permissions = [
    "company.hr.attendance.check_out",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_attendance_missing_check_out(request: Request, attendance_id: int) -> Response:
    """
    POST /api/company/hr/attendance/<attendance_id>/missing-check-out/

    Mark attendance record as missing check-out.
    """

    record, error_response = _get_company_attendance_or_response(
        request=request,
        attendance_id=attendance_id,
    )
    if error_response:
        return error_response

    try:
        updated = mark_attendance_missing_check_out(
            attendance_record=record,
            updated_by=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Attendance record marked as missing check-out.",
                "attendance": serialize_attendance_record(updated),
                "record": serialize_attendance_record(updated),
                "data": serialize_attendance_record(updated),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Attendance record could not be marked as missing check-out.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_attendance_missing_check_out.required_company_permissions = [
    "company.hr.attendance.update",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_attendance_cancel(request: Request, attendance_id: int) -> Response:
    """
    POST /api/company/hr/attendance/<attendance_id>/cancel/

    Cancel attendance record.
    """

    record, error_response = _get_company_attendance_or_response(
        request=request,
        attendance_id=attendance_id,
    )
    if error_response:
        return error_response

    try:
        updated = cancel_attendance_record(
            attendance_record=record,
            updated_by=request.user,
            note=request.data.get("note") or request.data.get("notes") or "",
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Attendance record cancelled successfully.",
                "attendance": serialize_attendance_record(updated),
                "record": serialize_attendance_record(updated),
                "data": serialize_attendance_record(updated),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Attendance record could not be cancelled.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_attendance_cancel.required_company_permissions = [
    "company.hr.attendance.cancel",
]