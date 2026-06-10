# ============================================================
# ?? api/company/hr/payroll/runs/detail.py
# ?? PrimeyAcc | Payroll Run Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollRun

from .serializers import serialize_payroll_run


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payroll_run_detail(request, run_id: int):
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

    payroll_run = PayrollRun.objects.select_related(
        "period",
    ).filter(
        company=company,
        id=run_id,
    ).first()

    if not payroll_run:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payroll run not found.",
            },
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll run loaded successfully.",
            "payroll_run": serialize_payroll_run(payroll_run),
        }
    )


payroll_run_detail.required_company_permissions = [
    "company.hr.payroll.runs.view",
]
