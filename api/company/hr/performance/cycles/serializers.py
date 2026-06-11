from __future__ import annotations

from hr.models import PerformanceCycle


def serialize_performance_cycle(cycle: PerformanceCycle) -> dict:
    return {
        "id": cycle.id,
        "company_id": cycle.company_id,
        "name": cycle.name,
        "code": cycle.code,
        "start_date": cycle.start_date.isoformat() if cycle.start_date else None,
        "end_date": cycle.end_date.isoformat() if cycle.end_date else None,
        "status": cycle.status,
        "description": cycle.description,
        "notes": cycle.notes,
        "extra_data": cycle.extra_data or {},
        "created_at": cycle.created_at.isoformat() if cycle.created_at else None,
        "updated_at": cycle.updated_at.isoformat() if cycle.updated_at else None,
    }
