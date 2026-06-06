# ============================================================
# 📂 companies/tests.py
# 🧠 PrimeyAcc | Companies Tests V1.0
# ------------------------------------------------------------
# ✅ CompanySettings tests
# ✅ Branch tenant-isolation tests
# ✅ /api/company/me/ snapshot tests
# ✅ /api/company/profile/ snapshot tests
# ✅ /api/company/branches/ list/detail/create tests
# ✅ Ensures unauthenticated APIs return JSON 401
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company = حدود العزل الأساسية للنظام
# - CompanyMembership = حد الوصول الرسمي لمساحة /company
# - /api/company لا يقبل company_id من الواجهة كمصدر ثقة
# - فروع الشركة لا تظهر إلا لأعضاء نفس الشركة
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus, UserProfile
from companies.models import Branch, BranchType, Company, CompanySettings, CompanyStatus


User = get_user_model()


class CompanyWorkspacePhase3Tests(TestCase):
    """
    Tests for Phase 3 company settings and branches foundation.
    """

    def setUp(self) -> None:
        self.client = Client()

        self.user = User.objects.create_user(
            username="company_owner",
            email="owner@example.com",
            password="StrongPass123!",
            first_name="Company",
            last_name="Owner",
        )

        self.other_user = User.objects.create_user(
            username="other_owner",
            email="other@example.com",
            password="StrongPass123!",
            first_name="Other",
            last_name="Owner",
        )

        self.company = Company.objects.create(
            name="Primey Test Company",
            name_ar="شركة برايمي التجريبية",
            name_en="Primey Test Company",
            company_code="TEST-COMPANY-A",
            status=CompanyStatus.ACTIVE,
            is_active=True,
            city="Jeddah",
            currency_code="SAR",
        )

        self.other_company = Company.objects.create(
            name="Other Test Company",
            name_ar="شركة أخرى",
            name_en="Other Test Company",
            company_code="TEST-COMPANY-B",
            status=CompanyStatus.ACTIVE,
            is_active=True,
            city="Riyadh",
            currency_code="SAR",
        )

        self.profile = UserProfile.objects.create(
            user=self.user,
            display_name="Company Owner",
            default_company=self.company,
        )

        self.other_profile = UserProfile.objects.create(
            user=self.other_user,
            display_name="Other Owner",
            default_company=self.other_company,
        )

        self.membership = CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            job_title="Owner",
        )

        self.other_membership = CompanyMembership.objects.create(
            user=self.other_user,
            company=self.other_company,
            role=CompanyRole.OWNER,
            status=MembershipStatus.ACTIVE,
            is_primary=True,
            job_title="Owner",
        )

        self.default_branch = Branch.objects.create(
            company=self.company,
            name="Main Branch",
            name_ar="الفرع الرئيسي",
            name_en="Main Branch",
            branch_code="MAIN",
            branch_type=BranchType.HEAD_OFFICE,
            is_default=True,
            city="Jeddah",
            created_by=self.user,
            updated_by=self.user,
        )

        self.other_company_branch = Branch.objects.create(
            company=self.other_company,
            name="Other Branch",
            name_ar="فرع شركة أخرى",
            name_en="Other Branch",
            branch_code="OTHER",
            branch_type=BranchType.BRANCH,
            is_default=True,
            city="Riyadh",
            created_by=self.other_user,
            updated_by=self.other_user,
        )

    def test_company_apis_return_json_401_for_guest(self) -> None:
        """
        Guest requests should receive JSON 401, not /accounts/login/ HTML redirects.
        """

        endpoints = [
            "/api/company/me/",
            "/api/company/profile/",
            "/api/company/branches/",
            f"/api/company/branches/{self.default_branch.id}/",
        ]

        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, 401, endpoint)

            payload = response.json()
            self.assertFalse(payload["ok"])
            self.assertEqual(payload["code"], "AUTHENTICATION_REQUIRED")

    def test_company_me_returns_settings_and_default_branch(self) -> None:
        """
        /api/company/me/ should return current company snapshot,
        operational settings, and default branch.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/me/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company"]["id"], self.company.id)
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["membership_id"], self.membership.id)
        self.assertIsNotNone(data["settings"])
        self.assertIsNotNone(data["operational_settings"])
        self.assertEqual(data["default_branch"]["id"], self.default_branch.id)

        self.assertTrue(
            CompanySettings.objects.filter(company=self.company).exists()
        )

    def test_company_profile_returns_settings_and_default_branch(self) -> None:
        """
        /api/company/profile/ should return company profile with settings and default branch.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/profile/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company"]["id"], self.company.id)
        self.assertIsNotNone(data["settings"])
        self.assertIsNotNone(data["operational_settings"])
        self.assertEqual(data["default_branch"]["id"], self.default_branch.id)

    def test_branches_list_is_scoped_to_current_company(self) -> None:
        """
        Branch list should show only branches belonging to current user's active company.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/branches/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        results = payload["data"]["results"]
        result_ids = {item["id"] for item in results}

        self.assertIn(self.default_branch.id, result_ids)
        self.assertNotIn(self.other_company_branch.id, result_ids)
        self.assertEqual(payload["data"]["company_id"], self.company.id)

    def test_branch_detail_blocks_cross_company_access(self) -> None:
        """
        A user must not access a branch belonging to another company.
        """

        self.client.force_login(self.user)

        response = self.client.get(
            f"/api/company/branches/{self.other_company_branch.id}/"
        )

        self.assertEqual(response.status_code, 404)

        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["code"], "BRANCH_NOT_FOUND")

    def test_owner_can_create_branch_inside_current_company(self) -> None:
        """
        Owner can create a branch only inside current membership company.
        company_id from frontend is ignored by design.
        """

        self.client.force_login(self.user)

        payload = {
            "company_id": self.other_company.id,
            "name": "North Branch",
            "name_ar": "فرع الشمال",
            "name_en": "North Branch",
            "branch_code": "NORTH",
            "branch_type": "BRANCH",
            "city": "Jeddah",
            "is_default": False,
        }

        response = self.client.post(
            "/api/company/branches/create/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

        response_payload = response.json()
        branch_data = response_payload["data"]["branch"]

        self.assertTrue(response_payload["ok"])
        self.assertEqual(branch_data["branch_code"], "NORTH")
        self.assertEqual(branch_data["company_id"], self.company.id)
        self.assertNotEqual(branch_data["company_id"], self.other_company.id)

        created_branch = Branch.objects.get(branch_code="NORTH")
        self.assertEqual(created_branch.company_id, self.company.id)

    def test_duplicate_branch_code_inside_same_company_is_rejected(self) -> None:
        """
        branch_code must be unique inside the same company.
        """

        self.client.force_login(self.user)

        payload = {
            "name": "Duplicate Main",
            "branch_code": "MAIN",
            "branch_type": "BRANCH",
            "city": "Jeddah",
        }

        response = self.client.post(
            "/api/company/branches/create/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

        response_payload = response.json()
        self.assertFalse(response_payload["ok"])
        self.assertIn("branch_code", response_payload["errors"])

    def test_set_default_branch_unsets_previous_default(self) -> None:
        """
        When a branch becomes default, the previous default branch is unset.
        """

        self.client.force_login(self.user)

        second_branch = Branch.objects.create(
            company=self.company,
            name="Second Branch",
            name_ar="الفرع الثاني",
            name_en="Second Branch",
            branch_code="SECOND",
            branch_type=BranchType.BRANCH,
            is_default=False,
            city="Jeddah",
            created_by=self.user,
            updated_by=self.user,
        )

        response = self.client.post(
            f"/api/company/branches/{second_branch.id}/set_default/",
            data=json.dumps({}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        self.default_branch.refresh_from_db()
        second_branch.refresh_from_db()

        self.assertFalse(self.default_branch.is_default)
        self.assertTrue(second_branch.is_default)
        self.assertTrue(second_branch.is_active)