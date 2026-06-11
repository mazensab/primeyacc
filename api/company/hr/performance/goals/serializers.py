from __future__ import annotations

from hr.models import EmployeeGoal


def serialize_employee_goal(goal: EmployeeGoal) -> dict:
    return {
        "id": goal.id,
        "company_id": goal.company_id,
        "employee_id": goal.employee_id,
        "employee_number": goal.employee.employee_number if goal.employee_id else "",
        "employee_name": goal.employee.name if goal.employee_id else "",
        "cycle_id": goal.cycle_id,
        "cycle_name": goal.cycle.name if goal.cycle_id else "",
        "title": goal.title,
        "description": goal.description,
        "target_value": goal.target_value,
        "actual_value": goal.actual_value,
        "progress_percentage": str(goal.progress_percentage),
        "priority": goal.priority,
        "status": goal.status,
        "start_date": goal.start_date.isoformat() if goal.start_date else None,
        "due_date": goal.due_date.isoformat() if goal.due_date else None,
        "completed_at": goal.completed_at.isoformat() if goal.completed_at else None,
        "cancelled_at": goal.cancelled_at.isoformat() if goal.cancelled_at else None,
        "notes": goal.notes,
        "extra_data": goal.extra_data or {},
        "created_at": goal.created_at.isoformat() if goal.created_at else None,
        "updated_at": goal.updated_at.isoformat() if goal.updated_at else None,
    }
