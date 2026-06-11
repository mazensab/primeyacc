from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCycle

from .serializers import serialize_performance_cycle


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycles_list(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    qs = PerformanceCycle.objects.filter(company=company).order_by("-start_date", "-id")

    status_filter = request.query_params.get("status")
    if status_filter:
        qs = qs.filter(status=status_filter)

    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(name__icontains=search) | qs.filter(code__icontains=search)

    return Response(
        {
            "ok": True,
            "success": True,
            "results": [serialize_performance_cycle(cycle) for cycle in qs],
        }
    )


performance_cycles_list.required_company_permissions = [
    "company.hr.performance.cycles.view",
]
