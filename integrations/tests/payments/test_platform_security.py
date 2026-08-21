from django.test import SimpleTestCase

from billing.models import PlatformSubscriptionPayment
from billing.payment_services import (
    is_provider_managed_subscription_payment,
)
from integrations.payments.platform_bridge import (
    _safe_provider_snapshot,
)


class PlatformPaymentSecurityTests(SimpleTestCase):
    def test_provider_managed_gateway_detection(self):
        for gateway in ("MOYASAR", "TAMARA", "TABBY", "moyasar"):
            payment = PlatformSubscriptionPayment(gateway=gateway)
            self.assertTrue(
                is_provider_managed_subscription_payment(payment)
            )

        manual = PlatformSubscriptionPayment(gateway="MANUAL")
        self.assertFalse(
            is_provider_managed_subscription_payment(manual)
        )

    def test_provider_snapshot_redacts_nested_secrets(self):
        source = {
            "id": "pay_123",
            "token": "secret-token",
            "nested": {
                "authorization": "Bearer secret",
                "safe": "value",
                "items": [
                    {
                        "api_key": "secret-key",
                        "status": "paid",
                    }
                ],
            },
        }

        safe = _safe_provider_snapshot(source)

        self.assertEqual(safe["token"], "[REDACTED]")
        self.assertEqual(
            safe["nested"]["authorization"],
            "[REDACTED]",
        )
        self.assertEqual(
            safe["nested"]["items"][0]["api_key"],
            "[REDACTED]",
        )
        self.assertEqual(safe["nested"]["safe"], "value")
        self.assertEqual(
            safe["nested"]["items"][0]["status"],
            "paid",
        )

    def test_provider_snapshot_does_not_mutate_source(self):
        source = {
            "token": "original",
            "nested": {"password": "original-password"},
        }

        safe = _safe_provider_snapshot(source)

        self.assertEqual(source["token"], "original")
        self.assertEqual(
            source["nested"]["password"],
            "original-password",
        )
        self.assertEqual(safe["token"], "[REDACTED]")
