# ============================================================
# 📂 api/company/hr/employees/serializers.py
# 🧠 PrimeyAcc | Company HR Employees Serializers V1.0
# ------------------------------------------------------------
# ✅ Employee payload serialization
# ✅ Employee choices serialization
# ✅ Safe API input helpers
# ✅ Company-scoped branch resolving
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - company تأتي من request.company
# - branch_id إن وصل يجب أن يكون داخل نفس الشركة
# - هذا الملف لا يحتوي business logic ثقيل
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError

from companies.models import Branch, Company
from hr.models import Employee, EmployeeStatus, EmploymentType


def serialize_employee(employee: Employee) -> dict[str, Any]:
    """
    Serialize one employee for company workspace APIs.
    """

    branch = employee.branch
    user = employee.user

    return {
        "id": employee.id,
        "employee_number": employee.employee_number,
        "first_name": employee.first_name,
        "middle_name": employee.middle_name,
        "last_name": employee.last_name,
        "display_name": employee.display_name,
        "name": employee.name,
        "job_title": employee.job_title,
        "department_name": employee.department_name,
        "employment_type": employee.employment_type,
        "status": employee.status,
        "is_active": employee.is_active,
        "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        "termination_date": (
            employee.termination_date.isoformat()
            if employee.termination_date
            else None
        ),
        "email": employee.email,
        "phone": employee.phone,
        "mobile": employee.mobile,
        "national_id": employee.national_id,
        "notes": employee.notes,
        "extra_data": employee.extra_data if isinstance(employee.extra_data, dict) else {},
        "company": {
            "id": employee.company_id,
            "name": employee.company.display_name if employee.company_id else "",
        },
        "branch": {
            "id": branch.id,
            "name": branch.display_name,
            "branch_code": branch.branch_code,
        }
        if branch
        else None,
        "user": {
            "id": user.id,
            "username": user.get_username(),
            "email": user.email,
        }
        if user
        else None,
        "created_at": employee.created_at.isoformat() if employee.created_at else None,
        "updated_at": employee.updated_at.isoformat() if employee.updated_at else None,
    }


def serialize_employee_choices() -> dict[str, Any]:
    """
    Return choices needed by frontend forms.
    """

    return {
        "statuses": [
            {
                "value": value,
                "label": label,
            }
            for value, label in EmployeeStatus.choices
        ],
        "employment_types": [
            {
                "value": value,
                "label": label,
            }
            for value, label in EmploymentType.choices
        ],
    }


def resolve_company_branch(
    *,
    company: Company,
    branch_id: Any,
) -> Branch | None:
    """
    Resolve branch_id safely inside the current company.
    """

    if branch_id in [None, "", 0, "0"]:
        return None

    try:
        branch_id_int = int(branch_id)
    except (TypeError, ValueError):
        raise ValidationError({"branch_id": "Invalid branch_id."})

    try:
        return Branch.objects.get(
            id=branch_id_int,
            company=company,
        )
    except Branch.DoesNotExist:
        raise ValidationError(
            {"branch_id": "Branch was not found inside the current company."}
        )


def build_employee_data_from_request(
    *,
    company: Company,
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert API payload into Employee service data.

    company_id is intentionally ignored.
    """

    branch = resolve_company_branch(
        company=company,
        branch_id=payload.get("branch_id") or payload.get("branch"),
    )

    data: dict[str, Any] = {
        "branch": branch,
        "employee_number": str(payload.get("employee_number") or "").strip(),
        "first_name": str(payload.get("first_name") or "").strip(),
        "middle_name": str(payload.get("middle_name") or "").strip(),
        "last_name": str(payload.get("last_name") or "").strip(),
        "display_name": str(payload.get("display_name") or "").strip(),
        "job_title": str(payload.get("job_title") or "").strip(),
        "department_name": str(payload.get("department_name") or "").strip(),
        "employment_type": str(
            payload.get("employment_type") or EmploymentType.FULL_TIME
        ).strip(),
        "status": str(payload.get("status") or EmployeeStatus.ACTIVE).strip(),
        "email": str(payload.get("email") or "").strip(),
        "phone": str(payload.get("phone") or "").strip(),
        "mobile": str(payload.get("mobile") or "").strip(),
        "national_id": str(payload.get("national_id") or "").strip(),
        "notes": str(payload.get("notes") or "").strip(),
    }

    if "hire_date" in payload:
        data["hire_date"] = payload.get("hire_date") or None

    if "termination_date" in payload:
        data["termination_date"] = payload.get("termination_date") or None

    if isinstance(payload.get("extra_data"), dict):
        data["extra_data"] = payload.get("extra_data")

    return data