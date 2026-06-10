# ============================================================
# 📂 api/company/hr/leave_requests/actions.py
# 🧠 PrimeyAcc | Company HR Leave Requests Actions APIs V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import LeaveRequest
from hr.services import (
    approve_leave_request,
    cancel_leave_request,
    reject_leave_request,
    submit_leave_request,
)

from .serializers import serialize_leave_request


def _validation_errors_payload(exc: ValidationError):
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": [str(exc)]}


def _get_company_leave_request_or_response(*, request: Request, leave_request_id: int):
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

    try:
        leave_request = (
            LeaveRequest.objects.select_related(
                "company",
                "employee",
                "leave_type",
                "approved_by",
                "rejected_by",
                "cancelled_by",
            )
            .get(id=leave_request_id, company=company)
        )
    except LeaveRequest.DoesNotExist:
        return None, Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request was not found.",
            },
            status=404,
        )

    return leave_request, None


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_submit(request: Request, leave_request_id: int) -> Response:
    leave_request, error_response = _get_company_leave_request_or_response(
        request=request,
        leave_request_id=leave_request_id,
    )
    if error_response:
        return error_response

    try:
        updated = submit_leave_request(
            leave_request=leave_request,
            updated_by=request.user,
        )
        serialized = serialize_leave_request(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave request submitted successfully.",
                "leave_request": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request could not be submitted.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_request_submit.required_company_permissions = [
    "company.hr.leave_requests.submit",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_approve(request: Request, leave_request_id: int) -> Response:
    leave_request, error_response = _get_company_leave_request_or_response(
        request=request,
        leave_request_id=leave_request_id,
    )
    if error_response:
        return error_response

    try:
        updated = approve_leave_request(
            leave_request=leave_request,
            approved_by=request.user,
            note=request.data.get("note") or request.data.get("manager_note") or "",
        )
        serialized = serialize_leave_request(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave request approved successfully.",
                "leave_request": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request could not be approved.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_request_approve.required_company_permissions = [
    "company.hr.leave_requests.approve",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_reject(request: Request, leave_request_id: int) -> Response:
    leave_request, error_response = _get_company_leave_request_or_response(
        request=request,
        leave_request_id=leave_request_id,
    )
    if error_response:
        return error_response

    try:
        updated = reject_leave_request(
            leave_request=leave_request,
            rejected_by=request.user,
            note=request.data.get("note") or request.data.get("manager_note") or "",
        )
        serialized = serialize_leave_request(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave request rejected successfully.",
                "leave_request": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request could not be rejected.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_request_reject.required_company_permissions = [
    "company.hr.leave_requests.reject",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_leave_request_cancel(request: Request, leave_request_id: int) -> Response:
    leave_request, error_response = _get_company_leave_request_or_response(
        request=request,
        leave_request_id=leave_request_id,
    )
    if error_response:
        return error_response

    try:
        updated = cancel_leave_request(
            leave_request=leave_request,
            cancelled_by=request.user,
            note=request.data.get("note") or request.data.get("manager_note") or "",
        )
        serialized = serialize_leave_request(updated)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Leave request cancelled successfully.",
                "leave_request": serialized,
                "data": serialized,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Leave request could not be cancelled.",
                "errors": _validation_errors_payload(exc),
            },
            status=400,
        )


company_hr_leave_request_cancel.required_company_permissions = [
    "company.hr.leave_requests.cancel",
]