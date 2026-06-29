# ============================================================
# 📂 api/company/hr/attendance/serializers.py
# 🧠 Mhamcloud | Company HR Attendance Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize attendance records
# ✅ Resolve employee inside current company only
# ✅ Resolve branch inside current company only
# ✅ Build service-safe attendance payloads
# ✅ Ignore frontend company_id
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من request.company
# - employee_id يجب أن يكون داخل الشركة الحالية
# - branch_id إن وجد يجب أن يكون داخل الشركة الحالية
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_datetime

from companies.models import Branch
from hr.models import (
    AttendanceRecord,
    AttendanceSource,
    AttendanceStatus,
    Employee,
)


def serialize_attendance_employee(employee: Employee | None) -> dict | None:
    """
    Compact employee representation for attendance APIs.
    """

    if not employee:
        return None

    return {
        "id": employee.id,
        "employee_number": employee.employee_number,
        "name": employee.name,
        "first_name": employee.first_name,
        "middle_name": employee.middle_name,
        "last_name": employee.last_name,
        "display_name": employee.display_name,
        "job_title": employee.job_title,
        "department_name": employee.department_name,
        "status": employee.status,
        "is_active": employee.is_active,
    }


def serialize_attendance_branch(branch: Branch | None) -> dict | None:
    """
    Compact branch representation for attendance APIs.
    """

    if not branch:
        return None

    return {
        "id": branch.id,
        "name": branch.display_name,
        "branch_code": branch.branch_code,
        "is_active": branch.is_active,
    }


def serialize_attendance_record(record: AttendanceRecord) -> dict:
    """
    API representation for AttendanceRecord.
    """

    return {
        "id": record.id,
        "company": {
            "id": record.company_id,
            "name": record.company.display_name if record.company_id else "",
        },
        "branch": serialize_attendance_branch(record.branch),
        "employee": serialize_attendance_employee(record.employee),
        "work_date": record.work_date.isoformat() if record.work_date else None,
        "check_in_at": record.check_in_at.isoformat() if record.check_in_at else None,
        "check_out_at": record.check_out_at.isoformat() if record.check_out_at else None,
        "status": record.status,
        "status_label": record.get_status_display(),
        "source": record.source,
        "source_label": record.get_source_display(),
        "total_minutes": record.total_minutes,
        "total_hours": record.total_hours,
        "check_in_note": record.check_in_note,
        "check_out_note": record.check_out_note,
        "notes": record.notes,
        "extra_data": record.extra_data or {},
        "created_at": record.created_at.isoformat() if record.created_at else None,
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


def serialize_attendance_choices() -> dict:
    """
    Choices payload for frontend forms and filters.
    """

    return {
        "statuses": [
            {
                "value": value,
                "label": label,
            }
            for value, label in AttendanceStatus.choices
        ],
        "sources": [
            {
                "value": value,
                "label": label,
            }
            for value, label in AttendanceSource.choices
        ],
    }


def resolve_company_employee(*, company, employee_id) -> Employee:
    """
    Resolve employee by ID inside current company only.
    """

    if not employee_id:
        raise ValidationError(
            {"employee_id": "Employee is required."}
        )

    try:
        return Employee.objects.get(
            id=employee_id,
            company=company,
        )
    except Employee.DoesNotExist:
        raise ValidationError(
            {"employee_id": "Employee was not found in the current company."}
        )


def resolve_company_branch(*, company, branch_id) -> Branch | None:
    """
    Resolve branch by ID inside current company only.
    """

    if branch_id in [None, "", 0, "0"]:
        return None

    try:
        return Branch.objects.get(
            id=branch_id,
            company=company,
        )
    except Branch.DoesNotExist:
        raise ValidationError(
            {"branch_id": "Branch was not found in the current company."}
        )


def parse_request_datetime(value, field_name: str):
    """
    Parse ISO datetime string from API payload.
    """

    if value in [None, ""]:
        return None

    if hasattr(value, "isoformat"):
        return value

    parsed = parse_datetime(str(value))
    if not parsed:
        raise ValidationError(
            {field_name: "Invalid datetime format. Use ISO 8601 datetime."}
        )

    return parsed


def build_attendance_data_from_request(*, company, payload: dict) -> tuple[Employee, dict]:
    """
    Build service-safe attendance data from request payload.

    Returns:
    - employee resolved inside current company
    - data dictionary safe for hr.services.create_attendance_record
    """

    employee = resolve_company_employee(
        company=company,
        employee_id=payload.get("employee_id"),
    )

    branch = resolve_company_branch(
        company=company,
        branch_id=payload.get("branch_id"),
    )

    data = {}

    if branch is not None:
        data["branch"] = branch

    if "work_date" in payload:
        data["work_date"] = payload.get("work_date") or None

    if "check_in_at" in payload:
        data["check_in_at"] = parse_request_datetime(
            payload.get("check_in_at"),
            "check_in_at",
        )

    if "check_out_at" in payload:
        data["check_out_at"] = parse_request_datetime(
            payload.get("check_out_at"),
            "check_out_at",
        )

    for field_name in [
        "status",
        "source",
        "check_in_note",
        "check_out_note",
        "notes",
        "extra_data",
    ]:
        if field_name in payload:
            data[field_name] = payload.get(field_name)

    return employee, data


def build_check_in_data_from_request(*, company, payload: dict) -> tuple[Employee, dict]:
    """
    Build service-safe check-in payload.
    """

    employee = resolve_company_employee(
        company=company,
        employee_id=payload.get("employee_id"),
    )

    branch = resolve_company_branch(
        company=company,
        branch_id=payload.get("branch_id"),
    )

    data = {
        "branch": branch,
        "check_in_at": parse_request_datetime(
            payload.get("check_in_at"),
            "check_in_at",
        ),
        "source": payload.get("source") or AttendanceSource.MANUAL,
        "note": payload.get("note") or payload.get("check_in_note") or "",
        "data": {},
    }

    if data["check_in_at"] is None:
        data.pop("check_in_at")

    if branch is None:
        data.pop("branch")

    return employee, data


def build_check_out_data_from_request(payload: dict) -> dict:
    """
    Build service-safe check-out payload.
    """

    data = {
        "check_out_at": parse_request_datetime(
            payload.get("check_out_at"),
            "check_out_at",
        ),
        "note": payload.get("note") or payload.get("check_out_note") or "",
    }

    if data["check_out_at"] is None:
        data.pop("check_out_at")

    return data