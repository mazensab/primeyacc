# ============================================================
# 📂 hr/admin.py
# 🧠 PrimeyAcc | HR Admin V1.4
# ------------------------------------------------------------
# ✅ Employee admin registration
# ✅ AttendanceRecord admin registration
# ✅ LeaveType admin registration
# ✅ LeaveRequest admin registration
# ✅ LeaveBalance admin registration
# ✅ SalaryComponent admin registration
# ✅ EmployeeSalaryProfile admin registration
# ✅ PayrollPeriod admin registration
# ✅ PayrollRun admin registration
# ✅ Payslip admin registration
# ✅ PayslipItem admin registration
# ✅ Company / branch visibility
# ✅ Search and filters for HR operations
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    AttendanceRecord,
    Employee,
    EmployeeSalaryProfile,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
    PayrollPeriod,
    PayrollRun,
    Payslip,
    PayslipItem,
    PerformanceCriterion,
    PerformanceCycle,
    EmployeePerformanceReview,
    EmployeeGoal,
    PerformanceReviewScore,
    SalaryComponent,
)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = [
        "employee_number",
        "name",
        "company",
        "branch",
        "job_title",
        "department_name",
        "employment_type",
        "status",
        "is_active",
        "hire_date",
        "created_at",
    ]
    list_filter = [
        "status",
        "is_active",
        "employment_type",
        "company",
        "branch",
        "department_name",
        "hire_date",
        "created_at",
    ]
    search_fields = [
        "employee_number",
        "first_name",
        "middle_name",
        "last_name",
        "display_name",
        "email",
        "phone",
        "mobile",
        "national_id",
        "job_title",
        "department_name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "branch__name",
        "branch__name_ar",
        "branch__name_en",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "branch",
        "user",
        "created_by",
        "updated_by",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "branch",
                    "user",
                ]
            },
        ),
        (
            "Employee identity",
            {
                "fields": [
                    "employee_number",
                    "first_name",
                    "middle_name",
                    "last_name",
                    "display_name",
                    "national_id",
                ]
            },
        ),
        (
            "Job information",
            {
                "fields": [
                    "job_title",
                    "department_name",
                    "employment_type",
                    "status",
                    "is_active",
                    "hire_date",
                    "termination_date",
                ]
            },
        ),
        (
            "Contact",
            {
                "fields": [
                    "email",
                    "phone",
                    "mobile",
                ]
            },
        ),
        (
            "Extra",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "company",
        "branch",
        "work_date",
        "check_in_at",
        "check_out_at",
        "status",
        "source",
        "total_minutes",
        "total_hours",
        "created_at",
    ]
    list_filter = [
        "status",
        "source",
        "company",
        "branch",
        "work_date",
        "created_at",
    ]
    search_fields = [
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "employee__email",
        "employee__mobile",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "branch__name",
        "branch__name_ar",
        "branch__name_en",
        "check_in_note",
        "check_out_note",
        "notes",
    ]
    readonly_fields = [
        "total_minutes",
        "total_hours",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "branch",
        "employee",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "work_date"
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "branch",
                    "employee",
                ]
            },
        ),
        (
            "Attendance",
            {
                "fields": [
                    "work_date",
                    "check_in_at",
                    "check_out_at",
                    "status",
                    "source",
                    "total_minutes",
                    "total_hours",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "check_in_note",
                    "check_out_note",
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 🏖️ Leave Types Admin
# ============================================================


@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "code",
        "company",
        "unit",
        "annual_allowance",
        "is_paid",
        "requires_approval",
        "allow_half_day",
        "allow_negative_balance",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "company",
        "unit",
        "is_paid",
        "requires_approval",
        "allow_half_day",
        "allow_negative_balance",
        "is_active",
        "created_at",
    ]
    search_fields = [
        "name",
        "code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "name",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Leave Type",
            {
                "fields": [
                    "name",
                    "code",
                    "unit",
                    "annual_allowance",
                ]
            },
        ),
        (
            "Rules",
            {
                "fields": [
                    "is_paid",
                    "requires_approval",
                    "allow_half_day",
                    "allow_negative_balance",
                    "is_active",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 📝 Leave Requests Admin
# ============================================================


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "leave_type",
        "company",
        "start_date",
        "end_date",
        "requested_units",
        "status",
        "submitted_at",
        "approved_at",
        "rejected_at",
        "cancelled_at",
        "created_at",
    ]
    list_filter = [
        "company",
        "leave_type",
        "status",
        "start_date",
        "end_date",
        "submitted_at",
        "approved_at",
        "rejected_at",
        "cancelled_at",
        "created_at",
    ]
    search_fields = [
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "leave_type__name",
        "leave_type__code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "reason",
        "employee_note",
        "manager_note",
    ]
    readonly_fields = [
        "submitted_at",
        "approved_at",
        "rejected_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "employee",
        "leave_type",
        "approved_by",
        "rejected_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "start_date"
    ordering = [
        "-start_date",
        "-id",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Leave Request",
            {
                "fields": [
                    "employee",
                    "leave_type",
                    "start_date",
                    "end_date",
                    "requested_units",
                    "status",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "reason",
                    "employee_note",
                    "manager_note",
                    "extra_data",
                ]
            },
        ),
        (
            "Workflow",
            {
                "fields": [
                    "submitted_at",
                    "approved_at",
                    "approved_by",
                    "rejected_at",
                    "rejected_by",
                    "cancelled_at",
                    "cancelled_by",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# ⚖️ Leave Balances Admin
# ============================================================


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "leave_type",
        "company",
        "year",
        "opening_balance",
        "accrued",
        "used",
        "adjusted",
        "available_balance",
        "created_at",
    ]
    list_filter = [
        "company",
        "leave_type",
        "year",
        "created_at",
    ]
    search_fields = [
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "leave_type__name",
        "leave_type__code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "available_balance",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "employee",
        "leave_type",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "-year",
        "employee",
        "leave_type",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Balance",
            {
                "fields": [
                    "employee",
                    "leave_type",
                    "year",
                    "opening_balance",
                    "accrued",
                    "used",
                    "adjusted",
                    "available_balance",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 💰 Salary Components Admin
# ============================================================


@admin.register(SalaryComponent)
class SalaryComponentAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "code",
        "company",
        "component_type",
        "calculation_type",
        "amount",
        "percentage",
        "is_taxable",
        "is_active",
        "sort_order",
        "created_at",
    ]
    list_filter = [
        "company",
        "component_type",
        "calculation_type",
        "is_taxable",
        "is_active",
        "created_at",
    ]
    search_fields = [
        "name",
        "code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "sort_order",
        "name",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Component",
            {
                "fields": [
                    "name",
                    "code",
                    "component_type",
                    "calculation_type",
                    "amount",
                    "percentage",
                    "sort_order",
                ]
            },
        ),
        (
            "Flags",
            {
                "fields": [
                    "is_taxable",
                    "is_active",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 👤 Employee Salary Profiles Admin
# ============================================================


@admin.register(EmployeeSalaryProfile)
class EmployeeSalaryProfileAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "company",
        "basic_salary",
        "housing_allowance",
        "transport_allowance",
        "other_allowance",
        "gross_salary",
        "currency",
        "effective_from",
        "effective_to",
        "is_active",
        "created_at",
    ]
    list_filter = [
        "company",
        "currency",
        "is_active",
        "effective_from",
        "effective_to",
        "created_at",
    ]
    search_fields = [
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "bank_name",
        "bank_account_number",
        "iban",
        "notes",
    ]
    readonly_fields = [
        "gross_salary",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "employee",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "employee",
        "-effective_from",
        "-id",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "employee",
                ]
            },
        ),
        (
            "Salary",
            {
                "fields": [
                    "basic_salary",
                    "housing_allowance",
                    "transport_allowance",
                    "other_allowance",
                    "gross_salary",
                    "currency",
                ]
            },
        ),
        (
            "Bank",
            {
                "fields": [
                    "bank_name",
                    "bank_account_number",
                    "iban",
                ]
            },
        ),
        (
            "Validity",
            {
                "fields": [
                    "effective_from",
                    "effective_to",
                    "is_active",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 📅 Payroll Periods Admin
# ============================================================


@admin.register(PayrollPeriod)
class PayrollPeriodAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "company",
        "year",
        "month",
        "start_date",
        "end_date",
        "payment_date",
        "status",
        "created_at",
    ]
    list_filter = [
        "company",
        "year",
        "month",
        "status",
        "start_date",
        "end_date",
        "payment_date",
        "created_at",
    ]
    search_fields = [
        "name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "start_date"
    ordering = [
        "company",
        "-year",
        "-month",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Period",
            {
                "fields": [
                    "name",
                    "year",
                    "month",
                    "start_date",
                    "end_date",
                    "payment_date",
                    "status",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 🧮 Payroll Runs Admin
# ============================================================


@admin.register(PayrollRun)
class PayrollRunAdmin(admin.ModelAdmin):
    list_display = [
        "run_number",
        "name",
        "company",
        "period",
        "status",
        "total_employees",
        "total_earnings",
        "total_deductions",
        "net_pay",
        "calculated_at",
        "approved_at",
        "posted_at",
        "cancelled_at",
        "created_at",
    ]
    list_filter = [
        "company",
        "period",
        "status",
        "calculated_at",
        "approved_at",
        "posted_at",
        "cancelled_at",
        "created_at",
    ]
    search_fields = [
        "run_number",
        "name",
        "period__name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "calculated_at",
        "approved_at",
        "posted_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "period",
        "calculated_by",
        "approved_by",
        "posted_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "created_at"
    ordering = [
        "company",
        "-created_at",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "period",
                ]
            },
        ),
        (
            "Run",
            {
                "fields": [
                    "run_number",
                    "name",
                    "status",
                ]
            },
        ),
        (
            "Totals",
            {
                "fields": [
                    "total_employees",
                    "total_earnings",
                    "total_deductions",
                    "net_pay",
                ]
            },
        ),
        (
            "Workflow",
            {
                "fields": [
                    "calculated_at",
                    "calculated_by",
                    "approved_at",
                    "approved_by",
                    "posted_at",
                    "posted_by",
                    "cancelled_at",
                    "cancelled_by",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 🧾 Payslips Admin
# ============================================================


class PayslipItemInline(admin.TabularInline):
    model = PayslipItem
    extra = 0
    fields = [
        "component",
        "name",
        "code",
        "component_type",
        "amount",
        "notes",
    ]
    autocomplete_fields = [
        "component",
    ]


@admin.register(Payslip)
class PayslipAdmin(admin.ModelAdmin):
    inlines = [
        PayslipItemInline,
    ]
    list_display = [
        "payslip_number",
        "employee",
        "company",
        "period",
        "payroll_run",
        "status",
        "basic_salary",
        "total_earnings",
        "total_deductions",
        "net_pay",
        "currency",
        "calculated_at",
        "approved_at",
        "paid_at",
        "cancelled_at",
        "created_at",
    ]
    list_filter = [
        "company",
        "period",
        "payroll_run",
        "status",
        "currency",
        "calculated_at",
        "approved_at",
        "paid_at",
        "cancelled_at",
        "created_at",
    ]
    search_fields = [
        "payslip_number",
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "payroll_run__run_number",
        "period__name",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "calculated_at",
        "approved_at",
        "paid_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "payroll_run",
        "period",
        "employee",
        "salary_profile",
        "approved_by",
        "paid_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "created_at"
    ordering = [
        "company",
        "-created_at",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "payroll_run",
                    "period",
                    "employee",
                    "salary_profile",
                ]
            },
        ),
        (
            "Payslip",
            {
                "fields": [
                    "payslip_number",
                    "status",
                    "currency",
                ]
            },
        ),
        (
            "Amounts",
            {
                "fields": [
                    "basic_salary",
                    "total_earnings",
                    "total_deductions",
                    "net_pay",
                ]
            },
        ),
        (
            "Workflow",
            {
                "fields": [
                    "calculated_at",
                    "approved_at",
                    "approved_by",
                    "paid_at",
                    "paid_by",
                    "cancelled_at",
                    "cancelled_by",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# 📄 Payslip Items Admin
# ============================================================


@admin.register(PayslipItem)
class PayslipItemAdmin(admin.ModelAdmin):
    list_display = [
        "payslip",
        "company",
        "component",
        "name",
        "code",
        "component_type",
        "amount",
        "created_at",
    ]
    list_filter = [
        "company",
        "component_type",
        "component",
        "created_at",
    ]
    search_fields = [
        "payslip__payslip_number",
        "payslip__employee__employee_number",
        "payslip__employee__first_name",
        "payslip__employee__middle_name",
        "payslip__employee__last_name",
        "payslip__employee__display_name",
        "component__name",
        "component__code",
        "name",
        "code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "payslip",
        "component",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "payslip",
        "component_type",
        "id",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "payslip",
                ]
            },
        ),
        (
            "Item",
            {
                "fields": [
                    "component",
                    "name",
                    "code",
                    "component_type",
                    "amount",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# ?? Performance Cycles Admin
# ============================================================


@admin.register(PerformanceCycle)
class PerformanceCycleAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "code",
        "company",
        "start_date",
        "end_date",
        "status",
        "created_at",
    ]
    list_filter = [
        "company",
        "status",
        "start_date",
        "end_date",
        "created_at",
    ]
    search_fields = [
        "name",
        "code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "description",
        "notes",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "start_date"
    ordering = [
        "company",
        "-start_date",
        "-id",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Cycle",
            {
                "fields": [
                    "name",
                    "code",
                    "start_date",
                    "end_date",
                    "status",
                ]
            },
        ),
        (
            "Description",
            {
                "fields": [
                    "description",
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# ?? Performance Criteria Admin
# ============================================================


@admin.register(PerformanceCriterion)
class PerformanceCriterionAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "code",
        "company",
        "max_score",
        "weight",
        "is_active",
        "sort_order",
        "created_at",
    ]
    list_filter = [
        "company",
        "is_active",
        "created_at",
    ]
    search_fields = [
        "name",
        "code",
        "description",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "sort_order",
        "name",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                ]
            },
        ),
        (
            "Criterion",
            {
                "fields": [
                    "name",
                    "code",
                    "description",
                    "max_score",
                    "weight",
                    "sort_order",
                    "is_active",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# ?? Performance Review Scores Inline/Admin
# ============================================================


class PerformanceReviewScoreInline(admin.TabularInline):
    model = PerformanceReviewScore
    extra = 0
    fields = [
        "criterion",
        "score",
        "weight",
        "weighted_score",
        "comments",
    ]
    readonly_fields = [
        "weighted_score",
    ]
    autocomplete_fields = [
        "criterion",
    ]


@admin.register(EmployeePerformanceReview)
class EmployeePerformanceReviewAdmin(admin.ModelAdmin):
    inlines = [
        PerformanceReviewScoreInline,
    ]
    list_display = [
        "employee",
        "cycle",
        "company",
        "reviewer",
        "status",
        "review_date",
        "overall_score",
        "final_rating",
        "submitted_at",
        "approved_at",
        "cancelled_at",
        "created_at",
    ]
    list_filter = [
        "company",
        "cycle",
        "status",
        "review_date",
        "submitted_at",
        "approved_at",
        "cancelled_at",
        "created_at",
    ]
    search_fields = [
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "cycle__name",
        "cycle__code",
        "final_rating",
        "employee_comments",
        "reviewer_comments",
        "manager_comments",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "submitted_at",
        "approved_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "cycle",
        "employee",
        "reviewer",
        "approved_by",
        "cancelled_by",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "review_date"
    ordering = [
        "company",
        "-created_at",
        "-id",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "cycle",
                    "employee",
                    "reviewer",
                ]
            },
        ),
        (
            "Review",
            {
                "fields": [
                    "status",
                    "review_date",
                    "overall_score",
                    "final_rating",
                ]
            },
        ),
        (
            "Comments",
            {
                "fields": [
                    "employee_comments",
                    "reviewer_comments",
                    "manager_comments",
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Workflow",
            {
                "fields": [
                    "submitted_at",
                    "approved_at",
                    "approved_by",
                    "cancelled_at",
                    "cancelled_by",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


@admin.register(PerformanceReviewScore)
class PerformanceReviewScoreAdmin(admin.ModelAdmin):
    list_display = [
        "review",
        "criterion",
        "company",
        "score",
        "weight",
        "weighted_score",
        "created_at",
    ]
    list_filter = [
        "company",
        "criterion",
        "created_at",
    ]
    search_fields = [
        "review__employee__employee_number",
        "review__employee__first_name",
        "review__employee__last_name",
        "review__employee__display_name",
        "review__cycle__name",
        "review__cycle__code",
        "criterion__name",
        "criterion__code",
        "company__name",
        "company__company_code",
        "comments",
    ]
    readonly_fields = [
        "weighted_score",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "review",
        "criterion",
        "created_by",
        "updated_by",
    ]
    ordering = [
        "company",
        "review",
        "criterion",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "review",
                    "criterion",
                ]
            },
        ),
        (
            "Score",
            {
                "fields": [
                    "score",
                    "weight",
                    "weighted_score",
                    "comments",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]


# ============================================================
# ?? Employee Goals Admin
# ============================================================


@admin.register(EmployeeGoal)
class EmployeeGoalAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "employee",
        "company",
        "cycle",
        "priority",
        "status",
        "progress_percentage",
        "start_date",
        "due_date",
        "completed_at",
        "cancelled_at",
        "created_at",
    ]
    list_filter = [
        "company",
        "cycle",
        "priority",
        "status",
        "start_date",
        "due_date",
        "completed_at",
        "cancelled_at",
        "created_at",
    ]
    search_fields = [
        "title",
        "description",
        "target_value",
        "actual_value",
        "employee__employee_number",
        "employee__first_name",
        "employee__middle_name",
        "employee__last_name",
        "employee__display_name",
        "cycle__name",
        "cycle__code",
        "company__name",
        "company__name_ar",
        "company__name_en",
        "company__company_code",
        "notes",
    ]
    readonly_fields = [
        "completed_at",
        "cancelled_at",
        "created_at",
        "updated_at",
    ]
    autocomplete_fields = [
        "company",
        "employee",
        "cycle",
        "created_by",
        "updated_by",
    ]
    date_hierarchy = "due_date"
    ordering = [
        "company",
        "employee",
        "-created_at",
    ]
    fieldsets = [
        (
            "Tenant",
            {
                "fields": [
                    "company",
                    "employee",
                    "cycle",
                ]
            },
        ),
        (
            "Goal",
            {
                "fields": [
                    "title",
                    "description",
                    "target_value",
                    "actual_value",
                    "progress_percentage",
                    "priority",
                    "status",
                ]
            },
        ),
        (
            "Dates",
            {
                "fields": [
                    "start_date",
                    "due_date",
                    "completed_at",
                    "cancelled_at",
                ]
            },
        ),
        (
            "Notes",
            {
                "fields": [
                    "notes",
                    "extra_data",
                ]
            },
        ),
        (
            "Audit",
            {
                "fields": [
                    "created_by",
                    "updated_by",
                    "created_at",
                    "updated_at",
                ]
            },
        ),
    ]

