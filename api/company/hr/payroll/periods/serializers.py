# ============================================================
# ?? api/company/hr/payroll/periods/serializers.py
# ?? Mhamcloud | Payroll Periods API Serializers
# ============================================================

from __future__ import annotations

from datetime import datetime

from django.core.exceptions import ValidationError

from hr.models import PayrollPeriod, PayrollPeriodStatus


def serialize_payroll_period(period: PayrollPeriod) -> dict:
    return {
        "id": period.id,
        "company_id": period.company_id,
        "name": period.name,
        "year": period.year,
        "month": period.month,
        "start_date": period.start_date.isoformat() if period.start_date else None,
        "end_date": period.end_date.isoformat() if period.end_date else None,
        "payment_date": period.payment_date.isoformat() if period.payment_date else None,
        "status": period.status,
        "status_label": period.get_status_display(),
        "notes": period.notes,
        "extra_data": period.extra_data,
        "created_at": period.created_at.isoformat() if period.created_at else None,
        "updated_at": period.updated_at.isoformat() if period.updated_at else None,
    }


def serialize_payroll_period_choices() -> dict:
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in PayrollPeriodStatus.choices
        ],
        "months": [
            {"value": month, "label": str(month).zfill(2)}
            for month in range(1, 13)
        ],
    }


def parse_int(value, field_name: str, *, required: bool = False):
    if value in [None, ""]:
        if required:
            raise ValidationError({field_name: f"{field_name} is required."})
        return None

    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: f"{field_name} must be a valid integer."})


def parse_date(value, field_name: str, *, required: bool = False):
    if value in [None, ""]:
        if required:
            raise ValidationError({field_name: f"{field_name} is required."})
        return None

    if hasattr(value, "isoformat") and not isinstance(value, str):
        return value

    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError:
        raise ValidationError({field_name: f"{field_name} must be YYYY-MM-DD."})


def validate_payroll_period_required_fields(data: dict) -> None:
    errors = {}

    for field in ["year", "month", "start_date", "end_date"]:
        if data.get(field) in [None, ""]:
            errors[field] = f"{field} is required."

    if errors:
        raise ValidationError(errors)


def build_payroll_period_data_from_request(request, *, partial: bool = False) -> dict:
    source = request.data
    data = {}

    if "name" in source:
        data["name"] = str(source.get("name", "")).strip()

    if "year" in source:
        data["year"] = parse_int(source.get("year"), "year", required=not partial)

    if "month" in source:
        data["month"] = parse_int(source.get("month"), "month", required=not partial)

    if "start_date" in source:
        data["start_date"] = parse_date(
            source.get("start_date"),
            "start_date",
            required=not partial,
        )

    if "end_date" in source:
        data["end_date"] = parse_date(
            source.get("end_date"),
            "end_date",
            required=not partial,
        )

    if "payment_date" in source:
        data["payment_date"] = parse_date(
            source.get("payment_date"),
            "payment_date",
            required=False,
        )

    if "status" in source:
        data["status"] = str(source.get("status", "")).strip()

    if "notes" in source:
        data["notes"] = str(source.get("notes", "")).strip()

    if "extra_data" in source:
        extra_data = source.get("extra_data")
        data["extra_data"] = extra_data if isinstance(extra_data, dict) else {}

    if not partial:
        validate_payroll_period_required_fields(data)

    return data
