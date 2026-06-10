# ============================================================
# ?? api/company/hr/payroll/periods/actions.py
# ?? PrimeyAcc | Payroll Period Actions API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollPeriod
from hr.services import (
    close_payroll_period,
    open_payroll_period,
)

from .serializers import serialize_payroll_period


def _get_company_period(request, period_id: int):
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

    period = PayrollPeriod.objects.filter(
        company=company,
        id=period_id,
    ).first()

    if not period:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Payroll period not found.",
            },
            status=404,
        )

    return period, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_period_open(request, period_id: int):
    period, error_response = _get_company_period(request, period_id)
    if error_response:
        return error_response

    try:
        period = open_payroll_period(
            period=period,
            updated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not open payroll period.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll period opened successfully.",
            "period": serialize_payroll_period(period),
        }
    )


payroll_period_open.required_company_permissions = [
    "company.hr.payroll.periods.open",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_period_close(request, period_id: int):
    period, error_response = _get_company_period(request, period_id)
    if error_response:
        return error_response

    try:
        period = close_payroll_period(
            period=period,
            updated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not close payroll period.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll period closed successfully.",
            "period": serialize_payroll_period(period),
        }
    )


payroll_period_close.required_company_permissions = [
    "company.hr.payroll.periods.close",
]
