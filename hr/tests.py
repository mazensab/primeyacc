# ============================================================
# 📂 hr/tests.py
# 🧠 Mhamcloud | HR Tests V1.3
# ------------------------------------------------------------
# ✅ Employee model tests
# ✅ Employee services tests
# ✅ Company tenant isolation validation
# ✅ Branch/company mismatch protection
# ✅ Employee status lifecycle tests
# ✅ Company HR employees API tests
# ✅ Permissions and tenant isolation API tests
# ✅ Attendance model tests
# ✅ Attendance services tests
# ✅ Attendance API tests
# ============================================================

from __future__ import annotations
from decimal import Decimal

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import Client, TestCase
from django.utils import timezone

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus
from companies.models import Branch, Company

from .models import (
    AttendanceRecord,
    AttendanceSource,
    AttendanceStatus,
    Employee,
    EmployeeStatus,
    EmployeeSalaryProfile,
    EmployeePerformanceReview,
    EmployeeGoal,
    LeaveBalance,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
    LeaveTypeUnit,
    PayrollPeriod,
    PayrollPeriodStatus,
    PayrollRun,
    PayrollRunStatus,
    PerformanceCycle,
    PerformanceCycleStatus,
    PerformanceCriterion,
    PerformanceReviewStatus,
    PerformanceReviewScore,
    PerformanceGoalStatus,
    Payslip,
    PayslipItem,
    PayslipStatus,
    SalaryComponent,
    SalaryComponentCalculationType,
    SalaryComponentType,
)
from .services import (
    activate_employee,
    approve_leave_request,
    cancel_attendance_record,
    cancel_leave_request,
    check_in_employee,
    check_out_attendance_record,
    create_attendance_record,
    create_employee,
    create_leave_request,
    create_leave_type,
    create_or_update_leave_balance,
    deactivate_employee,
    mark_attendance_missing_check_out,
    reject_leave_request,
    submit_leave_request,
    approve_payroll_run,
    calculate_payroll_run,
    close_payroll_period,
    create_employee_salary_profile,
    create_payroll_period,
    create_payroll_run,
    create_salary_component,
    deactivate_salary_component,
    open_payroll_period,
    update_employee,
    update_employee_salary_profile,
    update_leave_type,
    update_payroll_period,
    update_salary_component,
)


User = get_user_model()


class EmployeeModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="hr-admin",
            email="hr-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Test Company",
            company_code="HR-COMP-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Main Branch",
            branch_code="MAIN",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_employee_can_be_created_inside_company(self):
        employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-001",
            first_name="Ahmed",
            last_name="Ali",
            job_title="Accountant",
            department_name="Finance",
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(employee.company, self.company)
        self.assertEqual(employee.branch, self.branch)
        self.assertEqual(employee.name, "Ahmed Ali")
        self.assertEqual(employee.status, EmployeeStatus.ACTIVE)
        self.assertTrue(employee.is_active)

    def test_employee_number_is_unique_per_company(self):
        Employee.objects.create(
            company=self.company,
            employee_number="EMP-001",
            first_name="Ahmed",
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            Employee.objects.create(
                company=self.company,
                employee_number="EMP-001",
                first_name="Mohammed",
                created_by=self.user,
                updated_by=self.user,
            )

    def test_same_employee_number_allowed_for_different_companies(self):
        other_company = Company.objects.create(
            name="Other Company",
            company_code="HR-COMP-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )

        employee_one = Employee.objects.create(
            company=self.company,
            employee_number="EMP-001",
            first_name="Ahmed",
            created_by=self.user,
            updated_by=self.user,
        )
        employee_two = Employee.objects.create(
            company=other_company,
            employee_number="EMP-001",
            first_name="Sara",
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertNotEqual(employee_one.company_id, employee_two.company_id)

    def test_employee_rejects_branch_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Company",
            company_code="HR-COMP-003",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_branch = Branch.objects.create(
            company=other_company,
            name="Other Branch",
            branch_code="OTHER",
            created_by=self.user,
            updated_by=self.user,
        )

        employee = Employee(
            company=self.company,
            branch=other_branch,
            employee_number="EMP-002",
            first_name="Ahmed",
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            employee.full_clean()

    def test_terminated_employee_requires_termination_date(self):
        employee = Employee(
            company=self.company,
            employee_number="EMP-003",
            first_name="Ahmed",
            status=EmployeeStatus.TERMINATED,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            employee.full_clean()


class EmployeeServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="hr-service-admin",
            email="hr-service-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Service Company",
            company_code="HR-SVC-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Service Branch",
            branch_code="SVC",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_create_employee_service_sets_company_and_audit_fields(self):
        employee = create_employee(
            company=self.company,
            created_by=self.user,
            data={
                "branch": self.branch,
                "employee_number": "EMP-SVC-001",
                "first_name": "Nora",
                "last_name": "Saleh",
                "job_title": "HR Officer",
            },
        )

        self.assertEqual(employee.company, self.company)
        self.assertEqual(employee.branch, self.branch)
        self.assertEqual(employee.created_by, self.user)
        self.assertEqual(employee.updated_by, self.user)
        self.assertEqual(employee.name, "Nora Saleh")

    def test_create_employee_service_rejects_foreign_branch(self):
        other_company = Company.objects.create(
            name="Other Service Company",
            company_code="HR-SVC-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_branch = Branch.objects.create(
            company=other_company,
            name="Foreign Branch",
            branch_code="FOREIGN",
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            create_employee(
                company=self.company,
                created_by=self.user,
                data={
                    "branch": other_branch,
                    "employee_number": "EMP-SVC-002",
                    "first_name": "Nora",
                },
            )

    def test_update_employee_service_does_not_change_company(self):
        other_company = Company.objects.create(
            name="Other Service Company",
            company_code="HR-SVC-003",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        employee = create_employee(
            company=self.company,
            created_by=self.user,
            data={
                "employee_number": "EMP-SVC-003",
                "first_name": "Nora",
            },
        )

        updated = update_employee(
            employee=employee,
            updated_by=self.user,
            data={
                "company": other_company,
                "first_name": "Updated",
                "job_title": "Senior HR Officer",
            },
        )

        self.assertEqual(updated.company, self.company)
        self.assertEqual(updated.first_name, "Updated")
        self.assertEqual(updated.job_title, "Senior HR Officer")

    def test_deactivate_and_activate_employee_services(self):
        employee = create_employee(
            company=self.company,
            created_by=self.user,
            data={
                "employee_number": "EMP-SVC-004",
                "first_name": "Nora",
            },
        )

        deactivate_employee(employee=employee, updated_by=self.user)
        employee.refresh_from_db()

        self.assertEqual(employee.status, EmployeeStatus.INACTIVE)
        self.assertFalse(employee.is_active)

        activate_employee(employee=employee, updated_by=self.user)
        employee.refresh_from_db()

        self.assertEqual(employee.status, EmployeeStatus.ACTIVE)
        self.assertTrue(employee.is_active)


class AttendanceRecordModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="attendance-model-admin",
            email="attendance-model-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Attendance Company",
            company_code="HR-ATT-MODEL-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Attendance Main Branch",
            branch_code="ATT-MAIN",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-ATT-001",
            first_name="Fahad",
            last_name="Saleh",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_attendance_record_can_be_created_open(self):
        check_in_at = timezone.now()

        record = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=check_in_at,
            source=AttendanceSource.MANUAL,
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(record.company, self.company)
        self.assertEqual(record.branch, self.branch)
        self.assertEqual(record.employee, self.employee)
        self.assertEqual(record.status, AttendanceStatus.OPEN)
        self.assertIsNone(record.check_out_at)
        self.assertEqual(record.total_minutes, 0)
        self.assertEqual(record.work_date, timezone.localtime(check_in_at).date())

    def test_attendance_record_calculates_total_minutes_when_closed(self):
        check_in_at = timezone.now()
        check_out_at = check_in_at + timedelta(hours=8, minutes=30)

        record = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=check_in_at,
            check_out_at=check_out_at,
            source=AttendanceSource.MANUAL,
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(record.status, AttendanceStatus.CLOSED)
        self.assertEqual(record.total_minutes, 510)
        self.assertEqual(record.total_hours, 8.5)

    def test_attendance_record_rejects_employee_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Attendance Company",
            company_code="HR-ATT-MODEL-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-ATT-OTHER",
            first_name="Other",
            created_by=self.user,
            updated_by=self.user,
        )

        record = AttendanceRecord(
            company=self.company,
            branch=self.branch,
            employee=other_employee,
            check_in_at=timezone.now(),
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            record.full_clean()

    def test_attendance_record_rejects_branch_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Attendance Company",
            company_code="HR-ATT-MODEL-003",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_branch = Branch.objects.create(
            company=other_company,
            name="Other Attendance Branch",
            branch_code="ATT-OTHER",
            created_by=self.user,
            updated_by=self.user,
        )

        record = AttendanceRecord(
            company=self.company,
            branch=other_branch,
            employee=self.employee,
            check_in_at=timezone.now(),
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            record.full_clean()

    def test_attendance_record_rejects_check_out_before_check_in(self):
        check_in_at = timezone.now()
        check_out_at = check_in_at - timedelta(minutes=1)

        record = AttendanceRecord(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=check_in_at,
            check_out_at=check_out_at,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            record.full_clean()


class AttendanceServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="attendance-service-admin",
            email="attendance-service-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Attendance Service Company",
            company_code="HR-ATT-SVC-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Attendance Service Branch",
            branch_code="ATT-SVC",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-ATT-SVC-001",
            first_name="Lama",
            last_name="Khalid",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_create_attendance_record_service_sets_company_branch_and_audit(self):
        check_in_at = timezone.now()

        record = create_attendance_record(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "check_in_at": check_in_at,
                "source": AttendanceSource.MANUAL,
                "check_in_note": "Manual check-in",
            },
        )

        self.assertEqual(record.company, self.company)
        self.assertEqual(record.branch, self.branch)
        self.assertEqual(record.employee, self.employee)
        self.assertEqual(record.created_by, self.user)
        self.assertEqual(record.updated_by, self.user)
        self.assertEqual(record.status, AttendanceStatus.OPEN)
        self.assertEqual(record.check_in_note, "Manual check-in")

    def test_create_attendance_record_service_rejects_employee_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Attendance Service Company",
            company_code="HR-ATT-SVC-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-ATT-SVC-OTHER",
            first_name="Other",
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            create_attendance_record(
                company=self.company,
                employee=other_employee,
                created_by=self.user,
                data={
                    "check_in_at": timezone.now(),
                },
            )

    def test_create_attendance_record_service_rejects_branch_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Attendance Service Company",
            company_code="HR-ATT-SVC-003",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_branch = Branch.objects.create(
            company=other_company,
            name="Other Attendance Branch",
            branch_code="ATT-FOREIGN",
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            create_attendance_record(
                company=self.company,
                employee=self.employee,
                created_by=self.user,
                data={
                    "branch": other_branch,
                    "check_in_at": timezone.now(),
                },
            )

    def test_check_in_employee_service_creates_open_attendance(self):
        record = check_in_employee(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            source=AttendanceSource.WEB,
            note="Checked in from web",
        )

        self.assertEqual(record.company, self.company)
        self.assertEqual(record.employee, self.employee)
        self.assertEqual(record.branch, self.branch)
        self.assertEqual(record.status, AttendanceStatus.OPEN)
        self.assertEqual(record.source, AttendanceSource.WEB)
        self.assertEqual(record.check_in_note, "Checked in from web")
        self.assertIsNone(record.check_out_at)

    def test_check_in_employee_service_rejects_second_open_record(self):
        check_in_employee(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            source=AttendanceSource.WEB,
        )

        with self.assertRaises(ValidationError):
            check_in_employee(
                company=self.company,
                employee=self.employee,
                created_by=self.user,
                source=AttendanceSource.WEB,
            )

    def test_check_out_attendance_record_service_closes_record(self):
        check_in_at = timezone.now() - timedelta(hours=7)
        check_out_at = check_in_at + timedelta(hours=7)

        record = check_in_employee(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            check_in_at=check_in_at,
            source=AttendanceSource.MANUAL,
        )

        updated = check_out_attendance_record(
            attendance_record=record,
            updated_by=self.user,
            check_out_at=check_out_at,
            note="Checked out manually",
        )
        updated.refresh_from_db()

        self.assertEqual(updated.status, AttendanceStatus.CLOSED)
        self.assertEqual(updated.check_out_at, check_out_at)
        self.assertEqual(updated.check_out_note, "Checked out manually")
        self.assertEqual(updated.total_minutes, 420)
        self.assertEqual(updated.updated_by, self.user)

    def test_check_out_attendance_record_service_rejects_already_closed_record(self):
        check_in_at = timezone.now() - timedelta(hours=2)
        check_out_at = check_in_at + timedelta(hours=2)

        record = create_attendance_record(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "check_in_at": check_in_at,
                "check_out_at": check_out_at,
            },
        )

        with self.assertRaises(ValidationError):
            check_out_attendance_record(
                attendance_record=record,
                updated_by=self.user,
                check_out_at=timezone.now(),
            )

    def test_mark_attendance_missing_check_out_service(self):
        record = check_in_employee(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            source=AttendanceSource.MANUAL,
        )

        updated = mark_attendance_missing_check_out(
            attendance_record=record,
            updated_by=self.user,
        )
        updated.refresh_from_db()

        self.assertEqual(updated.status, AttendanceStatus.MISSING_CHECK_OUT)
        self.assertIsNone(updated.check_out_at)
        self.assertEqual(updated.updated_by, self.user)

    def test_cancel_attendance_record_service(self):
        record = check_in_employee(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            source=AttendanceSource.MANUAL,
        )

        updated = cancel_attendance_record(
            attendance_record=record,
            updated_by=self.user,
            note="Wrong entry",
        )
        updated.refresh_from_db()

        self.assertEqual(updated.status, AttendanceStatus.CANCELLED)
        self.assertEqual(updated.notes, "Wrong entry")
        self.assertEqual(updated.updated_by, self.user)


class EmployeeAPITests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="hr-api-owner",
            email="hr-api-owner@example.com",
            password="StrongPass12345",
        )
        self.viewer = User.objects.create_user(
            username="hr-api-viewer",
            email="hr-api-viewer@example.com",
            password="StrongPass12345",
        )
        self.other_owner = User.objects.create_user(
            username="hr-api-other-owner",
            email="hr-api-other-owner@example.com",
            password="StrongPass12345",
        )

        self.company = Company.objects.create(
            name="Primey API Company",
            company_code="HR-API-001",
            owner=self.owner,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_company = Company.objects.create(
            name="Other API Company",
            company_code="HR-API-002",
            owner=self.other_owner,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.branch = Branch.objects.create(
            company=self.company,
            name="API Main Branch",
            branch_code="API-MAIN",
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other API Branch",
            branch_code="API-OTHER",
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.owner_membership = CompanyMembership.objects.create(
            user=self.owner,
            company=self.company,
            role=CompanyRole.OWNER,
            is_primary=True,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.viewer_membership = CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            is_primary=True,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_owner_membership = CompanyMembership.objects.create(
            user=self.other_owner,
            company=self.other_company,
            role=CompanyRole.OWNER,
            is_primary=True,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-API-001",
            first_name="Ahmed",
            last_name="Ali",
            job_title="Accountant",
            department_name="Finance",
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_employee = Employee.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            employee_number="EMP-API-OTHER",
            first_name="Sara",
            last_name="Saleh",
            job_title="HR Officer",
            department_name="HR",
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

    def test_employees_list_requires_authentication(self):
        response = self.client.get("/api/company/hr/employees/")

        self.assertEqual(response.status_code, 403)

    def test_owner_can_list_company_employees_only(self):
        self.client.force_login(self.owner)

        response = self.client.get("/api/company/hr/employees/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["employee_number"], "EMP-API-001")
        self.assertNotEqual(
            payload["results"][0]["employee_number"],
            "EMP-API-OTHER",
        )

    def test_viewer_can_list_employees_but_cannot_create_employee(self):
        self.client.force_login(self.viewer)

        list_response = self.client.get("/api/company/hr/employees/")
        self.assertEqual(list_response.status_code, 200)

        create_response = self.client.post(
            "/api/company/hr/employees/create/",
            data={
                "employee_number": "EMP-API-002",
                "first_name": "Nora",
                "last_name": "Saleh",
                "branch_id": self.branch.id,
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 403)

    def test_owner_can_create_employee_inside_current_company(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/employees/create/",
            data={
                "employee_number": "EMP-API-002",
                "first_name": "Nora",
                "last_name": "Saleh",
                "job_title": "HR Officer",
                "department_name": "HR",
                "branch_id": self.branch.id,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["employee"]["employee_number"], "EMP-API-002")
        self.assertEqual(payload["employee"]["branch"]["id"], self.branch.id)

        employee = Employee.objects.get(
            company=self.company,
            employee_number="EMP-API-002",
        )
        self.assertEqual(employee.created_by, self.owner)
        self.assertEqual(employee.updated_by, self.owner)

    def test_create_employee_rejects_branch_from_another_company(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/employees/create/",
            data={
                "employee_number": "EMP-API-003",
                "first_name": "Invalid",
                "branch_id": self.other_branch.id,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])
        self.assertIn("branch_id", payload["errors"])

    def test_owner_can_view_employee_detail_inside_current_company(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            f"/api/company/hr/employees/{self.employee.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["employee"]["id"], self.employee.id)
        self.assertEqual(payload["employee"]["employee_number"], "EMP-API-001")

    def test_owner_cannot_view_employee_from_another_company(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            f"/api/company/hr/employees/{self.other_employee.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_owner_can_update_employee_inside_current_company(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            f"/api/company/hr/employees/{self.employee.id}/update/",
            data={
                "employee_number": "EMP-API-001",
                "first_name": "Ahmed",
                "last_name": "Updated",
                "job_title": "Senior Accountant",
                "department_name": "Finance",
                "branch_id": self.branch.id,
                "employment_type": "FULL_TIME",
                "status": "ACTIVE",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["employee"]["last_name"], "Updated")
        self.assertEqual(payload["employee"]["job_title"], "Senior Accountant")

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.last_name, "Updated")
        self.assertEqual(self.employee.job_title, "Senior Accountant")

    def test_owner_can_deactivate_and_activate_employee(self):
        self.client.force_login(self.owner)

        deactivate_response = self.client.post(
            f"/api/company/hr/employees/{self.employee.id}/deactivate/"
        )

        self.assertEqual(deactivate_response.status_code, 200)

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.status, EmployeeStatus.INACTIVE)
        self.assertFalse(self.employee.is_active)

        activate_response = self.client.post(
            f"/api/company/hr/employees/{self.employee.id}/activate/"
        )

        self.assertEqual(activate_response.status_code, 200)

        self.employee.refresh_from_db()
        self.assertEqual(self.employee.status, EmployeeStatus.ACTIVE)
        self.assertTrue(self.employee.is_active)

    def test_search_filters_employees_inside_current_company(self):
        self.client.force_login(self.owner)

        Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-API-004",
            first_name="Mona",
            last_name="Khalid",
            job_title="Sales Officer",
            department_name="Sales",
            created_by=self.owner,
            updated_by=self.owner,
        )

        response = self.client.get(
            "/api/company/hr/employees/",
            data={
                "search": "Mona",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["employee_number"], "EMP-API-004")


class AttendanceAPITests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="attendance-api-owner",
            email="attendance-api-owner@example.com",
            password="StrongPass12345",
        )
        self.viewer = User.objects.create_user(
            username="attendance-api-viewer",
            email="attendance-api-viewer@example.com",
            password="StrongPass12345",
        )
        self.other_owner = User.objects.create_user(
            username="attendance-api-other-owner",
            email="attendance-api-other-owner@example.com",
            password="StrongPass12345",
        )

        self.company = Company.objects.create(
            name="Primey Attendance API Company",
            company_code="HR-ATT-API-001",
            owner=self.owner,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_company = Company.objects.create(
            name="Other Attendance API Company",
            company_code="HR-ATT-API-002",
            owner=self.other_owner,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.branch = Branch.objects.create(
            company=self.company,
            name="Attendance API Main Branch",
            branch_code="ATT-API-MAIN",
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Attendance API Branch",
            branch_code="ATT-API-OTHER",
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        CompanyMembership.objects.create(
            user=self.owner,
            company=self.company,
            role=CompanyRole.OWNER,
            is_primary=True,
            created_by=self.owner,
            updated_by=self.owner,
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            is_primary=True,
            created_by=self.owner,
            updated_by=self.owner,
        )
        CompanyMembership.objects.create(
            user=self.other_owner,
            company=self.other_company,
            role=CompanyRole.OWNER,
            is_primary=True,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-ATT-API-001",
            first_name="Huda",
            last_name="Ali",
            job_title="HR Officer",
            department_name="HR",
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_employee = Employee.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            employee_number="EMP-ATT-API-OTHER",
            first_name="Other",
            last_name="Employee",
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.check_in_at = timezone.now() - timedelta(hours=8)
        self.check_out_at = self.check_in_at + timedelta(hours=8)

        self.record = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=self.check_in_at,
            check_out_at=self.check_out_at,
            source=AttendanceSource.MANUAL,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_record = AttendanceRecord.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            employee=self.other_employee,
            check_in_at=timezone.now() - timedelta(hours=4),
            check_out_at=timezone.now() - timedelta(hours=1),
            source=AttendanceSource.MANUAL,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

    def test_attendance_list_requires_authentication(self):
        response = self.client.get("/api/company/hr/attendance/")

        self.assertEqual(response.status_code, 403)

    def test_owner_can_list_company_attendance_only(self):
        self.client.force_login(self.owner)

        response = self.client.get("/api/company/hr/attendance/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["id"], self.record.id)
        self.assertEqual(
            payload["results"][0]["employee"]["employee_number"],
            "EMP-ATT-API-001",
        )

    def test_viewer_can_list_attendance_but_cannot_create(self):
        self.client.force_login(self.viewer)

        list_response = self.client.get("/api/company/hr/attendance/")
        self.assertEqual(list_response.status_code, 200)

        create_response = self.client.post(
            "/api/company/hr/attendance/create/",
            data={
                "employee_id": self.employee.id,
                "branch_id": self.branch.id,
                "check_in_at": timezone.now().isoformat(),
                "source": AttendanceSource.MANUAL,
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 403)

    def test_owner_can_create_attendance_record(self):
        self.client.force_login(self.owner)

        check_in_at = timezone.now() - timedelta(hours=3)
        check_out_at = check_in_at + timedelta(hours=3)

        response = self.client.post(
            "/api/company/hr/attendance/create/",
            data={
                "employee_id": self.employee.id,
                "branch_id": self.branch.id,
                "check_in_at": check_in_at.isoformat(),
                "check_out_at": check_out_at.isoformat(),
                "source": AttendanceSource.MANUAL,
                "check_in_note": "Created from API",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["attendance"]["employee"]["id"], self.employee.id)
        self.assertEqual(payload["attendance"]["branch"]["id"], self.branch.id)
        self.assertEqual(payload["attendance"]["status"], AttendanceStatus.CLOSED)
        self.assertEqual(payload["attendance"]["total_minutes"], 180)

    def test_create_attendance_rejects_employee_from_another_company(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/attendance/create/",
            data={
                "employee_id": self.other_employee.id,
                "check_in_at": timezone.now().isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])
        self.assertIn("employee_id", payload["errors"])

    def test_create_attendance_rejects_branch_from_another_company(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/attendance/create/",
            data={
                "employee_id": self.employee.id,
                "branch_id": self.other_branch.id,
                "check_in_at": timezone.now().isoformat(),
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.json()

        self.assertFalse(payload["success"])
        self.assertIn("branch_id", payload["errors"])

    def test_owner_can_view_attendance_detail_inside_current_company(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            f"/api/company/hr/attendance/{self.record.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["attendance"]["id"], self.record.id)
        self.assertEqual(
            payload["attendance"]["employee"]["employee_number"],
            "EMP-ATT-API-001",
        )

    def test_owner_cannot_view_attendance_from_another_company(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            f"/api/company/hr/attendance/{self.other_record.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_owner_can_check_in_employee(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/attendance/check-in/",
            data={
                "employee_id": self.employee.id,
                "branch_id": self.branch.id,
                "source": AttendanceSource.WEB,
                "note": "Checked in from API",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["attendance"]["status"], AttendanceStatus.OPEN)
        self.assertEqual(payload["attendance"]["source"], AttendanceSource.WEB)
        self.assertEqual(payload["attendance"]["check_in_note"], "Checked in from API")

    def test_check_in_rejects_second_open_record(self):
        self.client.force_login(self.owner)

        first_response = self.client.post(
            "/api/company/hr/attendance/check-in/",
            data={
                "employee_id": self.employee.id,
                "branch_id": self.branch.id,
            },
            content_type="application/json",
        )
        self.assertEqual(first_response.status_code, 201)

        second_response = self.client.post(
            "/api/company/hr/attendance/check-in/",
            data={
                "employee_id": self.employee.id,
                "branch_id": self.branch.id,
            },
            content_type="application/json",
        )

        self.assertEqual(second_response.status_code, 400)
        payload = second_response.json()

        self.assertFalse(payload["success"])
        self.assertIn("employee", payload["errors"])

    def test_owner_can_check_out_attendance_record(self):
        self.client.force_login(self.owner)

        open_record = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=timezone.now() - timedelta(hours=2),
            source=AttendanceSource.MANUAL,
            created_by=self.owner,
            updated_by=self.owner,
        )

        response = self.client.post(
            f"/api/company/hr/attendance/{open_record.id}/check-out/",
            data={
                "check_out_at": timezone.now().isoformat(),
                "note": "Checked out from API",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["attendance"]["status"], AttendanceStatus.CLOSED)
        self.assertEqual(payload["attendance"]["check_out_note"], "Checked out from API")

        open_record.refresh_from_db()
        self.assertEqual(open_record.status, AttendanceStatus.CLOSED)
        self.assertIsNotNone(open_record.check_out_at)

    def test_owner_can_mark_missing_check_out(self):
        self.client.force_login(self.owner)

        open_record = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=timezone.now() - timedelta(hours=2),
            source=AttendanceSource.MANUAL,
            created_by=self.owner,
            updated_by=self.owner,
        )

        response = self.client.post(
            f"/api/company/hr/attendance/{open_record.id}/missing-check-out/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["attendance"]["status"],
            AttendanceStatus.MISSING_CHECK_OUT,
        )

        open_record.refresh_from_db()
        self.assertEqual(open_record.status, AttendanceStatus.MISSING_CHECK_OUT)
        self.assertIsNone(open_record.check_out_at)

    def test_owner_can_cancel_attendance_record(self):
        self.client.force_login(self.owner)

        open_record = AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=self.employee,
            check_in_at=timezone.now() - timedelta(hours=2),
            source=AttendanceSource.MANUAL,
            created_by=self.owner,
            updated_by=self.owner,
        )

        response = self.client.post(
            f"/api/company/hr/attendance/{open_record.id}/cancel/",
            data={
                "note": "Wrong API record",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["attendance"]["status"], AttendanceStatus.CANCELLED)
        self.assertEqual(payload["attendance"]["notes"], "Wrong API record")

        open_record.refresh_from_db()
        self.assertEqual(open_record.status, AttendanceStatus.CANCELLED)
        self.assertEqual(open_record.notes, "Wrong API record")

    def test_attendance_search_filters_inside_current_company(self):
        self.client.force_login(self.owner)

        Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-ATT-API-SEARCH",
            first_name="Search",
            last_name="Employee",
            created_by=self.owner,
            updated_by=self.owner,
        )

        search_employee = Employee.objects.get(
            company=self.company,
            employee_number="EMP-ATT-API-SEARCH",
        )

        AttendanceRecord.objects.create(
            company=self.company,
            branch=self.branch,
            employee=search_employee,
            check_in_at=timezone.now() - timedelta(hours=5),
            check_out_at=timezone.now() - timedelta(hours=1),
            source=AttendanceSource.MANUAL,
            created_by=self.owner,
            updated_by=self.owner,
        )

        response = self.client.get(
            "/api/company/hr/attendance/",
            data={
                "search": "EMP-ATT-API-SEARCH",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 1)
        self.assertEqual(
            payload["results"][0]["employee"]["employee_number"],
            "EMP-ATT-API-SEARCH",
        )


class LeaveModelsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="leave-model-admin",
            email="leave-model-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Leave Model Company",
            company_code="HR-LEAVE-MODEL-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Leave Model Branch",
            branch_code="LEAVE-MODEL",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-LEAVE-MODEL-001",
            first_name="Reem",
            last_name="Saleh",
            created_by=self.user,
            updated_by=self.user,
        )
        self.leave_type = LeaveType.objects.create(
            company=self.company,
            name="Annual Leave",
            code="annual",
            unit=LeaveTypeUnit.DAYS,
            annual_allowance=21,
            created_by=self.user,
            updated_by=self.user,
        )

    def test_leave_type_can_be_created_and_normalizes_code(self):
        self.assertEqual(self.leave_type.company, self.company)
        self.assertEqual(self.leave_type.code, "ANNUAL")
        self.assertEqual(self.leave_type.unit, LeaveTypeUnit.DAYS)
        self.assertTrue(self.leave_type.is_paid)
        self.assertTrue(self.leave_type.requires_approval)

    def test_leave_type_rejects_negative_annual_allowance(self):
        leave_type = LeaveType(
            company=self.company,
            name="Invalid Leave",
            code="INVALID",
            annual_allowance=-1,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            leave_type.full_clean()

    def test_leave_request_can_be_created_as_draft(self):
        request = LeaveRequest.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate() + timedelta(days=2),
            requested_units=3,
            reason="Annual vacation",
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(request.company, self.company)
        self.assertEqual(request.employee, self.employee)
        self.assertEqual(request.leave_type, self.leave_type)
        self.assertEqual(request.status, LeaveRequestStatus.DRAFT)
        self.assertEqual(request.requested_units, 3)

    def test_leave_request_rejects_employee_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Leave Model Company",
            company_code="HR-LEAVE-MODEL-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-LEAVE-OTHER",
            first_name="Other",
            created_by=self.user,
            updated_by=self.user,
        )

        request = LeaveRequest(
            company=self.company,
            employee=other_employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            requested_units=1,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            request.full_clean()

    def test_leave_request_rejects_end_date_before_start_date(self):
        today = timezone.localdate()

        request = LeaveRequest(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=today,
            end_date=today - timedelta(days=1),
            requested_units=1,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            request.full_clean()

    def test_leave_balance_available_balance(self):
        balance = LeaveBalance.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=timezone.localdate().year,
            opening_balance=5,
            accrued=21,
            used=4,
            adjusted=1,
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(balance.available_balance, 23)


class LeaveServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="leave-service-admin",
            email="leave-service-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Leave Service Company",
            company_code="HR-LEAVE-SVC-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Leave Service Branch",
            branch_code="LEAVE-SVC",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-LEAVE-SVC-001",
            first_name="Layan",
            last_name="Khalid",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_create_leave_type_service_sets_company_and_audit(self):
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Sick Leave",
                "code": "sick",
                "annual_allowance": 30,
                "unit": LeaveTypeUnit.DAYS,
            },
        )

        self.assertEqual(leave_type.company, self.company)
        self.assertEqual(leave_type.code, "SICK")
        self.assertEqual(leave_type.created_by, self.user)
        self.assertEqual(leave_type.updated_by, self.user)

    def test_update_leave_type_service_does_not_change_company(self):
        other_company = Company.objects.create(
            name="Other Leave Service Company",
            company_code="HR-LEAVE-SVC-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Annual Leave",
                "code": "ANNUAL",
                "annual_allowance": 21,
            },
        )

        updated = update_leave_type(
            leave_type=leave_type,
            updated_by=self.user,
            data={
                "company": other_company,
                "name": "Updated Annual Leave",
                "annual_allowance": 25,
            },
        )

        self.assertEqual(updated.company, self.company)
        self.assertEqual(updated.name, "Updated Annual Leave")
        self.assertEqual(updated.annual_allowance, 25)

    def test_create_leave_request_service_sets_company_employee_type_and_audit(self):
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Annual Leave",
                "code": "ANNUAL",
                "annual_allowance": 21,
            },
        )

        leave_request = create_leave_request(
            company=self.company,
            employee=self.employee,
            leave_type=leave_type,
            created_by=self.user,
            data={
                "start_date": timezone.localdate(),
                "end_date": timezone.localdate() + timedelta(days=1),
                "requested_units": 2,
                "reason": "Family vacation",
            },
        )

        self.assertEqual(leave_request.company, self.company)
        self.assertEqual(leave_request.employee, self.employee)
        self.assertEqual(leave_request.leave_type, leave_type)
        self.assertEqual(leave_request.status, LeaveRequestStatus.DRAFT)
        self.assertEqual(leave_request.created_by, self.user)
        self.assertEqual(leave_request.updated_by, self.user)

    def test_leave_request_workflow_submit_approve(self):
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Annual Leave",
                "code": "ANNUAL",
                "annual_allowance": 21,
            },
        )
        leave_request = create_leave_request(
            company=self.company,
            employee=self.employee,
            leave_type=leave_type,
            created_by=self.user,
            data={
                "start_date": timezone.localdate(),
                "end_date": timezone.localdate(),
                "requested_units": 1,
            },
        )

        submit_leave_request(
            leave_request=leave_request,
            updated_by=self.user,
        )
        leave_request.refresh_from_db()

        self.assertEqual(leave_request.status, LeaveRequestStatus.SUBMITTED)
        self.assertIsNotNone(leave_request.submitted_at)

        approve_leave_request(
            leave_request=leave_request,
            approved_by=self.user,
            note="Approved",
        )
        leave_request.refresh_from_db()

        self.assertEqual(leave_request.status, LeaveRequestStatus.APPROVED)
        self.assertEqual(leave_request.approved_by, self.user)
        self.assertEqual(leave_request.manager_note, "Approved")

    def test_leave_request_workflow_submit_reject(self):
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Emergency Leave",
                "code": "EMERGENCY",
                "annual_allowance": 5,
            },
        )
        leave_request = create_leave_request(
            company=self.company,
            employee=self.employee,
            leave_type=leave_type,
            created_by=self.user,
            data={
                "start_date": timezone.localdate(),
                "end_date": timezone.localdate(),
                "requested_units": 1,
            },
        )

        submit_leave_request(
            leave_request=leave_request,
            updated_by=self.user,
        )
        reject_leave_request(
            leave_request=leave_request,
            rejected_by=self.user,
            note="Rejected",
        )
        leave_request.refresh_from_db()

        self.assertEqual(leave_request.status, LeaveRequestStatus.REJECTED)
        self.assertEqual(leave_request.rejected_by, self.user)
        self.assertEqual(leave_request.manager_note, "Rejected")

    def test_leave_request_cancel_draft(self):
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Unpaid Leave",
                "code": "UNPAID",
                "annual_allowance": 0,
                "is_paid": False,
            },
        )
        leave_request = create_leave_request(
            company=self.company,
            employee=self.employee,
            leave_type=leave_type,
            created_by=self.user,
            data={
                "start_date": timezone.localdate(),
                "end_date": timezone.localdate(),
                "requested_units": 1,
            },
        )

        cancel_leave_request(
            leave_request=leave_request,
            cancelled_by=self.user,
            note="Cancelled by employee",
        )
        leave_request.refresh_from_db()

        self.assertEqual(leave_request.status, LeaveRequestStatus.CANCELLED)
        self.assertEqual(leave_request.cancelled_by, self.user)
        self.assertEqual(leave_request.manager_note, "Cancelled by employee")

    def test_create_or_update_leave_balance_service(self):
        leave_type = create_leave_type(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Annual Leave",
                "code": "ANNUAL",
                "annual_allowance": 21,
            },
        )

        balance = create_or_update_leave_balance(
            company=self.company,
            employee=self.employee,
            leave_type=leave_type,
            year=timezone.localdate().year,
            updated_by=self.user,
            data={
                "opening_balance": 2,
                "accrued": 21,
                "used": 3,
                "adjusted": 0,
            },
        )

        self.assertEqual(balance.company, self.company)
        self.assertEqual(balance.employee, self.employee)
        self.assertEqual(balance.leave_type, leave_type)
        self.assertEqual(balance.available_balance, 20)

        updated = create_or_update_leave_balance(
            company=self.company,
            employee=self.employee,
            leave_type=leave_type,
            year=timezone.localdate().year,
            updated_by=self.user,
            data={
                "used": 5,
            },
        )

        self.assertEqual(updated.id, balance.id)
        self.assertEqual(updated.used, 5)
        self.assertEqual(updated.available_balance, 18)


class LeaveManagementAPITests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="leave-api-owner",
            email="leave-api-owner@example.com",
            password="StrongPass12345",
        )
        self.viewer = User.objects.create_user(
            username="leave-api-viewer",
            email="leave-api-viewer@example.com",
            password="StrongPass12345",
        )
        self.other_owner = User.objects.create_user(
            username="leave-api-other-owner",
            email="leave-api-other-owner@example.com",
            password="StrongPass12345",
        )

        self.company = Company.objects.create(
            name="Primey Leave API Company",
            company_code="HR-LEAVE-API-001",
            owner=self.owner,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_company = Company.objects.create(
            name="Other Leave API Company",
            company_code="HR-LEAVE-API-002",
            owner=self.other_owner,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.branch = Branch.objects.create(
            company=self.company,
            name="Leave API Main Branch",
            branch_code="LEAVE-API-MAIN",
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Leave API Branch",
            branch_code="LEAVE-API-OTHER",
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        CompanyMembership.objects.create(
            user=self.owner,
            company=self.company,
            role=CompanyRole.OWNER,
            is_primary=True,
            created_by=self.owner,
            updated_by=self.owner,
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            is_primary=True,
            created_by=self.owner,
            updated_by=self.owner,
        )
        CompanyMembership.objects.create(
            user=self.other_owner,
            company=self.other_company,
            role=CompanyRole.OWNER,
            is_primary=True,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-LEAVE-API-001",
            first_name="Huda",
            last_name="Ali",
            job_title="HR Officer",
            department_name="HR",
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_employee = Employee.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            employee_number="EMP-LEAVE-API-OTHER",
            first_name="Other",
            last_name="Employee",
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

        self.leave_type = LeaveType.objects.create(
            company=self.company,
            name="Annual Leave",
            code="ANNUAL",
            unit=LeaveTypeUnit.DAYS,
            annual_allowance=21,
            created_by=self.owner,
            updated_by=self.owner,
        )
        self.other_leave_type = LeaveType.objects.create(
            company=self.other_company,
            name="Other Annual Leave",
            code="OTHER-ANNUAL",
            unit=LeaveTypeUnit.DAYS,
            annual_allowance=21,
            created_by=self.other_owner,
            updated_by=self.other_owner,
        )

    def test_leave_types_list_requires_authentication(self):
        response = self.client.get("/api/company/hr/leave-types/")

        self.assertEqual(response.status_code, 403)

    def test_owner_can_create_and_list_leave_types_inside_current_company(self):
        self.client.force_login(self.owner)

        create_response = self.client.post(
            "/api/company/hr/leave-types/create/",
            data={
                "name": "Sick Leave",
                "code": "sick",
                "unit": LeaveTypeUnit.DAYS,
                "annual_allowance": 30,
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 201)
        create_payload = create_response.json()

        self.assertTrue(create_payload["success"])
        self.assertEqual(create_payload["leave_type"]["code"], "SICK")

        list_response = self.client.get("/api/company/hr/leave-types/")
        self.assertEqual(list_response.status_code, 200)

        list_payload = list_response.json()
        codes = [item["code"] for item in list_payload["results"]]

        self.assertIn("ANNUAL", codes)
        self.assertIn("SICK", codes)
        self.assertNotIn("OTHER-ANNUAL", codes)

    def test_viewer_can_list_leave_types_but_cannot_create(self):
        self.client.force_login(self.viewer)

        list_response = self.client.get("/api/company/hr/leave-types/")
        self.assertEqual(list_response.status_code, 200)

        create_response = self.client.post(
            "/api/company/hr/leave-types/create/",
            data={
                "name": "Emergency Leave",
                "code": "EMERGENCY",
                "annual_allowance": 5,
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 403)

    def test_owner_can_view_update_activate_and_deactivate_leave_type(self):
        self.client.force_login(self.owner)

        detail_response = self.client.get(
            f"/api/company/hr/leave-types/{self.leave_type.id}/"
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(detail_response.json()["leave_type"]["code"], "ANNUAL")

        update_response = self.client.post(
            f"/api/company/hr/leave-types/{self.leave_type.id}/update/",
            data={
                "name": "Updated Annual Leave",
                "annual_allowance": 25,
            },
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(
            update_response.json()["leave_type"]["name"],
            "Updated Annual Leave",
        )

        deactivate_response = self.client.post(
            f"/api/company/hr/leave-types/{self.leave_type.id}/deactivate/"
        )
        self.assertEqual(deactivate_response.status_code, 200)
        self.leave_type.refresh_from_db()
        self.assertFalse(self.leave_type.is_active)

        activate_response = self.client.post(
            f"/api/company/hr/leave-types/{self.leave_type.id}/activate/"
        )
        self.assertEqual(activate_response.status_code, 200)
        self.leave_type.refresh_from_db()
        self.assertTrue(self.leave_type.is_active)

    def test_owner_cannot_view_leave_type_from_another_company(self):
        self.client.force_login(self.owner)

        response = self.client.get(
            f"/api/company/hr/leave-types/{self.other_leave_type.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_owner_can_create_and_list_leave_requests_inside_current_company(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/leave-requests/create/",
            data={
                "employee_id": self.employee.id,
                "leave_type_id": self.leave_type.id,
                "start_date": timezone.localdate().isoformat(),
                "end_date": (timezone.localdate() + timedelta(days=1)).isoformat(),
                "requested_units": 2,
                "reason": "Family vacation",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(
            payload["leave_request"]["employee"]["employee_number"],
            "EMP-LEAVE-API-001",
        )
        self.assertEqual(payload["leave_request"]["leave_type"]["code"], "ANNUAL")
        self.assertEqual(payload["leave_request"]["status"], LeaveRequestStatus.DRAFT)

        list_response = self.client.get("/api/company/hr/leave-requests/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(list_response.json()["count"], 1)

    def test_create_leave_request_rejects_foreign_employee(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/leave-requests/create/",
            data={
                "employee_id": self.other_employee.id,
                "leave_type_id": self.leave_type.id,
                "start_date": timezone.localdate().isoformat(),
                "end_date": timezone.localdate().isoformat(),
                "requested_units": 1,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("employee_id", response.json()["errors"])

    def test_create_leave_request_rejects_foreign_leave_type(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/leave-requests/create/",
            data={
                "employee_id": self.employee.id,
                "leave_type_id": self.other_leave_type.id,
                "start_date": timezone.localdate().isoformat(),
                "end_date": timezone.localdate().isoformat(),
                "requested_units": 1,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("leave_type_id", response.json()["errors"])

    def test_owner_can_view_and_update_leave_request(self):
        leave_request = LeaveRequest.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            requested_units=1,
            reason="Initial reason",
            created_by=self.owner,
            updated_by=self.owner,
        )

        self.client.force_login(self.owner)

        detail_response = self.client.get(
            f"/api/company/hr/leave-requests/{leave_request.id}/"
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertEqual(
            detail_response.json()["leave_request"]["employee"]["employee_number"],
            "EMP-LEAVE-API-001",
        )

        update_response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/update/",
            data={
                "reason": "Updated reason",
                "requested_units": 1,
            },
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 200)

        leave_request.refresh_from_db()
        self.assertEqual(leave_request.reason, "Updated reason")

    def test_owner_can_submit_and_approve_leave_request(self):
        leave_request = LeaveRequest.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            requested_units=1,
            created_by=self.owner,
            updated_by=self.owner,
        )

        self.client.force_login(self.owner)

        submit_response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/submit/"
        )
        self.assertEqual(submit_response.status_code, 200)

        leave_request.refresh_from_db()
        self.assertEqual(leave_request.status, LeaveRequestStatus.SUBMITTED)

        approve_response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/approve/",
            data={"note": "Approved by manager"},
            content_type="application/json",
        )
        self.assertEqual(approve_response.status_code, 200)

        leave_request.refresh_from_db()
        self.assertEqual(leave_request.status, LeaveRequestStatus.APPROVED)
        self.assertEqual(leave_request.manager_note, "Approved by manager")

    def test_owner_can_submit_and_reject_leave_request(self):
        leave_request = LeaveRequest.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            requested_units=1,
            created_by=self.owner,
            updated_by=self.owner,
        )

        self.client.force_login(self.owner)

        submit_response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/submit/"
        )
        self.assertEqual(submit_response.status_code, 200)

        reject_response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/reject/",
            data={"manager_note": "Rejected by manager"},
            content_type="application/json",
        )
        self.assertEqual(reject_response.status_code, 200)

        leave_request.refresh_from_db()
        self.assertEqual(leave_request.status, LeaveRequestStatus.REJECTED)
        self.assertEqual(leave_request.manager_note, "Rejected by manager")

    def test_owner_can_cancel_leave_request(self):
        leave_request = LeaveRequest.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            requested_units=1,
            created_by=self.owner,
            updated_by=self.owner,
        )

        self.client.force_login(self.owner)

        response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/cancel/",
            data={"note": "Cancelled by employee"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        leave_request.refresh_from_db()
        self.assertEqual(leave_request.status, LeaveRequestStatus.CANCELLED)
        self.assertEqual(leave_request.manager_note, "Cancelled by employee")

    def test_viewer_can_list_leave_requests_but_cannot_update(self):
        leave_request = LeaveRequest.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            start_date=timezone.localdate(),
            end_date=timezone.localdate(),
            requested_units=1,
            created_by=self.owner,
            updated_by=self.owner,
        )

        self.client.force_login(self.viewer)

        list_response = self.client.get("/api/company/hr/leave-requests/")
        self.assertEqual(list_response.status_code, 200)

        update_response = self.client.post(
            f"/api/company/hr/leave-requests/{leave_request.id}/update/",
            data={"reason": "Viewer update attempt"},
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 403)

    def test_owner_can_update_and_list_leave_balances(self):
        self.client.force_login(self.owner)

        update_response = self.client.post(
            "/api/company/hr/leave-balances/update/",
            data={
                "employee_id": self.employee.id,
                "leave_type_id": self.leave_type.id,
                "year": timezone.localdate().year,
                "opening_balance": 2,
                "accrued": 21,
                "used": 3,
                "adjusted": 0,
            },
            content_type="application/json",
        )

        self.assertEqual(update_response.status_code, 200)
        payload = update_response.json()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["leave_balance"]["available_balance"], "20")

        list_response = self.client.get("/api/company/hr/leave-balances/")
        self.assertEqual(list_response.status_code, 200)

        list_payload = list_response.json()
        self.assertEqual(list_payload["count"], 1)
        self.assertEqual(
            list_payload["results"][0]["employee"]["employee_number"],
            "EMP-LEAVE-API-001",
        )

    def test_leave_balance_update_rejects_foreign_employee(self):
        self.client.force_login(self.owner)

        response = self.client.post(
            "/api/company/hr/leave-balances/update/",
            data={
                "employee_id": self.other_employee.id,
                "leave_type_id": self.leave_type.id,
                "year": timezone.localdate().year,
                "accrued": 21,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("employee_id", response.json()["errors"])

    def test_viewer_can_list_leave_balances_but_cannot_update(self):
        LeaveBalance.objects.create(
            company=self.company,
            employee=self.employee,
            leave_type=self.leave_type,
            year=timezone.localdate().year,
            accrued=21,
            used=1,
            created_by=self.owner,
            updated_by=self.owner,
        )

        self.client.force_login(self.viewer)

        list_response = self.client.get("/api/company/hr/leave-balances/")
        self.assertEqual(list_response.status_code, 200)

        update_response = self.client.post(
            "/api/company/hr/leave-balances/update/",
            data={
                "employee_id": self.employee.id,
                "leave_type_id": self.leave_type.id,
                "year": timezone.localdate().year,
                "used": 2,
            },
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 403)


class PayrollModelsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-model-admin",
            email="payroll-model-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Model Company",
            company_code="HR-PAYROLL-MODEL-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Payroll Model Branch",
            branch_code="PAYROLL-MODEL",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-PAYROLL-MODEL-001",
            first_name="Noura",
            last_name="Hassan",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_salary_component_can_be_created_and_normalizes_code(self):
        component = SalaryComponent.objects.create(
            company=self.company,
            name="Basic Salary",
            code="basic",
            component_type=SalaryComponentType.EARNING,
            calculation_type=SalaryComponentCalculationType.FIXED,
            amount=5000,
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(component.code, "BASIC")
        self.assertEqual(component.company, self.company)
        self.assertEqual(component.component_type, SalaryComponentType.EARNING)

    def test_salary_component_rejects_negative_amount(self):
        component = SalaryComponent(
            company=self.company,
            name="Invalid Component",
            code="INVALID",
            amount=-1,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            component.full_clean()

    def test_employee_salary_profile_gross_salary(self):
        profile = EmployeeSalaryProfile.objects.create(
            company=self.company,
            employee=self.employee,
            basic_salary=5000,
            housing_allowance=1250,
            transport_allowance=500,
            other_allowance=250,
            currency="sar",
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(profile.currency, "SAR")
        self.assertEqual(profile.gross_salary, 7000)

    def test_employee_salary_profile_rejects_employee_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Payroll Model Company",
            company_code="HR-PAYROLL-MODEL-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-PAYROLL-OTHER",
            first_name="Other",
            created_by=self.user,
            updated_by=self.user,
        )

        profile = EmployeeSalaryProfile(
            company=self.company,
            employee=other_employee,
            basic_salary=5000,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            profile.full_clean()

    def test_payroll_period_can_be_created_and_named(self):
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            start_date=timezone.localdate().replace(day=1),
            end_date=timezone.localdate().replace(day=28),
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(period.status, PayrollPeriodStatus.DRAFT)
        self.assertIn(str(period.year), period.name)

    def test_payroll_period_open_and_close_workflow(self):
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            start_date=timezone.localdate().replace(day=1),
            end_date=timezone.localdate().replace(day=28),
            created_by=self.user,
            updated_by=self.user,
        )

        period.open(user=self.user)
        self.assertEqual(period.status, PayrollPeriodStatus.OPEN)

        period.close(user=self.user)
        self.assertEqual(period.status, PayrollPeriodStatus.CLOSED)

    def test_payroll_run_workflow_calculated_approved_posted(self):
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            start_date=timezone.localdate().replace(day=1),
            end_date=timezone.localdate().replace(day=28),
            created_by=self.user,
            updated_by=self.user,
        )
        payroll_run = PayrollRun.objects.create(
            company=self.company,
            period=period,
            run_number="PAY-MODEL-001",
            created_by=self.user,
            updated_by=self.user,
        )

        payroll_run.mark_calculated(user=self.user)
        self.assertEqual(payroll_run.status, PayrollRunStatus.CALCULATED)

        payroll_run.approve(user=self.user)
        self.assertEqual(payroll_run.status, PayrollRunStatus.APPROVED)

        payroll_run.post(user=self.user)
        self.assertEqual(payroll_run.status, PayrollRunStatus.POSTED)

    def test_payslip_can_be_created_and_marked_calculated_approved_paid(self):
        profile = EmployeeSalaryProfile.objects.create(
            company=self.company,
            employee=self.employee,
            basic_salary=5000,
            housing_allowance=1000,
            currency="SAR",
            created_by=self.user,
            updated_by=self.user,
        )
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            start_date=timezone.localdate().replace(day=1),
            end_date=timezone.localdate().replace(day=28),
            created_by=self.user,
            updated_by=self.user,
        )
        payroll_run = PayrollRun.objects.create(
            company=self.company,
            period=period,
            run_number="PAY-MODEL-002",
            created_by=self.user,
            updated_by=self.user,
        )
        payslip = Payslip.objects.create(
            company=self.company,
            payroll_run=payroll_run,
            period=period,
            employee=self.employee,
            salary_profile=profile,
            payslip_number="PS-MODEL-001",
            basic_salary=5000,
            total_earnings=6000,
            total_deductions=0,
            net_pay=6000,
            created_by=self.user,
            updated_by=self.user,
        )

        payslip.mark_calculated(user=self.user)
        self.assertEqual(payslip.status, PayslipStatus.CALCULATED)

        payslip.approve(user=self.user)
        self.assertEqual(payslip.status, PayslipStatus.APPROVED)

        payslip.mark_paid(user=self.user)
        self.assertEqual(payslip.status, PayslipStatus.PAID)

    def test_payslip_item_rejects_component_from_another_company(self):
        other_company = Company.objects.create(
            name="Other Payroll Item Company",
            company_code="HR-PAYROLL-ITEM-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        other_component = SalaryComponent.objects.create(
            company=other_company,
            name="Other Basic",
            code="OTHER-BASIC",
            amount=1000,
            created_by=self.user,
            updated_by=self.user,
        )
        period = PayrollPeriod.objects.create(
            company=self.company,
            year=timezone.localdate().year,
            month=timezone.localdate().month,
            start_date=timezone.localdate().replace(day=1),
            end_date=timezone.localdate().replace(day=28),
            created_by=self.user,
            updated_by=self.user,
        )
        payroll_run = PayrollRun.objects.create(
            company=self.company,
            period=period,
            run_number="PAY-MODEL-003",
            created_by=self.user,
            updated_by=self.user,
        )
        payslip = Payslip.objects.create(
            company=self.company,
            payroll_run=payroll_run,
            period=period,
            employee=self.employee,
            payslip_number="PS-MODEL-002",
            created_by=self.user,
            updated_by=self.user,
        )

        item = PayslipItem(
            company=self.company,
            payslip=payslip,
            component=other_component,
            name="Invalid",
            code="INVALID",
            component_type=SalaryComponentType.EARNING,
            amount=100,
            created_by=self.user,
            updated_by=self.user,
        )

        with self.assertRaises(ValidationError):
            item.full_clean()


class PayrollServicesTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-service-admin",
            email="payroll-service-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Service Company",
            company_code="HR-PAYROLL-SVC-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Payroll Service Branch",
            branch_code="PAYROLL-SVC",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-PAYROLL-SVC-001",
            first_name="Fahad",
            last_name="Omar",
            created_by=self.user,
            updated_by=self.user,
        )

    def test_create_salary_component_service_sets_company_and_audit(self):
        component = create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Basic Salary",
                "code": "basic",
                "component_type": SalaryComponentType.EARNING,
                "calculation_type": SalaryComponentCalculationType.FIXED,
                "amount": 5000,
            },
        )

        self.assertEqual(component.company, self.company)
        self.assertEqual(component.code, "BASIC")
        self.assertEqual(component.created_by, self.user)
        self.assertEqual(component.updated_by, self.user)

    def test_update_salary_component_service_does_not_change_company(self):
        other_company = Company.objects.create(
            name="Other Payroll Component Company",
            company_code="HR-PAYROLL-SVC-002",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        component = create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Housing Allowance",
                "code": "HOUSING",
                "amount": 1000,
            },
        )

        updated = update_salary_component(
            component=component,
            updated_by=self.user,
            data={
                "company": other_company,
                "name": "Updated Housing Allowance",
                "amount": 1500,
            },
        )

        self.assertEqual(updated.company, self.company)
        self.assertEqual(updated.name, "Updated Housing Allowance")
        self.assertEqual(updated.amount, 1500)

    def test_deactivate_salary_component_service(self):
        component = create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Transport Allowance",
                "code": "TRANSPORT",
                "amount": 500,
            },
        )

        deactivate_salary_component(
            component=component,
            updated_by=self.user,
        )

        component.refresh_from_db()
        self.assertFalse(component.is_active)

    def test_create_employee_salary_profile_service(self):
        profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "housing_allowance": 1000,
                "transport_allowance": 500,
                "currency": "sar",
            },
        )

        self.assertEqual(profile.company, self.company)
        self.assertEqual(profile.employee, self.employee)
        self.assertEqual(profile.currency, "SAR")
        self.assertEqual(profile.gross_salary, 6500)

    def test_update_employee_salary_profile_service(self):
        profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )

        updated = update_employee_salary_profile(
            profile=profile,
            updated_by=self.user,
            data={
                "basic_salary": 6000,
                "housing_allowance": 1200,
            },
        )

        self.assertEqual(updated.basic_salary, 6000)
        self.assertEqual(updated.gross_salary, 7200)

    def test_create_and_update_payroll_period_services(self):
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": timezone.localdate().year,
                "month": timezone.localdate().month,
                "start_date": timezone.localdate().replace(day=1),
                "end_date": timezone.localdate().replace(day=28),
            },
        )

        self.assertEqual(period.company, self.company)
        self.assertEqual(period.status, PayrollPeriodStatus.DRAFT)

        updated = update_payroll_period(
            period=period,
            updated_by=self.user,
            data={
                "name": "Updated Payroll Period",
            },
        )

        self.assertEqual(updated.name, "Updated Payroll Period")

    def test_open_and_close_payroll_period_services(self):
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": timezone.localdate().year,
                "month": timezone.localdate().month,
                "start_date": timezone.localdate().replace(day=1),
                "end_date": timezone.localdate().replace(day=28),
            },
        )

        open_payroll_period(period=period, updated_by=self.user)
        period.refresh_from_db()
        self.assertEqual(period.status, PayrollPeriodStatus.OPEN)

        close_payroll_period(period=period, updated_by=self.user)
        period.refresh_from_db()
        self.assertEqual(period.status, PayrollPeriodStatus.CLOSED)

    def test_create_payroll_run_service_builds_run_number(self):
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": timezone.localdate().replace(day=1),
                "end_date": timezone.localdate().replace(day=28),
            },
        )

        payroll_run = create_payroll_run(
            company=self.company,
            period=period,
            created_by=self.user,
        )

        self.assertEqual(payroll_run.company, self.company)
        self.assertEqual(payroll_run.period, period)
        self.assertEqual(payroll_run.run_number, "PAY-2026-06")

    def test_calculate_payroll_run_creates_payslip_and_items(self):
        profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "housing_allowance": 1000,
                "transport_allowance": 500,
                "other_allowance": 250,
                "currency": "SAR",
            },
        )
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": timezone.localdate().replace(day=1),
                "end_date": timezone.localdate().replace(day=28),
            },
        )
        payroll_run = create_payroll_run(
            company=self.company,
            period=period,
            created_by=self.user,
        )

        calculate_payroll_run(
            payroll_run=payroll_run,
            calculated_by=self.user,
        )

        payroll_run.refresh_from_db()

        self.assertEqual(payroll_run.status, PayrollRunStatus.CALCULATED)
        self.assertEqual(payroll_run.total_employees, 1)
        self.assertEqual(payroll_run.total_earnings, 6750)
        self.assertEqual(payroll_run.total_deductions, 0)
        self.assertEqual(payroll_run.net_pay, 6750)

        payslip = Payslip.objects.get(payroll_run=payroll_run, employee=self.employee)
        self.assertEqual(payslip.status, PayslipStatus.CALCULATED)
        self.assertEqual(payslip.net_pay, 6750)
        self.assertEqual(payslip.items.count(), 4)

        self.assertEqual(profile.gross_salary, 6750)

    def test_approve_payroll_run_approves_payslips(self):
        create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": timezone.localdate().replace(day=1),
                "end_date": timezone.localdate().replace(day=28),
            },
        )
        payroll_run = create_payroll_run(
            company=self.company,
            period=period,
            created_by=self.user,
        )

        calculate_payroll_run(
            payroll_run=payroll_run,
            calculated_by=self.user,
        )
        approve_payroll_run(
            payroll_run=payroll_run,
            approved_by=self.user,
        )

        payroll_run.refresh_from_db()
        payslip = Payslip.objects.get(payroll_run=payroll_run, employee=self.employee)

        self.assertEqual(payroll_run.status, PayrollRunStatus.APPROVED)
        self.assertEqual(payslip.status, PayslipStatus.APPROVED)


class PayrollSalaryComponentsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-components-api-admin",
            email="payroll-components-api-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Components API Company",
            company_code="HR-PAYROLL-COMP-API-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        self.membership = CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_salary_components_list_api(self):
        create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Basic Salary",
                "code": "BASIC",
                "component_type": SalaryComponentType.EARNING,
                "amount": 5000,
            },
        )

        response = self.client.get("/api/company/hr/payroll/components/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["code"], "BASIC")

    def test_salary_component_create_api(self):
        response = self.client.post(
            "/api/company/hr/payroll/components/create/",
            data={
                "name": "Housing Allowance",
                "code": "housing",
                "component_type": SalaryComponentType.EARNING,
                "calculation_type": SalaryComponentCalculationType.FIXED,
                "amount": "1200.00",
                "is_taxable": "true",
                "is_active": "true",
                "sort_order": "10",
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["code"], "HOUSING")
        self.assertEqual(payload["component"]["amount"], "1200.00")

        self.assertTrue(
            SalaryComponent.objects.filter(
                company=self.company,
                code="HOUSING",
            ).exists()
        )

    def test_salary_component_detail_api(self):
        component = create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Transport Allowance",
                "code": "TRANSPORT",
                "amount": 500,
            },
        )

        response = self.client.get(
            f"/api/company/hr/payroll/components/{component.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["id"], component.id)
        self.assertEqual(payload["component"]["code"], "TRANSPORT")

    def test_salary_component_update_api(self):
        component = create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Other Allowance",
                "code": "OTHER",
                "amount": 100,
            },
        )

        response = self.client.post(
            f"/api/company/hr/payroll/components/{component.id}/update/",
            data={
                "name": "Updated Other Allowance",
                "amount": "250.00",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["component"]["name"], "Updated Other Allowance")
        self.assertEqual(payload["component"]["amount"], "250.00")

    def test_salary_component_activate_deactivate_api(self):
        component = create_salary_component(
            company=self.company,
            created_by=self.user,
            data={
                "name": "Bonus",
                "code": "BONUS",
                "amount": 300,
                "is_active": True,
            },
        )

        response = self.client.post(
            f"/api/company/hr/payroll/components/{component.id}/deactivate/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertFalse(payload["component"]["is_active"])

        response = self.client.post(
            f"/api/company/hr/payroll/components/{component.id}/activate/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["component"]["is_active"])

    def test_salary_component_create_requires_permission(self):
        viewer = User.objects.create_user(
            username="payroll-components-api-viewer",
            email="payroll-components-api-viewer@example.com",
            password="StrongPass12345",
        )
        CompanyMembership.objects.create(
            user=viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_login(viewer)

        response = self.client.post(
            "/api/company/hr/payroll/components/create/",
            data={
                "name": "Unauthorized Component",
                "code": "UNAUTH",
                "amount": "100.00",
            },
        )

        self.assertIn(response.status_code, [403, 404])
        self.assertFalse(
            SalaryComponent.objects.filter(
                company=self.company,
                code="UNAUTH",
            ).exists()
        )

    def test_salary_component_tenant_isolation(self):
        other_user = User.objects.create_user(
            username="payroll-components-api-other",
            email="payroll-components-api-other@example.com",
            password="StrongPass12345",
        )
        other_company = Company.objects.create(
            name="Other Payroll Components API Company",
            company_code="HR-PAYROLL-COMP-API-002",
            owner=other_user,
            created_by=other_user,
            updated_by=other_user,
        )
        other_component = create_salary_component(
            company=other_company,
            created_by=other_user,
            data={
                "name": "Other Company Component",
                "code": "OTHER-COMP",
                "amount": 999,
            },
        )

        response = self.client.get(
            f"/api/company/hr/payroll/components/{other_component.id}/"
        )

        self.assertEqual(response.status_code, 404)


class PayrollSalaryProfilesAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-profiles-api-admin",
            email="payroll-profiles-api-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Profiles API Company",
            company_code="HR-PAYROLL-PROF-API-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Payroll Profiles API Branch",
            branch_code="PAYROLL-PROF-API",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-PROF-API-001",
            first_name="Sara",
            last_name="Ali",
            created_by=self.user,
            updated_by=self.user,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_salary_profiles_list_api(self):
        create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "housing_allowance": 1000,
                "currency": "SAR",
            },
        )

        response = self.client.get("/api/company/hr/payroll/profiles/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["employee"]["employee_number"], "EMP-PROF-API-001")

    def test_salary_profile_create_api(self):
        response = self.client.post(
            "/api/company/hr/payroll/profiles/create/",
            data={
                "employee_id": self.employee.id,
                "basic_salary": "6000.00",
                "housing_allowance": "1200.00",
                "transport_allowance": "500.00",
                "other_allowance": "300.00",
                "currency": "sar",
                "bank_name": "Prime Bank",
                "iban": "SA0000000000000000000000",
                "is_active": "true",
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["profile"]["employee_id"], self.employee.id)
        self.assertEqual(payload["profile"]["currency"], "SAR")
        self.assertEqual(payload["profile"]["gross_salary"], "8000.00")

        self.assertTrue(
            EmployeeSalaryProfile.objects.filter(
                company=self.company,
                employee=self.employee,
                is_active=True,
            ).exists()
        )

    def test_salary_profile_detail_api(self):
        profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )

        response = self.client.get(
            f"/api/company/hr/payroll/profiles/{profile.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["profile"]["id"], profile.id)
        self.assertEqual(payload["profile"]["employee_id"], self.employee.id)

    def test_salary_profile_update_api(self):
        profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )

        response = self.client.post(
            f"/api/company/hr/payroll/profiles/{profile.id}/update/",
            data={
                "basic_salary": "6500.00",
                "housing_allowance": "1500.00",
                "currency": "sar",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["profile"]["basic_salary"], "6500.00")
        self.assertEqual(payload["profile"]["gross_salary"], "8000.00")

    def test_salary_profile_activate_deactivate_api(self):
        profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
                "is_active": True,
            },
        )

        response = self.client.post(
            f"/api/company/hr/payroll/profiles/{profile.id}/deactivate/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertFalse(payload["profile"]["is_active"])

        response = self.client.post(
            f"/api/company/hr/payroll/profiles/{profile.id}/activate/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertTrue(payload["profile"]["is_active"])

    def test_salary_profile_create_requires_permission(self):
        viewer = User.objects.create_user(
            username="payroll-profiles-api-viewer",
            email="payroll-profiles-api-viewer@example.com",
            password="StrongPass12345",
        )
        CompanyMembership.objects.create(
            user=viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_login(viewer)

        response = self.client.post(
            "/api/company/hr/payroll/profiles/create/",
            data={
                "employee_id": self.employee.id,
                "basic_salary": "5000.00",
                "currency": "SAR",
            },
        )

        self.assertIn(response.status_code, [403, 404])
        self.assertFalse(
            EmployeeSalaryProfile.objects.filter(
                company=self.company,
                employee=self.employee,
            ).exists()
        )

    def test_salary_profile_tenant_isolation(self):
        other_user = User.objects.create_user(
            username="payroll-profiles-api-other",
            email="payroll-profiles-api-other@example.com",
            password="StrongPass12345",
        )
        other_company = Company.objects.create(
            name="Other Payroll Profiles API Company",
            company_code="HR-PAYROLL-PROF-API-002",
            owner=other_user,
            created_by=other_user,
            updated_by=other_user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-PROF-OTHER",
            first_name="Other",
            created_by=other_user,
            updated_by=other_user,
        )
        other_profile = create_employee_salary_profile(
            company=other_company,
            employee=other_employee,
            created_by=other_user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )

        response = self.client.get(
            f"/api/company/hr/payroll/profiles/{other_profile.id}/"
        )

        self.assertEqual(response.status_code, 404)


class PayrollPeriodsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-periods-api-admin",
            email="payroll-periods-api-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Periods API Company",
            company_code="HR-PAYROLL-PERIOD-API-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_payroll_periods_list_api(self):
        create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": "2026-06-01",
                "end_date": "2026-06-30",
            },
        )

        response = self.client.get("/api/company/hr/payroll/periods/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["year"], 2026)
        self.assertEqual(payload["results"][0]["month"], 6)

    def test_payroll_period_create_api(self):
        response = self.client.post(
            "/api/company/hr/payroll/periods/create/",
            data={
                "year": "2026",
                "month": "7",
                "start_date": "2026-07-01",
                "end_date": "2026-07-31",
                "payment_date": "2026-08-01",
                "notes": "July payroll",
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["period"]["year"], 2026)
        self.assertEqual(payload["period"]["month"], 7)
        self.assertEqual(payload["period"]["status"], PayrollPeriodStatus.DRAFT)

        self.assertTrue(
            PayrollPeriod.objects.filter(
                company=self.company,
                year=2026,
                month=7,
            ).exists()
        )

    def test_payroll_period_detail_api(self):
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 8,
                "start_date": "2026-08-01",
                "end_date": "2026-08-31",
            },
        )

        response = self.client.get(
            f"/api/company/hr/payroll/periods/{period.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["period"]["id"], period.id)
        self.assertEqual(payload["period"]["month"], 8)

    def test_payroll_period_update_api(self):
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 9,
                "start_date": "2026-09-01",
                "end_date": "2026-09-30",
            },
        )

        response = self.client.post(
            f"/api/company/hr/payroll/periods/{period.id}/update/",
            data={
                "name": "Updated September Payroll",
                "payment_date": "2026-10-01",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["period"]["name"], "Updated September Payroll")
        self.assertEqual(payload["period"]["payment_date"], "2026-10-01")

    def test_payroll_period_open_close_api(self):
        period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 10,
                "start_date": "2026-10-01",
                "end_date": "2026-10-31",
            },
        )

        response = self.client.post(
            f"/api/company/hr/payroll/periods/{period.id}/open/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["period"]["status"], PayrollPeriodStatus.OPEN)

        response = self.client.post(
            f"/api/company/hr/payroll/periods/{period.id}/close/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["period"]["status"], PayrollPeriodStatus.CLOSED)

    def test_payroll_period_create_requires_permission(self):
        viewer = User.objects.create_user(
            username="payroll-periods-api-viewer",
            email="payroll-periods-api-viewer@example.com",
            password="StrongPass12345",
        )
        CompanyMembership.objects.create(
            user=viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_login(viewer)

        response = self.client.post(
            "/api/company/hr/payroll/periods/create/",
            data={
                "year": "2026",
                "month": "11",
                "start_date": "2026-11-01",
                "end_date": "2026-11-30",
            },
        )

        self.assertIn(response.status_code, [403, 404])
        self.assertFalse(
            PayrollPeriod.objects.filter(
                company=self.company,
                year=2026,
                month=11,
            ).exists()
        )

    def test_payroll_period_tenant_isolation(self):
        other_user = User.objects.create_user(
            username="payroll-periods-api-other",
            email="payroll-periods-api-other@example.com",
            password="StrongPass12345",
        )
        other_company = Company.objects.create(
            name="Other Payroll Periods API Company",
            company_code="HR-PAYROLL-PERIOD-API-002",
            owner=other_user,
            created_by=other_user,
            updated_by=other_user,
        )
        other_period = create_payroll_period(
            company=other_company,
            created_by=other_user,
            data={
                "year": 2026,
                "month": 12,
                "start_date": "2026-12-01",
                "end_date": "2026-12-31",
            },
        )

        response = self.client.get(
            f"/api/company/hr/payroll/periods/{other_period.id}/"
        )

        self.assertEqual(response.status_code, 404)


class PayrollRunsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-runs-api-admin",
            email="payroll-runs-api-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Runs API Company",
            company_code="HR-PAYROLL-RUN-API-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Payroll Runs API Branch",
            branch_code="PAYROLL-RUN-API",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-RUN-API-001",
            first_name="Omar",
            last_name="Saleh",
            created_by=self.user,
            updated_by=self.user,
        )
        self.period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": "2026-06-01",
                "end_date": "2026-06-30",
            },
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_payroll_runs_list_api(self):
        create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )

        response = self.client.get("/api/company/hr/payroll/runs/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["period_id"], self.period.id)

    def test_payroll_run_create_api(self):
        response = self.client.post(
            "/api/company/hr/payroll/runs/create/",
            data={
                "period_id": self.period.id,
                "name": "June Payroll Run",
                "notes": "Main monthly payroll",
            },
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payroll_run"]["period_id"], self.period.id)
        self.assertEqual(payload["payroll_run"]["run_number"], "PAY-2026-06")

        self.assertTrue(
            PayrollRun.objects.filter(
                company=self.company,
                period=self.period,
                run_number="PAY-2026-06",
            ).exists()
        )

    def test_payroll_run_detail_api(self):
        payroll_run = create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )

        response = self.client.get(
            f"/api/company/hr/payroll/runs/{payroll_run.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payroll_run"]["id"], payroll_run.id)

    def test_payroll_run_update_api(self):
        payroll_run = create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/payroll/runs/{payroll_run.id}/update/",
            data={
                "name": "Updated Payroll Run",
                "notes": "Updated notes",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payroll_run"]["name"], "Updated Payroll Run")

    def test_payroll_run_calculate_and_approve_api(self):
        create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "housing_allowance": 1000,
                "transport_allowance": 500,
                "currency": "SAR",
            },
        )
        payroll_run = create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/payroll/runs/{payroll_run.id}/calculate/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payroll_run"]["status"], PayrollRunStatus.CALCULATED)
        self.assertEqual(payload["payroll_run"]["total_employees"], 1)
        self.assertEqual(Decimal(payload["payroll_run"]["net_pay"]), Decimal("6500"))

        response = self.client.post(
            f"/api/company/hr/payroll/runs/{payroll_run.id}/approve/"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payroll_run"]["status"], PayrollRunStatus.APPROVED)

    def test_payroll_run_cancel_api(self):
        payroll_run = create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/payroll/runs/{payroll_run.id}/cancel/",
            data={
                "note": "Cancelled by test",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payroll_run"]["status"], PayrollRunStatus.CANCELLED)

    def test_payroll_run_create_requires_permission(self):
        viewer = User.objects.create_user(
            username="payroll-runs-api-viewer",
            email="payroll-runs-api-viewer@example.com",
            password="StrongPass12345",
        )
        CompanyMembership.objects.create(
            user=viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_login(viewer)

        response = self.client.post(
            "/api/company/hr/payroll/runs/create/",
            data={
                "period_id": self.period.id,
            },
        )

        self.assertIn(response.status_code, [403, 404])
        self.assertFalse(
            PayrollRun.objects.filter(
                company=self.company,
                period=self.period,
            ).exists()
        )

    def test_payroll_run_tenant_isolation(self):
        other_user = User.objects.create_user(
            username="payroll-runs-api-other",
            email="payroll-runs-api-other@example.com",
            password="StrongPass12345",
        )
        other_company = Company.objects.create(
            name="Other Payroll Runs API Company",
            company_code="HR-PAYROLL-RUN-API-002",
            owner=other_user,
            created_by=other_user,
            updated_by=other_user,
        )
        other_period = create_payroll_period(
            company=other_company,
            created_by=other_user,
            data={
                "year": 2026,
                "month": 7,
                "start_date": "2026-07-01",
                "end_date": "2026-07-31",
            },
        )
        other_run = create_payroll_run(
            company=other_company,
            period=other_period,
            created_by=other_user,
        )

        response = self.client.get(
            f"/api/company/hr/payroll/runs/{other_run.id}/"
        )

        self.assertEqual(response.status_code, 404)


class PayrollPayslipsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-payslips-api-admin",
            email="payroll-payslips-api-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Payslips API Company",
            company_code="HR-PAYSLIP-API-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Payroll Payslips API Branch",
            branch_code="PAYSLIP-API",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-PAYSLIP-API-001",
            first_name="Nora",
            last_name="Hassan",
            created_by=self.user,
            updated_by=self.user,
        )
        self.period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": "2026-06-01",
                "end_date": "2026-06-30",
            },
        )
        self.profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "housing_allowance": 1000,
                "transport_allowance": 500,
                "currency": "SAR",
            },
        )
        self.payroll_run = create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )
        calculate_payroll_run(
            payroll_run=self.payroll_run,
            calculated_by=self.user,
        )
        self.payslip = Payslip.objects.get(
            company=self.company,
            payroll_run=self.payroll_run,
            employee=self.employee,
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_payslips_list_api(self):
        response = self.client.get("/api/company/hr/payroll/payslips/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["employee_id"], self.employee.id)
        self.assertEqual(payload["results"][0]["payroll_run_id"], self.payroll_run.id)

    def test_payslip_detail_api_includes_items(self):
        response = self.client.get(
            f"/api/company/hr/payroll/payslips/{self.payslip.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payslip"]["id"], self.payslip.id)
        self.assertIn("items", payload["payslip"])
        self.assertGreaterEqual(len(payload["payslip"]["items"]), 1)

    def test_payslip_update_api(self):
        response = self.client.post(
            f"/api/company/hr/payroll/payslips/{self.payslip.id}/update/",
            data={
                "notes": "Updated payslip notes",
                "currency": "SAR",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payslip"]["notes"], "Updated payslip notes")

    def test_payslip_approve_and_pay_api(self):
        response = self.client.post(
            f"/api/company/hr/payroll/payslips/{self.payslip.id}/approve/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payslip"]["status"], PayslipStatus.APPROVED)

        response = self.client.post(
            f"/api/company/hr/payroll/payslips/{self.payslip.id}/pay/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payslip"]["status"], PayslipStatus.PAID)

    def test_payslip_cancel_api(self):
        response = self.client.post(
            f"/api/company/hr/payroll/payslips/{self.payslip.id}/cancel/",
            data={
                "note": "Cancelled by test",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["payslip"]["status"], PayslipStatus.CANCELLED)

    def test_payslip_update_requires_permission(self):
        viewer = User.objects.create_user(
            username="payroll-payslips-api-viewer",
            email="payroll-payslips-api-viewer@example.com",
            password="StrongPass12345",
        )
        CompanyMembership.objects.create(
            user=viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_login(viewer)

        response = self.client.post(
            f"/api/company/hr/payroll/payslips/{self.payslip.id}/update/",
            data={
                "notes": "Viewer should not update",
            },
        )

        self.assertIn(response.status_code, [403, 404])
        self.payslip.refresh_from_db()
        self.assertNotEqual(self.payslip.notes, "Viewer should not update")

    def test_payslip_tenant_isolation(self):
        other_user = User.objects.create_user(
            username="payroll-payslips-api-other",
            email="payroll-payslips-api-other@example.com",
            password="StrongPass12345",
        )
        other_company = Company.objects.create(
            name="Other Payroll Payslips API Company",
            company_code="HR-PAYSLIP-API-002",
            owner=other_user,
            created_by=other_user,
            updated_by=other_user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-PAYSLIP-OTHER",
            first_name="Other",
            created_by=other_user,
            updated_by=other_user,
        )
        other_period = create_payroll_period(
            company=other_company,
            created_by=other_user,
            data={
                "year": 2026,
                "month": 7,
                "start_date": "2026-07-01",
                "end_date": "2026-07-31",
            },
        )
        create_employee_salary_profile(
            company=other_company,
            employee=other_employee,
            created_by=other_user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )
        other_run = create_payroll_run(
            company=other_company,
            period=other_period,
            created_by=other_user,
        )
        calculate_payroll_run(
            payroll_run=other_run,
            calculated_by=other_user,
        )
        other_payslip = Payslip.objects.get(
            company=other_company,
            payroll_run=other_run,
            employee=other_employee,
        )

        response = self.client.get(
            f"/api/company/hr/payroll/payslips/{other_payslip.id}/"
        )

        self.assertEqual(response.status_code, 404)


class PayrollPayslipItemsAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="payroll-payslip-items-api-admin",
            email="payroll-payslip-items-api-admin@example.com",
            password="StrongPass12345",
        )
        self.company = Company.objects.create(
            name="Primey Payroll Payslip Items API Company",
            company_code="HR-PAYSLIP-ITEM-API-001",
            owner=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.ADMIN,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.branch = Branch.objects.create(
            company=self.company,
            name="Payroll Payslip Items API Branch",
            branch_code="PAYSLIP-ITEM-API",
            created_by=self.user,
            updated_by=self.user,
        )
        self.employee = Employee.objects.create(
            company=self.company,
            branch=self.branch,
            employee_number="EMP-PAYSLIP-ITEM-API-001",
            first_name="Fahad",
            last_name="Ali",
            created_by=self.user,
            updated_by=self.user,
        )
        self.period = create_payroll_period(
            company=self.company,
            created_by=self.user,
            data={
                "year": 2026,
                "month": 6,
                "start_date": "2026-06-01",
                "end_date": "2026-06-30",
            },
        )
        self.profile = create_employee_salary_profile(
            company=self.company,
            employee=self.employee,
            created_by=self.user,
            data={
                "basic_salary": 5000,
                "housing_allowance": 1000,
                "transport_allowance": 500,
                "currency": "SAR",
            },
        )
        self.payroll_run = create_payroll_run(
            company=self.company,
            period=self.period,
            created_by=self.user,
        )
        calculate_payroll_run(
            payroll_run=self.payroll_run,
            calculated_by=self.user,
        )
        self.payslip = Payslip.objects.get(
            company=self.company,
            payroll_run=self.payroll_run,
            employee=self.employee,
        )
        self.item = PayslipItem.objects.filter(
            company=self.company,
            payslip=self.payslip,
        ).first()
        self.client = Client()
        self.client.force_login(self.user)

    def test_payslip_items_list_api(self):
        response = self.client.get("/api/company/hr/payroll/payslip-items/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertGreaterEqual(payload["count"], 1)
        self.assertEqual(payload["results"][0]["payslip_id"], self.payslip.id)

    def test_payslip_item_detail_api(self):
        response = self.client.get(
            f"/api/company/hr/payroll/payslip-items/{self.item.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["item"]["id"], self.item.id)
        self.assertEqual(payload["item"]["payslip_id"], self.payslip.id)
        self.assertEqual(payload["item"]["employee_id"], self.employee.id)

    def test_payslip_item_update_api(self):
        response = self.client.post(
            f"/api/company/hr/payroll/payslip-items/{self.item.id}/update/",
            data={
                "name": "Updated Payslip Item",
                "amount": "1234.50",
                "notes": "Updated by API test",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["item"]["name"], "Updated Payslip Item")
        self.assertEqual(payload["item"]["amount"], "1234.50")
        self.assertEqual(payload["item"]["notes"], "Updated by API test")

    def test_payslip_item_update_requires_permission(self):
        viewer = User.objects.create_user(
            username="payroll-payslip-items-api-viewer",
            email="payroll-payslip-items-api-viewer@example.com",
            password="StrongPass12345",
        )
        CompanyMembership.objects.create(
            user=viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            created_by=self.user,
            updated_by=self.user,
        )
        self.client.force_login(viewer)

        response = self.client.post(
            f"/api/company/hr/payroll/payslip-items/{self.item.id}/update/",
            data={
                "name": "Viewer should not update",
            },
        )

        self.assertIn(response.status_code, [403, 404])
        self.item.refresh_from_db()
        self.assertNotEqual(self.item.name, "Viewer should not update")

    def test_payslip_item_tenant_isolation(self):
        other_user = User.objects.create_user(
            username="payroll-payslip-items-api-other",
            email="payroll-payslip-items-api-other@example.com",
            password="StrongPass12345",
        )
        other_company = Company.objects.create(
            name="Other Payroll Payslip Items API Company",
            company_code="HR-PAYSLIP-ITEM-API-002",
            owner=other_user,
            created_by=other_user,
            updated_by=other_user,
        )
        other_employee = Employee.objects.create(
            company=other_company,
            employee_number="EMP-PAYSLIP-ITEM-OTHER",
            first_name="Other",
            created_by=other_user,
            updated_by=other_user,
        )
        other_period = create_payroll_period(
            company=other_company,
            created_by=other_user,
            data={
                "year": 2026,
                "month": 7,
                "start_date": "2026-07-01",
                "end_date": "2026-07-31",
            },
        )
        create_employee_salary_profile(
            company=other_company,
            employee=other_employee,
            created_by=other_user,
            data={
                "basic_salary": 5000,
                "currency": "SAR",
            },
        )
        other_run = create_payroll_run(
            company=other_company,
            period=other_period,
            created_by=other_user,
        )
        calculate_payroll_run(
            payroll_run=other_run,
            calculated_by=other_user,
        )
        other_payslip = Payslip.objects.get(
            company=other_company,
            payroll_run=other_run,
            employee=other_employee,
        )
        other_item = PayslipItem.objects.filter(
            company=other_company,
            payslip=other_payslip,
        ).first()

        response = self.client.get(
            f"/api/company/hr/payroll/payslip-items/{other_item.id}/"
        )

        self.assertEqual(response.status_code, 404)

# ============================================================
# ?? Performance Cycles API Tests
# ============================================================


class PerformanceCyclesAPITests(TestCase):
    def setUp(self):
        self.client = Client()

        self.company = Company.objects.create(
            name="Performance Company",
            company_code="PERF-001",
        )
        self.other_company = Company.objects.create(
            name="Other Performance Company",
            company_code="PERF-002",
        )

        self.user = User.objects.create_user(
            username="performance-admin",
            email="performance-admin@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.HR,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.viewer = User.objects.create_user(
            username="performance-viewer",
            email="performance-viewer@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.client.force_login(self.user)

    def test_create_performance_cycle_api(self):
        response = self.client.post(
            "/api/company/hr/performance/cycles/create/",
            data={
                "name": "2026 Annual Review",
                "code": "ANN-2026",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
                "description": "Annual performance review",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["cycle"]["code"], "ANN-2026")
        self.assertEqual(
            PerformanceCycle.objects.filter(company=self.company).count(),
            1,
        )

    def test_list_performance_cycles_api(self):
        PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )
        PerformanceCycle.objects.create(
            company=self.other_company,
            name="Other Review",
            code="OTHER-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
        )

        response = self.client.get("/api/company/hr/performance/cycles/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["code"], "ANN-2026")

    def test_detail_performance_cycle_api(self):
        cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(f"/api/company/hr/performance/cycles/{cycle.id}/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["cycle"]["id"], cycle.id)

    def test_update_performance_cycle_api(self):
        cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/cycles/{cycle.id}/update/",
            data={
                "name": "2026 Updated Review",
                "description": "Updated description",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        cycle.refresh_from_db()
        self.assertEqual(cycle.name, "2026 Updated Review")

    def test_open_close_cancel_performance_cycle_api(self):
        cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )

        open_response = self.client.post(
            f"/api/company/hr/performance/cycles/{cycle.id}/open/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(open_response.status_code, 200)
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, PerformanceCycleStatus.OPEN)

        close_response = self.client.post(
            f"/api/company/hr/performance/cycles/{cycle.id}/close/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(close_response.status_code, 200)
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, PerformanceCycleStatus.CLOSED)

    def test_cancel_performance_cycle_api(self):
        cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/cycles/{cycle.id}/cancel/",
            data={"note": "Cancelled by admin"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        cycle.refresh_from_db()
        self.assertEqual(cycle.status, PerformanceCycleStatus.CANCELLED)

    def test_performance_cycle_cross_company_blocked(self):
        other_cycle = PerformanceCycle.objects.create(
            company=self.other_company,
            name="Other Review",
            code="OTHER-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
        )

        response = self.client.get(
            f"/api/company/hr/performance/cycles/{other_cycle.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_performance_cycle(self):
        self.client.force_login(self.viewer)

        response = self.client.post(
            "/api/company/hr/performance/cycles/create/",
            data={
                "name": "Viewer Review",
                "code": "VIEWER-2026",
                "start_date": "2026-01-01",
                "end_date": "2026-12-31",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

# ============================================================
# ?? Performance Criteria API Tests
# ============================================================


class PerformanceCriteriaAPITests(TestCase):
    def setUp(self):
        self.client = Client()

        self.company = Company.objects.create(
            name="Performance Criteria Company",
            company_code="PERF-CRIT-001",
        )
        self.other_company = Company.objects.create(
            name="Other Performance Criteria Company",
            company_code="PERF-CRIT-002",
        )

        self.user = User.objects.create_user(
            username="criteria-hr",
            email="criteria-hr@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.HR,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.viewer = User.objects.create_user(
            username="criteria-viewer",
            email="criteria-viewer@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.client.force_login(self.user)

    def test_create_performance_criterion_api(self):
        response = self.client.post(
            "/api/company/hr/performance/criteria/create/",
            data={
                "name": "Quality of Work",
                "code": "QUALITY",
                "description": "Work quality and accuracy",
                "max_score": "5.00",
                "weight": "40.0000",
                "sort_order": 1,
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["criterion"]["code"], "QUALITY")
        self.assertEqual(
            PerformanceCriterion.objects.filter(company=self.company).count(),
            1,
        )

    def test_list_performance_criteria_api(self):
        PerformanceCriterion.objects.create(
            company=self.company,
            name="Quality of Work",
            code="QUALITY",
            max_score="5.00",
            weight="40.0000",
            created_by=self.user,
            updated_by=self.user,
        )
        PerformanceCriterion.objects.create(
            company=self.other_company,
            name="Other Criterion",
            code="OTHER",
            max_score="5.00",
            weight="20.0000",
        )

        response = self.client.get("/api/company/hr/performance/criteria/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["code"], "QUALITY")

    def test_detail_performance_criterion_api(self):
        criterion = PerformanceCriterion.objects.create(
            company=self.company,
            name="Quality of Work",
            code="QUALITY",
            max_score="5.00",
            weight="40.0000",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            f"/api/company/hr/performance/criteria/{criterion.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["criterion"]["id"], criterion.id)

    def test_update_performance_criterion_api(self):
        criterion = PerformanceCriterion.objects.create(
            company=self.company,
            name="Quality of Work",
            code="QUALITY",
            max_score="5.00",
            weight="40.0000",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/criteria/{criterion.id}/update/",
            data={
                "name": "Updated Quality",
                "weight": "50.0000",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        criterion.refresh_from_db()
        self.assertEqual(criterion.name, "Updated Quality")
        self.assertEqual(str(criterion.weight), "50.0000")

    def test_activate_deactivate_performance_criterion_api(self):
        criterion = PerformanceCriterion.objects.create(
            company=self.company,
            name="Quality of Work",
            code="QUALITY",
            max_score="5.00",
            weight="40.0000",
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        deactivate_response = self.client.post(
            f"/api/company/hr/performance/criteria/{criterion.id}/deactivate/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(deactivate_response.status_code, 200)
        criterion.refresh_from_db()
        self.assertFalse(criterion.is_active)

        activate_response = self.client.post(
            f"/api/company/hr/performance/criteria/{criterion.id}/activate/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(activate_response.status_code, 200)
        criterion.refresh_from_db()
        self.assertTrue(criterion.is_active)

    def test_performance_criterion_cross_company_blocked(self):
        other_criterion = PerformanceCriterion.objects.create(
            company=self.other_company,
            name="Other Criterion",
            code="OTHER",
            max_score="5.00",
            weight="20.0000",
        )

        response = self.client.get(
            f"/api/company/hr/performance/criteria/{other_criterion.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_performance_criterion(self):
        self.client.force_login(self.viewer)

        response = self.client.post(
            "/api/company/hr/performance/criteria/create/",
            data={
                "name": "Viewer Criterion",
                "code": "VIEWER",
                "max_score": "5.00",
                "weight": "10.0000",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

# ============================================================
# ?? Performance Reviews API Tests
# ============================================================


class PerformanceReviewsAPITests(TestCase):
    def setUp(self):
        self.client = Client()

        self.company = Company.objects.create(
            name="Performance Reviews Company",
            company_code="PERF-REV-001",
        )
        self.other_company = Company.objects.create(
            name="Other Performance Reviews Company",
            company_code="PERF-REV-002",
        )

        self.user = User.objects.create_user(
            username="reviews-hr",
            email="reviews-hr@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.HR,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.viewer = User.objects.create_user(
            username="reviews-viewer",
            email="reviews-viewer@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.employee = Employee.objects.create(
            company=self.company,
            employee_number="EMP-REV-001",
            first_name="Review",
            last_name="Employee",
            job_title="Accountant",
            department_name="Finance",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_employee = Employee.objects.create(
            company=self.other_company,
            employee_number="EMP-REV-OTHER",
            first_name="Other",
            last_name="Employee",
        )

        self.cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_cycle = PerformanceCycle.objects.create(
            company=self.other_company,
            name="Other Annual Review",
            code="OTHER-ANN-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
        )

        self.client.force_login(self.user)

    def test_create_performance_review_api(self):
        response = self.client.post(
            "/api/company/hr/performance/reviews/create/",
            data={
                "cycle_id": self.cycle.id,
                "employee_id": self.employee.id,
                "review_date": "2026-06-30",
                "final_rating": "Good",
                "reviewer_comments": "Initial review",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["review"]["employee_id"], self.employee.id)
        self.assertEqual(payload["review"]["cycle_id"], self.cycle.id)
        self.assertEqual(
            EmployeePerformanceReview.objects.filter(company=self.company).count(),
            1,
        )

    def test_list_performance_reviews_api(self):
        EmployeePerformanceReview.objects.create(
            company=self.company,
            cycle=self.cycle,
            employee=self.employee,
            reviewer=self.user,
            review_date="2026-06-30",
            created_by=self.user,
            updated_by=self.user,
        )
        EmployeePerformanceReview.objects.create(
            company=self.other_company,
            cycle=self.other_cycle,
            employee=self.other_employee,
            review_date="2026-06-30",
        )

        response = self.client.get("/api/company/hr/performance/reviews/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["employee_id"], self.employee.id)

    def test_detail_performance_review_api(self):
        review = EmployeePerformanceReview.objects.create(
            company=self.company,
            cycle=self.cycle,
            employee=self.employee,
            reviewer=self.user,
            review_date="2026-06-30",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            f"/api/company/hr/performance/reviews/{review.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["review"]["id"], review.id)
        self.assertIn("scores", payload["review"])

    def test_update_performance_review_api(self):
        review = EmployeePerformanceReview.objects.create(
            company=self.company,
            cycle=self.cycle,
            employee=self.employee,
            reviewer=self.user,
            review_date="2026-06-30",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/reviews/{review.id}/update/",
            data={
                "final_rating": "Excellent",
                "reviewer_comments": "Updated comments",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.final_rating, "Excellent")
        self.assertEqual(review.reviewer_comments, "Updated comments")

    def test_submit_approve_performance_review_api(self):
        review = EmployeePerformanceReview.objects.create(
            company=self.company,
            cycle=self.cycle,
            employee=self.employee,
            reviewer=self.user,
            review_date="2026-06-30",
            created_by=self.user,
            updated_by=self.user,
        )

        submit_response = self.client.post(
            f"/api/company/hr/performance/reviews/{review.id}/submit/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(submit_response.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.status, PerformanceReviewStatus.SUBMITTED)

        approve_response = self.client.post(
            f"/api/company/hr/performance/reviews/{review.id}/approve/",
            data={"note": "Approved by HR"},
            content_type="application/json",
        )
        self.assertEqual(approve_response.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.status, PerformanceReviewStatus.APPROVED)

    def test_cancel_performance_review_api(self):
        review = EmployeePerformanceReview.objects.create(
            company=self.company,
            cycle=self.cycle,
            employee=self.employee,
            reviewer=self.user,
            review_date="2026-06-30",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/reviews/{review.id}/cancel/",
            data={"note": "Cancelled by HR"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        review.refresh_from_db()
        self.assertEqual(review.status, PerformanceReviewStatus.CANCELLED)

    def test_performance_review_cross_company_blocked(self):
        other_review = EmployeePerformanceReview.objects.create(
            company=self.other_company,
            cycle=self.other_cycle,
            employee=self.other_employee,
            review_date="2026-06-30",
        )

        response = self.client.get(
            f"/api/company/hr/performance/reviews/{other_review.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_performance_review(self):
        self.client.force_login(self.viewer)

        response = self.client.post(
            "/api/company/hr/performance/reviews/create/",
            data={
                "cycle_id": self.cycle.id,
                "employee_id": self.employee.id,
                "review_date": "2026-06-30",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

# ============================================================
# ?? Performance Scores API Tests
# ============================================================


class PerformanceScoresAPITests(TestCase):
    def setUp(self):
        self.client = Client()

        self.company = Company.objects.create(
            name="Performance Scores Company",
            company_code="PERF-SCORE-001",
        )
        self.other_company = Company.objects.create(
            name="Other Performance Scores Company",
            company_code="PERF-SCORE-002",
        )

        self.user = User.objects.create_user(
            username="scores-hr",
            email="scores-hr@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.HR,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.viewer = User.objects.create_user(
            username="scores-viewer",
            email="scores-viewer@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.employee = Employee.objects.create(
            company=self.company,
            employee_number="EMP-SCORE-001",
            first_name="Score",
            last_name="Employee",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_employee = Employee.objects.create(
            company=self.other_company,
            employee_number="EMP-SCORE-OTHER",
            first_name="Other",
            last_name="Employee",
        )

        self.cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Annual Review",
            code="ANN-SCORE-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_cycle = PerformanceCycle.objects.create(
            company=self.other_company,
            name="Other Annual Review",
            code="OTHER-SCORE-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
        )

        self.review = EmployeePerformanceReview.objects.create(
            company=self.company,
            cycle=self.cycle,
            employee=self.employee,
            reviewer=self.user,
            review_date="2026-06-30",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_review = EmployeePerformanceReview.objects.create(
            company=self.other_company,
            cycle=self.other_cycle,
            employee=self.other_employee,
            review_date="2026-06-30",
        )

        self.criterion = PerformanceCriterion.objects.create(
            company=self.company,
            name="Quality",
            code="QUALITY-SCORE",
            max_score="5.00",
            weight="50.0000",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_criterion = PerformanceCriterion.objects.create(
            company=self.other_company,
            name="Other Quality",
            code="OTHER-QUALITY-SCORE",
            max_score="5.00",
            weight="50.0000",
        )

        self.client.force_login(self.user)

    def test_create_performance_score_api(self):
        response = self.client.post(
            "/api/company/hr/performance/scores/create/",
            data={
                "review_id": self.review.id,
                "criterion_id": self.criterion.id,
                "score": "4.0000",
                "comments": "Good quality",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["score"]["review_id"], self.review.id)
        self.assertEqual(payload["score"]["criterion_id"], self.criterion.id)
        self.assertEqual(
            PerformanceReviewScore.objects.filter(company=self.company).count(),
            1,
        )

        self.review.refresh_from_db()
        self.assertGreater(self.review.overall_score, 0)

    def test_list_performance_scores_api(self):
        PerformanceReviewScore.objects.create(
            company=self.company,
            review=self.review,
            criterion=self.criterion,
            score="4.0000",
            created_by=self.user,
            updated_by=self.user,
        )
        PerformanceReviewScore.objects.create(
            company=self.other_company,
            review=self.other_review,
            criterion=self.other_criterion,
            score="3.0000",
        )

        response = self.client.get(
            f"/api/company/hr/performance/scores/?review_id={self.review.id}"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["results"]), 1)

    def test_detail_performance_score_api(self):
        score = PerformanceReviewScore.objects.create(
            company=self.company,
            review=self.review,
            criterion=self.criterion,
            score="4.0000",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            f"/api/company/hr/performance/scores/{score.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["score"]["id"], score.id)

    def test_update_performance_score_api(self):
        score = PerformanceReviewScore.objects.create(
            company=self.company,
            review=self.review,
            criterion=self.criterion,
            score="3.0000",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/scores/{score.id}/update/",
            data={
                "score": "5.0000",
                "comments": "Excellent",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        score.refresh_from_db()
        self.assertEqual(str(score.score), "5.0000")
        self.assertEqual(score.comments, "Excellent")

    def test_delete_performance_score_api(self):
        score = PerformanceReviewScore.objects.create(
            company=self.company,
            review=self.review,
            criterion=self.criterion,
            score="4.0000",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/scores/{score.id}/delete/",
            data={},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(
            PerformanceReviewScore.objects.filter(id=score.id).exists()
        )

    def test_performance_score_cross_company_blocked(self):
        score = PerformanceReviewScore.objects.create(
            company=self.other_company,
            review=self.other_review,
            criterion=self.other_criterion,
            score="4.0000",
        )

        response = self.client.get(
            f"/api/company/hr/performance/scores/{score.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_performance_score(self):
        self.client.force_login(self.viewer)

        response = self.client.post(
            "/api/company/hr/performance/scores/create/",
            data={
                "review_id": self.review.id,
                "criterion_id": self.criterion.id,
                "score": "4.0000",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)


# ============================================================
# ?? Employee Goals API Tests
# ============================================================


class EmployeeGoalsAPITests(TestCase):
    def setUp(self):
        self.client = Client()

        self.company = Company.objects.create(
            name="Employee Goals Company",
            company_code="GOALS-001",
        )
        self.other_company = Company.objects.create(
            name="Other Employee Goals Company",
            company_code="GOALS-002",
        )

        self.user = User.objects.create_user(
            username="goals-hr",
            email="goals-hr@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.HR,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.viewer = User.objects.create_user(
            username="goals-viewer",
            email="goals-viewer@example.com",
            password="pass12345",
        )
        CompanyMembership.objects.create(
            user=self.viewer,
            company=self.company,
            role=CompanyRole.VIEWER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
        )

        self.employee = Employee.objects.create(
            company=self.company,
            employee_number="EMP-GOAL-001",
            first_name="Goal",
            last_name="Employee",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_employee = Employee.objects.create(
            company=self.other_company,
            employee_number="EMP-GOAL-OTHER",
            first_name="Other",
            last_name="Employee",
        )

        self.cycle = PerformanceCycle.objects.create(
            company=self.company,
            name="2026 Goals Cycle",
            code="GOALS-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
            created_by=self.user,
            updated_by=self.user,
        )
        self.other_cycle = PerformanceCycle.objects.create(
            company=self.other_company,
            name="Other Goals Cycle",
            code="OTHER-GOALS-2026",
            start_date="2026-01-01",
            end_date="2026-12-31",
        )

        self.client.force_login(self.user)

    def test_create_employee_goal_api(self):
        response = self.client.post(
            "/api/company/hr/performance/goals/create/",
            data={
                "employee_id": self.employee.id,
                "cycle_id": self.cycle.id,
                "title": "Improve monthly closing",
                "description": "Close monthly accounting faster",
                "target_value": "Close in 3 days",
                "priority": "HIGH",
                "start_date": "2026-01-01",
                "due_date": "2026-03-31",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["goal"]["employee_id"], self.employee.id)
        self.assertEqual(payload["goal"]["title"], "Improve monthly closing")
        self.assertEqual(
            EmployeeGoal.objects.filter(company=self.company).count(),
            1,
        )

    def test_list_employee_goals_api(self):
        EmployeeGoal.objects.create(
            company=self.company,
            employee=self.employee,
            cycle=self.cycle,
            title="Improve monthly closing",
            created_by=self.user,
            updated_by=self.user,
        )
        EmployeeGoal.objects.create(
            company=self.other_company,
            employee=self.other_employee,
            cycle=self.other_cycle,
            title="Other Goal",
        )

        response = self.client.get("/api/company/hr/performance/goals/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(payload["results"][0]["title"], "Improve monthly closing")

    def test_detail_employee_goal_api(self):
        goal = EmployeeGoal.objects.create(
            company=self.company,
            employee=self.employee,
            cycle=self.cycle,
            title="Improve monthly closing",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.get(
            f"/api/company/hr/performance/goals/{goal.id}/"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["goal"]["id"], goal.id)

    def test_update_employee_goal_api(self):
        goal = EmployeeGoal.objects.create(
            company=self.company,
            employee=self.employee,
            cycle=self.cycle,
            title="Improve monthly closing",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/goals/{goal.id}/update/",
            data={
                "title": "Updated goal",
                "progress_percentage": "50.00",
                "actual_value": "Half completed",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        goal.refresh_from_db()
        self.assertEqual(goal.title, "Updated goal")
        self.assertEqual(str(goal.progress_percentage), "50.00")

    def test_activate_complete_employee_goal_api(self):
        goal = EmployeeGoal.objects.create(
            company=self.company,
            employee=self.employee,
            cycle=self.cycle,
            title="Improve monthly closing",
            created_by=self.user,
            updated_by=self.user,
        )

        activate_response = self.client.post(
            f"/api/company/hr/performance/goals/{goal.id}/activate/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(activate_response.status_code, 200)
        goal.refresh_from_db()
        self.assertEqual(goal.status, PerformanceGoalStatus.ACTIVE)

        complete_response = self.client.post(
            f"/api/company/hr/performance/goals/{goal.id}/complete/",
            data={"note": "Completed successfully"},
            content_type="application/json",
        )
        self.assertEqual(complete_response.status_code, 200)
        goal.refresh_from_db()
        self.assertEqual(goal.status, PerformanceGoalStatus.COMPLETED)
        self.assertEqual(str(goal.progress_percentage), "100.00")

    def test_cancel_employee_goal_api(self):
        goal = EmployeeGoal.objects.create(
            company=self.company,
            employee=self.employee,
            cycle=self.cycle,
            title="Improve monthly closing",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/hr/performance/goals/{goal.id}/cancel/",
            data={"note": "Cancelled by HR"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        goal.refresh_from_db()
        self.assertEqual(goal.status, PerformanceGoalStatus.CANCELLED)

    def test_employee_goal_cross_company_blocked(self):
        goal = EmployeeGoal.objects.create(
            company=self.other_company,
            employee=self.other_employee,
            cycle=self.other_cycle,
            title="Other Goal",
        )

        response = self.client.get(
            f"/api/company/hr/performance/goals/{goal.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_viewer_cannot_create_employee_goal(self):
        self.client.force_login(self.viewer)

        response = self.client.post(
            "/api/company/hr/performance/goals/create/",
            data={
                "employee_id": self.employee.id,
                "cycle_id": self.cycle.id,
                "title": "Viewer Goal",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

