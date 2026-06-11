from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCycle

from .serializers import serialize_performance_cycle


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycle_detail(request, cycle_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        cycle = PerformanceCycle.objects.get(id=cycle_id, company=company)
    except PerformanceCycle.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance cycle not found."},
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "cycle": serialize_performance_cycle(cycle),
        }
    )


performance_cycle_detail.required_company_permissions = [
    "company.hr.performance.cycles.view",
]
