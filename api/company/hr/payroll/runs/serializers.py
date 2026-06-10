# ============================================================
# ?? api/company/hr/payroll/runs/serializers.py
# ?? PrimeyAcc | Payroll Runs API Serializers
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError

from hr.models import PayrollPeriod, PayrollRun, PayrollRunStatus


def serialize_payroll_run_period(period: PayrollPeriod | None) -> dict | None:
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


def serialize_payroll_run(payroll_run: PayrollRun) -> dict:
    return {
        "id": payroll_run.id,
        "company_id": payroll_run.company_id,
        "period": serialize_payroll_run_period(payroll_run.period),
        "period_id": payroll_run.period_id,
        "run_number": payroll_run.run_number,
        "name": payroll_run.name,
        "status": payroll_run.status,
        "status_label": payroll_run.get_status_display(),
        "total_employees": payroll_run.total_employees,
        "total_earnings": str(payroll_run.total_earnings),
        "total_deductions": str(payroll_run.total_deductions),
        "net_pay": str(payroll_run.net_pay),
        "calculated_at": payroll_run.calculated_at.isoformat() if payroll_run.calculated_at else None,
        "approved_at": payroll_run.approved_at.isoformat() if payroll_run.approved_at else None,
        "posted_at": payroll_run.posted_at.isoformat() if payroll_run.posted_at else None,
        "cancelled_at": payroll_run.cancelled_at.isoformat() if payroll_run.cancelled_at else None,
        "notes": payroll_run.notes,
        "extra_data": payroll_run.extra_data,
        "created_at": payroll_run.created_at.isoformat() if payroll_run.created_at else None,
        "updated_at": payroll_run.updated_at.isoformat() if payroll_run.updated_at else None,
    }


def serialize_payroll_run_choices() -> dict:
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in PayrollRunStatus.choices
        ],
    }


def resolve_company_payroll_period(company, period_id) -> PayrollPeriod:
    if not period_id:
        raise ValidationError({"period_id": "Payroll period is required."})

    period = PayrollPeriod.objects.filter(
        company=company,
        id=period_id,
    ).first()

    if not period:
        raise ValidationError({"period_id": "Payroll period not found."})

    return period


def build_payroll_run_data_from_request(request, *, partial: bool = False) -> dict:
    source = request.data
    data = {}

    text_fields = [
        "run_number",
        "name",
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
