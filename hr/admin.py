# ============================================================
# 📂 hr/admin.py
# 🧠 PrimeyAcc | HR Admin V1.1
# ------------------------------------------------------------
# ✅ Employee admin registration
# ✅ AttendanceRecord admin registration
# ✅ Company / branch visibility
# ✅ Search and filters for HR operations
# ============================================================

from __future__ import annotations

from django.contrib import admin

from .models import AttendanceRecord, Employee


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