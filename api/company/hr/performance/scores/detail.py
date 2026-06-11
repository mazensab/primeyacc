from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceReviewScore

from .serializers import serialize_performance_review_score


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_score_detail(request, score_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        score = PerformanceReviewScore.objects.select_related(
            "review",
            "criterion",
        ).get(id=score_id, company=company)
    except PerformanceReviewScore.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance score not found."},
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "score": serialize_performance_review_score(score),
        }
    )


performance_score_detail.required_company_permissions = [
    "company.hr.performance.scores.view",
]
