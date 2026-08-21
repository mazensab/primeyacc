from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from integrations.payments.platform_checkout import (
    SERVER_SIDE_CHECKOUT_GATEWAYS,
    _major_to_minor,
    _safe_provider_snapshot,
)
from integrations.payments.types import (
    PaymentGatewayName,
)


class PlatformCheckoutFoundationTests(SimpleTestCase):
    def test_server_side_gateways_are_tamara_and_tabby(self) -> None:
        self.assertEqual(
            SERVER_SIDE_CHECKOUT_GATEWAYS,
            {
                PaymentGatewayName.TAMARA,
                PaymentGatewayName.TABBY,
            },
        )

    def test_moyasar_is_not_server_side_checkout(self) -> None:
        self.assertNotIn(
            PaymentGatewayName.MOYASAR,
            SERVER_SIDE_CHECKOUT_GATEWAYS,
        )

    def test_major_to_minor(self) -> None:
        self.assertEqual(
            _major_to_minor(Decimal("100.25")),
            10025,
        )

    def test_major_to_minor_rejects_negative(self) -> None:
        with self.assertRaises(ValidationError):
            _major_to_minor(Decimal("-1.00"))

    def test_provider_snapshot_redacts_secrets_recursively(self) -> None:
        payload = {
            "id": "provider-1",
            "token": "secret-token",
            "nested": {
                "authorization": "Bearer secret",
                "status": "created",
            },
            "items": [
                {
                    "secret_key": "hidden",
                    "name": "Subscription",
                }
            ],
        }

        cleaned = _safe_provider_snapshot(
            payload
        )

        self.assertEqual(
            cleaned["id"],
            "provider-1",
        )
        self.assertEqual(
            cleaned["token"],
            "[REDACTED]",
        )
        self.assertEqual(
            cleaned["nested"]["authorization"],
            "[REDACTED]",
        )
        self.assertEqual(
            cleaned["nested"]["status"],
            "created",
        )
        self.assertEqual(
            cleaned["items"][0]["secret_key"],
            "[REDACTED]",
        )

    def test_snapshot_handles_non_dict_payload(self) -> None:
        self.assertEqual(
            _safe_provider_snapshot(None),
            {},
        )

    def test_adapter_contract_can_be_mocked_without_provider_call(self) -> None:
        adapter = MagicMock()

        adapter.create_payment.return_value = (
            SimpleNamespace(
                provider_payment_id="provider-1",
                checkout_url="https://checkout.example/",
            )
        )

        self.assertEqual(
            adapter.create_payment(
                SimpleNamespace()
            ).provider_payment_id,
            "provider-1",
        )
