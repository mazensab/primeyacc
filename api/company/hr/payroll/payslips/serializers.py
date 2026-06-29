# ============================================================
# ?? api/company/hr/payroll/payslips/serializers.py
# ?? Mhamcloud | Payroll Payslips API Serializers
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError

from hr.models import Payslip, PayslipItem, PayslipStatus


def serialize_payslip_employee(employee) -> dict | None:
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


def serialize_payslip_period(period) -> dict | None:
    if not period:
        return None

    return {
        "id": period.id,
        "name": period.name,
        "year": period.year,
        "month": period.month,
        "start_date": period.start_date.isoformat() if period.start_date else None,
        "end_date": period.end_date.isoformat() if period.end_date else None,
        "payment_date": period.payment_date.isoformat() if period.payment_date else None,
        "status": period.status,
    }


def serialize_payslip_run(payroll_run) -> dict | None:
    if not payroll_run:
        return None

    return {
        "id": payroll_run.id,
        "run_number": payroll_run.run_number,
        "name": payroll_run.name,
        "status": payroll_run.status,
        "total_employees": payroll_run.total_employees,
        "total_earnings": str(payroll_run.total_earnings),
        "total_deductions": str(payroll_run.total_deductions),
        "net_pay": str(payroll_run.net_pay),
    }


def serialize_payslip_item(item: PayslipItem) -> dict:
    return {
        "id": item.id,
        "company_id": item.company_id,
        "payslip_id": item.payslip_id,
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


def serialize_payslip(payslip: Payslip, *, include_items: bool = False) -> dict:
    data = {
        "id": payslip.id,
        "company_id": payslip.company_id,
        "payroll_run": serialize_payslip_run(payslip.payroll_run),
        "payroll_run_id": payslip.payroll_run_id,
        "period": serialize_payslip_period(payslip.period),
        "period_id": payslip.period_id,
        "employee": serialize_payslip_employee(payslip.employee),
        "employee_id": payslip.employee_id,
        "salary_profile_id": payslip.salary_profile_id,
        "payslip_number": payslip.payslip_number,
        "status": payslip.status,
        "status_label": payslip.get_status_display(),
        "basic_salary": str(payslip.basic_salary),
        "total_earnings": str(payslip.total_earnings),
        "total_deductions": str(payslip.total_deductions),
        "net_pay": str(payslip.net_pay),
        "currency": payslip.currency,
        "calculated_at": payslip.calculated_at.isoformat() if payslip.calculated_at else None,
        "approved_at": payslip.approved_at.isoformat() if payslip.approved_at else None,
        "paid_at": payslip.paid_at.isoformat() if payslip.paid_at else None,
        "cancelled_at": payslip.cancelled_at.isoformat() if payslip.cancelled_at else None,
        "notes": payslip.notes,
        "extra_data": payslip.extra_data,
        "created_at": payslip.created_at.isoformat() if payslip.created_at else None,
        "updated_at": payslip.updated_at.isoformat() if payslip.updated_at else None,
    }

    if include_items:
        data["items"] = [
            serialize_payslip_item(item)
            for item in payslip.items.all().order_by("id")
        ]

    return data


def serialize_payslip_choices() -> dict:
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in PayslipStatus.choices
        ],
    }


def parse_decimal(value, field_name: str):
    if value in [None, ""]:
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValidationError({field_name: f"{field_name} must be a valid decimal."})


def build_payslip_update_data_from_request(request) -> dict:
    source = request.data
    data = {}

    decimal_fields = [
        "basic_salary",
        "total_earnings",
        "total_deductions",
        "net_pay",
    ]

    for field in decimal_fields:
        if field in source:
            parsed = parse_decimal(source.get(field), field)
            if parsed is not None:
                data[field] = parsed

    text_fields = [
        "currency",
        "status",
        "notes",
    ]

    for field in text_fields:
        if field in source:
            data[field] = str(source.get(field, "")).strip()

    if "extra_data" in source:
        extra_data = source.get("extra_data")
        data["extra_data"] = extra_data if isinstance(extra_data, dict) else {}

    return data
