# ============================================================
# File: api/system/users/tests.py
# Module: PrimeyAcc System Users API Tests
# Purpose:
# - Verify system users API routes.
# - Verify system permission guard.
# - Verify list, search and detail payloads.
# ============================================================
from __future__ import annotations
from django.contrib.auth import get_user_model
from django.test import TestCase
from accounts.models import SystemRole, UserProfile, UserProfileStatus
UserModel = get_user_model()
class SystemUsersAPITests(TestCase):
    def setUp(self) -> None:
        self.system_user = UserModel.objects.create_user(
            username="system-admin",
            email="system-admin@example.com",
            password="StrongPass123!",
            first_name="System",
            last_name="Admin",
        )
        self.system_profile, _ = UserProfile.objects.update_or_create(
            user=self.system_user,
            defaults={
                "display_name": "System Admin",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPER_ADMIN,
            },
        )
        self.regular_user = UserModel.objects.create_user(
            username="regular-user",
            email="regular-user@example.com",
            password="StrongPass123!",
            first_name="Regular",
            last_name="User",
        )
        self.regular_profile, _ = UserProfile.objects.update_or_create(
            user=self.regular_user,
            defaults={
                "display_name": "Regular User",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": False,
                "system_role": SystemRole.NONE,
            },
        )
    def test_system_users_list_requires_system_permission(self) -> None:
        self.client.force_login(self.regular_user)
        response = self.client.get("/api/system/users/")
        self.assertEqual(response.status_code, 403)
    def test_system_users_list_returns_real_profiles(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.get("/api/system/users/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        usernames = {item["username"] for item in payload["results"]}
        self.assertIn("results", payload)
        self.assertGreaterEqual(payload["count"], 2)
        self.assertIn("system-admin", usernames)
        self.assertIn("regular-user", usernames)
    def test_system_users_alias_route_returns_real_profiles(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.get("/api/users/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["count"], 2)
    def test_system_users_list_supports_search(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.get("/api/system/users/", {"search": "regular"})
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(payload["count"], 1)
        self.assertTrue(
            any(item["username"] == "regular-user" for item in payload["results"])
        )
    def test_system_user_detail_returns_payload(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.get(f"/api/system/users/{self.regular_user.id}/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["id"], self.regular_user.id)
        self.assertEqual(payload["username"], "regular-user")
        self.assertEqual(payload["profile_id"], self.regular_profile.id)
        self.assertIn("system_permissions", payload)
        self.assertIn("memberships", payload)
