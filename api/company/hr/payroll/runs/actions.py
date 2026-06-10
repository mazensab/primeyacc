# ============================================================
# ?? api/company/hr/payroll/runs/actions.py
# ?? PrimeyAcc | Payroll Run Actions API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayrollRun
from hr.services import (
    approve_payroll_run,
    calculate_payroll_run,
    cancel_payroll_run,
    post_payroll_run,
)

from .serializers import serialize_payroll_run


def _get_company_payroll_run(request, run_id: int):
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

    payroll_run = PayrollRun.objects.select_related(
        "period",
    ).filter(
        company=company,
        id=run_id,
    ).first()

    if not payroll_run:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Payroll run not found.",
            },
            status=404,
        )

    return payroll_run, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_run_calculate(request, run_id: int):
    payroll_run, error_response = _get_company_payroll_run(request, run_id)
    if error_response:
        return error_response

    try:
        payroll_run = calculate_payroll_run(
            payroll_run=payroll_run,
            calculated_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not calculate payroll run.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll run calculated successfully.",
            "payroll_run": serialize_payroll_run(payroll_run),
        }
    )


payroll_run_calculate.required_company_permissions = [
    "company.hr.payroll.runs.calculate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_run_approve(request, run_id: int):
    payroll_run, error_response = _get_company_payroll_run(request, run_id)
    if error_response:
        return error_response

    try:
        payroll_run = approve_payroll_run(
            payroll_run=payroll_run,
            approved_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not approve payroll run.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll run approved successfully.",
            "payroll_run": serialize_payroll_run(payroll_run),
        }
    )


payroll_run_approve.required_company_permissions = [
    "company.hr.payroll.runs.approve",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_run_post(request, run_id: int):
    payroll_run, error_response = _get_company_payroll_run(request, run_id)
    if error_response:
        return error_response

    try:
        payroll_run = post_payroll_run(
            payroll_run=payroll_run,
            posted_by=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not post payroll run.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll run posted successfully.",
            "payroll_run": serialize_payroll_run(payroll_run),
        }
    )


payroll_run_post.required_company_permissions = [
    "company.hr.payroll.runs.post",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payroll_run_cancel(request, run_id: int):
    payroll_run, error_response = _get_company_payroll_run(request, run_id)
    if error_response:
        return error_response

    note = str(request.data.get("note", "")).strip()

    try:
        payroll_run = cancel_payroll_run(
            payroll_run=payroll_run,
            cancelled_by=request.user,
            note=note,
        )
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not cancel payroll run.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payroll run cancelled successfully.",
            "payroll_run": serialize_payroll_run(payroll_run),
        }
    )


payroll_run_cancel.required_company_permissions = [
    "company.hr.payroll.runs.cancel",
]
