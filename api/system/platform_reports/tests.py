from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from accounts.models import (
    SystemRole,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
class PlatformReportsTests(TestCase):
    def make_user(self, name, role=SystemRole.NONE, system=False):
        user = get_user_model().objects.create_user(
            username=name,
            email=f"{name}@test.local",
            password="StrongPass123!",
        )
        UserProfile.objects.create(
            user=user,
            display_name=name,
            status=UserProfileStatus.ACTIVE,
            default_workspace=(
                WorkspaceType.SYSTEM
                if system
                else WorkspaceType.COMPANY
            ),
            system_role=role,
            is_system_user=system,
        )
        return user
    def setUp(self):
        self.overview = reverse(
            "system:system_platform_reports:overview"
        )
        self.export = reverse(
            "system:system_platform_reports:export"
        )
    def test_anonymous_redirected(self):
        response = self.client.get(self.overview)
        self.assertEqual(response.status_code, 302)
    def test_support_denied(self):
        user = self.make_user(
            "support31",
            SystemRole.SUPPORT,
            True,
        )
        self.client.force_login(user)
        response = self.client.get(self.overview)
        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            response.json()["code"],
            "SYSTEM_REPORTS_VIEW_PERMISSION_REQUIRED",
        )
    def test_billing_manager_report_runtime(self):
        user = self.make_user(
            "billing31",
            SystemRole.BILLING_MANAGER,
            True,
        )
        self.client.force_login(user)
        response = self.client.get(self.overview)
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertIn("subscriptions", data)
        self.assertIn("revenue", data)
        self.assertIn("payments", data)
        self.assertIn("billing_documents", data)
        self.assertIn("refunds", data)
        self.assertIn("adjustments", data)
        self.assertIn("reconciliation", data)
        recurring = data["subscriptions"]["recurring_revenue"]
        self.assertEqual(recurring["mrr"], "0.00")
        self.assertEqual(recurring["arr"], "0.00")
    def test_bad_date_rejected(self):
        user = self.make_user(
            "billingdate31",
            SystemRole.BILLING_MANAGER,
            True,
        )
        self.client.force_login(user)
        response = self.client.get(
            self.overview,
            {"date_from": "24-08-2026"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json()["code"],
            "INVALID_REPORT_DATE",
        )
    def test_export_runtime(self):
        user = self.make_user(
            "billingexport31",
            SystemRole.BILLING_MANAGER,
            True,
        )
        self.client.force_login(user)
        response = self.client.get(self.export)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            response["Content-Type"].startswith("text/csv")
        )
        body = response.content.decode("utf-8")
        self.assertIn(
            "subscriptions.recurring_revenue.mrr",
            body,
        )
        self.assertIn(
            "revenue.net_collected",
            body,
        )
    def test_report_contract_has_no_provider_secrets(self):
        user = self.make_user(
            "billingsecret31",
            SystemRole.BILLING_MANAGER,
            True,
        )
        self.client.force_login(user)
        response = self.client.get(self.overview)
        self.assertEqual(response.status_code, 200)
        body = response.content.decode("utf-8").lower()
        for token in (
            "secret_key",
            "client_secret",
            "webhook_secret",
            "access_token",
            "refresh_token",
            "private_key",
            "provider_response_snapshot",
            "provider_request_snapshot",
        ):
            self.assertNotIn(token, body)
