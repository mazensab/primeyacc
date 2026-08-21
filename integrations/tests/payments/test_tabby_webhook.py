from __future__ import annotations

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayVerificationError,
)
from integrations.payments.tabby.webhook import (
    verify_tabby_webhook,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentStatus,
)


class TabbyWebhookTests(SimpleTestCase):
    HEADER_NAME = "X-Mhamcloud-Tabby-Webhook"
    HEADER_VALUE = "tabby-webhook-secret-123"

    def headers(
        self,
        *,
        value: str | None = None,
        name: str | None = None,
    ):
        return {
            name or self.HEADER_NAME: (
                self.HEADER_VALUE
                if value is None
                else value
            )
        }

    def payload(
        self,
        *,
        payment_id="payment_123",
        status="AUTHORIZED",
    ):
        return {
            "payment_id": payment_id,
            "status": status,
            "amount": "125.00",
            "currency": "SAR",
            "order": {
                "reference_id": "subscription_123",
            },
        }

    def verify(
        self,
        *,
        headers=None,
        payload=None,
        header_name=None,
        header_value=None,
    ):
        return verify_tabby_webhook(
            headers=(
                self.headers()
                if headers is None
                else headers
            ),
            payload=(
                self.payload()
                if payload is None
                else payload
            ),
            header_name=(
                self.HEADER_NAME
                if header_name is None
                else header_name
            ),
            header_value=(
                self.HEADER_VALUE
                if header_value is None
                else header_value
            ),
        )

    def test_accepts_valid_webhook(self):
        result = self.verify()

        self.assertEqual(
            result.gateway,
            PaymentGatewayName.TABBY,
        )
        self.assertEqual(
            result.provider_payment_id,
            "payment_123",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )
        self.assertEqual(
            result.event_type,
            "authorized",
        )

    def test_created_maps_initiated(self):
        result = self.verify(
            payload=self.payload(
                status="CREATED"
            )
        )

        self.assertEqual(
            result.status,
            PaymentStatus.INITIATED,
        )

    def test_closed_maps_paid(self):
        result = self.verify(
            payload=self.payload(
                status="CLOSED"
            )
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_rejected_maps_failed(self):
        result = self.verify(
            payload=self.payload(
                status="REJECTED"
            )
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_expired_maps_failed(self):
        result = self.verify(
            payload=self.payload(
                status="EXPIRED"
            )
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_unknown_status_is_not_trusted(self):
        result = self.verify(
            payload=self.payload(
                status="FUTURE_STATUS"
            )
        )

        self.assertEqual(
            result.status,
            PaymentStatus.UNKNOWN,
        )

    def test_accepts_id_as_payment_id_fallback(self):
        payload = self.payload()
        payment_id = payload.pop(
            "payment_id"
        )
        payload["id"] = payment_id

        result = self.verify(
            payload=payload
        )

        self.assertEqual(
            result.provider_payment_id,
            "payment_123",
        )

    def test_header_name_is_case_insensitive(self):
        result = self.verify(
            headers={
                self.HEADER_NAME.lower():
                    self.HEADER_VALUE
            }
        )

        self.assertEqual(
            result.provider_payment_id,
            "payment_123",
        )

    def test_rejects_missing_header_configuration(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            self.verify(
                header_name="",
            )

    def test_rejects_missing_header_value_configuration(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            self.verify(
                header_value="",
            )

    def test_rejects_missing_authentication_header(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.verify(
                headers={},
            )

    def test_rejects_wrong_authentication_header(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.verify(
                headers=self.headers(
                    value="wrong-secret"
                ),
            )

    def test_rejects_missing_payment_id(self):
        payload = self.payload()
        payload.pop(
            "payment_id"
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.verify(
                payload=payload
            )

    def test_rejects_missing_status(self):
        payload = self.payload()
        payload.pop("status")

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.verify(
                payload=payload
            )

    def test_rejects_invalid_headers_type(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tabby_webhook(
                headers=None,  # type: ignore[arg-type]
                payload=self.payload(),
                header_name=self.HEADER_NAME,
                header_value=self.HEADER_VALUE,
            )

    def test_rejects_invalid_payload_type(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tabby_webhook(
                headers=self.headers(),
                payload=None,  # type: ignore[arg-type]
                header_name=self.HEADER_NAME,
                header_value=self.HEADER_VALUE,
            )