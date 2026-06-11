from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import EmployeePerformanceReview, PerformanceCriterion, PerformanceReviewScore
from hr.services import update_performance_review_score

from .serializers import serialize_performance_review_score


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def performance_score_update(request, score_id: int):
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

    data = dict(request.data)

    if "review_id" in data:
        try:
            data["review"] = EmployeePerformanceReview.objects.get(
                id=data.pop("review_id"),
                company=company,
            )
        except EmployeePerformanceReview.DoesNotExist:
            return Response(
                {"ok": False, "success": False, "message": "Performance review not found."},
                status=404,
            )

    if "criterion_id" in data:
        try:
            data["criterion"] = PerformanceCriterion.objects.get(
                id=data.pop("criterion_id"),
                company=company,
            )
        except PerformanceCriterion.DoesNotExist:
            return Response(
                {"ok": False, "success": False, "message": "Performance criterion not found."},
                status=404,
            )

    try:
        score = update_performance_review_score(
            score=score,
            updated_by=request.user,
            data=data,
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
            "message": "Performance score updated successfully.",
            "score": serialize_performance_review_score(score),
        }
    )


performance_score_update.required_company_permissions = [
    "company.hr.performance.scores.update",
]
