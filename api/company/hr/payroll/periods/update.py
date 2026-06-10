# ============================================================
# ?? api/company/hr/payroll/periods/update.py
# ?? PrimeyAcc | Payroll Period Update API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollPeriod
from hr.services import update_payroll_period

from .serializers import (
    build_payroll_period_data_from_request,
    serialize_payroll_period,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payroll_period_update(request, period_id: int):
    company = getattr(request, "company", None)

    if not company:
        return Response(
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
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payroll period not found.",
            },
            status=404,
        )

    try:
        data = build_payroll_period_data_from_request(request, partial=True)
        period = update_payroll_period(
            period=period,
            updated_by=request.user,
            data=data,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Invalid payroll period data.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payroll period already exists for this company/month.",
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll period updated successfully.",
            "period": serialize_payroll_period(period),
        }
    )


payroll_period_update.required_company_permissions = [
    "company.hr.payroll.periods.update",
]
