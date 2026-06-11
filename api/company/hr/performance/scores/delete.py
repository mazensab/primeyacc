from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceReviewScore
from hr.services import delete_performance_review_score


@api_view(["POST", "DELETE"])
@permission_classes([HasAnyCompanyPermission])
def performance_score_delete(request, score_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        score = PerformanceReviewScore.objects.get(id=score_id, company=company)
    except PerformanceReviewScore.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance score not found."},
            status=404,
        )

    review = delete_performance_review_score(score=score)

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Performance score deleted successfully.",
            "review_id": review.id,
            "overall_score": str(review.overall_score),
        }
    )


performance_score_delete.required_company_permissions = [
    "company.hr.performance.scores.delete",
]
