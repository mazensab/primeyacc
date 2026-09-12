from django.contrib.auth import get_user_model
from django.test import TestCase


class SystemDashboardAnalyticsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="dashboard-analytics-superuser",
            email="dashboard-analytics@example.com",
            password="StrongPass123!",
            is_staff=True,
            is_superuser=True,
        )

    def test_auth_required(self):
        response = self.client.get("/api/system/dashboard/analytics/")
        self.assertIn(response.status_code, {302, 401, 403})

    def test_contract(self):
        self.client.force_login(self.user)
        response = self.client.get(
            "/api/system/dashboard/analytics/?date_from=2026-08-16&date_to=2026-09-12"
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        data = body["data"]
        self.assertIn("financial_cards", data)
        self.assertIn("chart", data)
        self.assertIn("top_plans", data)
        self.assertIn("subscription_events", data)
        self.assertEqual(len(data["chart"]["series"]), 28)

    def test_invalid_range(self):
        self.client.force_login(self.user)
        response = self.client.get(
            "/api/system/dashboard/analytics/?date_from=2026-09-12&date_to=2026-09-01"
        )
        self.assertEqual(response.status_code, 400)
