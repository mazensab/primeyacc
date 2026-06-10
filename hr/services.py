# ============================================================
# 📂 hr/services.py
# 🧠 PrimeyAcc | HR Services V1.0
# ------------------------------------------------------------
# ✅ Employee create/update services
# ✅ Tenant-safe branch validation
# ✅ Audit user tracking
# ✅ Status lifecycle helpers
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الخدمات لا تستقبل company_id من الواجهة
# - الشركة تأتي من /company context لاحقًا
# - branch إن وجدت يجب أن تكون من نفس الشركة
# - أي منطق تشغيلي للموظف يبقى هنا وليس داخل views
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from companies.models import Branch, Company

from .models import Employee


def validate_employee_branch(*, company: Company, branch: Branch | None) -> None:
    """
    Ensure selected branch belongs to the same company.
    """

    if branch and branch.company_id != company.id:
        raise ValidationError(
            {"branch": "Branch must belong to the same company."}
        )


@transaction.atomic
def create_employee(
    *,
    company: Company,
    created_by,
    data: dict[str, Any],
) -> Employee:
    """
    Create an employee inside a company tenant.
    """

    branch = data.get("branch")
    validate_employee_branch(company=company, branch=branch)

    employee = Employee(
        company=company,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    employee.save()
    return employee


@transaction.atomic
def update_employee(
    *,
    employee: Employee,
    updated_by,
    data: dict[str, Any],
) -> Employee:
    """
    Update an employee without changing the tenant boundary.
    """

    data.pop("company", None)

    if "branch" in data:
        validate_employee_branch(
            company=employee.company,
            branch=data.get("branch"),
        )

    for field_name, value in data.items():
        setattr(employee, field_name, value)

    employee.updated_by = updated_by
    employee.save()
    return employee


@transaction.atomic
def activate_employee(*, employee: Employee, updated_by) -> Employee:
    """
    Activate employee.
    """

    employee.activate(user=updated_by)
    return employee


@transaction.atomic
def deactivate_employee(*, employee: Employee, updated_by) -> Employee:
    """
    Deactivate employee.
    """

    employee.deactivate(user=updated_by)
    return employee