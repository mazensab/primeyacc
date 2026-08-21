from __future__ import annotations

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import resolve

from accounts.models import SystemRole, UserProfile, UserProfileStatus


User = get_user_model()


class SystemSubscriptionPaymentsAPITests(TestCase):
    def setUp(self) -> None:
        self.system_user = User.objects.create_user(
            username="phase19-system-admin",
            email="phase19-system-admin@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.update_or_create(
            user=self.system_user,
            defaults={
                "display_name": "Phase 19 System Admin",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": True,
                "system_role": SystemRole.SUPER_ADMIN,
            },
        )

        self.regular_user = User.objects.create_user(
            username="phase19-regular-user",
            email="phase19-regular-user@example.com",
            password="StrongPass123!",
        )
        UserProfile.objects.update_or_create(
            user=self.regular_user,
            defaults={
                "display_name": "Phase 19 Regular User",
                "status": UserProfileStatus.ACTIVE,
                "is_system_user": False,
                "system_role": SystemRole.NONE,
            },
        )

    def test_list_requires_system_subscription_view_permission(self) -> None:
        self.client.force_login(self.regular_user)
        response = self.client.get("/api/system/subscription-payments/")
        self.assertEqual(response.status_code, 403)

    def test_super_admin_can_read_empty_payment_register(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.get("/api/system/subscription-payments/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["count"], 0)
        self.assertEqual(payload["data"]["results"], [])

    def test_invalid_status_filter_is_rejected(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.get(
            "/api/system/subscription-payments/?status=NOT_A_STATUS"
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])

    def test_create_requires_subscription_id(self) -> None:
        self.client.force_login(self.system_user)
        response = self.client.post(
            "/api/system/subscription-payments/create/",
            data="{}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])

    def test_route_contract(self) -> None:
        cases = [
            (
                "/api/system/subscription-payments/",
                "system:system_subscription_payments:list",
            ),
            (
                "/api/system/subscription-payments/create/",
                "system:system_subscription_payments:create",
            ),
            (
                "/api/system/subscription-payments/1/",
                "system:system_subscription_payments:detail",
            ),
            (
                "/api/system/subscription-payments/1/events/",
                "system:system_subscription_payments:events",
            ),
            (
                "/api/system/subscription-payments/1/checkout/",
                "system:system_subscription_payments:checkout",
            ),
            (
                "/api/system/subscription-payments/1/moyasar/attach/",
                "system:system_subscription_payments:moyasar_attach",
            ),
            (
                "/api/system/subscription-payments/1/confirm/",
                "system:system_subscription_payments:confirm",
            ),
            (
                "/api/system/subscription-payments/1/fail/",
                "system:system_subscription_payments:fail",
            ),
            (
                "/api/system/subscription-payments/1/cancel/",
                "system:system_subscription_payments:cancel",
            ),
        ]

        for path, expected_name in cases:
            with self.subTest(path=path):
                self.assertEqual(resolve(path).view_name, expected_name)

    def test_checkout_requires_system_subscription_update_permission(self) -> None:
        self.client.force_login(self.regular_user)
        response = self.client.post(
            "/api/system/subscription-payments/1/checkout/",
            data="{}",
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_moyasar_attach_requires_system_subscription_update_permission(self) -> None:
        self.client.force_login(self.regular_user)
        response = self.client.post(
            "/api/system/subscription-payments/1/moyasar/attach/",
            data='{"provider_payment_id":"pay_test"}',
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)
