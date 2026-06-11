from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCriterion
from hr.services import (
    activate_performance_criterion,
    deactivate_performance_criterion,
)

from .serializers import serialize_performance_criterion


def _get_criterion_or_response(*, company, criterion_id: int):
    try:
        return PerformanceCriterion.objects.get(id=criterion_id, company=company), None
    except PerformanceCriterion.DoesNotExist:
        return None, Response(
            {"ok": False, "success": False, "message": "Performance criterion not found."},
            status=404,
        )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_criterion_activate(request, criterion_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    criterion, error_response = _get_criterion_or_response(company=company, criterion_id=criterion_id)
    if error_response:
        return error_response

    try:
        criterion = activate_performance_criterion(
            criterion=criterion,
            updated_by=request.user,
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
            "message": "Performance criterion activated successfully.",
            "criterion": serialize_performance_criterion(criterion),
        }
    )


performance_criterion_activate.required_company_permissions = [
    "company.hr.performance.criteria.activate",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_criterion_deactivate(request, criterion_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    criterion, error_response = _get_criterion_or_response(company=company, criterion_id=criterion_id)
    if error_response:
        return error_response

    try:
        criterion = deactivate_performance_criterion(
            criterion=criterion,
            updated_by=request.user,
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
            "message": "Performance criterion deactivated successfully.",
            "criterion": serialize_performance_criterion(criterion),
        }
    )


performance_criterion_deactivate.required_company_permissions = [
    "company.hr.performance.criteria.deactivate",
]
