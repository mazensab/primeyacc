from __future__ import annotations

from django.contrib.auth import (
    get_user_model,
)
from django.test import TestCase
from django.urls import resolve

from accounts.models import (
    SystemRole,
    UserProfile,
    UserProfileStatus,
)


User = get_user_model()


class Phase29CPlatformPaymentOperationsAPITests(
    TestCase
):
    def setUp(self):
        self.system_user = (
            User.objects.create_user(
                username="phase29c-system-admin",
                email="phase29c-system-admin@example.com",
                password="StrongPass123!",
            )
        )

        UserProfile.objects.update_or_create(
            user=self.system_user,
            defaults={
                "display_name": (
                    "Phase 29C System Admin"
                ),
                "status": (
                    UserProfileStatus.ACTIVE
                ),
                "is_system_user": True,
                "system_role": (
                    SystemRole.SUPER_ADMIN
                ),
            },
        )

        self.regular_user = (
            User.objects.create_user(
                username="phase29c-regular-user",
                email="phase29c-regular-user@example.com",
                password="StrongPass123!",
            )
        )

        UserProfile.objects.update_or_create(
            user=self.regular_user,
            defaults={
                "display_name": (
                    "Phase 29C Regular"
                ),
                "status": (
                    UserProfileStatus.ACTIVE
                ),
                "is_system_user": False,
                "system_role": (
                    SystemRole.NONE
                ),
            },
        )

    def test_phase29c_route_contract(
        self,
    ):
        cases = [
            (
                "/api/system/subscription-payments/reconciliations/",
                "system:system_subscription_payments:reconciliations",
            ),
            (
                "/api/system/subscription-payments/reconciliations/1/",
                "system:system_subscription_payments:reconciliation_detail",
            ),
            (
                "/api/system/subscription-payments/webhook-events/",
                "system:system_subscription_payments:webhook_events",
            ),
            (
                "/api/system/subscription-payments/webhook-events/1/",
                "system:system_subscription_payments:webhook_event_detail",
            ),
            (
                "/api/system/subscription-payments/webhook-events/1/reprocess/",
                "system:system_subscription_payments:webhook_event_reprocess",
            ),
            (
                "/api/system/subscription-payments/gateway-readiness/",
                "system:system_subscription_payments:gateway_readiness",
            ),
            (
                "/api/system/subscription-payments/1/reconcile/",
                "system:system_subscription_payments:reconcile",
            ),
            (
                "/api/system/subscription-payments/1/reconciliations/",
                "system:system_subscription_payments:payment_reconciliations",
            ),
        ]

        for path, expected in cases:
            with self.subTest(
                path=path
            ):
                self.assertEqual(
                    resolve(path).view_name,
                    expected,
                )

    def test_regular_user_cannot_view_reconciliations(
        self,
    ):
        self.client.force_login(
            self.regular_user
        )

        response = self.client.get(
            "/api/system/subscription-payments/reconciliations/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_regular_user_cannot_view_webhook_operations(
        self,
    ):
        self.client.force_login(
            self.regular_user
        )

        response = self.client.get(
            "/api/system/subscription-payments/webhook-events/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_regular_user_cannot_reprocess_webhook(
        self,
    ):
        self.client.force_login(
            self.regular_user
        )

        response = self.client.post(
            "/api/system/subscription-payments/webhook-events/1/reprocess/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_regular_user_cannot_reconcile_payment(
        self,
    ):
        self.client.force_login(
            self.regular_user
        )

        response = self.client.post(
            "/api/system/subscription-payments/1/reconcile/"
        )

        self.assertEqual(
            response.status_code,
            403,
        )

    def test_super_admin_can_view_empty_reconciliation_register(
        self,
    ):
        self.client.force_login(
            self.system_user
        )

        response = self.client.get(
            "/api/system/subscription-payments/reconciliations/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertTrue(
            payload["ok"]
        )

        self.assertEqual(
            payload["data"]["count"],
            0,
        )

    def test_super_admin_can_view_empty_webhook_register(
        self,
    ):
        self.client.force_login(
            self.system_user
        )

        response = self.client.get(
            "/api/system/subscription-payments/webhook-events/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertTrue(
            response.json()["ok"]
        )

    def test_gateway_readiness_does_not_expose_secret_values(
        self,
    ):
        self.client.force_login(
            self.system_user
        )

        response = self.client.get(
            "/api/system/subscription-payments/gateway-readiness/"
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        payload = response.json()

        self.assertTrue(
            payload["ok"]
        )

        for gateway in (
            payload["data"][
                "gateways"
            ]
        ):
            for check in gateway[
                "checks"
            ]:
                self.assertNotIn(
                    "value",
                    check,
                )
