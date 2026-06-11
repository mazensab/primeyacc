from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCriterion
from hr.services import update_performance_criterion

from .serializers import serialize_performance_criterion


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def performance_criterion_update(request, criterion_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        criterion = PerformanceCriterion.objects.get(id=criterion_id, company=company)
    except PerformanceCriterion.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance criterion not found."},
            status=404,
        )

    try:
        criterion = update_performance_criterion(
            criterion=criterion,
            updated_by=request.user,
            data=request.data,
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
            "message": "Performance criterion updated successfully.",
            "criterion": serialize_performance_criterion(criterion),
        }
    )


performance_criterion_update.required_company_permissions = [
    "company.hr.performance.criteria.update",
]
