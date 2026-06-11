from __future__ import annotations

from hr.models import PerformanceCriterion


def serialize_performance_criterion(criterion: PerformanceCriterion) -> dict:
    return {
        "id": criterion.id,
        "company_id": criterion.company_id,
        "name": criterion.name,
        "code": criterion.code,
        "description": criterion.description,
        "max_score": str(criterion.max_score),
        "weight": str(criterion.weight),
        "is_active": criterion.is_active,
        "sort_order": criterion.sort_order,
        "notes": criterion.notes,
        "extra_data": criterion.extra_data or {},
        "created_at": criterion.created_at.isoformat() if criterion.created_at else None,
        "updated_at": criterion.updated_at.isoformat() if criterion.updated_at else None,
    }
