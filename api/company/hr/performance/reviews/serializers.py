from __future__ import annotations

from hr.models import EmployeePerformanceReview, PerformanceReviewScore


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


def serialize_employee_performance_review(
    review: EmployeePerformanceReview,
    *,
    include_scores: bool = False,
) -> dict:
    data = {
        "id": review.id,
        "company_id": review.company_id,
        "cycle_id": review.cycle_id,
        "cycle_name": review.cycle.name if review.cycle_id else "",
        "employee_id": review.employee_id,
        "employee_number": review.employee.employee_number if review.employee_id else "",
        "employee_name": review.employee.name if review.employee_id else "",
        "reviewer_id": review.reviewer_id,
        "reviewer_name": review.reviewer.get_username() if review.reviewer_id else "",
        "status": review.status,
        "review_date": review.review_date.isoformat() if review.review_date else None,
        "overall_score": str(review.overall_score),
        "final_rating": review.final_rating,
        "employee_comments": review.employee_comments,
        "reviewer_comments": review.reviewer_comments,
        "manager_comments": review.manager_comments,
        "submitted_at": review.submitted_at.isoformat() if review.submitted_at else None,
        "approved_at": review.approved_at.isoformat() if review.approved_at else None,
        "cancelled_at": review.cancelled_at.isoformat() if review.cancelled_at else None,
        "approved_by_id": review.approved_by_id,
        "cancelled_by_id": review.cancelled_by_id,
        "notes": review.notes,
        "extra_data": review.extra_data or {},
        "created_at": review.created_at.isoformat() if review.created_at else None,
        "updated_at": review.updated_at.isoformat() if review.updated_at else None,
    }

    if include_scores:
        data["scores"] = [
            serialize_performance_review_score(score)
            for score in review.scores.select_related("criterion").order_by("criterion__sort_order", "id")
        ]

    return data
