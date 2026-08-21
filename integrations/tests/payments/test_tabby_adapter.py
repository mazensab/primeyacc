from __future__ import annotations

from unittest.mock import MagicMock

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayResponseError,
    PaymentGatewayVerificationError,
)
from integrations.payments.tabby.adapter import TabbyAdapter
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentStatus,
    RefundRequest,
)


class TabbyAdapterTests(SimpleTestCase):
    def setUp(self):
        self.client = MagicMock()
        self.client.merchant_code = "MHAMCLOUD"

        self.webhook_header_name = (
            "X-Mhamcloud-Tabby-Webhook"
        )
        self.webhook_header_value = (
            "tabby-webhook-secret-123"
        )

        self.adapter = TabbyAdapter(
            client=self.client,
            webhook_header_name=(
                self.webhook_header_name
            ),
            webhook_header_value=(
                self.webhook_header_value
            ),
        )

    def request(self):
        return PaymentRequest(
            amount=12500,
            currency="SAR",
            description="Platform subscription",
            reference="subscription_123",
            metadata={
                "buyer": {
                    "phone": "966500000000",
                    "email": "billing@example.com",
                    "name": "Test Customer",
                },
                "order": {
                    "reference_id": "subscription_123",
                    "items": [
                        {
                            "title": "Platform subscription",
                            "quantity": 1,
                            "unit_price": "125.00",
                            "category": "Subscription plan",
                        }
                    ],
                },
                "merchant_urls": {
                    "success": "https://example.com/success",
                    "cancel": "https://example.com/cancel",
                    "failure": "https://example.com/failure",
                },
                "lang": "en",
            },
        )

    def payment_payload(
        self,
        *,
        status="AUTHORIZED",
        amount="125.00",
        currency="SAR",
        payment_id="payment_123",
        reference="subscription_123",
    ):
        return {
            "id": payment_id,
            "status": status,
            "amount": amount,
            "currency": currency,
            "order": {
                "reference_id": reference,
            },
        }

    def webhook_headers(
        self,
        *,
        value=None,
    ):
        return {
            self.webhook_header_name: (
                self.webhook_header_value
                if value is None
                else value
            )
        }

    def webhook_payload(
        self,
        *,
        payment_id="payment_123",
        status="AUTHORIZED",
        amount="125.00",
        currency="SAR",
        reference="subscription_123",
    ):
        return {
            "payment_id": payment_id,
            "status": status,
            "amount": amount,
            "currency": currency,
            "order": {
                "reference_id": reference,
            },
        }

    def checkout_payload(
        self,
        *,
        status="CREATED",
        payment_id="payment_123",
        web_url="https://checkout.tabby.example/payment_123",
    ):
        return {
            "id": "checkout_123",
            "status": "created",
            "payment": {
                "id": payment_id,
                "status": status,
                "amount": "125.00",
                "currency": "SAR",
                "order": {
                    "reference_id": "subscription_123",
                },
            },
            "configuration": {
                "available_products": {
                    "installments": [
                        {
                            "web_url": web_url,
                        }
                    ],
                },
            },
        }

    def test_gateway_name(self):
        self.assertEqual(
            self.adapter.gateway,
            PaymentGatewayName.TABBY,
        )

    def test_create_checkout(self):
        self.client.create_checkout.return_value = (
            self.checkout_payload()
        )

        result = self.adapter.create_payment(
            self.request()
        )

        payload = (
            self.client.create_checkout
            .call_args.args[0]
        )

        self.assertEqual(
            payload["payment"]["amount"],
            "125.00",
        )
        self.assertEqual(
            payload["payment"]["currency"],
            "SAR",
        )
        self.assertEqual(
            payload["payment"]["order"]["reference_id"],
            "subscription_123",
        )
        self.assertEqual(
            payload["merchant_code"],
            "MHAMCLOUD",
        )

        self.assertEqual(
            result.provider_payment_id,
            "payment_123",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.INITIATED,
        )
        self.assertEqual(
            result.amount,
            12500,
        )
        self.assertEqual(
            result.currency,
            "SAR",
        )
        self.assertEqual(
            result.reference,
            "subscription_123",
        )
        self.assertEqual(
            result.checkout_url,
            "https://checkout.tabby.example/payment_123",
        )

    def test_retrieve_authorized(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )
        self.assertEqual(
            result.amount,
            12500,
        )
        self.assertEqual(
            result.currency,
            "SAR",
        )
        self.assertEqual(
            result.reference,
            "subscription_123",
        )

    def test_created_maps_initiated(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CREATED"
            )
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.INITIATED,
        )

    def test_closed_maps_paid(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CLOSED"
            )
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_rejected_maps_failed(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="REJECTED"
            )
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_expired_maps_failed(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="EXPIRED"
            )
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_unknown_status_is_safe(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="FUTURE_STATUS"
            )
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.UNKNOWN,
        )

    def test_verify_authorized(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="AUTHORIZED"
            )
        )

        result = self.adapter.verify_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_verify_closed(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CLOSED"
            )
        )

        result = self.adapter.verify_payment(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_verify_rejects_created(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CREATED"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_payment(
                "payment_123"
            )

    def test_capture_full_amount(self):
        self.client.fetch_payment.side_effect = [
            self.payment_payload(
                status="AUTHORIZED"
            ),
            self.payment_payload(
                status="CLOSED"
            ),
        ]

        result = self.adapter.capture_payment(
            "payment_123"
        )

        self.client.capture_payment.assert_called_once_with(
            "payment_123",
            payload={
                "amount": "125.00",
            },
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_capture_partial_amount(self):
        self.client.fetch_payment.side_effect = [
            self.payment_payload(
                status="AUTHORIZED"
            ),
            self.payment_payload(
                status="AUTHORIZED"
            ),
        ]

        result = self.adapter.capture_payment(
            "payment_123",
            amount=5000,
        )

        self.client.capture_payment.assert_called_once_with(
            "payment_123",
            payload={
                "amount": "50.00",
            },
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_refund_full_amount(self):
        self.client.fetch_payment.side_effect = [
            self.payment_payload(
                status="CLOSED"
            ),
            self.payment_payload(
                status="CLOSED"
            ),
        ]

        result = self.adapter.refund_payment(
            RefundRequest(
                provider_payment_id="payment_123",
            )
        )

        self.client.refund_payment.assert_called_once_with(
            "payment_123",
            payload={
                "amount": "125.00",
            },
        )

        self.assertEqual(
            result.provider_payment_id,
            "payment_123",
        )

    def test_refund_partial_amount_with_reason(self):
        self.client.fetch_payment.side_effect = [
            self.payment_payload(
                status="CLOSED"
            ),
            self.payment_payload(
                status="CLOSED"
            ),
        ]

        self.adapter.refund_payment(
            RefundRequest(
                provider_payment_id="payment_123",
                amount=5000,
                reason="Subscription cancellation",
            )
        )

        self.client.refund_payment.assert_called_once_with(
            "payment_123",
            payload={
                "amount": "50.00",
                "reason": "Subscription cancellation",
            },
        )

    def test_cancel_calls_close_then_fetches(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CLOSED"
            )
        )

        result = self.adapter.cancel_payment(
            "payment_123"
        )

        self.client.close_payment.assert_called_once_with(
            "payment_123"
        )

        self.client.fetch_payment.assert_called_once_with(
            "payment_123"
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_missing_buyer_rejected(self):
        request = self.request()
        request.metadata.pop("buyer")

        with self.assertRaises(ValueError):
            self.adapter.create_payment(
                request
            )

    def test_missing_order_rejected(self):
        request = self.request()
        request.metadata.pop("order")

        with self.assertRaises(ValueError):
            self.adapter.create_payment(
                request
            )

    def test_missing_merchant_urls_rejected(self):
        request = self.request()
        request.metadata.pop(
            "merchant_urls"
        )

        with self.assertRaises(ValueError):
            self.adapter.create_payment(
                request
            )

    def test_missing_reference_rejected(self):
        original = self.request()

        metadata = dict(
            original.metadata or {}
        )

        order = dict(
            metadata.get("order") or {}
        )

        order.pop(
            "reference_id",
            None,
        )

        metadata["order"] = order

        request = PaymentRequest(
            amount=original.amount,
            currency=original.currency,
            description=original.description,
            reference="",
            metadata=metadata,
        )

        with self.assertRaises(ValueError):
            self.adapter.create_payment(
                request
            )

    def test_missing_checkout_payment_rejected(self):
        self.client.create_checkout.return_value = {
            "id": "checkout_123",
            "status": "created",
        }

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.create_payment(
                self.request()
            )

    def test_missing_checkout_payment_id_rejected(self):
        payload = self.checkout_payload()
        payload["payment"].pop("id")

        self.client.create_checkout.return_value = (
            payload
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.create_payment(
                self.request()
            )

    def test_missing_checkout_url_rejected(self):
        payload = self.checkout_payload()
        payload["configuration"] = {}

        self.client.create_checkout.return_value = (
            payload
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.create_payment(
                self.request()
            )

    def test_invalid_payment_amount_rejected(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                amount="invalid"
            )
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.retrieve_payment(
                "payment_123"
            )

    def test_negative_payment_amount_rejected(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                amount="-1.00"
            )
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.retrieve_payment(
                "payment_123"
            )

    def test_currency_normalized(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                currency="sar"
            )
        )

        result = self.adapter.retrieve_payment(
            "payment_123"
        )

        self.assertEqual(
            result.currency,
            "SAR",
        )

    def test_invalid_currency_rejected(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                currency="INVALID"
            )
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.adapter.retrieve_payment(
                "payment_123"
            )

    def test_arabic_language_supported(self):
        request = self.request()
        request.metadata["lang"] = "ar"

        self.client.create_checkout.return_value = (
            self.checkout_payload()
        )

        self.adapter.create_payment(
            request
        )

        payload = (
            self.client.create_checkout
            .call_args.args[0]
        )

        self.assertEqual(
            payload["lang"],
            "ar",
        )

    def test_unknown_language_falls_back_to_english(self):
        request = self.request()
        request.metadata["lang"] = "fr"

        self.client.create_checkout.return_value = (
            self.checkout_payload()
        )

        self.adapter.create_payment(
            request
        )

        payload = (
            self.client.create_checkout
            .call_args.args[0]
        )

        self.assertEqual(
            payload["lang"],
            "en",
        )

    def test_zero_capture_rejected(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        with self.assertRaises(ValueError):
            self.adapter.capture_payment(
                "payment_123",
                amount=0,
            )

    def test_negative_refund_rejected(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CLOSED"
            )
        )

        with self.assertRaises(ValueError):
            self.adapter.refund_payment(
                RefundRequest(
                    provider_payment_id="payment_123",
                    amount=-1,
                )
            )

    def test_boolean_amount_rejected(self):
        with self.assertRaises(ValueError):
            self.adapter._minor_to_major_string(
                True
            )

    def test_verify_webhook_fetches_authoritative_payment(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="AUTHORIZED"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=self.webhook_payload(),
        )

        self.client.fetch_payment.assert_called_once_with(
            "payment_123"
        )

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

    def test_verify_webhook_uses_provider_status_not_webhook_status(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="CLOSED"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=self.webhook_payload(
                status="AUTHORIZED"
            ),
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PAID,
        )

    def test_verify_webhook_rejects_bad_header_before_fetch(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(
                    value="wrong-secret"
                ),
                body=b"",
                payload=self.webhook_payload(),
            )

        self.client.fetch_payment.assert_not_called()

    def test_verify_webhook_rejects_payment_id_mismatch(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                payment_id="different_payment"
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
        self.client.fetch_payment.return_value = (
            self.payment_payload(
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

    def test_verify_webhook_rejects_amount_mismatch(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                amount="125.00"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(),
                body=b"",
                payload=self.webhook_payload(
                    amount="99.00"
                ),
            )

    def test_verify_webhook_rejects_currency_mismatch(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                currency="SAR"
            )
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            self.adapter.verify_webhook(
                headers=self.webhook_headers(),
                body=b"",
                payload=self.webhook_payload(
                    currency="USD"
                ),
            )

    def test_verify_webhook_normalizes_currency(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                currency="SAR"
            )
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=self.webhook_payload(
                currency="sar"
            ),
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_verify_webhook_rejects_unknown_provider_status(self):
        self.client.fetch_payment.return_value = (
            self.payment_payload(
                status="FUTURE_STATUS"
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

    def test_verify_webhook_allows_missing_optional_amount(self):
        payload = self.webhook_payload()
        payload.pop("amount")

        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=payload,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_verify_webhook_allows_missing_optional_currency(self):
        payload = self.webhook_payload()
        payload.pop("currency")

        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=payload,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_verify_webhook_allows_missing_optional_reference(self):
        payload = self.webhook_payload()
        payload.pop("order")

        self.client.fetch_payment.return_value = (
            self.payment_payload()
        )

        result = self.adapter.verify_webhook(
            headers=self.webhook_headers(),
            body=b"",
            payload=payload,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )