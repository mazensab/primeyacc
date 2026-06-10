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
)
from .services import (
    activate_employee,
    cancel_attendance_record,
    check_in_employee,
    check_out_attendance_record,
    create_attendance_record,
    create_employee,
    deactivate_employee,
    mark_attendance_missing_check_out,
    update_employee,
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