# ============================================================
# File: api/system/users/tests.py
# Module: Mhamcloud System Users API Tests
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
        self.system_admin_user = UserModel.objects.create_user(
            username="limited-system-admin",
            email="limited-system-admin@example.com",
            password="StrongPass123!",
            first_name="Limited",
            last_name="SystemAdmin",
        )
        self.system_admin_profile, _ = UserProfile.objects.update_or_create(
            user=self.system_admin_user,
            defaults={
                "display_name": "Limited System Admin",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SYSTEM_ADMIN,
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
        self.assertEqual(created_user.Mhamcloud_profile.system_role, SystemRole.SUPPORT)
        self.assertTrue(created_user.Mhamcloud_profile.is_system_user)
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
    def test_system_admin_cannot_create_super_admin(self) -> None:
        import json
        self.client.force_login(self.system_admin_user)
        response = self.client.post(
            "/api/system/users/create/",
            data=json.dumps(
                {
                    "username": "forbidden-super-admin",
                    "password": "StrongPass123!",
                    "email": "forbidden-super-admin@example.com",
                    "system_role": "SUPER_ADMIN",
                    "is_active": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["code"],
            "system_users_super_admin_create_forbidden",
        )
        self.assertFalse(
            UserModel.objects.filter(username="forbidden-super-admin").exists()
        )

    def test_system_admin_can_create_non_super_admin(self) -> None:
        import json
        self.client.force_login(self.system_admin_user)
        response = self.client.post(
            "/api/system/users/create/",
            data=json.dumps(
                {
                    "username": "allowed-support-by-admin",
                    "password": "StrongPass123!",
                    "email": "allowed-support-by-admin@example.com",
                    "system_role": "SUPPORT",
                    "is_active": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["system_role"], SystemRole.SUPPORT)

    def test_super_admin_can_create_super_admin(self) -> None:
        import json
        self.client.force_login(self.system_user)
        response = self.client.post(
            "/api/system/users/create/",
            data=json.dumps(
                {
                    "username": "allowed-super-admin",
                    "password": "StrongPass123!",
                    "email": "allowed-super-admin@example.com",
                    "system_role": "SUPER_ADMIN",
                    "is_active": True,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["system_role"], SystemRole.SUPER_ADMIN)

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


    def _create_system_support_target(self, username: str = "managed-support"):
        user = UserModel.objects.create_user(
            username=username,
            email=f"{username}@example.com",
            password="StrongPass123!",
            first_name="Managed",
            last_name="Support",
        )
        profile, _ = UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": "Managed Support",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPPORT,
            },
        )
        return user, profile

    def test_system_user_update_requires_update_permission(self) -> None:
        import json
        target, _ = self._create_system_support_target()
        self.client.force_login(self.regular_user)
        response = self.client.patch(
            f"/api/system/users/{target.id}/",
            data=json.dumps({"first_name": "Blocked"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_system_admin_can_update_normal_system_user_without_password_change(self) -> None:
        import json
        target, _ = self._create_system_support_target()
        password_hash = target.password
        self.client.force_login(self.system_admin_user)
        response = self.client.patch(
            f"/api/system/users/{target.id}/",
            data=json.dumps(
                {
                    "first_name": "Updated",
                    "last_name": "Operator",
                    "email": "updated-operator@example.com",
                    "display_name": "Updated Operator",
                    "phone": "0555555555",
                    "system_role": "BILLING_MANAGER",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        target.refresh_from_db()
        target.Mhamcloud_profile.refresh_from_db()
        self.assertEqual(target.first_name, "Updated")
        self.assertEqual(target.email, "updated-operator@example.com")
        self.assertEqual(target.password, password_hash)
        self.assertEqual(
            target.Mhamcloud_profile.system_role,
            SystemRole.BILLING_MANAGER,
        )
        self.assertEqual(target.Mhamcloud_profile.phone, "0555555555")

    def test_system_user_update_rejects_password_and_username_fields(self) -> None:
        import json
        target, _ = self._create_system_support_target()
        password_hash = target.password
        old_username = target.username
        self.client.force_login(self.system_user)
        response = self.client.patch(
            f"/api/system/users/{target.id}/",
            data=json.dumps(
                {
                    "username": "new-username",
                    "password": "ChangedPassword123!",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["code"],
            "system_user_immutable_fields",
        )
        target.refresh_from_db()
        self.assertEqual(target.username, old_username)
        self.assertEqual(target.password, password_hash)

    def test_system_admin_cannot_promote_or_edit_super_admin(self) -> None:
        import json
        target, _ = self._create_system_support_target()
        self.client.force_login(self.system_admin_user)

        promote = self.client.patch(
            f"/api/system/users/{target.id}/",
            data=json.dumps({"system_role": "SUPER_ADMIN"}),
            content_type="application/json",
        )
        self.assertEqual(promote.status_code, 403)
        self.assertEqual(
            promote.json()["code"],
            "system_users_super_admin_assign_forbidden",
        )

        edit_super = self.client.patch(
            f"/api/system/users/{self.system_user.id}/",
            data=json.dumps({"first_name": "ShouldNotChange"}),
            content_type="application/json",
        )
        self.assertEqual(edit_super.status_code, 403)
        self.assertEqual(
            edit_super.json()["code"],
            "system_users_super_admin_target_forbidden",
        )

    def test_last_active_super_admin_cannot_be_demoted(self) -> None:
        import json
        self.client.force_login(self.system_user)
        response = self.client.patch(
            f"/api/system/users/{self.system_user.id}/",
            data=json.dumps({"system_role": "SUPPORT"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["code"],
            "last_active_super_admin_required",
        )

    def test_super_admin_can_promote_normal_system_user(self) -> None:
        import json
        target, _ = self._create_system_support_target()
        self.client.force_login(self.system_user)
        response = self.client.patch(
            f"/api/system/users/{target.id}/",
            data=json.dumps({"system_role": "SUPER_ADMIN"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        target.Mhamcloud_profile.refresh_from_db()
        self.assertEqual(
            target.Mhamcloud_profile.system_role,
            SystemRole.SUPER_ADMIN,
        )

    def test_system_user_status_lifecycle(self) -> None:
        import json
        target, profile = self._create_system_support_target()
        self.client.force_login(self.system_admin_user)

        suspend = self.client.post(
            f"/api/system/users/{target.id}/status/",
            data=json.dumps(
                {
                    "action": "suspend",
                    "reason": "Security review",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(suspend.status_code, 200)
        target.refresh_from_db()
        profile.refresh_from_db()
        self.assertFalse(target.is_active)
        self.assertEqual(profile.status, UserProfileStatus.SUSPENDED)
        self.assertEqual(profile.suspended_reason, "Security review")
        self.assertIsNotNone(profile.suspended_at)

        activate = self.client.post(
            f"/api/system/users/{target.id}/status/",
            data=json.dumps({"action": "activate"}),
            content_type="application/json",
        )
        self.assertEqual(activate.status_code, 200)
        target.refresh_from_db()
        profile.refresh_from_db()
        self.assertTrue(target.is_active)
        self.assertEqual(profile.status, UserProfileStatus.ACTIVE)
        self.assertEqual(profile.suspended_reason, "")
        self.assertIsNone(profile.suspended_at)

        deactivate = self.client.post(
            f"/api/system/users/{target.id}/status/",
            data=json.dumps(
                {
                    "action": "deactivate",
                    "reason": "Employment ended",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(deactivate.status_code, 200)
        target.refresh_from_db()
        profile.refresh_from_db()
        self.assertFalse(target.is_active)
        self.assertEqual(profile.status, UserProfileStatus.INACTIVE)
        self.assertEqual(profile.suspended_reason, "Employment ended")

    def test_system_user_status_prevents_self_disable(self) -> None:
        import json
        self.client.force_login(self.system_admin_user)
        for action in ("suspend", "deactivate"):
            response = self.client.post(
                f"/api/system/users/{self.system_admin_user.id}/status/",
                data=json.dumps({"action": action}),
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.json()["code"],
                "system_user_self_disable_forbidden",
            )

    def test_last_active_super_admin_cannot_be_disabled(self) -> None:
        import json
        platform_root = UserModel.objects.create_superuser(
            username="platform-root-no-profile",
            email="platform-root-no-profile@example.com",
            password="StrongPass123!",
        )
        # The system permission helper intentionally allows active Django
        # superusers even without a UserProfile. Removing any signal-created
        # profile ensures the target remains the last active profile super admin.
        UserProfile.objects.filter(user=platform_root).delete()

        self.client.force_login(platform_root)
        response = self.client.post(
            f"/api/system/users/{self.system_user.id}/status/",
            data=json.dumps({"action": "deactivate"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["code"],
            "last_active_super_admin_required",
        )
        self.system_user.refresh_from_db()
        self.assertTrue(self.system_user.is_active)

    def test_system_admin_cannot_change_super_admin_status(self) -> None:
        import json
        self.client.force_login(self.system_admin_user)
        response = self.client.post(
            f"/api/system/users/{self.system_user.id}/status/",
            data=json.dumps({"action": "suspend"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["code"],
            "system_users_super_admin_target_forbidden",
        )

    def test_company_only_profile_is_not_mutated_by_system_user_routes(self) -> None:
        import json
        self.client.force_login(self.system_user)

        update_response = self.client.patch(
            f"/api/system/users/{self.regular_user.id}/",
            data=json.dumps({"first_name": "No"}),
            content_type="application/json",
        )
        self.assertEqual(update_response.status_code, 400)
        self.assertEqual(
            update_response.json()["code"],
            "system_user_required",
        )

        status_response = self.client.post(
            f"/api/system/users/{self.regular_user.id}/status/",
            data=json.dumps({"action": "deactivate"}),
            content_type="application/json",
        )
        self.assertEqual(status_response.status_code, 400)
        self.assertEqual(
            status_response.json()["code"],
            "system_user_required",
        )

    def test_system_user_delete_is_not_supported(self) -> None:
        target, _ = self._create_system_support_target()
        self.client.force_login(self.system_user)
        response = self.client.delete(
            f"/api/system/users/{target.id}/"
        )
        self.assertEqual(response.status_code, 405)


    def test_inactive_system_user_keeps_system_access_classification(self) -> None:
        from unittest.mock import patch

        target, profile = self._create_system_support_target(
            "classification-target"
        )
        target.is_active = False
        target.save(update_fields=["is_active"])
        profile.status = UserProfileStatus.INACTIVE
        profile.save(update_fields=["status", "updated_at"])

        fake_membership = {
            "id": 999,
            "company_id": 999,
            "company_name": "Classification Company",
            "company_display_name": "Classification Company",
            "role": "OWNER",
            "status": "ACTIVE",
            "is_primary": True,
            "is_active": True,
            "job_title": "",
            "department": "",
        }

        self.client.force_login(self.system_user)

        with patch(
            "api.system.users.list._system_user_default_membership_payload",
            return_value=fake_membership,
        ):
            detail = self.client.get(
                f"/api/system/users/{target.id}/"
            )
            self.assertEqual(detail.status_code, 200)
            detail_payload = detail.json()
            self.assertEqual(detail_payload["access_type"], "system")
            self.assertFalse(detail_payload["can_access_system"])
            self.assertTrue(detail_payload["is_system_user"])
            self.assertEqual(
                detail_payload["role"],
                SystemRole.SUPPORT,
            )
            self.assertEqual(
                detail_payload["system_role"],
                SystemRole.SUPPORT,
            )
            self.assertEqual(
                detail_payload["raw_system_role"],
                SystemRole.SUPPORT,
            )
            self.assertEqual(detail_payload["company_role"], "OWNER")

            system_list = self.client.get(
                "/api/system/users/",
                {
                    "access": "system",
                    "search": "classification-target",
                },
            )
            self.assertEqual(system_list.status_code, 200)
            system_rows = system_list.json()["results"]
            self.assertEqual(len(system_rows), 1)
            self.assertEqual(system_rows[0]["id"], target.id)
            self.assertEqual(system_rows[0]["access_type"], "system")
            self.assertEqual(
                system_rows[0]["system_role"],
                SystemRole.SUPPORT,
            )
            self.assertEqual(
                system_rows[0]["role"],
                SystemRole.SUPPORT,
            )
            self.assertEqual(system_rows[0]["company_role"], "OWNER")

            company_list = self.client.get(
                "/api/system/users/",
                {
                    "access": "company",
                    "search": "classification-target",
                },
            )
            self.assertEqual(company_list.status_code, 200)
            self.assertEqual(company_list.json()["count"], 0)


    def test_system_admin_cannot_edit_or_activate_inactive_super_admin(self) -> None:
        import json

        target = UserModel.objects.create_user(
            username="inactive-super-admin",
            email="inactive-super-admin@example.com",
            password="StrongPass123!",
            is_active=False,
        )
        profile, _ = UserProfile.objects.update_or_create(
            user=target,
            defaults={
                "display_name": "Inactive Super Admin",
                "status": UserProfileStatus.INACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPER_ADMIN,
            },
        )

        self.client.force_login(self.system_admin_user)

        edit_response = self.client.patch(
            f"/api/system/users/{target.id}/",
            data=json.dumps({"first_name": "Blocked"}),
            content_type="application/json",
        )
        self.assertEqual(edit_response.status_code, 403)
        self.assertEqual(
            edit_response.json()["code"],
            "system_users_super_admin_target_forbidden",
        )

        activate_response = self.client.post(
            f"/api/system/users/{target.id}/status/",
            data=json.dumps({"action": "activate"}),
            content_type="application/json",
        )
        self.assertEqual(activate_response.status_code, 403)
        self.assertEqual(
            activate_response.json()["code"],
            "system_users_super_admin_target_forbidden",
        )

        target.refresh_from_db()
        profile.refresh_from_db()
        self.assertFalse(target.is_active)
        self.assertEqual(profile.status, UserProfileStatus.INACTIVE)
        self.assertEqual(profile.system_role, SystemRole.SUPER_ADMIN)

    def test_system_user_status_requires_reason_for_destructive_actions(self) -> None:
        import json

        target, profile = self._create_system_support_target(
            "reason-required-target"
        )
        self.client.force_login(self.system_admin_user)

        for action in ("suspend", "deactivate"):
            response = self.client.post(
                f"/api/system/users/{target.id}/status/",
                data=json.dumps({"action": action}),
                content_type="application/json",
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(
                response.json()["code"],
                "system_user_status_reason_required",
            )

            target.refresh_from_db()
            profile.refresh_from_db()
            self.assertTrue(target.is_active)
            self.assertEqual(
                profile.status,
                UserProfileStatus.ACTIVE,
            )
