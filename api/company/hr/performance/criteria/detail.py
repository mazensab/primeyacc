from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCriterion

from .serializers import serialize_performance_criterion


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_criterion_detail(request, criterion_id: int):
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

    return Response(
        {
            "ok": True,
            "success": True,
            "criterion": serialize_performance_criterion(criterion),
        }
    )


performance_criterion_detail.required_company_permissions = [
    "company.hr.performance.criteria.view",
]
