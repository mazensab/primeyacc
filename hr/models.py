# ============================================================
# 📂 hr/models.py
# 🧠 PrimeyAcc | HR Models V1.3
# ------------------------------------------------------------
# ✅ HR employees foundation
# ✅ Company-level tenant isolation
# ✅ Optional branch-level assignment
# ✅ Optional user account link
# ✅ Employee status lifecycle
# ✅ Attendance records foundation
# ✅ Attendance check-in / check-out lifecycle
# ✅ Attendance total minutes calculation
# ✅ Audit fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Employee = موظف داخل شركة واحدة فقط
# - AttendanceRecord = سجل حضور وانصراف لموظف داخل شركة واحدة فقط
# - لا يتم قبول company_id من واجهات /company
# - أي Employee يجب أن يرتبط بـ company
# - أي AttendanceRecord يجب أن يرتبط بـ company و employee
# - branch اختياري لكنه يجب أن يكون من نفس الشركة
# - employee داخل AttendanceRecord يجب أن يكون من نفس الشركة
# - لا يجوز لشركة الوصول إلى موظفي أو حضور شركة أخرى
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from companies.models import Branch, Company


class EmployeeStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ON_LEAVE = "ON_LEAVE", "On leave"
    TERMINATED = "TERMINATED", "Terminated"


class EmploymentType(models.TextChoices):
    FULL_TIME = "FULL_TIME", "Full time"
    PART_TIME = "PART_TIME", "Part time"
    CONTRACT = "CONTRACT", "Contract"
    TEMPORARY = "TEMPORARY", "Temporary"
    INTERN = "INTERN", "Intern"


class AttendanceStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"
    MISSING_CHECK_OUT = "MISSING_CHECK_OUT", "Missing check-out"
    CANCELLED = "CANCELLED", "Cancelled"


