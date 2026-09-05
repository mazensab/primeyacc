from __future__ import annotations

from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import resolve
from accounts.models import SystemRole, UserProfile, UserProfileStatus

User = get_user_model()


class SystemMhamCloudAPITests(TestCase):
    def setUp(self):
        self.superuser = User.objects.create_user(
            username="phase52a-super",
            email="phase52a-super@example.com",
            password="StrongPass123!",
            is_superuser=True,
        )
        UserProfile.objects.update_or_create(
            user=self.superuser,
            defaults={
                "display_name": "Phase 52A Super",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPER_ADMIN,
            },
        )
        self.regular = User.objects.create_user(
            username="phase52a-regular",
            email="phase52a-regular@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.update_or_create(
            user=self.regular,
            defaults={
                "display_name": "Phase 52A Regular",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": False,
                "system_role": SystemRole.NONE,
            },
        )

    def test_routes(self):
        cases = [
            ("/api/system/mhamcloud/status/", "system:system_mhamcloud:status"),
            ("/api/system/mhamcloud/settings/", "system:system_mhamcloud:settings"),
            ("/api/system/mhamcloud/test-connection/", "system:system_mhamcloud:test_connection"),
            ("/api/system/mhamcloud/companies/", "system:system_mhamcloud:companies"),
            ("/api/system/mhamcloud/companies/652/", "system:system_mhamcloud:company_detail"),
            ("/api/system/mhamcloud/companies/652/retry/", "system:system_mhamcloud:company_retry"),
            ("/api/system/mhamcloud/runs/", "system:system_mhamcloud:runs"),
            ("/api/system/mhamcloud/run-sync/", "system:system_mhamcloud:run_sync"),
        ]
        for path, expected in cases:
            with self.subTest(path=path):
                self.assertEqual(resolve(path).view_name, expected)

    def test_regular_user_forbidden(self):
        self.client.force_login(self.regular)
        self.assertEqual(self.client.get("/api/system/mhamcloud/status/").status_code, 403)

    @patch(
        "api.system.mhamcloud.views.public_settings",
        return_value={
            "enabled": True,
            "base_url": "https://mhamcloud.sa/connector/api",
            "timeout_seconds": 30,
            "client_id_configured": True,
            "client_secret_configured": True,
            "username_configured": True,
            "password_configured": True,
        },
    )
    def test_settings_do_not_expose_secrets(self, _mock):
        self.client.force_login(self.superuser)
        response = self.client.get("/api/system/mhamcloud/settings/")
        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8").lower()
        self.assertNotIn('"client_secret":', body)
        self.assertNotIn('"password":', body)
        self.assertNotIn('"access_token":', body)
        self.assertIn('"client_secret_configured": true', body)

    def test_http_base_url_rejected(self):
        self.client.force_login(self.superuser)
        response = self.client.patch(
            "/api/system/mhamcloud/settings/",
            data='{"base_url":"http://mhamcloud.sa/connector/api"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    def test_foreign_host_rejected(self):
        self.client.force_login(self.superuser)
        response = self.client.patch(
            "/api/system/mhamcloud/settings/",
            data='{"base_url":"https://example.com/connector/api"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

    @patch("api.system.mhamcloud.views.companies_payload", return_value=[])
    def test_empty_company_register_is_valid(self, _mock):
        self.client.force_login(self.superuser)
        response = self.client.get("/api/system/mhamcloud/companies/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["results"], [])
