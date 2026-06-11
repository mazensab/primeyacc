from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCycle
from hr.services import (
    cancel_performance_cycle,
    close_performance_cycle,
    open_performance_cycle,
)

from .serializers import serialize_performance_cycle


def _get_cycle_or_response(*, company, cycle_id: int):
    try:
        return PerformanceCycle.objects.get(id=cycle_id, company=company), None
    except PerformanceCycle.DoesNotExist:
        return None, Response(
            {"ok": False, "success": False, "message": "Performance cycle not found."},
            status=404,
        )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycle_open(request, cycle_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    cycle, error_response = _get_cycle_or_response(company=company, cycle_id=cycle_id)
    if error_response:
        return error_response

    try:
        cycle = open_performance_cycle(cycle=cycle, updated_by=request.user)
    except ValidationError as exc:
        return Response(
            {"ok": False, "success": False, "message": "Validation error.", "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages},
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Performance cycle opened successfully.",
            "cycle": serialize_performance_cycle(cycle),
        }
    )


performance_cycle_open.required_company_permissions = [
    "company.hr.performance.cycles.open",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycle_close(request, cycle_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    cycle, error_response = _get_cycle_or_response(company=company, cycle_id=cycle_id)
    if error_response:
        return error_response

    try:
        cycle = close_performance_cycle(cycle=cycle, updated_by=request.user)
    except ValidationError as exc:
        return Response(
            {"ok": False, "success": False, "message": "Validation error.", "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages},
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Performance cycle closed successfully.",
            "cycle": serialize_performance_cycle(cycle),
        }
    )


performance_cycle_close.required_company_permissions = [
    "company.hr.performance.cycles.close",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycle_cancel(request, cycle_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    cycle, error_response = _get_cycle_or_response(company=company, cycle_id=cycle_id)
    if error_response:
        return error_response

    try:
        cycle = cancel_performance_cycle(
            cycle=cycle,
            cancelled_by=request.user,
            note=request.data.get("note", ""),
        )
    except ValidationError as exc:
        return Response(
            {"ok": False, "success": False, "message": "Validation error.", "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages},
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Performance cycle cancelled successfully.",
            "cycle": serialize_performance_cycle(cycle),
        }
    )


performance_cycle_cancel.required_company_permissions = [
    "company.hr.performance.cycles.cancel",
]
