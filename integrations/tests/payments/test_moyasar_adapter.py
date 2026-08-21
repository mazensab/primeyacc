from __future__ import annotations

from unittest.mock import MagicMock

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayResponseError,
    PaymentGatewayVerificationError,
)
from integrations.payments.moyasar.adapter import MoyasarAdapter
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentStatus,
    RefundRequest,
)


class MoyasarAdapterTests(SimpleTestCase):
    def setUp(self):
        self.client = MagicMock()
        self.adapter = MoyasarAdapter(client=self.client)

    def payment_payload(
        self,
        *,
        status="paid",
        amount=12500,
        currency="SAR",
    ):
        return {
            "id": "pay_123",
            "status": status,
            "amount": amount,
            "currency": currency,
            "given_id": "subscription_123",
        }

    def test_gateway_name(self):
        self.assertEqual(
            self.adapter.gateway,
            PaymentGatewayName.MOYASAR,
        )

    def test_create_payment_is_not_server_side(self):
        request = PaymentRequest(
            amount=12500,
            currency="SAR",
            description="Platform subscription",
        )

        with self.assertRaises(NotImplementedError):
            self.adapter.create_payment(request)

    def test_retrieve_normalizes_paid_payment(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        result = self.adapter.retrieve_payment("pay_123")

        self.assertEqual(result.status, PaymentStatus.PAID)
        self.assertEqual(result.amount, 12500)
        self.assertEqual(result.currency, "SAR")
        self.assertEqual(result.reference, "subscription_123")

    def test_captured_maps_to_paid(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(status="captured")
        )

        result = self.adapter.retrieve_payment("pay_123")

        self.assertEqual(result.status, PaymentStatus.PAID)

    def test_authorized_is_preserved(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(status="authorized")
        )

        result = self.adapter.retrieve_payment("pay_123")

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_unknown_status_is_safe(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(status="future_status")
        )

        result = self.adapter.retrieve_payment("pay_123")

        self.assertEqual(
            result.status,
            PaymentStatus.UNKNOWN,
        )

    def test_verify_paid_payment(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(status="paid")
        )

        result = self.adapter.verify_payment("pay_123")

        self.assertEqual(result.status, PaymentStatus.PAID)

    def test_verify_rejects_failed_payment(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(status="failed")
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_payment("pay_123")

    def test_refund_uses_client(self):
        self.client.refund_payment.return_value = (
            self.payment_payload(status="refunded")
        )

        result = self.adapter.refund_payment(
            RefundRequest(
                provider_payment_id="pay_123",
                amount=5000,
            )
        )

        self.client.refund_payment.assert_called_once_with(
            "pay_123",
            amount=5000,
        )
        self.assertEqual(
            result.status,
            PaymentStatus.REFUNDED,
        )

    def test_cancel_uses_void(self):
        self.client.void_payment.return_value = (
            self.payment_payload(status="voided")
        )

        result = self.adapter.cancel_payment("pay_123")

        self.client.void_payment.assert_called_once_with(
            "pay_123"
        )
        self.assertEqual(result.status, PaymentStatus.VOIDED)

    def test_capture_maps_to_paid(self):
        self.client.capture_payment.return_value = (
            self.payment_payload(status="captured")
        )

        result = self.adapter.capture_payment(
            "pay_123",
            amount=12500,
        )

        self.client.capture_payment.assert_called_once_with(
            "pay_123",
            amount=12500,
        )
        self.assertEqual(result.status, PaymentStatus.PAID)

    def test_missing_id_is_rejected(self):
        payload = self.payment_payload()
        payload.pop("id")

        self.client.fetch_payment.return_value = payload

        with self.assertRaises(PaymentGatewayResponseError):
            self.adapter.retrieve_payment("pay_123")

    def test_invalid_amount_is_rejected(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(amount="invalid")
        )

        with self.assertRaises(PaymentGatewayResponseError):
            self.adapter.retrieve_payment("pay_123")

    def test_currency_is_normalized(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(currency="sar")
        )

        result = self.adapter.retrieve_payment("pay_123")

        self.assertEqual(result.currency, "SAR")
    def webhook_payload(
        self,
        *,
        event_type="payment_paid",
        status="paid",
        amount=12500,
        currency="SAR",
        payment_id="pay_123",
        secret="webhook-secret-123",
    ):
        return {
            "id": "event_123",
            "type": event_type,
            "secret_token": secret,
            "live": False,
            "data": {
                "id": payment_id,
                "status": status,
                "amount": amount,
                "currency": currency,
            },
        }

    def test_verify_webhook_fetches_provider_payment(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )
        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        result = adapter.verify_webhook(
            headers={},
            body=b"",
            payload=self.webhook_payload(),
        )

        self.client.fetch_payment.assert_called_once_with(
            "pay_123"
        )
        self.assertEqual(
            result.gateway,
            PaymentGatewayName.MOYASAR,
        )
        self.assertEqual(
            result.provider_payment_id,
            "pay_123",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_verify_webhook_rejects_invalid_secret_before_fetch(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            adapter.verify_webhook(
                headers={},
                body=b"",
                payload=self.webhook_payload(
                    secret="wrong-secret"
                ),
            )

        self.client.fetch_payment.assert_not_called()

    def test_verify_webhook_rejects_provider_id_mismatch(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )
        provider_payload = self.payment_payload()
        provider_payload["id"] = "pay_different"
        self.client.fetch_payment.return_value = provider_payload

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            adapter.verify_webhook(
                headers={},
                body=b"",
                payload=self.webhook_payload(),
            )

    def test_verify_webhook_rejects_provider_status_mismatch(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )
        self.client.fetch_payment.return_value = (
            self.payment_payload(status="failed")
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            adapter.verify_webhook(
                headers={},
                body=b"",
                payload=self.webhook_payload(),
            )

    def test_verify_webhook_rejects_amount_mismatch(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )
        self.client.fetch_payment.return_value = (
            self.payment_payload(amount=12500)
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            adapter.verify_webhook(
                headers={},
                body=b"",
                payload=self.webhook_payload(
                    amount=9999
                ),
            )

    def test_verify_webhook_rejects_currency_mismatch(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )
        self.client.fetch_payment.return_value = (
            self.payment_payload(currency="SAR")
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            adapter.verify_webhook(
                headers={},
                body=b"",
                payload=self.webhook_payload(
                    currency="USD"
                ),
            )

    def test_verify_webhook_normalizes_currency_before_compare(self):
        adapter = MoyasarAdapter(
            client=self.client,
            webhook_secret="webhook-secret-123",
        )
        self.client.fetch_payment.return_value = (
            self.payment_payload(currency="SAR")
        )

        result = adapter.verify_webhook(
            headers={},
            body=b"",
            payload=self.webhook_payload(
                currency="sar"
            ),
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )
