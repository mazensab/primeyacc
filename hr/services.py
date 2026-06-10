# ============================================================
# 📂 hr/services.py
# 🧠 PrimeyAcc | HR Services V1.2
# ------------------------------------------------------------
# ✅ Employee create/update services
# ✅ Tenant-safe branch validation
# ✅ Employee status lifecycle helpers
# ✅ Attendance create/check-in/check-out services
# ✅ Attendance tenant isolation validation
# ✅ Open attendance protection per employee
# ✅ Leave type services
# ✅ Leave request workflow services
# ✅ Leave balance services
# ✅ Audit user tracking
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الخدمات لا تستقبل company_id من الواجهة
# - الشركة تأتي من /company context لاحقًا
# - branch إن وجدت يجب أن تكون من نفس الشركة
# - employee داخل الحضور والإجازات يجب أن يكون من نفس الشركة
# - leave_type يجب أن يكون من نفس الشركة
# - لا يسمح بوجود سجل حضور مفتوح لنفس الموظف
# - أي منطق تشغيلي يبقى هنا وليس داخل views
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
    LeaveBalance,
    LeaveRequest,
    LeaveType,
)


# ============================================================
# 👤 Employee Services
# ============================================================


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

    data = dict(data or {})
    data.pop("company", None)

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

    data = dict(data or {})
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


# ============================================================
# 🕒 Attendance Services
# ============================================================


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

    data = dict(data or {})
    data.pop("company", None)

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


# ============================================================
# 🏖️ Leave Management Services
# ============================================================


def validate_leave_employee(*, company: Company, employee: Employee) -> None:
    """
    Ensure employee belongs to the current company.
    """

    if employee.company_id != company.id:
        raise ValidationError(
            {"employee": "Employee must belong to the current company."}
        )


def validate_leave_type(*, company: Company, leave_type: LeaveType) -> None:
    """
    Ensure leave type belongs to the current company.
    """

    if leave_type.company_id != company.id:
        raise ValidationError(
            {"leave_type": "Leave type must belong to the current company."}
        )


def validate_leave_balance_entities(
    *,
    company: Company,
    employee: Employee,
    leave_type: LeaveType,
) -> None:
    """
    Ensure leave balance entities belong to the same company.
    """

    validate_leave_employee(company=company, employee=employee)
    validate_leave_type(company=company, leave_type=leave_type)


@transaction.atomic
def create_leave_type(
    *,
    company: Company,
    created_by,
    data: dict[str, Any],
) -> LeaveType:
    """
    Create company-scoped leave type.
    """

    data = dict(data or {})
    data.pop("company", None)

    leave_type = LeaveType(
        company=company,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    leave_type.full_clean()
    leave_type.save()

    return leave_type


@transaction.atomic
def update_leave_type(
    *,
    leave_type: LeaveType,
    updated_by,
    data: dict[str, Any],
) -> LeaveType:
    """
    Update leave type without changing company.
    """

    data = dict(data or {})
    data.pop("company", None)

    for field_name, value in data.items():
        setattr(leave_type, field_name, value)

    leave_type.updated_by = updated_by
    leave_type.full_clean()
    leave_type.save()

    return leave_type


@transaction.atomic
def activate_leave_type(*, leave_type: LeaveType, updated_by) -> LeaveType:
    """
    Activate leave type.
    """

    leave_type.is_active = True
    leave_type.updated_by = updated_by
    leave_type.full_clean()
    leave_type.save(
        update_fields=[
            "is_active",
            "updated_by",
            "updated_at",
        ]
    )

    return leave_type


@transaction.atomic
def deactivate_leave_type(*, leave_type: LeaveType, updated_by) -> LeaveType:
    """
    Deactivate leave type.
    """

    leave_type.is_active = False
    leave_type.updated_by = updated_by
    leave_type.full_clean()
    leave_type.save(
        update_fields=[
            "is_active",
            "updated_by",
            "updated_at",
        ]
    )

    return leave_type


@transaction.atomic
def create_leave_request(
    *,
    company: Company,
    employee: Employee,
    leave_type: LeaveType,
    created_by,
    data: dict[str, Any],
) -> LeaveRequest:
    """
    Create company-scoped leave request.
    """

    data = dict(data or {})
    data.pop("company", None)
    data.pop("employee", None)
    data.pop("leave_type", None)

    validate_leave_employee(company=company, employee=employee)
    validate_leave_type(company=company, leave_type=leave_type)

    leave_request = LeaveRequest(
        company=company,
        employee=employee,
        leave_type=leave_type,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    leave_request.full_clean()
    leave_request.save()

    return leave_request


@transaction.atomic
def update_leave_request(
    *,
    leave_request: LeaveRequest,
    updated_by,
    data: dict[str, Any],
) -> LeaveRequest:
    """
    Update leave request without changing company.
    """

    data = dict(data or {})
    data.pop("company", None)

    if "employee" in data:
        validate_leave_employee(
            company=leave_request.company,
            employee=data["employee"],
        )

    if "leave_type" in data:
        validate_leave_type(
            company=leave_request.company,
            leave_type=data["leave_type"],
        )

    for field_name, value in data.items():
        setattr(leave_request, field_name, value)

    leave_request.updated_by = updated_by
    leave_request.full_clean()
    leave_request.save()

    return leave_request


@transaction.atomic
def submit_leave_request(
    *,
    leave_request: LeaveRequest,
    updated_by,
) -> LeaveRequest:
    """
    Submit draft leave request.
    """

    return leave_request.submit(user=updated_by)


@transaction.atomic
def approve_leave_request(
    *,
    leave_request: LeaveRequest,
    approved_by,
    note: str = "",
) -> LeaveRequest:
    """
    Approve submitted leave request.
    """

    return leave_request.approve(user=approved_by, note=note)


@transaction.atomic
def reject_leave_request(
    *,
    leave_request: LeaveRequest,
    rejected_by,
    note: str = "",
) -> LeaveRequest:
    """
    Reject submitted leave request.
    """

    return leave_request.reject(user=rejected_by, note=note)


@transaction.atomic
def cancel_leave_request(
    *,
    leave_request: LeaveRequest,
    cancelled_by,
    note: str = "",
) -> LeaveRequest:
    """
    Cancel draft/submitted leave request.
    """

    return leave_request.cancel(user=cancelled_by, note=note)


@transaction.atomic
def create_or_update_leave_balance(
    *,
    company: Company,
    employee: Employee,
    leave_type: LeaveType,
    year: int,
    updated_by,
    data: dict[str, Any],
) -> LeaveBalance:
    """
    Create or update leave balance for employee/type/year.
    """

    data = dict(data or {})
    data.pop("company", None)
    data.pop("employee", None)
    data.pop("leave_type", None)
    data.pop("year", None)

    validate_leave_balance_entities(
        company=company,
        employee=employee,
        leave_type=leave_type,
    )

    balance, created = LeaveBalance.objects.get_or_create(
        company=company,
        employee=employee,
        leave_type=leave_type,
        year=year,
        defaults={
            "created_by": updated_by,
            "updated_by": updated_by,
        },
    )

    for field_name, value in data.items():
        setattr(balance, field_name, value)

    balance.updated_by = updated_by
    if created:
        balance.created_by = updated_by

    balance.full_clean()
    balance.save()

    return balance