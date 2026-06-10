# ============================================================
# 📂 hr/admin.py
# 🧠 PrimeyAcc | HR Admin V1.2
# ------------------------------------------------------------
# ✅ Employee admin registration
# ✅ AttendanceRecord admin registration
# ✅ LeaveType admin registration
# ✅ LeaveRequest admin registration
# ✅ LeaveBalance admin registration
# ✅ Company / branch visibility
# ✅ Search and filters for HR operations
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import (
    AttendanceRecord,
    Employee,
    LeaveBalance,
    LeaveRequest,
    LeaveType,
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