class AttendanceSource(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    WEB = "WEB", "Web"
    MOBILE = "MOBILE", "Mobile"
    DEVICE = "DEVICE", "Device"
    API = "API", "API"


class Employee(models.Model):
    """
    Company employee.

    This model is the HR foundation for PrimeyAcc.
    Every employee is scoped to one company and can optionally be linked
    to a branch and to a Django user account.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="employees",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="employees",
        db_index=True,
        verbose_name="Branch",
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="employee_profile",
        verbose_name="User account",
    )

    employee_number = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Employee number",
        help_text="Unique employee number inside the same company.",
    )

    first_name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="First name",
    )
    middle_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Middle name",
    )
    last_name = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Last name",
    )

    display_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Display name",
    )

    job_title = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Job title",
    )
    department_name = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Department name",
    )

    employment_type = models.CharField(
        max_length=30,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
        db_index=True,
        verbose_name="Employment type",
    )
    status = models.CharField(
        max_length=30,
        choices=EmployeeStatus.choices,
        default=EmployeeStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    hire_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Hire date",
    )
    termination_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Termination date",
    )

    email = models.EmailField(
        blank=True,
        db_index=True,
        verbose_name="Email",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Phone",
    )
    mobile = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Mobile",
    )

    national_id = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="National ID / Iqama",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_hr_employees",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_hr_employees",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Employee"
        verbose_name_plural = "Employees"
        ordering = ["company_id", "employee_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee_number"],
                name="unique_employee_number_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "national_id"],
                condition=~models.Q(national_id=""),
                name="unique_employee_national_id_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status", "is_active"]),
            models.Index(fields=["company", "branch", "status"]),
            models.Index(fields=["company", "department_name"]),
            models.Index(fields=["company", "job_title"]),
            models.Index(fields=["company", "hire_date"]),
            models.Index(fields=["employee_number"]),
            models.Index(fields=["national_id"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee_number} - {self.name}"

    @property
    def name(self) -> str:
        if self.display_name:
            return self.display_name

        parts = [
            self.first_name,
            self.middle_name,
            self.last_name,
        ]
        return " ".join([part for part in parts if part]).strip()

    def clean(self) -> None:
        if self.branch and self.branch.company_id != self.company_id:
            raise ValidationError(
                {"branch": "Branch must belong to the same employee company."}
            )

        if self.termination_date and self.hire_date and self.termination_date < self.hire_date:
            raise ValidationError(
                {"termination_date": "Termination date cannot be before hire date."}
            )

        if self.status == EmployeeStatus.TERMINATED and not self.termination_date:
            raise ValidationError(
                {"termination_date": "Termination date is required for terminated employees."}
            )

    def save(self, *args, **kwargs):
        if not self.display_name:
            parts = [
                self.first_name,
                self.middle_name,
                self.last_name,
            ]
            self.display_name = " ".join([part for part in parts if part]).strip()

        if self.status in [EmployeeStatus.INACTIVE, EmployeeStatus.TERMINATED]:
            self.is_active = False

        if self.status in [EmployeeStatus.ACTIVE, EmployeeStatus.ON_LEAVE]:
            self.is_active = True

        self.full_clean()
        super().save(*args, **kwargs)

    def activate(self, user=None) -> None:
        self.status = EmployeeStatus.ACTIVE
        self.is_active = True
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )

    def deactivate(self, user=None) -> None:
        self.status = EmployeeStatus.INACTIVE
        self.is_active = False
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "is_active",
                "updated_by",
                "updated_at",
            ]
        )


class AttendanceRecord(models.Model):
    """
    Company employee attendance record.

    This model is the attendance foundation for PrimeyAcc.
    Every attendance record is scoped to one company and one employee.
    Branch is optional, but if provided it must belong to the same company.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        db_index=True,
        verbose_name="Company",
    )
    branch = models.ForeignKey(
        Branch,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="attendance_records",
        db_index=True,
        verbose_name="Branch",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="attendance_records",
        db_index=True,
        verbose_name="Employee",
    )

    work_date = models.DateField(
        db_index=True,
        verbose_name="Work date",
        help_text="Local work date based on check-in time.",
    )

    check_in_at = models.DateTimeField(
        db_index=True,
        verbose_name="Check-in at",
    )
    check_out_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Check-out at",
    )

    status = models.CharField(
        max_length=30,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.OPEN,
        db_index=True,
        verbose_name="Status",
    )
    source = models.CharField(
        max_length=30,
        choices=AttendanceSource.choices,
        default=AttendanceSource.MANUAL,
        db_index=True,
        verbose_name="Source",
    )

    total_minutes = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Total minutes",
    )

    check_in_note = models.TextField(
        blank=True,
        verbose_name="Check-in note",
    )
    check_out_note = models.TextField(
        blank=True,
        verbose_name="Check-out note",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_hr_attendance_records",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_hr_attendance_records",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Attendance record"
        verbose_name_plural = "Attendance records"
        ordering = ["company_id", "-work_date", "-check_in_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["employee"],
                condition=models.Q(check_out_at__isnull=True)
                & ~models.Q(status=AttendanceStatus.CANCELLED),
                name="unique_open_attendance_per_employee",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "work_date"]),
            models.Index(fields=["company", "employee", "work_date"]),
            models.Index(fields=["company", "branch", "work_date"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["employee", "status"]),
            models.Index(fields=["check_in_at"]),
            models.Index(fields=["check_out_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee.employee_number} - {self.work_date} - {self.status}"

    @property
    def is_open(self) -> bool:
        return self.status == AttendanceStatus.OPEN and self.check_out_at is None

    @property
    def total_hours(self) -> float:
        if not self.total_minutes:
            return 0.0
        return round(self.total_minutes / 60, 2)

    def clean(self) -> None:
        if self.employee and self.employee.company_id != self.company_id:
            raise ValidationError(
                {"employee": "Employee must belong to the same attendance company."}
            )

        if self.branch and self.branch.company_id != self.company_id:
            raise ValidationError(
                {"branch": "Branch must belong to the same attendance company."}
            )

        if self.branch and self.employee and self.employee.company_id != self.branch.company_id:
            raise ValidationError(
                {"branch": "Branch must belong to the same employee company."}
            )

        if self.check_out_at and self.check_out_at < self.check_in_at:
            raise ValidationError(
                {"check_out_at": "Check-out time cannot be before check-in time."}
            )

        if self.status == AttendanceStatus.CLOSED and not self.check_out_at:
            raise ValidationError(
                {"check_out_at": "Check-out time is required for closed attendance records."}
            )

        if self.status == AttendanceStatus.OPEN and self.check_out_at:
            raise ValidationError(
                {"status": "Open attendance records cannot have check-out time."}
            )

    def _calculate_total_minutes(self) -> int:
        if not self.check_in_at or not self.check_out_at:
            return 0

        duration = self.check_out_at - self.check_in_at
        total_seconds = max(int(duration.total_seconds()), 0)
        return total_seconds // 60

    def save(self, *args, **kwargs):
        if self.employee and not self.company_id:
            self.company = self.employee.company

        if self.employee and not self.branch_id and self.employee.branch_id:
            self.branch = self.employee.branch

        if self.check_in_at and not self.work_date:
            self.work_date = timezone.localtime(self.check_in_at).date()

        if self.status != AttendanceStatus.CANCELLED:
            if self.check_out_at:
                self.status = AttendanceStatus.CLOSED
            elif not self.check_out_at:
                self.status = AttendanceStatus.OPEN

        self.total_minutes = self._calculate_total_minutes()

        self.full_clean()
        super().save(*args, **kwargs)

    def check_out(self, *, check_out_at=None, note: str = "", user=None) -> None:
        self.check_out_at = check_out_at or timezone.now()
        self.check_out_note = note or self.check_out_note
        self.status = AttendanceStatus.CLOSED
        if user:
            self.updated_by = user
        self.save()

    def mark_missing_check_out(self, *, user=None) -> None:
        self.status = AttendanceStatus.MISSING_CHECK_OUT
        if user:
            self.updated_by = user
        self.full_clean()
        super().save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

    def cancel(self, *, note: str = "", user=None) -> None:
        self.status = AttendanceStatus.CANCELLED
        self.notes = note or self.notes
        if user:
            self.updated_by = user
        self.save()

# ============================================================
# 🏖️ HR Leave Management Models
# ============================================================


class LeaveTypeUnit(models.TextChoices):
    DAYS = "DAYS", "Days"
    HOURS = "HOURS", "Hours"


class LeaveRequestStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    CANCELLED = "CANCELLED", "Cancelled"


class LeaveType(models.Model):
    """
    Company-scoped leave type.

    Examples:
    - Annual Leave
    - Sick Leave
    - Emergency Leave
    - Unpaid Leave
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="leave_types",
    )

    name = models.CharField(max_length=150)
    code = models.CharField(max_length=50)

    unit = models.CharField(
        max_length=20,
        choices=LeaveTypeUnit.choices,
        default=LeaveTypeUnit.DAYS,
    )

    annual_allowance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Default yearly allowance for this leave type.",
    )

    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    allow_half_day = models.BooleanField(default=False)
    allow_negative_balance = models.BooleanField(default=False)

    is_active = models.BooleanField(default=True)

    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_leave_types",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_leave_types",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Leave Type"
        verbose_name_plural = "Leave Types"
        ordering = ["company_id", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_leave_type_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.company} - {self.name}"

    def clean(self):
        super().clean()

        if self.annual_allowance < 0:
            raise ValidationError(
                {"annual_allowance": "Annual allowance cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        super().save(*args, **kwargs)


class LeaveRequest(models.Model):
    """
    Company-scoped employee leave request.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="leave_requests",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="leave_requests",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.PROTECT,
        related_name="leave_requests",
    )

    start_date = models.DateField()
    end_date = models.DateField()

    requested_units = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        help_text="Requested leave amount in leave type unit.",
    )

    status = models.CharField(
        max_length=20,
        choices=LeaveRequestStatus.choices,
        default=LeaveRequestStatus.DRAFT,
        db_index=True,
    )

    reason = models.TextField(blank=True)
    employee_note = models.TextField(blank=True)
    manager_note = models.TextField(blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_leave_requests",
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_leave_requests",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="cancelled_leave_requests",
    )

    extra_data = models.JSONField(default=dict, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_leave_requests",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_leave_requests",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Leave Request"
        verbose_name_plural = "Leave Requests"
        ordering = ["-start_date", "-id"]
        indexes = [
            models.Index(fields=["company", "employee"]),
            models.Index(fields=["company", "leave_type"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee} - {self.leave_type} - {self.start_date} to {self.end_date}"

    def clean(self):
        super().clean()

        if self.employee_id and self.company_id:
            if self.employee.company_id != self.company_id:
                raise ValidationError(
                    {"employee": "Employee must belong to the same company."}
                )

        if self.leave_type_id and self.company_id:
            if self.leave_type.company_id != self.company_id:
                raise ValidationError(
                    {"leave_type": "Leave type must belong to the same company."}
                )

        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError(
                {"end_date": "End date cannot be before start date."}
            )

        if self.requested_units <= 0:
            raise ValidationError(
                {"requested_units": "Requested units must be greater than zero."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def submit(self, *, user=None):
        if self.status != LeaveRequestStatus.DRAFT:
            raise ValidationError(
                {"status": "Only draft leave requests can be submitted."}
            )

        self.status = LeaveRequestStatus.SUBMITTED
        self.submitted_at = timezone.now()
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "submitted_at",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def approve(self, *, user=None, note: str = ""):
        if self.status != LeaveRequestStatus.SUBMITTED:
            raise ValidationError(
                {"status": "Only submitted leave requests can be approved."}
            )

        self.status = LeaveRequestStatus.APPROVED
        self.approved_at = timezone.now()
        self.approved_by = user
        self.manager_note = note or self.manager_note
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "manager_note",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def reject(self, *, user=None, note: str = ""):
        if self.status != LeaveRequestStatus.SUBMITTED:
            raise ValidationError(
                {"status": "Only submitted leave requests can be rejected."}
            )

        self.status = LeaveRequestStatus.REJECTED
        self.rejected_at = timezone.now()
        self.rejected_by = user
        self.manager_note = note or self.manager_note
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "rejected_at",
                "rejected_by",
                "manager_note",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def cancel(self, *, user=None, note: str = ""):
        if self.status in [
            LeaveRequestStatus.APPROVED,
            LeaveRequestStatus.REJECTED,
            LeaveRequestStatus.CANCELLED,
        ]:
            raise ValidationError(
                {"status": "This leave request cannot be cancelled."}
            )

        self.status = LeaveRequestStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        self.manager_note = note or self.manager_note
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "manager_note",
                "updated_by",
                "updated_at",
            ]
        )
        return self


class LeaveBalance(models.Model):
    """
    Company-scoped leave balance per employee and leave type.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )
    leave_type = models.ForeignKey(
        LeaveType,
        on_delete=models.CASCADE,
        related_name="leave_balances",
    )

    year = models.PositiveIntegerField()

    opening_balance = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    accrued = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    used = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )
    adjusted = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
    )

    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_leave_balances",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_leave_balances",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Leave Balance"
        verbose_name_plural = "Leave Balances"
        ordering = ["company_id", "year", "employee_id", "leave_type_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee", "leave_type", "year"],
                name="unique_leave_balance_per_employee_type_year",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "employee", "year"]),
            models.Index(fields=["company", "leave_type", "year"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee} - {self.leave_type} - {self.year}"

    @property
    def available_balance(self):
        return self.opening_balance + self.accrued + self.adjusted - self.used

    def clean(self):
        super().clean()

        if self.employee_id and self.company_id:
            if self.employee.company_id != self.company_id:
                raise ValidationError(
                    {"employee": "Employee must belong to the same company."}
                )

        if self.leave_type_id and self.company_id:
            if self.leave_type.company_id != self.company_id:
                raise ValidationError(
                    {"leave_type": "Leave type must belong to the same company."}
                )

        if self.year < 2000:
            raise ValidationError(
                {"year": "Year must be valid."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


# ============================================================
# ?? HR Payroll Foundation Models
# ============================================================


class SalaryComponentType(models.TextChoices):
    EARNING = "EARNING", "Earning"
    DEDUCTION = "DEDUCTION", "Deduction"


class SalaryComponentCalculationType(models.TextChoices):
    FIXED = "FIXED", "Fixed"
    PERCENTAGE = "PERCENTAGE", "Percentage"


class PayrollPeriodStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"


class PayrollRunStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CALCULATED = "CALCULATED", "Calculated"
    APPROVED = "APPROVED", "Approved"
    POSTED = "POSTED", "Posted"
    CANCELLED = "CANCELLED", "Cancelled"


class PayslipStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    CALCULATED = "CALCULATED", "Calculated"
    APPROVED = "APPROVED", "Approved"
    PAID = "PAID", "Paid"
    CANCELLED = "CANCELLED", "Cancelled"


class SalaryComponent(models.Model):
    """
    Company-scoped salary component.

    Examples:
    - Basic Salary
    - Housing Allowance
    - Transport Allowance
    - GOSI Deduction
    - Absence Deduction
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="salary_components",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Name",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Code",
    )

    component_type = models.CharField(
        max_length=30,
        choices=SalaryComponentType.choices,
        default=SalaryComponentType.EARNING,
        db_index=True,
        verbose_name="Component type",
    )
    calculation_type = models.CharField(
        max_length=30,
        choices=SalaryComponentCalculationType.choices,
        default=SalaryComponentCalculationType.FIXED,
        db_index=True,
        verbose_name="Calculation type",
    )

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Fixed amount",
    )
    percentage = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=0,
        verbose_name="Percentage",
        help_text="Percentage value used when calculation type is percentage.",
    )

    is_taxable = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Taxable",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort order",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_salary_components",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_salary_components",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Salary component"
        verbose_name_plural = "Salary components"
        ordering = ["company_id", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_salary_component_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "component_type"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self) -> str:
        return f"{self.company} - {self.code} - {self.name}"

    def clean(self):
        super().clean()

        if self.amount < 0:
            raise ValidationError(
                {"amount": "Amount cannot be negative."}
            )

        if self.percentage < 0:
            raise ValidationError(
                {"percentage": "Percentage cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()
        self.full_clean()
        super().save(*args, **kwargs)


class EmployeeSalaryProfile(models.Model):
    """
    Company-scoped salary profile for an employee.

    This is the current payroll contract snapshot used to generate payslips.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="employee_salary_profiles",
        db_index=True,
        verbose_name="Company",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="salary_profiles",
        db_index=True,
        verbose_name="Employee",
    )

    basic_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        db_index=True,
        verbose_name="Basic salary",
    )
    housing_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Housing allowance",
    )
    transport_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Transport allowance",
    )
    other_allowance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Other allowance",
    )

    currency = models.CharField(
        max_length=10,
        default="SAR",
        db_index=True,
        verbose_name="Currency",
    )

    bank_name = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Bank name",
    )
    bank_account_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Bank account number",
    )
    iban = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="IBAN",
    )

    effective_from = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Effective from",
    )
    effective_to = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Effective to",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_employee_salary_profiles",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_employee_salary_profiles",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Employee salary profile"
        verbose_name_plural = "Employee salary profiles"
        ordering = ["company_id", "employee__employee_number", "-effective_from", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "employee"],
                condition=models.Q(is_active=True),
                name="unique_active_salary_profile_per_employee",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "employee", "is_active"]),
            models.Index(fields=["company", "effective_from"]),
            models.Index(fields=["company", "currency"]),
            models.Index(fields=["iban"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee} - {self.basic_salary} {self.currency}"

    @property
    def gross_salary(self):
        return (
            self.basic_salary
            + self.housing_allowance
            + self.transport_allowance
            + self.other_allowance
        )

    def clean(self):
        super().clean()

        if self.employee_id and self.company_id:
            if self.employee.company_id != self.company_id:
                raise ValidationError(
                    {"employee": "Employee must belong to the same company."}
                )

        if self.effective_to and self.effective_from and self.effective_to < self.effective_from:
            raise ValidationError(
                {"effective_to": "Effective to cannot be before effective from."}
            )

        money_fields = {
            "basic_salary": self.basic_salary,
            "housing_allowance": self.housing_allowance,
            "transport_allowance": self.transport_allowance,
            "other_allowance": self.other_allowance,
        }
        for field_name, value in money_fields.items():
            if value < 0:
                raise ValidationError(
                    {field_name: "Amount cannot be negative."}
                )

    def save(self, *args, **kwargs):
        self.currency = (self.currency or "SAR").strip().upper()
        self.full_clean()
        super().save(*args, **kwargs)


class PayrollPeriod(models.Model):
    """
    Company-scoped payroll period.

    Usually one period per company/month.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payroll_periods",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Name",
    )

    year = models.PositiveIntegerField(
        db_index=True,
        verbose_name="Year",
    )
    month = models.PositiveSmallIntegerField(
        db_index=True,
        verbose_name="Month",
    )

    start_date = models.DateField(
        db_index=True,
        verbose_name="Start date",
    )
    end_date = models.DateField(
        db_index=True,
        verbose_name="End date",
    )
    payment_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Payment date",
    )

    status = models.CharField(
        max_length=30,
        choices=PayrollPeriodStatus.choices,
        default=PayrollPeriodStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payroll_periods",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_payroll_periods",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Payroll period"
        verbose_name_plural = "Payroll periods"
        ordering = ["company_id", "-year", "-month"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "year", "month"],
                name="unique_payroll_period_per_company_month",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "year", "month"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.company} - {self.year}-{str(self.month).zfill(2)}"

    def clean(self):
        super().clean()

        if self.month < 1 or self.month > 12:
            raise ValidationError(
                {"month": "Month must be between 1 and 12."}
            )

        if self.year < 2000:
            raise ValidationError(
                {"year": "Year must be valid."}
            )

        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError(
                {"end_date": "End date cannot be before start date."}
            )

        if self.payment_date and self.start_date and self.payment_date < self.start_date:
            raise ValidationError(
                {"payment_date": "Payment date cannot be before period start date."}
            )

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = f"Payroll {self.year}-{str(self.month).zfill(2)}"

        self.full_clean()
        super().save(*args, **kwargs)

    def open(self, *, user=None):
        if self.status == PayrollPeriodStatus.CLOSED:
            raise ValidationError(
                {"status": "Closed payroll periods cannot be reopened."}
            )

        self.status = PayrollPeriodStatus.OPEN
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def close(self, *, user=None):
        if self.status != PayrollPeriodStatus.OPEN:
            raise ValidationError(
                {"status": "Only open payroll periods can be closed."}
            )

        self.status = PayrollPeriodStatus.CLOSED
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )
        return self


