# ============================================================
# ?? api/company/hr/payroll/profiles/serializers.py
# ?? PrimeyAcc | Payroll Salary Profiles API Serializers
# ============================================================

from __future__ import annotations

from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError

from hr.models import Employee, EmployeeSalaryProfile


def serialize_salary_profile_employee(employee: Employee | None) -> dict | None:
    if not employee:
        return None

    return {
        "id": employee.id,
        "employee_number": employee.employee_number,
        "name": employee.name,
        "display_name": employee.display_name,
        "job_title": employee.job_title,
        "department_name": employee.department_name,
        "status": employee.status,
        "is_active": employee.is_active,
    }


def serialize_employee_salary_profile(profile: EmployeeSalaryProfile) -> dict:
    return {
        "id": profile.id,
        "company_id": profile.company_id,
        "employee": serialize_salary_profile_employee(profile.employee),
        "employee_id": profile.employee_id,
        "basic_salary": str(profile.basic_salary),
        "housing_allowance": str(profile.housing_allowance),
        "transport_allowance": str(profile.transport_allowance),
        "other_allowance": str(profile.other_allowance),
        "gross_salary": str(profile.gross_salary),
        "currency": profile.currency,
        "bank_name": profile.bank_name,
        "bank_account_number": profile.bank_account_number,
        "iban": profile.iban,
        "effective_from": profile.effective_from.isoformat() if profile.effective_from else None,
        "effective_to": profile.effective_to.isoformat() if profile.effective_to else None,
        "is_active": profile.is_active,
        "notes": profile.notes,
        "extra_data": profile.extra_data,
        "created_at": profile.created_at.isoformat() if profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else None,
    }


def parse_bool(value, default=False) -> bool:
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    value = str(value).strip().lower()

    if value in ["1", "true", "yes", "y", "on"]:
        return True

    if value in ["0", "false", "no", "n", "off"]:
        return False

    return default


def parse_decimal(value, field_name: str, default="0") -> Decimal:
    if value in [None, ""]:
        value = default

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError({field_name: f"{field_name} must be a valid decimal."})


def parse_date(value, field_name: str):
    if value in [None, ""]:
        return None

    if hasattr(value, "isoformat") and not isinstance(value, str):
        return value

    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError({field_name: f"{field_name} must be YYYY-MM-DD."})


def resolve_company_employee(company, employee_id) -> Employee:
    if not employee_id:
        raise ValidationError({"employee_id": "Employee is required."})

    employee = Employee.objects.filter(
        company=company,
        id=employee_id,
    ).first()

    if not employee:
        raise ValidationError({"employee_id": "Employee not found."})

    return employee


def build_salary_profile_data_from_request(request, *, partial: bool = False) -> dict:
    source = request.data
    data = {}

    decimal_fields = [
        "basic_salary",
        "housing_allowance",
        "transport_allowance",
        "other_allowance",
    ]

    for field in decimal_fields:
        if field in source:
            data[field] = parse_decimal(source.get(field), field)

    text_fields = [
        "currency",
        "bank_name",
        "bank_account_number",
        "iban",
        "notes",
    ]

    for field in text_fields:
        if field in source:
            data[field] = str(source.get(field, "")).strip()

    if "effective_from" in source:
        data["effective_from"] = parse_date(source.get("effective_from"), "effective_from")

    if "effective_to" in source:
        data["effective_to"] = parse_date(source.get("effective_to"), "effective_to")

    if "is_active" in source:
        data["is_active"] = parse_bool(source.get("is_active"), default=True)

    if "extra_data" in source:
        extra_data = source.get("extra_data")
        data["extra_data"] = extra_data if isinstance(extra_data, dict) else {}

    if not partial and "basic_salary" not in data:
        raise ValidationError({"basic_salary": "Basic salary is required."})

    return data
