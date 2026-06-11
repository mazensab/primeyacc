# ============================================================
# 📂 companies/tests.py
# 🧠 PrimeyAcc | Companies Tests V1.4
# ------------------------------------------------------------
# ✅ CompanySettings tests
# ✅ Company settings API tests
# ✅ Company permissions snapshot API tests
# ✅ Company setup/readiness API tests
# ✅ Company users/memberships API tests
# ✅ Branch tenant-isolation tests
# ✅ Activity Profiles tests
# ✅ /api/company/me/ snapshot tests
# ✅ /api/company/profile/ snapshot tests
# ✅ /api/company/permissions/ snapshot tests
# ✅ /api/company/setup/ readiness snapshot tests
# ✅ /api/company/settings/ detail/update tests
# ✅ /api/company/users/ list/create/detail/status tests
# ✅ /api/company/branches/ list/detail/create tests
# ✅ Ensures unauthenticated APIs return JSON 401
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - Company = حدود العزل الأساسية للنظام
# - CompanyMembership = حد الوصول الرسمي لمساحة /company
# - /api/company لا يقبل company_id من الواجهة كمصدر ثقة
# - CompanySettings تخص الشركة الحالية فقط
# - ActivityProfile يدعم الأنشطة العامة والمخصصة للشركات
# - مستخدمو الشركة لا يظهرون إلا لأعضاء نفس الشركة
# - فروع الشركة لا تظهر إلا لأعضاء نفس الشركة
# - الصلاحيات والأدوار مصدرها الباكند
# - تهيئة الشركة وجاهزيتها التشغيلية مصدرها الباكند
# - الباكند هو مصدر الحقيقة للصلاحيات وعزل الشركات
# ============================================================

from __future__ import annotations

import json

from django.contrib.auth import get_user_model
from django.test import Client, TestCase

from accounts.models import CompanyMembership, CompanyRole, MembershipStatus, UserProfile
from companies.models import (
    ActivityProfile,
    Branch,
    BranchType,
    Company,
    CompanySettings,
    CompanyStatus,
)


User = get_user_model()