class PayrollRun(models.Model):
    """
    Company-scoped payroll run for one payroll period.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payroll_runs",
        db_index=True,
        verbose_name="Company",
    )
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.PROTECT,
        related_name="payroll_runs",
        db_index=True,
        verbose_name="Payroll period",
    )

    run_number = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Run number",
    )
    name = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Name",
    )

    status = models.CharField(
        max_length=30,
        choices=PayrollRunStatus.choices,
        default=PayrollRunStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    total_employees = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Total employees",
    )
    total_earnings = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Total earnings",
    )
    total_deductions = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Total deductions",
    )
    net_pay = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Net pay",
    )

    calculated_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Calculated at",
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Approved at",
    )
    posted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Posted at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    calculated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="calculated_payroll_runs",
        verbose_name="Calculated by",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="approved_payroll_runs",
        verbose_name="Approved by",
    )
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="posted_payroll_runs",
        verbose_name="Posted by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_payroll_runs",
        verbose_name="Cancelled by",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payroll_runs",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_payroll_runs",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Payroll run"
        verbose_name_plural = "Payroll runs"
        ordering = ["company_id", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "run_number"],
                name="unique_payroll_run_number_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "period"],
                name="unique_payroll_run_per_company_period",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "period"]),
            models.Index(fields=["company", "run_number"]),
            models.Index(fields=["calculated_at"]),
            models.Index(fields=["approved_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.run_number} - {self.status}"

    def clean(self):
        super().clean()

        if self.period_id and self.company_id:
            if self.period.company_id != self.company_id:
                raise ValidationError(
                    {"period": "Payroll period must belong to the same company."}
                )

        money_fields = {
            "total_earnings": self.total_earnings,
            "total_deductions": self.total_deductions,
            "net_pay": self.net_pay,
        }
        for field_name, value in money_fields.items():
            if value < 0:
                raise ValidationError(
                    {field_name: "Amount cannot be negative."}
                )

    def save(self, *args, **kwargs):
        self.run_number = (self.run_number or "").strip().upper()

        if not self.name and self.period_id:
            self.name = f"Payroll Run {self.run_number}"

        self.full_clean()
        super().save(*args, **kwargs)

    def mark_calculated(self, *, user=None):
        if self.status not in [PayrollRunStatus.DRAFT, PayrollRunStatus.CALCULATED]:
            raise ValidationError(
                {"status": "Only draft payroll runs can be calculated."}
            )

        self.status = PayrollRunStatus.CALCULATED
        self.calculated_at = timezone.now()
        self.calculated_by = user
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "calculated_at",
                "calculated_by",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def approve(self, *, user=None):
        if self.status != PayrollRunStatus.CALCULATED:
            raise ValidationError(
                {"status": "Only calculated payroll runs can be approved."}
            )

        self.status = PayrollRunStatus.APPROVED
        self.approved_at = timezone.now()
        self.approved_by = user
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def post(self, *, user=None):
        if self.status != PayrollRunStatus.APPROVED:
            raise ValidationError(
                {"status": "Only approved payroll runs can be posted."}
            )

        self.status = PayrollRunStatus.POSTED
        self.posted_at = timezone.now()
        self.posted_by = user
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "posted_at",
                "posted_by",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def cancel(self, *, user=None, note: str = ""):
        if self.status == PayrollRunStatus.POSTED:
            raise ValidationError(
                {"status": "Posted payroll runs cannot be cancelled."}
            )

        self.status = PayrollRunStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        self.notes = note or self.notes
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "notes",
                "updated_by",
                "updated_at",
            ]
        )
        return self


class Payslip(models.Model):
    """
    Company-scoped employee payslip generated by a payroll run.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payslips",
        db_index=True,
        verbose_name="Company",
    )
    payroll_run = models.ForeignKey(
        PayrollRun,
        on_delete=models.CASCADE,
        related_name="payslips",
        db_index=True,
        verbose_name="Payroll run",
    )
    period = models.ForeignKey(
        PayrollPeriod,
        on_delete=models.PROTECT,
        related_name="payslips",
        db_index=True,
        verbose_name="Payroll period",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="payslips",
        db_index=True,
        verbose_name="Employee",
    )
    salary_profile = models.ForeignKey(
        EmployeeSalaryProfile,
        on_delete=models.SET_NULL,
        related_name="payslips",
        blank=True,
        null=True,
        verbose_name="Salary profile",
    )

    payslip_number = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Payslip number",
    )

    status = models.CharField(
        max_length=30,
        choices=PayslipStatus.choices,
        default=PayslipStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    basic_salary = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Basic salary",
    )
    total_earnings = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Total earnings",
    )
    total_deductions = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Total deductions",
    )
    net_pay = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        db_index=True,
        verbose_name="Net pay",
    )

    currency = models.CharField(
        max_length=10,
        default="SAR",
        db_index=True,
        verbose_name="Currency",
    )

    calculated_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Calculated at",
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Approved at",
    )
    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Paid at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="approved_payslips",
        verbose_name="Approved by",
    )
    paid_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="paid_payslips",
        verbose_name="Paid by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_payslips",
        verbose_name="Cancelled by",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payslips",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_payslips",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Payslip"
        verbose_name_plural = "Payslips"
        ordering = ["company_id", "-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "payslip_number"],
                name="unique_payslip_number_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "payroll_run", "employee"],
                name="unique_payslip_per_run_employee",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "period"]),
            models.Index(fields=["company", "employee"]),
            models.Index(fields=["company", "payroll_run"]),
            models.Index(fields=["payslip_number"]),
        ]

    def __str__(self) -> str:
        return f"{self.payslip_number} - {self.employee}"

    def clean(self):
        super().clean()

        if self.payroll_run_id and self.company_id:
            if self.payroll_run.company_id != self.company_id:
                raise ValidationError(
                    {"payroll_run": "Payroll run must belong to the same company."}
                )

        if self.period_id and self.company_id:
            if self.period.company_id != self.company_id:
                raise ValidationError(
                    {"period": "Payroll period must belong to the same company."}
                )

        if self.employee_id and self.company_id:
            if self.employee.company_id != self.company_id:
                raise ValidationError(
                    {"employee": "Employee must belong to the same company."}
                )

        if self.salary_profile_id and self.company_id:
            if self.salary_profile.company_id != self.company_id:
                raise ValidationError(
                    {"salary_profile": "Salary profile must belong to the same company."}
                )

        if self.salary_profile_id and self.employee_id:
            if self.salary_profile.employee_id != self.employee_id:
                raise ValidationError(
                    {"salary_profile": "Salary profile must belong to the same employee."}
                )

        money_fields = {
            "basic_salary": self.basic_salary,
            "total_earnings": self.total_earnings,
            "total_deductions": self.total_deductions,
            "net_pay": self.net_pay,
        }
        for field_name, value in money_fields.items():
            if value < 0:
                raise ValidationError(
                    {field_name: "Amount cannot be negative."}
                )

    def save(self, *args, **kwargs):
        self.payslip_number = (self.payslip_number or "").strip().upper()
        self.currency = (self.currency or "SAR").strip().upper()

        if self.payroll_run_id and not self.period_id:
            self.period = self.payroll_run.period

        self.full_clean()
        super().save(*args, **kwargs)

    def mark_calculated(self, *, user=None):
        self.status = PayslipStatus.CALCULATED
        self.calculated_at = timezone.now()
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "calculated_at",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def approve(self, *, user=None):
        if self.status != PayslipStatus.CALCULATED:
            raise ValidationError(
                {"status": "Only calculated payslips can be approved."}
            )

        self.status = PayslipStatus.APPROVED
        self.approved_at = timezone.now()
        self.approved_by = user
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def mark_paid(self, *, user=None):
        if self.status != PayslipStatus.APPROVED:
            raise ValidationError(
                {"status": "Only approved payslips can be marked as paid."}
            )

        self.status = PayslipStatus.PAID
        self.paid_at = timezone.now()
        self.paid_by = user
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "paid_at",
                "paid_by",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def cancel(self, *, user=None, note: str = ""):
        if self.status == PayslipStatus.PAID:
            raise ValidationError(
                {"status": "Paid payslips cannot be cancelled."}
            )

        self.status = PayslipStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        self.notes = note or self.notes
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "notes",
                "updated_by",
                "updated_at",
            ]
        )
        return self


