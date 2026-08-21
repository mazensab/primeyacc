from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from unittest.mock import MagicMock

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayResponseError,
    PaymentGatewayVerificationError,
)
from integrations.payments.tamara.adapter import (
    TamaraAdapter,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentStatus,
    RefundRequest,
)


class TamaraAdapterTests(SimpleTestCase):
    NOTIFICATION_TOKEN = "tamara-notification-secret"

    def setUp(self):
        self.client = MagicMock()
        self.adapter = TamaraAdapter(
            client=self.client,
            notification_token=self.NOTIFICATION_TOKEN,
        )

    def request(self):
        return PaymentRequest(
            amount=12500,
            currency="SAR",
            description="Platform subscription",
            reference="subscription_123",
            metadata={
                "consumer": {
                    "first_name": "Test",
                    "last_name": "Customer",
                    "phone_number": "966500000000",
                    "email": "billing@example.com",
                },
                "shipping_address": {
                    "first_name": "Test",
                    "last_name": "Customer",
                    "line1": "Business",
                    "city": "Jeddah",
                    "country_code": "SA",
                },
                "merchant_url": {
                    "success": "https://example.com/success",
                    "failure": "https://example.com/failure",
                    "cancel": "https://example.com/cancel",
                    "notification": "https://example.com/webhook",
                },
                "items": [
                    {
                        "reference_id": "plan_1",
                        "type": "service",
                        "name": "Platform subscription",
                        "sku": "plan_1",
                        "quantity": 1,
                        "unit_price": {
                            "amount": 125.0,
                            "currency": "SAR",
                        },
                        "total_amount": {
                            "amount": 125.0,
                            "currency": "SAR",
                        },
                    }
                ],
            },
        )

    def order_payload(
        self,
        *,
        status="authorised",
        amount=125.0,
        currency="SAR",
        order_id="order_123",
        reference="subscription_123",
    ):
        return {
            "order_id": order_id,
            "status": status,
            "total_amount": {
                "amount": amount,
                "currency": currency,
            },
            "order_reference_id": reference,
        }

    def webhook_payload(
        self,
        *,
        event_type="order_authorised",
        order_id="order_123",
        reference="subscription_123",
    ):
        return {
            "order_id": order_id,
            "order_reference_id": reference,
            "order_number": reference,
            "event_type": event_type,
            "data": [],
        }

    def webhook_headers(
        self,
        *,
        secret=None,
    ):
        token = self._jwt(
            secret=(
                self.NOTIFICATION_TOKEN
                if secret is None
                else secret
            )
        )

        return {
            "Authorization": f"Bearer {token}",
        }

    @staticmethod
    def _base64url(value):
        return (
            base64.urlsafe_b64encode(value)
            .decode("ascii")
            .rstrip("=")
        )

    def _jwt(
        self,
        *,
        secret,
    ):
        now = int(time.time())

        header = {
            "typ": "JWT",
            "alg": "HS256",
        }

        claims = {
            "iss": "Tamara",
            "iat": now - 10,
            "exp": now + 900,
        }

        encoded_header = self._base64url(
            json.dumps(
                header,
                separators=(",", ":"),
            ).encode("utf-8")
        )

        encoded_claims = self._base64url(
            json.dumps(
                claims,
                separators=(",", ":"),
            ).encode("utf-8")
        )

        signing_input = (
            f"{encoded_header}.{encoded_claims}"
        ).encode("ascii")

        signature = hmac.new(
            secret.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()

        return (
            f"{encoded_header}."
            f"{encoded_claims}."
            f"{self._base64url(signature)}"
        )

    def test_gateway_name(self):
        self.assertEqual(
            self.adapter.gateway,
            PaymentGatewayName.TAMARA,
        )

    def test_create_checkout(self):
        self.client.create_checkout.return_value = {
            "order_id": "order_123",
            "checkout_id": "checkout_123",
            "status": "new",
            "checkout_url": "https://checkout.example",
        }

        result = self.adapter.create_payment(
            self.request()
        )

        payload = (
            self.client.create_checkout
            .call_args.args[0]
        )

        self.assertEqual(
            payload["total_amount"]["amount"],
            125.0,
        )
        self.assertEqual(
            payload["total_amount"]["currency"],
            "SAR",
        )
        self.assertEqual(
            payload["order_reference_id"],
            "subscription_123",
        )
        self.assertEqual(
            result.provider_payment_id,
            "order_123",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.INITIATED,
        )
        self.assertEqual(
            result.checkout_url,
            "https://checkout.example",
        )

    def test_retrieve_authorised(self):
        self.client.fetch_order.return_value = (
            self.order_payload()
        )

        result = self.adapter.retrieve_payment(
            "order_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )
        self.assertEqual(result.amount, 12500)
        self.assertEqual(result.currency, "SAR")

    def test_fully_captured_maps_paid(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="fully_captured"
            )
        )

        result = self.adapter.retrieve_payment(
            "order_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_approved_is_pending(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="approved"
            )
        )

        result = self.adapter.retrieve_payment(
            "order_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PENDING,
        )

    def test_declined_is_failed(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="declined"
            )
        )

        result = self.adapter.retrieve_payment(
            "order_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_unknown_status_is_safe(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="future_status"
            )
        )

        result = self.adapter.retrieve_payment(
            "order_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.UNKNOWN,
        )

    def test_verify_authorised(self):
        self.client.fetch_order.return_value = (
            self.order_payload()
        )

        result = self.adapter.verify_payment(
            "order_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_verify_rejects_approved(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="approved"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_payment(
                "order_123"
            )

    def test_authorise_uses_client_then_fetches(self):
        self.client.fetch_order.return_value = (
            self.order_payload()
        )

        result = self.adapter.authorise_payment(
            "order_123"
        )

        self.client.authorise_order.assert_called_once_with(
            "order_123"
        )
        self.client.fetch_order.assert_called_once_with(
            "order_123"
        )
        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_capture_uses_minor_units(self):
        self.client.fetch_order.side_effect = [
            self.order_payload(),
            self.order_payload(
                status="fully_captured"
            ),
        ]

        result = self.adapter.capture_payment(
            "order_123",
            amount=5000,
        )

        payload = (
            self.client.capture_order
            .call_args.args[0]
        )

        self.assertEqual(
            payload["order_id"],
            "order_123",
        )
        self.assertEqual(
            payload["total_amount"]["amount"],
            50.0,
        )
        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_cancel_uses_client_then_fetches(self):
        self.client.fetch_order.side_effect = [
            self.order_payload(),
            self.order_payload(
                status="canceled"
            ),
        ]

        result = self.adapter.cancel_payment(
            "order_123"
        )

        self.client.cancel_order.assert_called_once()
        self.assertEqual(
            result.status,
            PaymentStatus.CANCELLED,
        )

    def test_refund_uses_client_then_fetches(self):
        self.client.fetch_order.side_effect = [
            self.order_payload(
                status="fully_captured"
            ),
            self.order_payload(
                status="partially_refunded"
            ),
        ]

        result = self.adapter.refund_payment(
            RefundRequest(
                provider_payment_id="order_123",
                amount=5000,
                reason="Subscription cancellation",
            )
        )

        payload = (
            self.client.refund_order
            .call_args.kwargs["payload"]
        )

        self.assertEqual(
            payload["total_amount"]["amount"],
            50.0,
        )
        self.assertEqual(
            result.status,
            PaymentStatus.PARTIALLY_REFUNDED,
        )

    def test_missing_checkout_order_id_rejected(self):
        self.client.create_checkout.return_value = {
            "checkout_url": "https://checkout.example",
        }

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.create_payment(
                self.request()
            )

    def test_missing_checkout_url_rejected(self):
        self.client.create_checkout.return_value = {
            "order_id": "order_123",
        }

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.create_payment(
                self.request()
            )

    def test_invalid_order_amount_rejected(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                amount="invalid"
            )
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.retrieve_payment(
                "order_123"
            )

    def test_currency_normalized(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                currency="sar"
            )
        )

        result = self.adapter.retrieve_payment(
            "order_123"
        )

        self.assertEqual(
            result.currency,
            "SAR",
        )

    def test_checkout_requires_consumer(self):
        request = self.request()
        request.metadata.pop("consumer")

        with self.assertRaises(ValueError):
            self.adapter.create_payment(request)

    def test_verify_webhook_fetches_authoritative_order(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="authorised"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"ignored",
            payload=self.webhook_payload(),
        )

        self.client.fetch_order.assert_called_once_with(
            "order_123"
        )

        self.assertEqual(
            result.gateway,
            PaymentGatewayName.TAMARA,
        )
        self.assertEqual(
            result.provider_payment_id,
            "order_123",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )
        self.assertEqual(
            result.event_type,
            "order_authorised",
        )

    def test_verify_webhook_uses_api_status_for_capture(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="fully_captured"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=self.webhook_payload(
                event_type="order_captured"
            ),
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_verify_webhook_uses_api_status_for_partial_capture(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="partially_captured"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=self.webhook_payload(
                event_type="order_captured"
            ),
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_verify_webhook_uses_api_status_for_partial_refund(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="partially_refunded"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=self.webhook_payload(
                event_type="order_refunded"
            ),
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PARTIALLY_REFUNDED,
        )

    def test_verify_webhook_rejects_wrong_jwt_before_fetch(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(
                    secret="wrong-secret"
                ),
                body=b"",
                payload=self.webhook_payload(),
            )

        self.client.fetch_order.assert_not_called()

    def test_verify_webhook_rejects_order_id_mismatch(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                order_id="different_order"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(),
                body=b"",
                payload=self.webhook_payload(),
            )

    def test_verify_webhook_rejects_reference_mismatch(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                reference="different_subscription"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(),
                body=b"",
                payload=self.webhook_payload(),
            )

    def test_verify_webhook_rejects_missing_provider_reference(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                reference=""
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(),
                body=b"",
                payload=self.webhook_payload(),
            )

    def test_verify_webhook_rejects_unknown_provider_status(self):
        self.client.fetch_order.return_value = (
            self.order_payload(
                status="future_status"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(),
                body=b"",
                payload=self.webhook_payload(),
            )