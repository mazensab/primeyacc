# ============================================================
# ?? api/company/hr/payroll/periods/detail.py
# ?? PrimeyAcc | Payroll Period Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollPeriod

from .serializers import serialize_payroll_period


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payroll_period_detail(request, period_id: int):
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

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll period loaded successfully.",
            "period": serialize_payroll_period(period),
        }
    )


payroll_period_detail.required_company_permissions = [
    "company.hr.payroll.periods.view",
]
