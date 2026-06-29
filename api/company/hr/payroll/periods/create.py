# ============================================================
# ?? api/company/hr/payroll/periods/create.py
# ?? Mhamcloud | Payroll Period Create API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_payroll_period

from .serializers import (
    build_payroll_period_data_from_request,
    serialize_payroll_period,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_period_create(request):
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

    try:
        data = build_payroll_period_data_from_request(request)
        period = create_payroll_period(
            company=company,
            created_by=request.user,
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
            "message": "Payroll period created successfully.",
            "period": serialize_payroll_period(period),
        },
        status=201,
    )


payroll_period_create.required_company_permissions = [
    "company.hr.payroll.periods.create",
]
