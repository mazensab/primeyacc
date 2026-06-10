# ============================================================
# ًں“‚ hr/services.py
# ًں§  PrimeyAcc | HR Services V1.1
# ------------------------------------------------------------
# âœ… Employee create/update services
# âœ… Tenant-safe branch validation
# âœ… Employee status lifecycle helpers
# âœ… Attendance create/check-in/check-out services
# âœ… Attendance tenant isolation validation
# âœ… Open attendance protection per employee
# âœ… Audit user tracking
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ط§ظ„ط®ط¯ظ…ط§طھ ظ„ط§ طھط³طھظ‚ط¨ظ„ company_id ظ…ظ† ط§ظ„ظˆط§ط¬ظ‡ط©
# - ط§ظ„ط´ط±ظƒط© طھط£طھظٹ ظ…ظ† /company context ظ„ط§ط­ظ‚ظ‹ط§
# - branch ط¥ظ† ظˆط¬ط¯طھ ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ظ…ظ† ظ†ظپط³ ط§ظ„ط´ط±ظƒط©
# - employee ط¯ط§ط®ظ„ ط§ظ„ط­ط¶ظˆط± ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ظ…ظ† ظ†ظپط³ ط§ظ„ط´ط±ظƒط©
# - ظ„ط§ ظٹط³ظ…ط­ ط¨ظˆط¬ظˆط¯ ط³ط¬ظ„ ط­ط¶ظˆط± ظ…ظپطھظˆط­ ظ„ظ†ظپط³ ط§ظ„ظ…ظˆط¸ظپ
# - ط£ظٹ ظ…ظ†ط·ظ‚ طھط´ط؛ظٹظ„ظٹ ظٹط¨ظ‚ظ‰ ظ‡ظ†ط§ ظˆظ„ظٹط³ ط¯ط§ط®ظ„ views
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from companies.models import Branch, Company

from .models import (
    AttendanceRecord,
    AttendanceSource,
    AttendanceStatus,
    Employee,
)


def validate_employee_branch(*, company: Company, branch: Branch | None) -> None:
    """
    Ensure selected branch belongs to the same company.
    """

    if branch and branch.company_id != company.id:
        raise ValidationError(
            {"branch": "Branch must belong to the same company."}
        )


def validate_attendance_employee(
    *,
    company: Company,
    employee: Employee,
) -> None:
    """
    Ensure selected employee belongs to the same company.
    """

    if employee.company_id != company.id:
        raise ValidationError(
            {"employee": "Employee must belong to the same company."}
        )


def validate_attendance_branch(
    *,
    company: Company,
    branch: Branch | None,
) -> None:
    """
    Ensure selected attendance branch belongs to the same company.
    """

    if branch and branch.company_id != company.id:
        raise ValidationError(
            {"branch": "Branch must belong to the same company."}
        )


def validate_employee_has_no_open_attendance(*, employee: Employee) -> None:
    """
    Prevent more than one open attendance record for the same employee.
    """

    exists = AttendanceRecord.objects.filter(
        employee=employee,
        check_out_at__isnull=True,
    ).exclude(
        status=AttendanceStatus.CANCELLED,
    ).exists()

    if exists:
        raise ValidationError(
            {
                "employee": (
                    "Employee already has an open attendance record. "
                    "Please check out or cancel the existing record first."
                )
            }
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


@transaction.atomic
def create_attendance_record(
    *,
    company: Company,
    employee: Employee,
    created_by,
    data: dict[str, Any],
) -> AttendanceRecord:
    """
    Create attendance record inside a company tenant.

    This service can create either:
    - open attendance record with check_in_at only
    - closed attendance record with check_in_at and check_out_at
    """

    data.pop("company", None)

    data = dict(data or {})
    branch = data.pop("branch", None)
    if branch is None:
        branch = employee.branch

    validate_attendance_employee(company=company, employee=employee)
    validate_attendance_branch(company=company, branch=branch)

    if not data.get("check_out_at"):
        validate_employee_has_no_open_attendance(employee=employee)

    record = AttendanceRecord(
        company=company,
        employee=employee,
        branch=branch,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    record.save()
    return record


@transaction.atomic
def check_in_employee(
    *,
    company: Company,
    employee: Employee,
    created_by,
    check_in_at=None,
    branch: Branch | None = None,
    source: str = AttendanceSource.MANUAL,
    note: str = "",
    data: dict[str, Any] | None = None,
) -> AttendanceRecord:
    """
    Check in an employee and create an open attendance record.
    """

    payload = dict(data or {})
    payload["check_in_at"] = check_in_at or timezone.now()
    payload["source"] = source or AttendanceSource.MANUAL
    payload["check_in_note"] = note or payload.get("check_in_note", "")

    if branch is not None:
        payload["branch"] = branch

    return create_attendance_record(
        company=company,
        employee=employee,
        created_by=created_by,
        data=payload,
    )


@transaction.atomic
def check_out_attendance_record(
    *,
    attendance_record: AttendanceRecord,
    updated_by,
    check_out_at=None,
    note: str = "",
) -> AttendanceRecord:
    """
    Check out an open attendance record.
    """

    if attendance_record.status == AttendanceStatus.CANCELLED:
        raise ValidationError(
            {"status": "Cancelled attendance records cannot be checked out."}
        )

    if attendance_record.check_out_at:
        raise ValidationError(
            {"check_out_at": "Attendance record is already checked out."}
        )

    attendance_record.check_out(
        check_out_at=check_out_at or timezone.now(),
        note=note,
        user=updated_by,
    )
    return attendance_record


@transaction.atomic
def mark_attendance_missing_check_out(
    *,
    attendance_record: AttendanceRecord,
    updated_by,
) -> AttendanceRecord:
    """
    Mark an open attendance record as missing check-out.
    """

    if attendance_record.status == AttendanceStatus.CANCELLED:
        raise ValidationError(
            {"status": "Cancelled attendance records cannot be marked missing check-out."}
        )

    if attendance_record.check_out_at:
        raise ValidationError(
            {"check_out_at": "Closed attendance records cannot be marked missing check-out."}
        )

    attendance_record.mark_missing_check_out(user=updated_by)
    return attendance_record


@transaction.atomic
def cancel_attendance_record(
    *,
    attendance_record: AttendanceRecord,
    updated_by,
    note: str = "",
) -> AttendanceRecord:
    """
    Cancel attendance record.
    """

    attendance_record.cancel(
        note=note,
        user=updated_by,
    )
    return attendance_record
