from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import (
    SystemRole,
    UserProfile,
    UserProfileStatus,
)
from companies.models import ActivityProfile, Company


UserModel = get_user_model()


class SystemActivityProfilesAPITests(TestCase):
    def setUp(self) -> None:
        self.system_admin = UserModel.objects.create_user(
            username="activity-system-admin",
            email="activity-system-admin@example.com",
            password="StrongPass123!",
        )
        self.system_admin_profile, _ = UserProfile.objects.update_or_create(
            user=self.system_admin,
            defaults={
                "display_name": "Activity System Admin",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SYSTEM_ADMIN,
            },
        )

        self.support_user = UserModel.objects.create_user(
            username="activity-support",
            email="activity-support@example.com",
            password="StrongPass123!",
        )
        self.support_profile, _ = UserProfile.objects.update_or_create(
            user=self.support_user,
            defaults={
                "display_name": "Activity Support",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPPORT,
            },
        )

        self.billing_user = UserModel.objects.create_user(
            username="activity-billing",
            email="activity-billing@example.com",
            password="StrongPass123!",
        )
        self.billing_profile, _ = UserProfile.objects.update_or_create(
            user=self.billing_user,
            defaults={
                "display_name": "Activity Billing",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.BILLING_MANAGER,
            },
        )

        self.regular_user = UserModel.objects.create_user(
            username="activity-regular",
            email="activity-regular@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.update_or_create(
            user=self.regular_user,
            defaults={
                "display_name": "Activity Regular",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": False,
                "system_role": SystemRole.NONE,
            },
        )

        self.owner_company = Company.objects.create(
            name="Custom Profile Owner",
            name_ar="مالك النشاط المخصص",
            name_en="Custom Profile Owner",
            company_code="ACT-OWNER",
        )
        self.linked_company = Company.objects.create(
            name="Linked Company",
            name_ar="شركة مرتبطة",
            name_en="Linked Company",
            company_code="ACT-LINKED",
        )

        self.system_profile = ActivityProfile.objects.create(
            code="SYSTEM-TEST",
            name="System Test",
            name_ar="نشاط نظام",
            name_en="System Test",
            description="System activity profile.",
            is_system=True,
            is_active=True,
            default_settings={
                "accounting": True,
                "inventory": True,
            },
            extra_data={
                "source": "test",
            },
        )

        self.custom_profile = ActivityProfile.objects.create(
            company=self.owner_company,
            code="CUSTOM-TEST",
            name="Custom Test",
            name_ar="نشاط مخصص",
            name_en="Custom Test",
            description="Company custom activity profile.",
            is_system=False,
            is_active=False,
            default_settings={
                "pos": True,
            },
            extra_data={
                "source": "company",
            },
        )

        self.linked_company.activity_profile_ref = self.system_profile
        self.linked_company.save(
            update_fields=[
                "activity_profile_ref",
                "updated_at",
            ]
        )

    def test_explicit_permission_is_present_for_existing_system_roles(self) -> None:
        permission = "system.activity_profiles.view"

        for profile in (
            self.system_admin_profile,
            self.support_profile,
            self.billing_profile,
        ):
            self.assertIn(
                permission,
                profile.system_permissions,
            )

    def test_overview_requires_authentication(self) -> None:
        response = self.client.get(
            "/api/system/activity-profiles/"
        )
        self.assertEqual(response.status_code, 401)

    def test_overview_blocks_non_system_user(self) -> None:
        self.client.force_login(self.regular_user)

        response = self.client.get(
            "/api/system/activity-profiles/"
        )

        self.assertEqual(response.status_code, 403)

    def test_overview_returns_real_model_fields_and_scope_counts(self) -> None:
        self.client.force_login(self.system_admin)

        response = self.client.get(
            "/api/system/activity-profiles/",
            {"limit": 200},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        data = payload["data"]
        rows = {
            row["code"]: row
            for row in data["results"]
        }

        system_row = rows["SYSTEM-TEST"]
        custom_row = rows["CUSTOM-TEST"]

        self.assertTrue(system_row["is_system"])
        self.assertEqual(system_row["scope"], "SYSTEM")
        self.assertIsNone(system_row["company_id"])
        self.assertTrue(
            system_row["default_settings"]["accounting"]
        )
        self.assertTrue(
            system_row["settings"]["inventory"]
        )
        self.assertEqual(
            system_row["extra_data"]["source"],
            "test",
        )
        self.assertEqual(
            system_row["metadata"]["source"],
            "test",
        )

        self.assertFalse(custom_row["is_system"])
        self.assertEqual(custom_row["scope"], "COMPANY")
        self.assertEqual(
            custom_row["company_id"],
            self.owner_company.id,
        )
        self.assertEqual(
            custom_row["company"]["id"],
            self.owner_company.id,
        )

        self.assertGreaterEqual(data["summary"]["system"], 1)
        self.assertGreaterEqual(data["summary"]["custom"], 1)

    def test_scope_and_status_filters_are_supported(self) -> None:
        self.client.force_login(self.support_user)

        system_response = self.client.get(
            "/api/system/activity-profiles/list/",
            {
                "scope": "SYSTEM",
                "search": "SYSTEM-TEST",
            },
        )
        self.assertEqual(system_response.status_code, 200)
        system_rows = system_response.json()["results"]
        self.assertEqual(len(system_rows), 1)
        self.assertEqual(system_rows[0]["scope"], "SYSTEM")

        custom_response = self.client.get(
            "/api/system/activity-profiles/list/",
            {
                "scope": "COMPANY",
                "status": "INACTIVE",
                "search": "CUSTOM-TEST",
            },
        )
        self.assertEqual(custom_response.status_code, 200)
        custom_rows = custom_response.json()["results"]
        self.assertEqual(len(custom_rows), 1)
        self.assertEqual(custom_rows[0]["scope"], "COMPANY")
        self.assertFalse(custom_rows[0]["is_active"])

    def test_safe_ordering_is_supported(self) -> None:
        self.client.force_login(self.billing_user)

        response = self.client.get(
            "/api/system/activity-profiles/list/",
            {
                "ordering": "code",
                "limit": 200,
            },
        )

        self.assertEqual(response.status_code, 200)
        codes = [
            row["code"]
            for row in response.json()["results"]
        ]
        self.assertEqual(codes, sorted(codes))

    def test_detail_returns_linked_companies_and_current_fields(self) -> None:
        self.client.force_login(self.system_admin)

        response = self.client.get(
            f"/api/system/activity-profiles/{self.system_profile.id}/"
        )

        self.assertEqual(response.status_code, 200)
        profile = response.json()["profile"]

        self.assertEqual(profile["id"], self.system_profile.id)
        self.assertEqual(profile["scope"], "SYSTEM")
        self.assertEqual(profile["companies_count"], 1)
        self.assertTrue(
            profile["default_settings"]["accounting"]
        )
        self.assertEqual(len(profile["companies"]), 1)
        self.assertEqual(
            profile["companies"][0]["id"],
            self.linked_company.id,
        )

    def test_companies_endpoint_is_paginated_and_read_only(self) -> None:
        self.client.force_login(self.system_admin)

        response = self.client.get(
            (
                f"/api/system/activity-profiles/"
                f"{self.system_profile.id}/companies/"
            ),
            {
                "limit": 1,
                "offset": 0,
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["count"], 1)
        self.assertEqual(len(payload["results"]), 1)
        self.assertEqual(
            payload["results"][0]["id"],
            self.linked_company.id,
        )

        post_response = self.client.post(
            "/api/system/activity-profiles/",
            data={},
        )
        self.assertEqual(post_response.status_code, 405)
