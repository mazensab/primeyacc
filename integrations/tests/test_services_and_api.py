# ============================================================
# 📂 integrations/tests/test_services_and_api.py
# 🧠 PrimeyAcc | Integration API Keys Tests V1.0
# ------------------------------------------------------------
# ✅ API key creation stores hash only
# ✅ Authentication resolves company from key
# ✅ Scope validation
# ✅ Disable / enable / revoke / rotate lifecycle
# ✅ System API create/list/detail smoke tests
# ============================================================

from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import SystemRole, UserProfile, WorkspaceType
from companies.models import Company, CompanyStatus
from integrations.models import IntegrationApiKeyStatus
from integrations.services import (
    IntegrationApiKeyAuthError,
    authenticate_integration_api_key,
    create_integration_api_key,
    disable_integration_api_key,
    enable_integration_api_key,
    revoke_integration_api_key,
    rotate_integration_api_key,
)


class IntegrationApiKeyServiceTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="system-admin",
            email="system-admin@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.create(
            user=self.user,
            display_name="System Admin",
            is_system_user=True,
            system_role=SystemRole.SYSTEM_ADMIN,
            default_workspace=WorkspaceType.SYSTEM,
        )
        self.company = Company.objects.create(
            name="Demo Company",
            name_ar="شركة تجريبية",
            company_code="DEMO-API",
            status=CompanyStatus.ACTIVE,
            is_active=True,
        )

    def test_create_api_key_stores_hash_only_and_authenticates(self):
        api_key, raw_key = create_integration_api_key(
            company=self.company,
            name="Store Integration",
            environment="TEST",
            scopes=["company.read", "products.read"],
            created_by=self.user,
        )

        self.assertTrue(raw_key.startswith("pmacc_test_"))
        self.assertNotEqual(api_key.key_hash, raw_key)
        self.assertNotIn(raw_key, api_key.key_hash)
        self.assertEqual(api_key.status, IntegrationApiKeyStatus.ACTIVE)

        authenticated = authenticate_integration_api_key(
            raw_key=raw_key,
            required_scopes=["company.read"],
        )

        self.assertEqual(authenticated.company_id, self.company.id)
        self.assertEqual(authenticated.api_key.id, api_key.id)

    def test_missing_scope_is_rejected(self):
        api_key, raw_key = create_integration_api_key(
            company=self.company,
            name="Limited Integration",
            environment="TEST",
            scopes=["company.read"],
            created_by=self.user,
        )

        with self.assertRaises(IntegrationApiKeyAuthError):
            authenticate_integration_api_key(
                raw_key=raw_key,
                required_scopes=["sales_invoices.write"],
            )

    def test_disable_enable_revoke_lifecycle(self):
        api_key, raw_key = create_integration_api_key(
            company=self.company,
            name="Lifecycle Integration",
            environment="TEST",
            scopes=["company.read"],
            created_by=self.user,
        )

        disable_integration_api_key(api_key=api_key, user=self.user, reason="pause")
        api_key.refresh_from_db()
        self.assertEqual(api_key.status, IntegrationApiKeyStatus.DISABLED)

        enable_integration_api_key(api_key=api_key, user=self.user)
        api_key.refresh_from_db()
        self.assertEqual(api_key.status, IntegrationApiKeyStatus.ACTIVE)

        revoke_integration_api_key(api_key=api_key, user=self.user, reason="security")
        api_key.refresh_from_db()
        self.assertEqual(api_key.status, IntegrationApiKeyStatus.REVOKED)

        with self.assertRaises(IntegrationApiKeyAuthError):
            authenticate_integration_api_key(raw_key=raw_key)

    def test_rotate_disables_old_key_and_creates_new_key(self):
        api_key, old_raw_key = create_integration_api_key(
            company=self.company,
            name="Rotating Integration",
            environment="TEST",
            scopes=["company.read", "customers.read"],
            created_by=self.user,
        )

        new_key, new_raw_key = rotate_integration_api_key(
            api_key=api_key,
            user=self.user,
            reason="scheduled rotation",
        )

        api_key.refresh_from_db()
        self.assertEqual(api_key.status, IntegrationApiKeyStatus.DISABLED)
        self.assertEqual(new_key.rotated_from_id, api_key.id)
        self.assertNotEqual(old_raw_key, new_raw_key)

        authenticated = authenticate_integration_api_key(
            raw_key=new_raw_key,
            required_scopes=["customers.read"],
        )
        self.assertEqual(authenticated.api_key.id, new_key.id)


class SystemIntegrationApiKeyApiTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="system-admin-api",
            email="system-admin-api@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.create(
            user=self.user,
            display_name="System Admin API",
            is_system_user=True,
            system_role=SystemRole.SYSTEM_ADMIN,
            default_workspace=WorkspaceType.SYSTEM,
        )
        self.company = Company.objects.create(
            name="API Company",
            name_ar="شركة API",
            company_code="API-COMPANY",
            status=CompanyStatus.ACTIVE,
            is_active=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_system_create_and_list_api_keys(self):
        response = self.client.post(
            "/api/system/integration-api-keys/",
            {
                "company_id": self.company.id,
                "name": "ERP Connector",
                "description": "External ERP connector",
                "environment": "TEST",
                "scopes": ["company.read", "products.read"],
                "rate_limit_per_minute": 120,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("secret_key", response.data)
        self.assertTrue(response.data["secret_key"].startswith("pmacc_test_"))

        list_response = self.client.get("/api/system/integration-api-keys/")
        self.assertEqual(list_response.status_code, 200)
        self.assertGreaterEqual(list_response.data["count"], 1)

    def test_detail_does_not_expose_secret_key(self):
        api_key, raw_key = create_integration_api_key(
            company=self.company,
            name="No Secret Detail",
            environment="TEST",
            scopes=["company.read"],
            created_by=self.user,
        )

        response = self.client.get(f"/api/system/integration-api-keys/{api_key.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("secret_key", response.data)
        self.assertEqual(response.data["key_prefix"], api_key.key_prefix)
        self.assertNotEqual(response.data["key_prefix"], raw_key)