class PayslipItem(models.Model):
    """
    Company-scoped payslip earning/deduction line.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="payslip_items",
        db_index=True,
        verbose_name="Company",
    )
    payslip = models.ForeignKey(
        Payslip,
        on_delete=models.CASCADE,
        related_name="items",
        db_index=True,
        verbose_name="Payslip",
    )
    component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.SET_NULL,
        related_name="payslip_items",
        blank=True,
        null=True,
        verbose_name="Salary component",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Name",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Code",
    )
    component_type = models.CharField(
        max_length=30,
        choices=SalaryComponentType.choices,
        db_index=True,
        verbose_name="Component type",
    )

    amount = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=0,
        verbose_name="Amount",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_payslip_items",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_payslip_items",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Payslip item"
        verbose_name_plural = "Payslip items"
        ordering = ["company_id", "payslip_id", "component_type", "id"]
        indexes = [
            models.Index(fields=["company", "payslip"]),
            models.Index(fields=["company", "component_type"]),
            models.Index(fields=["company", "code"]),
        ]

    def __str__(self) -> str:
        return f"{self.payslip} - {self.code} - {self.amount}"

    def clean(self):
        super().clean()

        if self.payslip_id and self.company_id:
            if self.payslip.company_id != self.company_id:
                raise ValidationError(
                    {"payslip": "Payslip must belong to the same company."}
                )

        if self.component_id and self.company_id:
            if self.component.company_id != self.company_id:
                raise ValidationError(
                    {"component": "Salary component must belong to the same company."}
                )

        if self.amount < 0:
            raise ValidationError(
                {"amount": "Amount cannot be negative."}
            )

    def save(self, *args, **kwargs):
        if self.component_id:
            if not self.name:
                self.name = self.component.name
            if not self.code:
                self.code = self.component.code
            if not self.component_type:
                self.component_type = self.component.component_type

        self.code = (self.code or "").strip().upper()
        self.name = (self.name or "").strip()

        self.full_clean()
        super().save(*args, **kwargs)

# ============================================================
# ?? HR Performance & Appraisals Foundation Models
# ============================================================


class PerformanceCycleStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    OPEN = "OPEN", "Open"
    CLOSED = "CLOSED", "Closed"
    CANCELLED = "CANCELLED", "Cancelled"


class PerformanceReviewStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved"
    CANCELLED = "CANCELLED", "Cancelled"


class PerformanceGoalStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    ACTIVE = "ACTIVE", "Active"
    COMPLETED = "COMPLETED", "Completed"
    CANCELLED = "CANCELLED", "Cancelled"


class PerformanceGoalPriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    CRITICAL = "CRITICAL", "Critical"


class PerformanceCycle(models.Model):
    """
    Company-scoped performance review cycle.

    Examples:
    - 2026 Annual Review
    - 2026 Q1 Performance Review
    - Probation Evaluation Cycle
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="performance_cycles",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Name",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Code",
    )

    start_date = models.DateField(
        db_index=True,
        verbose_name="Start date",
    )
    end_date = models.DateField(
        db_index=True,
        verbose_name="End date",
    )

    status = models.CharField(
        max_length=30,
        choices=PerformanceCycleStatus.choices,
        default=PerformanceCycleStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    description = models.TextField(
        blank=True,
        verbose_name="Description",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_performance_cycles",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_performance_cycles",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Performance cycle"
        verbose_name_plural = "Performance cycles"
        ordering = ["company_id", "-start_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="uniq_perf_cycle_code_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "start_date", "end_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.company} - {self.code} - {self.name}"

    def clean(self):
        super().clean()

        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError(
                {"end_date": "End date cannot be before start date."}
            )

    def save(self, *args, **kwargs):
        self.name = (self.name or "").strip()

        if not self.code:
            self.code = self.name

        self.code = (self.code or "").strip().upper().replace(" ", "-")

        self.full_clean()
        super().save(*args, **kwargs)

    def open(self, *, user=None):
        if self.status == PerformanceCycleStatus.CLOSED:
            raise ValidationError(
                {"status": "Closed performance cycles cannot be reopened."}
            )

        if self.status == PerformanceCycleStatus.CANCELLED:
            raise ValidationError(
                {"status": "Cancelled performance cycles cannot be opened."}
            )

        self.status = PerformanceCycleStatus.OPEN
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def close(self, *, user=None):
        if self.status != PerformanceCycleStatus.OPEN:
            raise ValidationError(
                {"status": "Only open performance cycles can be closed."}
            )

        self.status = PerformanceCycleStatus.CLOSED
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def cancel(self, *, user=None, note: str = ""):
        if self.status == PerformanceCycleStatus.CLOSED:
            raise ValidationError(
                {"status": "Closed performance cycles cannot be cancelled."}
            )

        self.status = PerformanceCycleStatus.CANCELLED
        self.notes = note or self.notes
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "notes",
                "updated_by",
                "updated_at",
            ]
        )
        return self


class PerformanceCriterion(models.Model):
    """
    Company-scoped performance criterion.

    Examples:
    - Quality of Work
    - Productivity
    - Teamwork
    - Attendance
    - Leadership
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="performance_criteria",
        db_index=True,
        verbose_name="Company",
    )

    name = models.CharField(
        max_length=150,
        db_index=True,
        verbose_name="Name",
    )
    code = models.CharField(
        max_length=50,
        db_index=True,
        verbose_name="Code",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description",
    )

    max_score = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=5,
        verbose_name="Maximum score",
    )
    weight = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=0,
        verbose_name="Weight",
        help_text="Weight percentage used in total performance score.",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )
    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        verbose_name="Sort order",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_performance_criteria",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_performance_criteria",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Performance criterion"
        verbose_name_plural = "Performance criteria"
        ordering = ["company_id", "sort_order", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="uniq_perf_criterion_code_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "code"]),
            models.Index(fields=["company", "is_active"]),
            models.Index(fields=["company", "sort_order"]),
        ]

    def __str__(self) -> str:
        return f"{self.company} - {self.code} - {self.name}"

    def clean(self):
        super().clean()

        if self.max_score <= 0:
            raise ValidationError(
                {"max_score": "Maximum score must be greater than zero."}
            )

        if self.weight < 0:
            raise ValidationError(
                {"weight": "Weight cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.name = (self.name or "").strip()

        if not self.code:
            self.code = self.name

        self.code = (self.code or "").strip().upper().replace(" ", "-")

        self.full_clean()
        super().save(*args, **kwargs)


class EmployeePerformanceReview(models.Model):
    """
    Company-scoped employee performance review.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="performance_reviews",
        db_index=True,
        verbose_name="Company",
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.PROTECT,
        related_name="reviews",
        db_index=True,
        verbose_name="Performance cycle",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.PROTECT,
        related_name="performance_reviews",
        db_index=True,
        verbose_name="Employee",
    )

    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="reviewed_performance_reviews",
        verbose_name="Reviewer",
    )

    status = models.CharField(
        max_length=30,
        choices=PerformanceReviewStatus.choices,
        default=PerformanceReviewStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    review_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Review date",
    )

    overall_score = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=0,
        db_index=True,
        verbose_name="Overall score",
    )
    final_rating = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        verbose_name="Final rating",
    )

    employee_comments = models.TextField(
        blank=True,
        verbose_name="Employee comments",
    )
    reviewer_comments = models.TextField(
        blank=True,
        verbose_name="Reviewer comments",
    )
    manager_comments = models.TextField(
        blank=True,
        verbose_name="Manager comments",
    )

    submitted_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Submitted at",
    )
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Approved at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="approved_performance_reviews",
        verbose_name="Approved by",
    )
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="cancelled_performance_reviews",
        verbose_name="Cancelled by",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_performance_reviews",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_performance_reviews",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Employee performance review"
        verbose_name_plural = "Employee performance reviews"
        ordering = ["company_id", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "cycle", "employee"],
                name="uniq_perf_review_company_cycle_employee",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "cycle"]),
            models.Index(fields=["company", "employee"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "review_date"]),
            models.Index(fields=["overall_score"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee} - {self.cycle} - {self.status}"

    def clean(self):
        super().clean()

        if self.cycle_id and self.company_id:
            if self.cycle.company_id != self.company_id:
                raise ValidationError(
                    {"cycle": "Performance cycle must belong to the same company."}
                )

        if self.employee_id and self.company_id:
            if self.employee.company_id != self.company_id:
                raise ValidationError(
                    {"employee": "Employee must belong to the same company."}
                )

        if self.overall_score < 0:
            raise ValidationError(
                {"overall_score": "Overall score cannot be negative."}
            )

    def save(self, *args, **kwargs):
        self.final_rating = (self.final_rating or "").strip()

        self.full_clean()
        super().save(*args, **kwargs)

    def submit(self, *, user=None):
        if self.status != PerformanceReviewStatus.DRAFT:
            raise ValidationError(
                {"status": "Only draft performance reviews can be submitted."}
            )

        self.status = PerformanceReviewStatus.SUBMITTED
        self.submitted_at = timezone.now()
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "submitted_at",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def approve(self, *, user=None, note: str = ""):
        if self.status != PerformanceReviewStatus.SUBMITTED:
            raise ValidationError(
                {"status": "Only submitted performance reviews can be approved."}
            )

        self.status = PerformanceReviewStatus.APPROVED
        self.approved_at = timezone.now()
        self.approved_by = user
        self.manager_comments = note or self.manager_comments
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "approved_at",
                "approved_by",
                "manager_comments",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def cancel(self, *, user=None, note: str = ""):
        if self.status == PerformanceReviewStatus.APPROVED:
            raise ValidationError(
                {"status": "Approved performance reviews cannot be cancelled."}
            )

        self.status = PerformanceReviewStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.cancelled_by = user
        self.manager_comments = note or self.manager_comments
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "cancelled_by",
                "manager_comments",
                "updated_by",
                "updated_at",
            ]
        )
        return self


