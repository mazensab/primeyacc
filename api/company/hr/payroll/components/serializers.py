# ============================================================
# ?? api/company/hr/payroll/components/serializers.py
# ?? Mhamcloud | Payroll Salary Components API Serializers
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError

from hr.models import (
    SalaryComponent,
    SalaryComponentCalculationType,
    SalaryComponentType,
)


def serialize_salary_component(component: SalaryComponent) -> dict:
    return {
        "id": component.id,
        "company_id": component.company_id,
        "name": component.name,
        "code": component.code,
        "component_type": component.component_type,
        "component_type_label": component.get_component_type_display(),
        "calculation_type": component.calculation_type,
        "calculation_type_label": component.get_calculation_type_display(),
        "amount": str(component.amount),
        "percentage": str(component.percentage),
        "is_taxable": component.is_taxable,
        "is_active": component.is_active,
        "sort_order": component.sort_order,
        "notes": component.notes,
        "extra_data": component.extra_data,
        "created_at": component.created_at.isoformat() if component.created_at else None,
        "updated_at": component.updated_at.isoformat() if component.updated_at else None,
    }


def serialize_salary_component_choices() -> dict:
    return {
        "component_types": [
            {"value": value, "label": label}
            for value, label in SalaryComponentType.choices
        ],
        "calculation_types": [
            {"value": value, "label": label}
            for value, label in SalaryComponentCalculationType.choices
        ],
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


def parse_int(value, field_name: str, default=0) -> int:
    if value in [None, ""]:
        return default

    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: f"{field_name} must be a valid integer."})


def validate_salary_component_required_fields(data: dict) -> None:
    errors = {}

    if not str(data.get("name", "")).strip():
        errors["name"] = "Name is required."

    if not str(data.get("code", "")).strip():
        errors["code"] = "Code is required."

    if errors:
        raise ValidationError(errors)


def build_salary_component_data_from_request(request, *, partial: bool = False) -> dict:
    source = request.data
    data = {}

    text_fields = [
        "name",
        "code",
        "component_type",
        "calculation_type",
        "notes",
    ]

    for field in text_fields:
        if field in source:
            data[field] = str(source.get(field, "")).strip()

    if "amount" in source:
        data["amount"] = parse_decimal(source.get("amount"), "amount")

    if "percentage" in source:
        data["percentage"] = parse_decimal(source.get("percentage"), "percentage")

    if "is_taxable" in source:
        data["is_taxable"] = parse_bool(source.get("is_taxable"), default=True)

    if "is_active" in source:
        data["is_active"] = parse_bool(source.get("is_active"), default=True)

    if "sort_order" in source:
        data["sort_order"] = parse_int(source.get("sort_order"), "sort_order")

    if "extra_data" in source:
        extra_data = source.get("extra_data")
        data["extra_data"] = extra_data if isinstance(extra_data, dict) else {}

    if not partial:
        validate_salary_component_required_fields(data)

    return data