class CompanyWorkspacePhase3Tests(TestCase):
    """
    Tests for Phase 3 company settings, branches, users, and permissions foundation.
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

        self.company_employee_user = User.objects.create_user(
            username="company_employee",
            email="employee@example.com",
            password="StrongPass123!",
            first_name="Company",
            last_name="Employee",
        )

        self.company_employee_profile = UserProfile.objects.create(
            user=self.company_employee_user,
            display_name="Company Employee",
            default_company=self.company,
        )

        self.company_employee_membership = CompanyMembership.objects.create(
            user=self.company_employee_user,
            company=self.company,
            role=CompanyRole.EMPLOYEE,
            status=MembershipStatus.ACTIVE,
            is_primary=False,
            job_title="Employee",
            department="Operations",
            created_by=self.user,
            updated_by=self.user,
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

    def test_can_create_system_activity_profile(self) -> None:
        """
        System activity profiles are global and not linked to one company.
        """

        profile = ActivityProfile.objects.create(
            code="retail",
            name="Retail",
            name_ar="تجارة تجزئة",
            name_en="Retail",
            is_system=True,
            is_active=True,
            default_settings={
                "inventory": {
                    "enabled": True,
                },
                "pos": {
                    "enabled": True,
                },
            },
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(profile.code, "RETAIL")
        self.assertTrue(profile.is_system)
        self.assertIsNone(profile.company_id)
        self.assertEqual(profile.display_name, "تجارة تجزئة")
        self.assertTrue(profile.default_settings["inventory"]["enabled"])

    def test_can_create_company_custom_activity_profile(self) -> None:
        """
        Custom activity profiles must belong to one company.
        """

        profile = ActivityProfile.objects.create(
            company=self.company,
            code="custom-services",
            name="Custom Services",
            name_ar="خدمات مخصصة",
            name_en="Custom Services",
            is_system=False,
            is_active=True,
            default_settings={
                "sales": {
                    "require_customer": True,
                },
            },
            created_by=self.user,
            updated_by=self.user,
        )

        self.assertEqual(profile.code, "CUSTOM-SERVICES")
        self.assertFalse(profile.is_system)
        self.assertEqual(profile.company_id, self.company.id)
        self.assertEqual(profile.display_name, "خدمات مخصصة")
        self.assertTrue(profile.default_settings["sales"]["require_customer"])

    def test_company_can_reference_activity_profile_without_breaking_legacy_field(self) -> None:
        """
        Company keeps legacy activity_profile while using expandable activity_profile_ref.
        """

        profile = ActivityProfile.objects.create(
            code="wholesale",
            name="Wholesale",
            name_ar="تجارة جملة",
            name_en="Wholesale",
            is_system=True,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        self.company.activity_profile_ref = profile
        self.company.save(update_fields=["activity_profile_ref", "updated_at"])

        self.company.refresh_from_db()

        self.assertEqual(self.company.activity_profile_ref_id, profile.id)
        self.assertEqual(self.company.activity_profile, "GENERAL")

    def test_activity_profiles_list_returns_system_and_current_company_profiles(self) -> None:
        """
        /api/company/activity-profiles/ returns active system profiles
        and current-company custom profiles only.
        """

        system_profile = ActivityProfile.objects.create(
            code="retail-api",
            name="Retail API",
            name_ar="????? ????? API",
            name_en="Retail API",
            is_system=True,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        own_profile = ActivityProfile.objects.create(
            company=self.company,
            code="own-api",
            name="Own API",
            name_ar="???? ?????? API",
            name_en="Own API",
            is_system=False,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        other_profile = ActivityProfile.objects.create(
            company=self.other_company,
            code="other-api",
            name="Other API",
            name_ar="???? ???? ???? API",
            name_en="Other API",
            is_system=False,
            is_active=True,
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        inactive_profile = ActivityProfile.objects.create(
            code="inactive-api",
            name="Inactive API",
            name_ar="???? ??? ???? API",
            name_en="Inactive API",
            is_system=True,
            is_active=False,
            created_by=self.user,
            updated_by=self.user,
        )

        self.client.force_login(self.user)

        response = self.client.get("/api/company/activity-profiles/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        results = payload["data"]["results"]
        result_ids = {item["id"] for item in results}

        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["company_id"], self.company.id)
        self.assertIn(system_profile.id, result_ids)
        self.assertIn(own_profile.id, result_ids)
        self.assertNotIn(other_profile.id, result_ids)
        self.assertNotIn(inactive_profile.id, result_ids)

    def test_current_activity_profile_returns_company_activity_snapshot(self) -> None:
        """
        /api/company/activity-profiles/current/ returns legacy and new activity profile state.
        """

        profile = ActivityProfile.objects.create(
            code="services-api",
            name="Services API",
            name_ar="????? API",
            name_en="Services API",
            is_system=True,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        self.company.activity_profile_ref = profile
        self.company.save(update_fields=["activity_profile_ref", "updated_at"])

        self.client.force_login(self.user)

        response = self.client.get("/api/company/activity-profiles/current/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["legacy_activity_profile"], "GENERAL")
        self.assertEqual(data["activity_profile"]["id"], profile.id)
        self.assertEqual(data["activity_profile"]["code"], "SERVICES-API")

    def test_owner_can_update_current_company_activity_profile(self) -> None:
        """
        Owner can update current company's activity_profile_ref using an available profile.
        """

        profile = ActivityProfile.objects.create(
            code="wholesale-api",
            name="Wholesale API",
            name_ar="???? API",
            name_en="Wholesale API",
            is_system=True,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        self.client.force_login(self.user)

        response = self.client.patch(
            "/api/company/activity-profiles/update/",
            data=json.dumps({"activity_profile_id": profile.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["activity_profile"]["id"], profile.id)

        self.company.refresh_from_db()
        self.assertEqual(self.company.activity_profile_ref_id, profile.id)

    def test_update_activity_profile_blocks_cross_company_profile(self) -> None:
        """
        A company cannot assign an activity profile belonging to another company.
        """

        other_profile = ActivityProfile.objects.create(
            company=self.other_company,
            code="blocked-api",
            name="Blocked API",
            name_ar="????? API",
            name_en="Blocked API",
            is_system=False,
            is_active=True,
            created_by=self.other_user,
            updated_by=self.other_user,
        )

        self.client.force_login(self.user)

        response = self.client.patch(
            "/api/company/activity-profiles/update/",
            data=json.dumps({"activity_profile_id": other_profile.id}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 404)

        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["code"], "ACTIVITY_PROFILE_NOT_FOUND")

        self.company.refresh_from_db()
        self.assertIsNone(self.company.activity_profile_ref_id)

    def test_owner_can_clear_current_company_activity_profile(self) -> None:
        """
        Owner can clear current company's activity_profile_ref.
        """

        profile = ActivityProfile.objects.create(
            code="clear-api",
            name="Clear API",
            name_ar="??? API",
            name_en="Clear API",
            is_system=True,
            is_active=True,
            created_by=self.user,
            updated_by=self.user,
        )

        self.company.activity_profile_ref = profile
        self.company.save(update_fields=["activity_profile_ref", "updated_at"])

        self.client.force_login(self.user)

        response = self.client.patch(
            "/api/company/activity-profiles/update/",
            data=json.dumps({"activity_profile_id": None}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company_id"], self.company.id)
        self.assertIsNone(data["activity_profile"])

        self.company.refresh_from_db()
        self.assertIsNone(self.company.activity_profile_ref_id)

    def test_company_apis_return_json_401_for_guest(self) -> None:
        """
        Guest requests should receive JSON 401, not /accounts/login/ HTML redirects.
        """

        endpoints = [
            "/api/company/me/",
            "/api/company/profile/",
            "/api/company/setup/",
            "/api/company/permissions/",
            "/api/company/settings/",
            "/api/company/users/",
            f"/api/company/users/{self.membership.id}/",
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

    def test_company_permissions_snapshot_returns_roles_and_permissions(self) -> None:
        """
        /api/company/permissions/ should return current role,
        permissions, roles list, and known permissions from backend.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/permissions/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company"]["id"], self.company.id)
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["membership_id"], self.membership.id)
        self.assertEqual(data["current_role"], CompanyRole.OWNER)
        self.assertIn("*", data["current_permissions"])
        self.assertIn("roles", data)
        self.assertIn("role_permissions", data)
        self.assertIn("permissions", data)
        self.assertIn("ADMIN", data["role_permissions"])
        self.assertIn("company.branches.view", data["role_permissions"]["ADMIN"])
        self.assertIn("company.users.update", data["role_permissions"]["ADMIN"])
        self.assertIn("company.activity_profiles.view", data["role_permissions"]["ADMIN"])
        self.assertIn("company.activity_profiles.update", data["role_permissions"]["ADMIN"])

    def test_company_setup_overview_returns_readiness_snapshot(self) -> None:
        """
        /api/company/setup/ should return setup checklist,
        readiness score, company summary, settings, branch summary,
        users summary, and current permissions for the current company only.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/setup/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company"]["id"], self.company.id)
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["membership_id"], self.membership.id)
        self.assertEqual(data["membership"]["id"], self.membership.id)
        self.assertEqual(data["current_role"], CompanyRole.OWNER)
        self.assertIn("*", data["current_permissions"])

        self.assertIsNotNone(data["settings"])
        self.assertIsNotNone(data["operational_settings"])
        self.assertEqual(data["settings"]["company_id"], self.company.id)

        self.assertIsNotNone(data["default_branch"])
        self.assertEqual(data["default_branch"]["id"], self.default_branch.id)
        self.assertEqual(data["default_branch"]["company_id"], self.company.id)

        self.assertEqual(data["branches_summary"]["total"], 1)
        self.assertEqual(data["branches_summary"]["active"], 1)
        self.assertTrue(data["branches_summary"]["default_exists"])

        self.assertEqual(data["users_summary"]["total_memberships"], 2)
        self.assertEqual(data["users_summary"]["active_memberships"], 2)
        self.assertEqual(data["users_summary"]["owners"], 1)

        self.assertIn("checklist", data)
        self.assertIn("readiness", data)
        self.assertGreaterEqual(data["readiness"]["total_checks"], 1)
        self.assertIn("is_ready", data["readiness"])
        self.assertIn("missing_required", data["readiness"])

        checklist_codes = {item["code"] for item in data["checklist"]}
        self.assertIn("company_name", checklist_codes)
        self.assertIn("company_code", checklist_codes)
        self.assertIn("default_branch", checklist_codes)

    def test_company_settings_endpoint_returns_current_company_settings(self) -> None:
        """
        /api/company/settings/ should return settings for the current company only.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/settings/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        data = payload["data"]

        self.assertTrue(payload["ok"])
        self.assertEqual(data["company"]["id"], self.company.id)
        self.assertEqual(data["company_id"], self.company.id)
        self.assertEqual(data["membership_id"], self.membership.id)
        self.assertIsNotNone(data["settings"])
        self.assertIsNotNone(data["operational_settings"])
        self.assertEqual(data["settings"]["company_id"], self.company.id)

        self.assertTrue(
            CompanySettings.objects.filter(company=self.company).exists()
        )

    def test_owner_can_update_company_settings_endpoint(self) -> None:
        """
        Owner can update operational settings for the current company only.
        """

        self.client.force_login(self.user)

        payload = {
            "default_language": "en",
            "timezone_name": "Asia/Riyadh",
            "date_format": "yyyy-MM-dd",
            "time_format": "24h",
            "fiscal_year_start_month": 4,
            "fiscal_year_start_day": 1,
            "invoice_prefix": "SALES",
            "quotation_prefix": "QTN",
            "purchase_prefix": "BUY",
            "receipt_prefix": "RCPT",
            "payment_prefix": "PMT",
            "allow_negative_stock": False,
            "enable_inventory_tracking": True,
            "enable_pos": True,
            "enable_purchases": True,
            "enable_hr": True,
            "enable_vat": True,
            "default_vat_percentage": "15.00",
            "require_customer_for_sales": True,
            "require_supplier_for_purchases": True,
            "settings_data": {
                "theme": "premium",
                "document_template": "default",
            },
        }

        response = self.client.patch(
            "/api/company/settings/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        response_payload = response.json()
        settings_data = response_payload["data"]["settings"]

        self.assertTrue(response_payload["ok"])
        self.assertEqual(settings_data["company_id"], self.company.id)
        self.assertEqual(settings_data["default_language"], "en")
        self.assertEqual(settings_data["fiscal_year_start_month"], 4)
        self.assertEqual(settings_data["invoice_prefix"], "SALES")
        self.assertTrue(settings_data["enable_hr"])
        self.assertTrue(settings_data["require_customer_for_sales"])
        self.assertEqual(settings_data["settings_data"]["theme"], "premium")

        settings_obj = CompanySettings.objects.get(company=self.company)
        self.assertEqual(settings_obj.default_language, "en")
        self.assertEqual(settings_obj.invoice_prefix, "SALES")
        self.assertEqual(settings_obj.updated_by_id, self.user.id)

    def test_company_users_list_is_scoped_to_current_company(self) -> None:
        """
        Company users list should show only memberships for the current company.
        """

        self.client.force_login(self.user)

        response = self.client.get("/api/company/users/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        results = payload["data"]["results"]
        result_ids = {item["id"] for item in results}

        self.assertIn(self.membership.id, result_ids)
        self.assertIn(self.company_employee_membership.id, result_ids)
        self.assertNotIn(self.other_membership.id, result_ids)
        self.assertEqual(payload["data"]["company_id"], self.company.id)

    def test_company_user_detail_blocks_cross_company_access(self) -> None:
        """
        A user must not access a membership belonging to another company.
        """

        self.client.force_login(self.user)

        response = self.client.get(f"/api/company/users/{self.other_membership.id}/")
        self.assertEqual(response.status_code, 404)

        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["code"], "COMPANY_MEMBERSHIP_NOT_FOUND")

    def test_owner_can_create_company_user_inside_current_company(self) -> None:
        """
        Owner can create a user membership only inside current membership company.
        company_id from frontend is ignored by design.
        """

        self.client.force_login(self.user)

        payload = {
            "company_id": self.other_company.id,
            "username": "new_company_user",
            "email": "new-company-user@example.com",
            "first_name": "New",
            "last_name": "User",
            "display_name": "New Company User",
            "phone": "0500000001",
            "role": "SALES",
            "status": "ACTIVE",
            "job_title": "Sales Representative",
            "department": "Sales",
        }

        response = self.client.post(
            "/api/company/users/create/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)

        response_payload = response.json()
        membership_data = response_payload["data"]["membership"]

        self.assertTrue(response_payload["ok"])
        self.assertTrue(response_payload["data"]["user_created"])
        self.assertEqual(membership_data["company_id"], self.company.id)
        self.assertEqual(membership_data["role"], "SALES")
        self.assertEqual(membership_data["user"]["email"], "new-company-user@example.com")

        created_user = User.objects.get(username="new_company_user")
        created_membership = CompanyMembership.objects.get(
            user=created_user,
            company=self.company,
        )

        self.assertEqual(created_membership.company_id, self.company.id)
        self.assertNotEqual(created_membership.company_id, self.other_company.id)

    def test_duplicate_company_user_membership_is_rejected(self) -> None:
        """
        The same user cannot be linked twice to the same company.
        """

        self.client.force_login(self.user)

        payload = {
            "username": self.company_employee_user.username,
            "email": self.company_employee_user.email,
            "role": "EMPLOYEE",
        }

        response = self.client.post(
            "/api/company/users/create/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

        response_payload = response.json()
        self.assertFalse(response_payload["ok"])
        self.assertIn("membership_id", response_payload["errors"])

    def test_owner_can_update_company_user_membership(self) -> None:
        """
        Owner can update membership/profile data for a user in the same company.
        """

        self.client.force_login(self.user)

        payload = {
            "first_name": "Updated",
            "last_name": "Employee",
            "display_name": "Updated Employee",
            "phone": "0500000099",
            "role": "MANAGER",
            "job_title": "Operations Manager",
            "department": "Operations",
        }

        response = self.client.patch(
            f"/api/company/users/{self.company_employee_membership.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)

        response_payload = response.json()
        membership_data = response_payload["data"]["membership"]

        self.assertTrue(response_payload["ok"])
        self.assertEqual(membership_data["role"], "MANAGER")
        self.assertEqual(membership_data["job_title"], "Operations Manager")
        self.assertEqual(membership_data["user"]["first_name"], "Updated")
        self.assertEqual(membership_data["profile"]["display_name"], "Updated Employee")

        self.company_employee_membership.refresh_from_db()
        self.company_employee_user.refresh_from_db()
        self.company_employee_profile.refresh_from_db()

        self.assertEqual(self.company_employee_membership.role, CompanyRole.MANAGER)
        self.assertEqual(self.company_employee_user.first_name, "Updated")
        self.assertEqual(self.company_employee_profile.display_name, "Updated Employee")

    def test_user_cannot_change_own_role_or_status(self) -> None:
        """
        A current user cannot change their own role/status/is_primary from detail endpoint.
        """

        self.client.force_login(self.user)

        payload = {
            "role": "ADMIN",
            "status": "INACTIVE",
            "is_primary": False,
        }

        response = self.client.patch(
            f"/api/company/users/{self.membership.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

        response_payload = response.json()
        self.assertFalse(response_payload["ok"])
        self.assertIn("membership", response_payload["errors"])

    def test_owner_can_suspend_activate_and_deactivate_company_user(self) -> None:
        """
        Owner can safely suspend, activate, and deactivate another membership.
        """

        self.client.force_login(self.user)

        suspend_response = self.client.post(
            f"/api/company/users/{self.company_employee_membership.id}/suspend/",
            data=json.dumps({"reason": "Testing suspension"}),
            content_type="application/json",
        )
        self.assertEqual(suspend_response.status_code, 200)

        self.company_employee_membership.refresh_from_db()
        self.assertEqual(self.company_employee_membership.status, MembershipStatus.SUSPENDED)
        self.assertEqual(
            self.company_employee_membership.suspended_reason,
            "Testing suspension",
        )

        activate_response = self.client.post(
            f"/api/company/users/{self.company_employee_membership.id}/activate/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(activate_response.status_code, 200)

        self.company_employee_membership.refresh_from_db()
        self.assertEqual(self.company_employee_membership.status, MembershipStatus.ACTIVE)

        deactivate_response = self.client.post(
            f"/api/company/users/{self.company_employee_membership.id}/deactivate/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(deactivate_response.status_code, 200)

        self.company_employee_membership.refresh_from_db()
        self.assertEqual(self.company_employee_membership.status, MembershipStatus.INACTIVE)
        self.assertFalse(self.company_employee_membership.is_primary)

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