from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from companies.models import Company
from subscriptions.models import CompanySubscription, SubscriptionPlan


class Phase32SubscriptionContractHardeningTests(TestCase):
    def setUp(self):
        User = get_user_model()

        self.user = User.objects.create_user(
            username="phase32-contract-user",
            email="phase32-contract@example.com",
            password="phase32-test-password",
        )

        self.client.force_login(self.user)

    def test_suspend_requires_system_subscription_update_permission(self):
        with patch(
            "api.system.subscriptions.suspend."
            "user_has_system_permission",
            return_value=False,
        ):
            response = self.client.post(
                "/api/system/subscriptions/999999/suspend/",
                data={},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["code"],
            "SYSTEM_SUBSCRIPTIONS_UPDATE_PERMISSION_REQUIRED",
        )

    def test_reactivate_requires_system_subscription_update_permission(self):
        with patch(
            "api.system.subscriptions.reactivate."
            "user_has_system_permission",
            return_value=False,
        ):
            response = self.client.post(
                "/api/system/subscriptions/999999/reactivate/",
                data={},
                content_type="application/json",
            )

        self.assertEqual(response.status_code, 403)
        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(
            payload["code"],
            "SYSTEM_SUBSCRIPTIONS_UPDATE_PERMISSION_REQUIRED",
        )
