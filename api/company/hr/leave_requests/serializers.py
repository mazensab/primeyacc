# ============================================================
# 📂 api/company/hr/leave_requests/serializers.py
# 🧠 PrimeyAcc | Company HR Leave Requests Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize leave requests
# ✅ Resolve employee inside current company only
# ✅ Resolve leave type inside current company only
# ✅ Build service-safe payloads
# ✅ Ignore frontend company_id
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date

from hr.models import (
    Employee,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
)


def serialize_leave_request_employee(employee: Employee | None) -> dict | None:
    """
    Compact employee representation for leave request APIs.
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


def serialize_leave_request_type(leave_type: LeaveType | None) -> dict | None:
    """
    Compact leave type representation for leave request APIs.
    """

    if not leave_type:
        return None

    return {
        "id": leave_type.id,
        "name": leave_type.name,
        "code": leave_type.code,
        "unit": leave_type.unit,
        "unit_label": leave_type.get_unit_display(),
        "annual_allowance": str(leave_type.annual_allowance),
        "is_paid": leave_type.is_paid,
        "requires_approval": leave_type.requires_approval,
        "allow_half_day": leave_type.allow_half_day,
        "allow_negative_balance": leave_type.allow_negative_balance,
        "is_active": leave_type.is_active,
    }


def serialize_leave_request(leave_request: LeaveRequest) -> dict:
    """
    API representation for LeaveRequest.
    """

    return {
        "id": leave_request.id,
        "company": {
            "id": leave_request.company_id,
            "name": leave_request.company.display_name if leave_request.company_id else "",
        },
        "employee": serialize_leave_request_employee(leave_request.employee),
        "leave_type": serialize_leave_request_type(leave_request.leave_type),
        "start_date": leave_request.start_date.isoformat() if leave_request.start_date else None,
        "end_date": leave_request.end_date.isoformat() if leave_request.end_date else None,
        "requested_units": str(leave_request.requested_units),
        "status": leave_request.status,
        "status_label": leave_request.get_status_display(),
        "reason": leave_request.reason,
        "employee_note": leave_request.employee_note,
        "manager_note": leave_request.manager_note,
        "submitted_at": leave_request.submitted_at.isoformat() if leave_request.submitted_at else None,
        "approved_at": leave_request.approved_at.isoformat() if leave_request.approved_at else None,
        "rejected_at": leave_request.rejected_at.isoformat() if leave_request.rejected_at else None,
        "cancelled_at": leave_request.cancelled_at.isoformat() if leave_request.cancelled_at else None,
        "approved_by": {
            "id": leave_request.approved_by_id,
            "username": leave_request.approved_by.get_username(),
        }
        if leave_request.approved_by_id
        else None,
        "rejected_by": {
            "id": leave_request.rejected_by_id,
            "username": leave_request.rejected_by.get_username(),
        }
        if leave_request.rejected_by_id
        else None,
        "cancelled_by": {
            "id": leave_request.cancelled_by_id,
            "username": leave_request.cancelled_by.get_username(),
        }
        if leave_request.cancelled_by_id
        else None,
        "extra_data": leave_request.extra_data or {},
        "created_at": leave_request.created_at.isoformat() if leave_request.created_at else None,
        "updated_at": leave_request.updated_at.isoformat() if leave_request.updated_at else None,
    }


def serialize_leave_request_choices() -> dict:
    """
    Choices payload for frontend forms and filters.
    """

    return {
        "statuses": [
            {
                "value": value,
                "label": label,
            }
            for value, label in LeaveRequestStatus.choices
        ],
    }


def parse_request_date(value, field_name: str):
    """
    Parse ISO date string from API payload.
    """

    if value in [None, ""]:
        return None

    if hasattr(value, "isoformat"):
        return value

    parsed = parse_date(str(value))
    if not parsed:
        raise ValidationError(
            {field_name: "Invalid date format. Use YYYY-MM-DD."}
        )

    return parsed


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


def resolve_company_leave_type(*, company, leave_type_id) -> LeaveType:
    """
    Resolve leave type by ID inside current company only.
    """

    if not leave_type_id:
        raise ValidationError(
            {"leave_type_id": "Leave type is required."}
        )

    try:
        return LeaveType.objects.get(
            id=leave_type_id,
            company=company,
        )
    except LeaveType.DoesNotExist:
        raise ValidationError(
            {"leave_type_id": "Leave type was not found in the current company."}
        )


def build_leave_request_data_from_request(*, company, payload: dict) -> tuple[Employee, LeaveType, dict]:
    """
    Build service-safe leave request data from request payload.

    Returns:
    - employee resolved inside current company
    - leave_type resolved inside current company
    - data dictionary safe for hr.services.create_leave_request
    """

    employee = resolve_company_employee(
        company=company,
        employee_id=payload.get("employee_id"),
    )

    leave_type = resolve_company_leave_type(
        company=company,
        leave_type_id=payload.get("leave_type_id"),
    )

    data = dict(payload or {})

    for blocked_field in [
        "company",
        "company_id",
        "employee",
        "employee_id",
        "leave_type",
        "leave_type_id",
        "created_by",
        "updated_by",
        "approved_by",
        "rejected_by",
        "cancelled_by",
        "submitted_at",
        "approved_at",
        "rejected_at",
        "cancelled_at",
    ]:
        data.pop(blocked_field, None)

    if "start_date" in payload:
        data["start_date"] = parse_request_date(
            payload.get("start_date"),
            "start_date",
        )

    if "end_date" in payload:
        data["end_date"] = parse_request_date(
            payload.get("end_date"),
            "end_date",
        )

    allowed_fields = [
        "start_date",
        "end_date",
        "requested_units",
        "status",
        "reason",
        "employee_note",
        "manager_note",
        "extra_data",
    ]

    safe_data = {
        field_name: data.get(field_name)
        for field_name in allowed_fields
        if field_name in data
    }

    return employee, leave_type, safe_data


def build_leave_request_update_data_from_request(*, company, payload: dict) -> dict:
    """
    Build service-safe update data from request payload.
    """

    data = dict(payload or {})

    for blocked_field in [
        "company",
        "company_id",
        "created_by",
        "updated_by",
        "approved_by",
        "rejected_by",
        "cancelled_by",
        "submitted_at",
        "approved_at",
        "rejected_at",
        "cancelled_at",
    ]:
        data.pop(blocked_field, None)

    if "employee_id" in data:
        employee = resolve_company_employee(
            company=company,
            employee_id=data.pop("employee_id"),
        )
        data["employee"] = employee

    if "leave_type_id" in data:
        leave_type = resolve_company_leave_type(
            company=company,
            leave_type_id=data.pop("leave_type_id"),
        )
        data["leave_type"] = leave_type

    if "start_date" in payload:
        data["start_date"] = parse_request_date(
            payload.get("start_date"),
            "start_date",
        )

    if "end_date" in payload:
        data["end_date"] = parse_request_date(
            payload.get("end_date"),
            "end_date",
        )

    allowed_fields = [
        "employee",
        "leave_type",
        "start_date",
        "end_date",
        "requested_units",
        "status",
        "reason",
        "employee_note",
        "manager_note",
        "extra_data",
    ]

    return {
        field_name: data.get(field_name)
        for field_name in allowed_fields
        if field_name in data
    }


def validate_leave_request_required_fields(data: dict) -> None:
    """
    Validate minimal required API fields.
    """

    errors = {}

    if not data.get("start_date"):
        errors["start_date"] = "Start date is required."

    if not data.get("end_date"):
        errors["end_date"] = "End date is required."

    if not data.get("requested_units"):
        errors["requested_units"] = "Requested units is required."

    if errors:
        raise ValidationError(errors)