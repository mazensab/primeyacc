# ============================================================
# ?? api/company/hr/payroll/payslips/actions.py
# ?? PrimeyAcc | Payroll Payslip Actions API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Payslip

from .serializers import serialize_payslip


def _get_company_payslip(request, payslip_id: int):
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

    payslip = Payslip.objects.select_related(
        "payroll_run",
        "period",
        "employee",
        "salary_profile",
    ).filter(
        company=company,
        id=payslip_id,
    ).first()

    if not payslip:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Payslip not found.",
            },
            status=404,
        )

    return payslip, None


def _call_workflow_method(instance, method_name: str, user, note: str = ""):
    method = getattr(instance, method_name)

    attempts = []

    if method_name == "approve":
        attempts = [
            lambda: method(approved_by=user),
            lambda: method(user),
            lambda: method(),
        ]
    elif method_name == "mark_paid":
        attempts = [
            lambda: method(paid_by=user),
            lambda: method(user),
            lambda: method(),
        ]
    elif method_name == "cancel":
        attempts = [
            lambda: method(cancelled_by=user, note=note),
            lambda: method(user, note),
            lambda: method(user),
            lambda: method(),
        ]
    else:
        attempts = [
            lambda: method(user),
            lambda: method(),
        ]

    last_error = None

    for attempt in attempts:
        try:
            return attempt()
        except TypeError as exc:
            last_error = exc

    if last_error:
        raise last_error

    return None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payslip_approve(request, payslip_id: int):
    payslip, error_response = _get_company_payslip(request, payslip_id)
    if error_response:
        return error_response

    try:
        _call_workflow_method(payslip, "approve", request.user)
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not approve payslip.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    payslip.refresh_from_db()

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip approved successfully.",
            "payslip": serialize_payslip(payslip),
        }
    )


payslip_approve.required_company_permissions = [
    "company.hr.payroll.payslips.approve",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payslip_pay(request, payslip_id: int):
    payslip, error_response = _get_company_payslip(request, payslip_id)
    if error_response:
        return error_response

    try:
        _call_workflow_method(payslip, "mark_paid", request.user)
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not mark payslip as paid.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    payslip.refresh_from_db()

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip marked as paid successfully.",
            "payslip": serialize_payslip(payslip),
        }
    )


payslip_pay.required_company_permissions = [
    "company.hr.payroll.payslips.pay",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def payslip_cancel(request, payslip_id: int):
    payslip, error_response = _get_company_payslip(request, payslip_id)
    if error_response:
        return error_response

    note = str(request.data.get("note", "")).strip()

    try:
        _call_workflow_method(payslip, "cancel", request.user, note=note)
    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Could not cancel payslip.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    payslip.refresh_from_db()

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip cancelled successfully.",
            "payslip": serialize_payslip(payslip),
        }
    )


payslip_cancel.required_company_permissions = [
    "company.hr.payroll.payslips.cancel",
]
