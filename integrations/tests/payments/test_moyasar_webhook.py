from __future__ import annotations

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayVerificationError,
)
from integrations.payments.moyasar.webhook import (
    verify_moyasar_webhook,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentStatus,
)


class MoyasarWebhookTests(SimpleTestCase):
    SECRET = "webhook-secret-123"

    def payload(
        self,
        *,
        event_type="payment_paid",
        payment_status="paid",
    ):
        return {
            "id": "event_123",
            "type": event_type,
            "created_at": "2026-08-16T00:00:00Z",
            "secret_token": self.SECRET,
            "account_name": "Mhamcloud",
            "live": False,
            "data": {
                "id": "pay_123",
                "status": payment_status,
                "amount": 12500,
                "currency": "SAR",
            },
        }

    def test_accepts_valid_paid_webhook(self):
        result = verify_moyasar_webhook(
            payload=self.payload(),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.gateway,
            PaymentGatewayName.MOYASAR,
        )
        self.assertEqual(
            result.event_type,
            "payment_paid",
        )
        self.assertEqual(
            result.provider_payment_id,
            "pay_123",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_rejects_missing_configuration(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            verify_moyasar_webhook(
                payload=self.payload(),
                shared_secret="",
            )

    def test_rejects_wrong_secret(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=self.payload(),
                shared_secret="wrong-secret",
            )

    def test_rejects_missing_event_id(self):
        payload = self.payload()
        payload.pop("id")

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=payload,
                shared_secret=self.SECRET,
            )

    def test_rejects_missing_event_type(self):
        payload = self.payload()
        payload.pop("type")

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=payload,
                shared_secret=self.SECRET,
            )

    def test_rejects_unknown_event(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=self.payload(
                    event_type="unknown_event",
                ),
                shared_secret=self.SECRET,
            )

    def test_rejects_missing_data(self):
        payload = self.payload()
        payload.pop("data")

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=payload,
                shared_secret=self.SECRET,
            )

    def test_rejects_missing_payment_id(self):
        payload = self.payload()
        payload["data"].pop("id")

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=payload,
                shared_secret=self.SECRET,
            )

    def test_rejects_event_status_tampering(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_moyasar_webhook(
                payload=self.payload(
                    event_type="payment_paid",
                    payment_status="failed",
                ),
                shared_secret=self.SECRET,
            )

    def test_maps_authorized(self):
        result = verify_moyasar_webhook(
            payload=self.payload(
                event_type="payment_authorized",
                payment_status="authorized",
            ),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_maps_captured_to_paid(self):
        result = verify_moyasar_webhook(
            payload=self.payload(
                event_type="payment_captured",
                payment_status="captured",
            ),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_maps_refunded(self):
        result = verify_moyasar_webhook(
            payload=self.payload(
                event_type="payment_refunded",
                payment_status="refunded",
            ),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.REFUNDED,
        )

    def test_maps_voided(self):
        result = verify_moyasar_webhook(
            payload=self.payload(
                event_type="payment_voided",
                payment_status="voided",
            ),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.VOIDED,
        )

    def test_accepts_documented_failed_spelling(self):
        result = verify_moyasar_webhook(
            payload=self.payload(
                event_type="payment_failed",
                payment_status="failed",
            ),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_accepts_reference_faild_spelling_defensively(self):
        result = verify_moyasar_webhook(
            payload=self.payload(
                event_type="payment_faild",
                payment_status="failed",
            ),
            shared_secret=self.SECRET,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )