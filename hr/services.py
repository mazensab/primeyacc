# ============================================================
# 📂 hr/services.py
# 🧠 PrimeyAcc | HR Services V1.3
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
# ✅ Payroll salary component services
# ✅ Payroll employee salary profile services
# ✅ Payroll period services
# ✅ Payroll run workflow services
# ✅ Payslip calculation foundation
# ✅ Audit user tracking
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الخدمات لا تستقبل company_id من الواجهة
# - الشركة تأتي من /company context لاحقًا
# - branch إن وجدت يجب أن تكون من نفس الشركة
# - employee داخل الحضور والإجازات والرواتب يجب أن يكون من نفس الشركة
# - leave_type يجب أن يكون من نفس الشركة
# - PayrollPeriod / PayrollRun / Payslip يجب أن تكون داخل نفس الشركة
# - لا يسمح بوجود سجل حضور مفتوح لنفس الموظف
# - أي منطق تشغيلي يبقى هنا وليس داخل views
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone

from companies.models import Branch, Company

from .models import (
    AttendanceRecord,
    AttendanceSource,
    AttendanceStatus,
    Employee,
    EmployeeSalaryProfile,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    PayrollPeriod,
    PayrollRun,
    PayrollRunStatus,
    Payslip,
    PayslipItem,
    SalaryComponent,
    SalaryComponentType,
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


# ============================================================
# 💰 Payroll Foundation Services
# ============================================================


def _decimal(value) -> Decimal:
    """
    Convert value to Decimal safely for payroll calculations.
    """

    if value in [None, ""]:
        return Decimal("0")

    return Decimal(str(value))


def validate_payroll_employee(*, company: Company, employee: Employee) -> None:
    """
    Ensure payroll employee belongs to current company.
    """

    if employee.company_id != company.id:
        raise ValidationError(
            {"employee": "Employee must belong to the current company."}
        )


def validate_salary_component(*, company: Company, component: SalaryComponent) -> None:
    """
    Ensure salary component belongs to current company.
    """

    if component.company_id != company.id:
        raise ValidationError(
            {"component": "Salary component must belong to the current company."}
        )


def validate_salary_profile_entities(
    *,
    company: Company,
    employee: Employee,
) -> None:
    """
    Ensure salary profile entities are tenant-safe.
    """

    validate_payroll_employee(company=company, employee=employee)


def validate_payroll_period(*, company: Company, period: PayrollPeriod) -> None:
    """
    Ensure payroll period belongs to current company.
    """

    if period.company_id != company.id:
        raise ValidationError(
            {"period": "Payroll period must belong to the current company."}
        )


def validate_payroll_run(*, company: Company, payroll_run: PayrollRun) -> None:
    """
    Ensure payroll run belongs to current company.
    """

    if payroll_run.company_id != company.id:
        raise ValidationError(
            {"payroll_run": "Payroll run must belong to the current company."}
        )


def validate_payslip_entities(
    *,
    company: Company,
    payroll_run: PayrollRun,
    period: PayrollPeriod,
    employee: Employee,
    salary_profile: EmployeeSalaryProfile | None = None,
) -> None:
    """
    Ensure payslip entities belong to current company.
    """

    validate_payroll_run(company=company, payroll_run=payroll_run)
    validate_payroll_period(company=company, period=period)
    validate_payroll_employee(company=company, employee=employee)

    if salary_profile:
        if salary_profile.company_id != company.id:
            raise ValidationError(
                {"salary_profile": "Salary profile must belong to the current company."}
            )

        if salary_profile.employee_id != employee.id:
            raise ValidationError(
                {"salary_profile": "Salary profile must belong to the selected employee."}
            )


# ============================================================
# 💵 Salary Component Services
# ============================================================


@transaction.atomic
def create_salary_component(
    *,
    company: Company,
    created_by,
    data: dict[str, Any],
) -> SalaryComponent:
    """
    Create company-scoped salary component.
    """

    data = dict(data or {})
    data.pop("company", None)

    component = SalaryComponent(
        company=company,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    component.full_clean()
    component.save()

    return component


@transaction.atomic
def update_salary_component(
    *,
    component: SalaryComponent,
    updated_by,
    data: dict[str, Any],
) -> SalaryComponent:
    """
    Update salary component without changing company.
    """

    data = dict(data or {})
    data.pop("company", None)

    for field_name, value in data.items():
        setattr(component, field_name, value)

    component.updated_by = updated_by
    component.full_clean()
    component.save()

    return component


@transaction.atomic
def activate_salary_component(
    *,
    component: SalaryComponent,
    updated_by,
) -> SalaryComponent:
    """
    Activate salary component.
    """

    component.is_active = True
    component.updated_by = updated_by
    component.full_clean()
    component.save(
        update_fields=[
            "is_active",
            "updated_by",
            "updated_at",
        ]
    )

    return component


@transaction.atomic
def deactivate_salary_component(
    *,
    component: SalaryComponent,
    updated_by,
) -> SalaryComponent:
    """
    Deactivate salary component.
    """

    component.is_active = False
    component.updated_by = updated_by
    component.full_clean()
    component.save(
        update_fields=[
            "is_active",
            "updated_by",
            "updated_at",
        ]
    )

    return component


# ============================================================
# 👤 Employee Salary Profile Services
# ============================================================


@transaction.atomic
def create_employee_salary_profile(
    *,
    company: Company,
    employee: Employee,
    created_by,
    data: dict[str, Any],
) -> EmployeeSalaryProfile:
    """
    Create company-scoped employee salary profile.
    """

    data = dict(data or {})
    data.pop("company", None)
    data.pop("employee", None)

    validate_salary_profile_entities(
        company=company,
        employee=employee,
    )

    profile = EmployeeSalaryProfile(
        company=company,
        employee=employee,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    profile.full_clean()
    profile.save()

    return profile


@transaction.atomic
def update_employee_salary_profile(
    *,
    profile: EmployeeSalaryProfile,
    updated_by,
    data: dict[str, Any],
) -> EmployeeSalaryProfile:
    """
    Update employee salary profile without changing company.
    """

    data = dict(data or {})
    data.pop("company", None)

    if "employee" in data:
        validate_salary_profile_entities(
            company=profile.company,
            employee=data["employee"],
        )

    for field_name, value in data.items():
        setattr(profile, field_name, value)

    profile.updated_by = updated_by
    profile.full_clean()
    profile.save()

    return profile


@transaction.atomic
def activate_employee_salary_profile(
    *,
    profile: EmployeeSalaryProfile,
    updated_by,
) -> EmployeeSalaryProfile:
    """
    Activate employee salary profile.
    """

    profile.is_active = True
    profile.updated_by = updated_by
    profile.full_clean()
    profile.save(
        update_fields=[
            "is_active",
            "updated_by",
            "updated_at",
        ]
    )

    return profile


@transaction.atomic
def deactivate_employee_salary_profile(
    *,
    profile: EmployeeSalaryProfile,
    updated_by,
) -> EmployeeSalaryProfile:
    """
    Deactivate employee salary profile.
    """

    profile.is_active = False
    profile.updated_by = updated_by
    profile.full_clean()
    profile.save(
        update_fields=[
            "is_active",
            "updated_by",
            "updated_at",
        ]
    )

    return profile


def get_active_salary_profile_for_employee(
    *,
    company: Company,
    employee: Employee,
) -> EmployeeSalaryProfile | None:
    """
    Get active salary profile for an employee inside current company.
    """

    validate_payroll_employee(company=company, employee=employee)

    return (
        EmployeeSalaryProfile.objects.filter(
            company=company,
            employee=employee,
            is_active=True,
        )
        .order_by("-effective_from", "-id")
        .first()
    )


# ============================================================
# 📅 Payroll Period Services
# ============================================================


@transaction.atomic
def create_payroll_period(
    *,
    company: Company,
    created_by,
    data: dict[str, Any],
) -> PayrollPeriod:
    """
    Create company-scoped payroll period.
    """

    data = dict(data or {})
    data.pop("company", None)

    period = PayrollPeriod(
        company=company,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    period.full_clean()
    period.save()

    return period


@transaction.atomic
def update_payroll_period(
    *,
    period: PayrollPeriod,
    updated_by,
    data: dict[str, Any],
) -> PayrollPeriod:
    """
    Update payroll period without changing company.
    """

    data = dict(data or {})
    data.pop("company", None)

    for field_name, value in data.items():
        setattr(period, field_name, value)

    period.updated_by = updated_by
    period.full_clean()
    period.save()

    return period


@transaction.atomic
def open_payroll_period(
    *,
    period: PayrollPeriod,
    updated_by,
) -> PayrollPeriod:
    """
    Open payroll period.
    """

    return period.open(user=updated_by)


@transaction.atomic
def close_payroll_period(
    *,
    period: PayrollPeriod,
    updated_by,
) -> PayrollPeriod:
    """
    Close payroll period.
    """

    return period.close(user=updated_by)


# ============================================================
# 🧮 Payroll Run / Payslip Services
# ============================================================


def build_payroll_run_number(*, period: PayrollPeriod) -> str:
    """
    Build default run number for payroll period.
    """

    return f"PAY-{period.year}-{str(period.month).zfill(2)}"


def build_payslip_number(
    *,
    period: PayrollPeriod,
    employee: Employee,
) -> str:
    """
    Build default payslip number.
    """

    return f"PS-{period.year}-{str(period.month).zfill(2)}-{employee.employee_number}"


@transaction.atomic
def create_payroll_run(
    *,
    company: Company,
    period: PayrollPeriod,
    created_by,
    data: dict[str, Any] | None = None,
) -> PayrollRun:
    """
    Create company-scoped payroll run.
    """

    data = dict(data or {})
    data.pop("company", None)
    data.pop("period", None)

    validate_payroll_period(company=company, period=period)

    if not data.get("run_number"):
        data["run_number"] = build_payroll_run_number(period=period)

    payroll_run = PayrollRun(
        company=company,
        period=period,
        created_by=created_by,
        updated_by=created_by,
        **data,
    )
    payroll_run.full_clean()
    payroll_run.save()

    return payroll_run


@transaction.atomic
def update_payroll_run(
    *,
    payroll_run: PayrollRun,
    updated_by,
    data: dict[str, Any],
) -> PayrollRun:
    """
    Update payroll run without changing company.
    """

    data = dict(data or {})
    data.pop("company", None)

    if "period" in data:
        validate_payroll_period(
            company=payroll_run.company,
            period=data["period"],
        )

    for field_name, value in data.items():
        setattr(payroll_run, field_name, value)

    payroll_run.updated_by = updated_by
    payroll_run.full_clean()
    payroll_run.save()

    return payroll_run


def calculate_profile_earning_items(
    *,
    profile: EmployeeSalaryProfile,
) -> list[dict[str, Any]]:
    """
    Convert salary profile fields into basic earning items.
    """

    items = []

    if profile.basic_salary:
        items.append(
            {
                "code": "BASIC",
                "name": "Basic Salary",
                "component_type": SalaryComponentType.EARNING,
                "amount": profile.basic_salary,
            }
        )

    if profile.housing_allowance:
        items.append(
            {
                "code": "HOUSING",
                "name": "Housing Allowance",
                "component_type": SalaryComponentType.EARNING,
                "amount": profile.housing_allowance,
            }
        )

    if profile.transport_allowance:
        items.append(
            {
                "code": "TRANSPORT",
                "name": "Transport Allowance",
                "component_type": SalaryComponentType.EARNING,
                "amount": profile.transport_allowance,
            }
        )

    if profile.other_allowance:
        items.append(
            {
                "code": "OTHER",
                "name": "Other Allowance",
                "component_type": SalaryComponentType.EARNING,
                "amount": profile.other_allowance,
            }
        )

    return items


@transaction.atomic
def create_or_update_payslip(
    *,
    company: Company,
    payroll_run: PayrollRun,
    period: PayrollPeriod,
    employee: Employee,
    salary_profile: EmployeeSalaryProfile | None,
    updated_by,
    data: dict[str, Any] | None = None,
) -> Payslip:
    """
    Create or update a company-scoped payslip for one employee/run.
    """

    data = dict(data or {})
    data.pop("company", None)
    data.pop("payroll_run", None)
    data.pop("period", None)
    data.pop("employee", None)
    data.pop("salary_profile", None)

    validate_payslip_entities(
        company=company,
        payroll_run=payroll_run,
        period=period,
        employee=employee,
        salary_profile=salary_profile,
    )

    payslip_number = data.pop(
        "payslip_number",
        build_payslip_number(
            period=period,
            employee=employee,
        ),
    )

    defaults = {
        "period": period,
        "salary_profile": salary_profile,
        "updated_by": updated_by,
    }

    if salary_profile:
        defaults.update(
            {
                "basic_salary": salary_profile.basic_salary,
                "currency": salary_profile.currency,
            }
        )

    defaults.update(data)

    payslip, created = Payslip.objects.get_or_create(
        company=company,
        payroll_run=payroll_run,
        employee=employee,
        defaults={
            "period": period,
            "salary_profile": salary_profile,
            "payslip_number": payslip_number,
            "created_by": updated_by,
            "updated_by": updated_by,
            **defaults,
        },
    )

    if not created:
        for field_name, value in defaults.items():
            setattr(payslip, field_name, value)

        payslip.payslip_number = payslip_number
        payslip.updated_by = updated_by

    payslip.full_clean()
    payslip.save()

    return payslip


@transaction.atomic
def rebuild_payslip_items_from_profile(
    *,
    payslip: Payslip,
    salary_profile: EmployeeSalaryProfile,
    updated_by,
) -> Payslip:
    """
    Rebuild payslip items from active salary profile.

    This is the initial payroll calculation foundation.
    Later we can extend it with attendance, unpaid leave, GOSI, loans, and taxes.
    """

    PayslipItem.objects.filter(payslip=payslip).delete()

    earning_items = calculate_profile_earning_items(profile=salary_profile)

    total_earnings = Decimal("0")
    total_deductions = Decimal("0")

    for item_data in earning_items:
        amount = _decimal(item_data.get("amount"))

        PayslipItem.objects.create(
            company=payslip.company,
            payslip=payslip,
            name=item_data["name"],
            code=item_data["code"],
            component_type=item_data["component_type"],
            amount=amount,
            created_by=updated_by,
            updated_by=updated_by,
        )

        if item_data["component_type"] == SalaryComponentType.EARNING:
            total_earnings += amount
        elif item_data["component_type"] == SalaryComponentType.DEDUCTION:
            total_deductions += amount

    payslip.basic_salary = salary_profile.basic_salary
    payslip.total_earnings = total_earnings
    payslip.total_deductions = total_deductions
    payslip.net_pay = max(total_earnings - total_deductions, Decimal("0"))
    payslip.currency = salary_profile.currency
    payslip.updated_by = updated_by
    payslip.save()

    payslip.mark_calculated(user=updated_by)

    return payslip


def recalculate_payroll_run_totals(*, payroll_run: PayrollRun) -> PayrollRun:
    """
    Recalculate run totals from payslips.
    """

    totals = Payslip.objects.filter(
        payroll_run=payroll_run,
    ).aggregate(
        total_earnings=Sum("total_earnings"),
        total_deductions=Sum("total_deductions"),
        net_pay=Sum("net_pay"),
    )

    payroll_run.total_employees = Payslip.objects.filter(
        payroll_run=payroll_run,
    ).count()
    payroll_run.total_earnings = totals["total_earnings"] or Decimal("0")
    payroll_run.total_deductions = totals["total_deductions"] or Decimal("0")
    payroll_run.net_pay = totals["net_pay"] or Decimal("0")
    payroll_run.full_clean()
    payroll_run.save(
        update_fields=[
            "total_employees",
            "total_earnings",
            "total_deductions",
            "net_pay",
            "updated_at",
        ]
    )

    return payroll_run


@transaction.atomic
def calculate_payroll_run(
    *,
    payroll_run: PayrollRun,
    calculated_by,
    employees=None,
) -> PayrollRun:
    """
    Calculate payroll run.

    Foundation behavior:
    - Finds active employees in the run company.
    - Requires an active salary profile for each included employee.
    - Creates or updates one payslip per employee.
    - Rebuilds payslip items from salary profile.
    - Updates payroll run totals.
    """

    if payroll_run.status not in [
        PayrollRunStatus.DRAFT,
        PayrollRunStatus.CALCULATED,
    ]:
        raise ValidationError(
            {"status": "Only draft/calculated payroll runs can be calculated."}
        )

    company = payroll_run.company
    period = payroll_run.period

    validate_payroll_period(company=company, period=period)

    employees_qs = Employee.objects.filter(
        company=company,
        is_active=True,
    ).order_by("employee_number", "id")

    if employees is not None:
        employee_ids = [employee.id for employee in employees]
        employees_qs = employees_qs.filter(id__in=employee_ids)

    calculated_count = 0

    for employee in employees_qs:
        salary_profile = get_active_salary_profile_for_employee(
            company=company,
            employee=employee,
        )

        if not salary_profile:
            continue

        payslip = create_or_update_payslip(
            company=company,
            payroll_run=payroll_run,
            period=period,
            employee=employee,
            salary_profile=salary_profile,
            updated_by=calculated_by,
        )

        rebuild_payslip_items_from_profile(
            payslip=payslip,
            salary_profile=salary_profile,
            updated_by=calculated_by,
        )

        calculated_count += 1

    recalculate_payroll_run_totals(payroll_run=payroll_run)

    payroll_run.mark_calculated(user=calculated_by)
    payroll_run.total_employees = calculated_count
    payroll_run.full_clean()
    payroll_run.save(
        update_fields=[
            "total_employees",
            "updated_at",
        ]
    )

    recalculate_payroll_run_totals(payroll_run=payroll_run)

    return payroll_run


@transaction.atomic
def approve_payroll_run(
    *,
    payroll_run: PayrollRun,
    approved_by,
) -> PayrollRun:
    """
    Approve calculated payroll run and approve calculated payslips.
    """

    payroll_run.approve(user=approved_by)

    for payslip in payroll_run.payslips.all():
        if payslip.status == "CALCULATED":
            payslip.approve(user=approved_by)

    return payroll_run


@transaction.atomic
def post_payroll_run(
    *,
    payroll_run: PayrollRun,
    posted_by,
) -> PayrollRun:
    """
    Post approved payroll run.

    Accounting integration comes later.
    """

    payroll_run.post(user=posted_by)
    return payroll_run


@transaction.atomic
def cancel_payroll_run(
    *,
    payroll_run: PayrollRun,
    cancelled_by,
    note: str = "",
) -> PayrollRun:
    """
    Cancel payroll run and cancel non-paid payslips.
    """

    payroll_run.cancel(
        user=cancelled_by,
        note=note,
    )

    for payslip in payroll_run.payslips.all():
        if payslip.status != "PAID":
            payslip.cancel(
                user=cancelled_by,
                note=note,
            )

    return payroll_run