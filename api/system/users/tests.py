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
    def test_system_user_create_alias_route_creates_profile(self) -> None:
        import json
        self.client.force_login(self.system_user)
        response = self.client.post(
            "/api/users/",
            data=json.dumps(
                {
                    "username": "created-support",
                    "password": "StrongPass123!",
                    "email": "created-support@example.com",
                    "first_name": "Created",
                    "last_name": "Support",
                    "phone": "0500000000",
                    "system_role": "SUPPORT",
                    "access_type": "system",
                    "is_active": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["username"], "created-support")
        self.assertEqual(payload["system_role"], SystemRole.SUPPORT)
        self.assertTrue(payload["is_system_user"])
        self.assertTrue(payload["can_access_system"])
        created_user = UserModel.objects.get(username="created-support")
        self.assertEqual(created_user.email, "created-support@example.com")
        self.assertTrue(created_user.check_password("StrongPass123!"))
        self.assertEqual(created_user.primeyacc_profile.system_role, SystemRole.SUPPORT)
        self.assertTrue(created_user.primeyacc_profile.is_system_user)
    def test_system_user_create_explicit_route_creates_profile(self) -> None:
        import json
        self.client.force_login(self.system_user)
        response = self.client.post(
            "/api/system/users/create/",
            data=json.dumps(
                {
                    "username": "created-billing",
                    "password": "StrongPass123!",
                    "email": "created-billing@example.com",
                    "first_name": "Created",
                    "last_name": "Billing",
                    "phone": "0511111111",
                    "system_role": "BILLING_MANAGER",
                    "access_type": "system",
                    "is_active": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["username"], "created-billing")
        self.assertEqual(payload["system_role"], SystemRole.BILLING_MANAGER)
        self.assertTrue(payload["is_system_user"])
    def test_system_user_create_requires_system_permission(self) -> None:
        import json
        self.client.force_login(self.regular_user)
        response = self.client.post(
            "/api/users/",
            data=json.dumps(
                {
                    "username": "forbidden-user",
                    "password": "StrongPass123!",
                    "email": "forbidden-user@example.com",
                    "system_role": "SUPPORT",
                    "access_type": "system",
                    "is_active": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertFalse(UserModel.objects.filter(username="forbidden-user").exists())
    def test_system_user_create_validates_required_payload(self) -> None:
        import json
        self.client.force_login(self.system_user)
        response = self.client.post(
            "/api/users/",
            data=json.dumps(
                {
                    "username": "",
                    "password": "short",
                    "system_role": "SUPPORT",
                    "access_type": "system",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "username_required")
