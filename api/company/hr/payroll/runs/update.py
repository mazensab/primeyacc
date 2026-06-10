# ============================================================
# ?? api/company/hr/payroll/runs/update.py
# ?? PrimeyAcc | Payroll Run Update API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollRun
from hr.services import update_payroll_run

from .serializers import (
    build_payroll_run_data_from_request,
    resolve_company_payroll_period,
    serialize_payroll_run,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payroll_run_update(request, run_id: int):
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

    payroll_run = PayrollRun.objects.filter(
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

    try:
        data = build_payroll_run_data_from_request(request, partial=True)

        if "period_id" in request.data:
            data["period"] = resolve_company_payroll_period(
                company,
                request.data.get("period_id"),
            )

        payroll_run = update_payroll_run(
            payroll_run=payroll_run,
            updated_by=request.user,
            data=data,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Invalid payroll run data.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payroll run already exists for this period or run number.",
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll run updated successfully.",
            "payroll_run": serialize_payroll_run(payroll_run),
        }
    )


payroll_run_update.required_company_permissions = [
    "company.hr.payroll.runs.update",
]
