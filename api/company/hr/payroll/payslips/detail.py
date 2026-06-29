# ============================================================
# ?? api/company/hr/payroll/payslips/detail.py
# ?? Mhamcloud | Payroll Payslip Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Payslip

from .serializers import serialize_payslip


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payslip_detail(request, payslip_id: int):
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

    payslip = Payslip.objects.select_related(
        "payroll_run",
        "period",
        "employee",
        "salary_profile",
    ).prefetch_related(
        "items",
    ).filter(
        company=company,
        id=payslip_id,
    ).first()

    if not payslip:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payslip not found.",
            },
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip loaded successfully.",
            "payslip": serialize_payslip(payslip, include_items=True),
        }
    )


payslip_detail.required_company_permissions = [
    "company.hr.payroll.payslips.view",
]
