# ============================================================
# ?? api/company/hr/payroll/payslip_items/serializers.py
# ?? PrimeyAcc | Payroll Payslip Items API Serializers
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError

from hr.models import PayslipItem, SalaryComponent, SalaryComponentType


def serialize_payslip_item_payslip(payslip) -> dict | None:
    if not payslip:
        return None

    return {
        "id": payslip.id,
        "payslip_number": payslip.payslip_number,
        "status": payslip.status,
        "employee_id": payslip.employee_id,
        "payroll_run_id": payslip.payroll_run_id,
        "period_id": payslip.period_id,
    }


def serialize_payslip_item_employee(employee) -> dict | None:
    if not employee:
        return None

    return {
        "id": employee.id,
        "employee_number": employee.employee_number,
        "name": employee.name,
        "display_name": employee.display_name,
        "job_title": employee.job_title,
        "department_name": employee.department_name,
    }


def serialize_payslip_item_component(component) -> dict | None:
    if not component:
        return None

    return {
        "id": component.id,
        "name": component.name,
        "code": component.code,
        "component_type": component.component_type,
        "calculation_type": component.calculation_type,
        "is_active": component.is_active,
    }


def serialize_payslip_item(item: PayslipItem) -> dict:
    payslip = item.payslip

    return {
        "id": item.id,
        "company_id": item.company_id,
        "payslip": serialize_payslip_item_payslip(payslip),
        "payslip_id": item.payslip_id,
        "employee": serialize_payslip_item_employee(getattr(payslip, "employee", None)),
        "employee_id": getattr(payslip, "employee_id", None),
        "component": serialize_payslip_item_component(item.component),
        "component_id": item.component_id,
        "name": item.name,
        "code": item.code,
        "component_type": item.component_type,
        "component_type_label": item.get_component_type_display(),
        "amount": str(item.amount),
        "notes": item.notes,
        "extra_data": item.extra_data,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_payslip_item_choices() -> dict:
    return {
        "component_types": [
            {"value": value, "label": label}
            for value, label in SalaryComponentType.choices
        ],
    }


def parse_decimal(value, field_name: str):
    if value in [None, ""]:
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError({field_name: f"{field_name} must be a valid decimal."})


def resolve_company_salary_component(company, component_id):
    if component_id in [None, ""]:
        return None

    component = SalaryComponent.objects.filter(
        company=company,
        id=component_id,
    ).first()

    if not component:
        raise ValidationError({"component_id": "Salary component not found."})

    return component


def build_payslip_item_update_data_from_request(request, company) -> dict:
    source = request.data
    data = {}

    if "component_id" in source:
        data["component"] = resolve_company_salary_component(
            company,
            source.get("component_id"),
        )

    text_fields = [
        "name",
        "code",
        "component_type",
        "notes",
    ]

    for field in text_fields:
        if field in source:
            data[field] = str(source.get(field, "")).strip()

    if "amount" in source:
        parsed = parse_decimal(source.get("amount"), "amount")
        if parsed is not None:
            data["amount"] = parsed

    if "extra_data" in source:
        extra_data = source.get("extra_data")
        data["extra_data"] = extra_data if isinstance(extra_data, dict) else {}

    return data
