# ============================================================
# 📂 hr/tests.py
# 🧠 PrimeyAcc | HR Tests V1.3
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

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from accounts.models import CompanyMembership, CompanyRole
from companies.models import Branch, Company

from .models import (
    AttendanceRecord,
    AttendanceSource,
    AttendanceStatus,
    Employee,
    EmployeeStatus,
    LeaveBalance,
    LeaveRequest,
    LeaveRequestStatus,
    LeaveType,
    LeaveTypeUnit,
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
    update_employee,
    update_leave_type,
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

