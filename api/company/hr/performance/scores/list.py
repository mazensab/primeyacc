from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceReviewScore

from .serializers import serialize_performance_review_score


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def performance_scores_list(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    qs = (
        PerformanceReviewScore.objects.filter(company=company)
        .select_related("review", "criterion")
        .order_by("review_id", "criterion__sort_order", "id")
    )

    review_id = request.query_params.get("review_id")
    if review_id:
        qs = qs.filter(review_id=review_id)

    criterion_id = request.query_params.get("criterion_id")
    if criterion_id:
        qs = qs.filter(criterion_id=criterion_id)

    return Response(
        {
            "ok": True,
            "success": True,
            "results": [serialize_performance_review_score(score) for score in qs],
        }
    )


performance_scores_list.required_company_permissions = [
    "company.hr.performance.scores.view",
]
