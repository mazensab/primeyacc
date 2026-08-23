from __future__ import annotations

import json

from django.test import (
    SimpleTestCase,
    override_settings,
)

from integrations.payments.readiness import (
    build_payment_gateway_readiness_payload,
)
from release_readiness.contracts import (
    contract_keys,
)
from release_readiness.services import (
    build_release_readiness_payload,
)


class PlatformPaymentGatewayReadinessTests(
    SimpleTestCase
):
    @override_settings(
        MOYASAR_SECRET_KEY="moyasar-secret-value",
        MOYASAR_WEBHOOK_SECRET="moyasar-webhook-value",
        MOYASAR_BASE_URL="https://api.moyasar.com/v1",
        MOYASAR_TIMEOUT=15,
        TAMARA_API_TOKEN="tamara-secret-value",
        TAMARA_NOTIFICATION_TOKEN="tamara-notification-value",
        TABBY_SECRET_KEY="tabby-secret-value",
        TABBY_MERCHANT_CODE="merchant-code",
        TABBY_WEBHOOK_HEADER_NAME="X-Webhook-Key",
        TABBY_WEBHOOK_HEADER_VALUE="tabby-webhook-value",
    )
    def test_all_gateway_configuration_can_be_ready(
        self,
    ):
        payload = (
            build_payment_gateway_readiness_payload()
        )

        self.assertTrue(
            payload["ready"]
        )

        self.assertEqual(
            payload["summary"][
                "ready_count"
            ],
            3,
        )

    @override_settings(
        MOYASAR_SECRET_KEY="moyasar-secret-value",
        MOYASAR_WEBHOOK_SECRET="moyasar-webhook-value",
        TAMARA_API_TOKEN="tamara-secret-value",
        TAMARA_NOTIFICATION_TOKEN="tamara-notification-value",
        TABBY_SECRET_KEY="tabby-secret-value",
        TABBY_MERCHANT_CODE="merchant-code",
        TABBY_WEBHOOK_HEADER_NAME="X-Webhook-Key",
        TABBY_WEBHOOK_HEADER_VALUE="tabby-webhook-value",
    )
    def test_readiness_payload_never_exposes_secret_values(
        self,
    ):
        payload = (
            build_payment_gateway_readiness_payload()
        )

        serialized = json.dumps(
            payload
        )

        for secret in (
            "moyasar-secret-value",
            "moyasar-webhook-value",
            "tamara-secret-value",
            "tamara-notification-value",
            "tabby-secret-value",
            "tabby-webhook-value",
        ):
            self.assertNotIn(
                secret,
                serialized,
            )

    def test_subscription_payments_contract_is_registered(
        self,
    ):
        self.assertIn(
            "subscription-payments",
            contract_keys(),
        )

    def test_release_readiness_contains_platform_gateway_check(
        self,
    ):
        payload = (
            build_release_readiness_payload()
        )

        keys = {
            row["key"]
            for row
            in payload["data"]["checks"]
        }

        self.assertIn(
            "platform_payment_gateways",
            keys,
        )
