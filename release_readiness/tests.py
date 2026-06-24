# ============================================================
# 📂 release_readiness/tests.py
# 🧠 PrimeyAcc | Phase 27 Release Readiness Tests
# ============================================================
# ✅ Contract registry smoke tests
# ✅ Readiness payload tests
# ✅ API access tests
# ✅ Management command test
# ============================================================

from __future__ import annotations

import json
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import RequestFactory, TestCase

from accounts.models import SystemRole, UserProfile, UserProfileStatus
from api.system.release_readiness.views import release_readiness_overview
from release_readiness.contracts import API_CONTRACTS, contract_keys
from release_readiness.services import build_release_readiness_payload


class ReleaseReadinessContractTests(TestCase):
    def test_contract_registry_has_required_phase_27_contracts(self):
        keys = contract_keys()

        self.assertIn("business-controls", keys)
        self.assertIn("activity-backends", keys)
        self.assertIn("release-readiness", keys)
        self.assertIn("inventory", keys)
        self.assertIn("accounting", keys)
        self.assertGreaterEqual(len(API_CONTRACTS), 10)

    def test_contract_keys_are_unique(self):
        keys = [contract.key for contract in API_CONTRACTS]

        self.assertEqual(len(keys), len(set(keys)))

    def test_readiness_payload_has_stable_response_contract(self):
        payload = build_release_readiness_payload()

        self.assertTrue(payload["success"])
        self.assertEqual(payload["message"], "Backend release readiness payload generated.")
        self.assertIn("data", payload)
        self.assertIn("errors", payload)
        self.assertIn("meta", payload)
        self.assertIn(payload["data"]["status"], {"ready", "ready_with_warnings", "blocked"})
        self.assertGreater(payload["data"]["summary"]["contracts_count"], 0)


class ReleaseReadinessAPITests(TestCase):
    def setUp(self):
        self.factory = RequestFactory()
        User = get_user_model()
        self.system_admin_user = User.objects.create_user(
            username="phase27_system_admin",
            email="phase27_system_admin@example.com",
            password="safe-test-password",
            is_staff=False,
            is_superuser=False,
        )
        UserProfile.objects.update_or_create(
            user=self.system_admin_user,
            defaults={
                "display_name": "Phase 27 System Admin",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SYSTEM_ADMIN,
            },
        )
        self.support_user = User.objects.create_user(
            username="phase27_support",
            email="phase27_support@example.com",
            password="safe-test-password",
            is_staff=False,
            is_superuser=False,
        )
        UserProfile.objects.update_or_create(
            user=self.support_user,
            defaults={
                "display_name": "Phase 27 Support",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPPORT,
            },
        )
        self.regular_user = User.objects.create_user(
            username="phase27_user",
            email="phase27_user@example.com",
            password="safe-test-password",
            is_staff=False,
            is_superuser=False,
        )
        UserProfile.objects.update_or_create(
            user=self.regular_user,
            defaults={
                "display_name": "Phase 27 Regular User",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": False,
                "system_role": SystemRole.NONE,
            },
        )
    def test_release_readiness_api_rejects_anonymous_user(self):
        request = self.factory.get("/api/system/release-readiness/")
        response = release_readiness_overview(request)
        self.assertEqual(response.status_code, 401)
        body = json.loads(response.content.decode("utf-8"))
        self.assertFalse(body["success"])
    def test_release_readiness_api_rejects_non_system_user(self):
        request = self.factory.get("/api/system/release-readiness/")
        request.user = self.regular_user
        response = release_readiness_overview(request)
        self.assertEqual(response.status_code, 403)
        body = json.loads(response.content.decode("utf-8"))
        self.assertFalse(body["success"])
    def test_release_readiness_api_rejects_system_user_without_permission(self):
        request = self.factory.get("/api/system/release-readiness/")
        request.user = self.support_user
        response = release_readiness_overview(request)
        self.assertEqual(response.status_code, 403)
        body = json.loads(response.content.decode("utf-8"))
        self.assertFalse(body["success"])
    def test_release_readiness_api_allows_system_admin_permission(self):
        request = self.factory.get("/api/system/release-readiness/")
        request.user = self.system_admin_user
        response = release_readiness_overview(request)
        self.assertEqual(response.status_code, 200)
        body = json.loads(response.content.decode("utf-8"))
        self.assertTrue(body["success"])
        self.assertEqual(body["meta"]["contract_version"], "v1")


class ReleaseReadinessCommandTests(TestCase):
    def test_check_release_readiness_command_outputs_summary(self):
        output = StringIO()

        call_command("check_release_readiness", stdout=output)

        value = output.getvalue()
        self.assertIn("PrimeyAcc Phase 27 Release Readiness", value)
        self.assertIn("Contracts:", value)
        self.assertIn("Checks:", value)
