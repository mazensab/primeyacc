from __future__ import annotations

from hr.models import PerformanceReviewScore


def serialize_performance_review_score(score: PerformanceReviewScore) -> dict:
    return {
        "id": score.id,
        "company_id": score.company_id,
        "review_id": score.review_id,
        "criterion_id": score.criterion_id,
        "criterion_name": score.criterion.name if score.criterion_id else "",
        "criterion_code": score.criterion.code if score.criterion_id else "",
        "score": str(score.score),
        "weight": str(score.weight),
        "weighted_score": str(score.weighted_score),
        "comments": score.comments,
        "extra_data": score.extra_data or {},
        "created_at": score.created_at.isoformat() if score.created_at else None,
        "updated_at": score.updated_at.isoformat() if score.updated_at else None,
    }
