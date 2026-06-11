from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCriterion

from .serializers import serialize_performance_criterion


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_criteria_list(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    qs = PerformanceCriterion.objects.filter(company=company).order_by("sort_order", "name", "id")

    is_active = request.query_params.get("is_active")
    if is_active in ["true", "1", "yes"]:
        qs = qs.filter(is_active=True)
    elif is_active in ["false", "0", "no"]:
        qs = qs.filter(is_active=False)

    search = (request.query_params.get("search") or "").strip()
    if search:
        qs = qs.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(description__icontains=search)
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "results": [serialize_performance_criterion(criterion) for criterion in qs],
        }
    )


performance_criteria_list.required_company_permissions = [
    "company.hr.performance.criteria.view",
]
