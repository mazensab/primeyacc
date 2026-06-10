# ============================================================
# 📂 api/company/hr/leave_balances/serializers.py
# 🧠 PrimeyAcc | Company HR Leave Balances Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize leave balances
# ✅ Resolve employee inside current company only
# ✅ Resolve leave type inside current company only
# ✅ Build service-safe payloads
# ✅ Ignore frontend company_id
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError

from hr.models import Employee, LeaveBalance, LeaveType


def serialize_leave_balance_employee(employee: Employee | None) -> dict | None:
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


def serialize_leave_balance_type(leave_type: LeaveType | None) -> dict | None:
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
        "is_active": leave_type.is_active,
    }


def serialize_leave_balance(balance: LeaveBalance) -> dict:
    return {
        "id": balance.id,
        "company": {
            "id": balance.company_id,
            "name": balance.company.display_name if balance.company_id else "",
        },
        "employee": serialize_leave_balance_employee(balance.employee),
        "leave_type": serialize_leave_balance_type(balance.leave_type),
        "year": balance.year,
        "opening_balance": str(balance.opening_balance),
        "accrued": str(balance.accrued),
        "used": str(balance.used),
        "adjusted": str(balance.adjusted),
        "available_balance": str(balance.available_balance),
        "notes": balance.notes,
        "created_at": balance.created_at.isoformat() if balance.created_at else None,
        "updated_at": balance.updated_at.isoformat() if balance.updated_at else None,
    }


def resolve_company_employee(*, company, employee_id) -> Employee:
    if not employee_id:
        raise ValidationError(
            {"employee_id": "Employee is required."}
        )

    try:
        return Employee.objects.get(id=employee_id, company=company)
    except Employee.DoesNotExist:
        raise ValidationError(
            {"employee_id": "Employee was not found in the current company."}
        )


def resolve_company_leave_type(*, company, leave_type_id) -> LeaveType:
    if not leave_type_id:
        raise ValidationError(
            {"leave_type_id": "Leave type is required."}
        )

    try:
        return LeaveType.objects.get(id=leave_type_id, company=company)
    except LeaveType.DoesNotExist:
        raise ValidationError(
            {"leave_type_id": "Leave type was not found in the current company."}
        )


def build_leave_balance_data_from_request(*, company, payload: dict):
    data = dict(payload or {})

    employee = resolve_company_employee(
        company=company,
        employee_id=data.get("employee_id"),
    )
    leave_type = resolve_company_leave_type(
        company=company,
        leave_type_id=data.get("leave_type_id"),
    )

    year = data.get("year")
    if not year:
        raise ValidationError(
            {"year": "Year is required."}
        )

    try:
        year = int(year)
    except (TypeError, ValueError):
        raise ValidationError(
            {"year": "Year must be a valid integer."}
        )

    for blocked_field in [
        "company",
        "company_id",
        "employee",
        "employee_id",
        "leave_type",
        "leave_type_id",
        "year",
        "created_by",
        "updated_by",
    ]:
        data.pop(blocked_field, None)

    allowed_fields = [
        "opening_balance",
        "accrued",
        "used",
        "adjusted",
        "notes",
    ]

    safe_data = {
        field_name: data.get(field_name)
        for field_name in allowed_fields
        if field_name in data
    }

    return employee, leave_type, year, safe_data