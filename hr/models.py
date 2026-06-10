# ============================================================
# 📂 hr/models.py
# 🧠 PrimeyAcc | HR Models V1.0
# ------------------------------------------------------------
# ✅ HR employees foundation
# ✅ Company-level tenant isolation
# ✅ Optional branch-level assignment
# ✅ Optional user account link
# ✅ Employee status lifecycle
# ✅ Audit fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Employee = موظف داخل شركة واحدة فقط
# - لا يتم قبول company_id من واجهات /company
# - أي Employee يجب أن يرتبط بـ company
# - branch اختياري لكنه يجب أن يكون من نفس الشركة
# - user اختياري لربط الموظف بحساب دخول
# - لا يجوز لشركة الوصول إلى موظفي شركة أخرى
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

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