class PerformanceReviewScore(models.Model):
    """
    Company-scoped score line for an employee performance review.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="performance_review_scores",
        db_index=True,
        verbose_name="Company",
    )
    review = models.ForeignKey(
        EmployeePerformanceReview,
        on_delete=models.CASCADE,
        related_name="scores",
        db_index=True,
        verbose_name="Performance review",
    )
    criterion = models.ForeignKey(
        PerformanceCriterion,
        on_delete=models.PROTECT,
        related_name="review_scores",
        db_index=True,
        verbose_name="Performance criterion",
    )

    score = models.DecimalField(
        max_digits=8,
        decimal_places=4,
        default=0,
        verbose_name="Score",
    )
    weight = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=0,
        verbose_name="Weight",
    )
    weighted_score = models.DecimalField(
        max_digits=10,
        decimal_places=4,
        default=0,
        verbose_name="Weighted score",
    )

    comments = models.TextField(
        blank=True,
        verbose_name="Comments",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_performance_review_scores",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_performance_review_scores",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Performance review score"
        verbose_name_plural = "Performance review scores"
        ordering = ["company_id", "review_id", "criterion__sort_order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "review", "criterion"],
                name="uniq_perf_score_company_review_criterion",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "review"]),
            models.Index(fields=["company", "criterion"]),
        ]

    def __str__(self) -> str:
        return f"{self.review} - {self.criterion} - {self.score}"

    def clean(self):
        super().clean()

        if self.review_id and self.company_id:
            if self.review.company_id != self.company_id:
                raise ValidationError(
                    {"review": "Performance review must belong to the same company."}
                )

        if self.criterion_id and self.company_id:
            if self.criterion.company_id != self.company_id:
                raise ValidationError(
                    {"criterion": "Performance criterion must belong to the same company."}
                )

        if self.score < 0:
            raise ValidationError(
                {"score": "Score cannot be negative."}
            )

        if self.criterion_id and self.score > self.criterion.max_score:
            raise ValidationError(
                {"score": "Score cannot exceed criterion maximum score."}
            )

        if self.weight < 0:
            raise ValidationError(
                {"weight": "Weight cannot be negative."}
            )

        if self.weighted_score < 0:
            raise ValidationError(
                {"weighted_score": "Weighted score cannot be negative."}
            )

    def save(self, *args, **kwargs):
        if self.criterion_id and not self.weight:
            self.weight = self.criterion.weight

        self.score = Decimal(str(self.score or "0")).quantize(
            Decimal("0.0001"),
            rounding=ROUND_HALF_UP,
        )
        self.weight = Decimal(str(self.weight or "0")).quantize(
            Decimal("0.0001"),
            rounding=ROUND_HALF_UP,
        )
        self.weighted_score = (
            (self.score * self.weight) / Decimal("100")
        ).quantize(
            Decimal("0.0001"),
            rounding=ROUND_HALF_UP,
        )

        self.full_clean()
        super().save(*args, **kwargs)


class EmployeeGoal(models.Model):
    """
    Company-scoped employee goal/objective.

    Goals can optionally be linked to a performance cycle.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="employee_goals",
        db_index=True,
        verbose_name="Company",
    )
    employee = models.ForeignKey(
        Employee,
        on_delete=models.CASCADE,
        related_name="performance_goals",
        db_index=True,
        verbose_name="Employee",
    )
    cycle = models.ForeignKey(
        PerformanceCycle,
        on_delete=models.SET_NULL,
        related_name="goals",
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Performance cycle",
    )

    title = models.CharField(
        max_length=200,
        db_index=True,
        verbose_name="Title",
    )
    description = models.TextField(
        blank=True,
        verbose_name="Description",
    )

    target_value = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Target value",
    )
    actual_value = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Actual value",
    )
    progress_percentage = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        db_index=True,
        verbose_name="Progress percentage",
    )

    priority = models.CharField(
        max_length=30,
        choices=PerformanceGoalPriority.choices,
        default=PerformanceGoalPriority.MEDIUM,
        db_index=True,
        verbose_name="Priority",
    )
    status = models.CharField(
        max_length=30,
        choices=PerformanceGoalStatus.choices,
        default=PerformanceGoalStatus.DRAFT,
        db_index=True,
        verbose_name="Status",
    )

    start_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Start date",
    )
    due_date = models.DateField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Due date",
    )
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Completed at",
    )
    cancelled_at = models.DateTimeField(
        blank=True,
        null=True,
        db_index=True,
        verbose_name="Cancelled at",
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )
    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_employee_goals",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_employee_goals",
        verbose_name="Updated by",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Employee goal"
        verbose_name_plural = "Employee goals"
        ordering = ["company_id", "employee_id", "-created_at"]
        indexes = [
            models.Index(fields=["company", "employee"]),
            models.Index(fields=["company", "cycle"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "priority"]),
            models.Index(fields=["company", "due_date"]),
        ]

    def __str__(self) -> str:
        return f"{self.employee} - {self.title} - {self.status}"

    def clean(self):
        super().clean()

        if self.employee_id and self.company_id:
            if self.employee.company_id != self.company_id:
                raise ValidationError(
                    {"employee": "Employee must belong to the same company."}
                )

        if self.cycle_id and self.company_id:
            if self.cycle.company_id != self.company_id:
                raise ValidationError(
                    {"cycle": "Performance cycle must belong to the same company."}
                )

        if self.due_date and self.start_date and self.due_date < self.start_date:
            raise ValidationError(
                {"due_date": "Due date cannot be before start date."}
            )

        if self.progress_percentage < 0 or self.progress_percentage > 100:
            raise ValidationError(
                {"progress_percentage": "Progress percentage must be between 0 and 100."}
            )

    def save(self, *args, **kwargs):
        self.title = (self.title or "").strip()
        self.full_clean()
        super().save(*args, **kwargs)

    def activate(self, *, user=None):
        if self.status == PerformanceGoalStatus.CANCELLED:
            raise ValidationError(
                {"status": "Cancelled goals cannot be activated."}
            )

        if self.status == PerformanceGoalStatus.COMPLETED:
            raise ValidationError(
                {"status": "Completed goals cannot be activated."}
            )

        self.status = PerformanceGoalStatus.ACTIVE
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def complete(self, *, user=None, note: str = ""):
        if self.status == PerformanceGoalStatus.CANCELLED:
            raise ValidationError(
                {"status": "Cancelled goals cannot be completed."}
            )

        self.status = PerformanceGoalStatus.COMPLETED
        self.progress_percentage = 100
        self.completed_at = timezone.now()
        self.notes = note or self.notes
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "progress_percentage",
                "completed_at",
                "notes",
                "updated_by",
                "updated_at",
            ]
        )
        return self

    def cancel(self, *, user=None, note: str = ""):
        if self.status == PerformanceGoalStatus.COMPLETED:
            raise ValidationError(
                {"status": "Completed goals cannot be cancelled."}
            )

        self.status = PerformanceGoalStatus.CANCELLED
        self.cancelled_at = timezone.now()
        self.notes = note or self.notes
        self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "cancelled_at",
                "notes",
                "updated_by",
                "updated_at",
            ]
        )
        return self

