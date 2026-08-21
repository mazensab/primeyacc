from __future__ import annotations

import io
import json
import urllib.error
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayRequestError,
    PaymentGatewayResponseError,
)
from integrations.payments.tabby.client import TabbyClient


class _FakeResponse:
    def __init__(
        self,
        payload,
    ):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(
        self,
        exc_type,
        exc_value,
        traceback,
    ):
        return False

    def read(self):
        if isinstance(self.payload, bytes):
            return self.payload

        return json.dumps(
            self.payload,
            separators=(",", ":"),
        ).encode("utf-8")


class TabbyClientTests(SimpleTestCase):
    def setUp(self):
        self.client = TabbyClient(
            secret_key="sk_test_tabby_secret",
            merchant_code="MHAMCLOUD",
        )

    def checkout_payload(self):
        return {
            "payment": {
                "amount": "125.00",
                "currency": "SAR",
                "description": "Platform subscription",
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
            },
            "lang": "en",
            "merchant_code": "MHAMCLOUD",
            "merchant_urls": {
                "success": "https://example.com/success",
                "cancel": "https://example.com/cancel",
                "failure": "https://example.com/failure",
            },
        }

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_create_checkout(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "checkout_123",
                "status": "created",
            }
        )

        result = self.client.create_checkout(
            self.checkout_payload()
        )

        self.assertEqual(
            result["id"],
            "checkout_123",
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            "https://api.tabby.sa/api/v2/checkout",
        )
        self.assertEqual(
            request.get_method(),
            "POST",
        )

        sent = json.loads(
            request.data.decode("utf-8")
        )

        self.assertEqual(
            sent["payment"]["amount"],
            "125.00",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_fetch_payment(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment_123",
                "status": "AUTHORIZED",
            }
        )

        result = self.client.fetch_payment(
            "payment_123"
        )

        self.assertEqual(
            result["id"],
            "payment_123",
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            (
                "https://api.tabby.sa/"
                "api/v2/payments/payment_123"
            ),
        )
        self.assertEqual(
            request.get_method(),
            "GET",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_capture_payment(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment_123",
                "status": "CLOSED",
            }
        )

        result = self.client.capture_payment(
            "payment_123",
            payload={
                "amount": "125.00",
            },
        )

        self.assertEqual(
            result["status"],
            "CLOSED",
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            (
                "https://api.tabby.sa/"
                "api/v2/payments/payment_123/captures"
            ),
        )
        self.assertEqual(
            request.get_method(),
            "POST",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_refund_payment(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "refund_123",
                "amount": "50.00",
            }
        )

        result = self.client.refund_payment(
            "payment_123",
            payload={
                "amount": "50.00",
            },
        )

        self.assertEqual(
            result["id"],
            "refund_123",
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            (
                "https://api.tabby.sa/"
                "api/v2/payments/payment_123/refunds"
            ),
        )
        self.assertEqual(
            request.get_method(),
            "POST",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_close_payment(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment_123",
                "status": "CLOSED",
            }
        )

        result = self.client.close_payment(
            "payment_123"
        )

        self.assertEqual(
            result["status"],
            "CLOSED",
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            (
                "https://api.tabby.sa/"
                "api/v2/payments/payment_123/close"
            ),
        )
        self.assertEqual(
            request.get_method(),
            "POST",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_authorization_header_uses_bearer(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment_123",
                "status": "AUTHORIZED",
            }
        )

        self.client.fetch_payment(
            "payment_123"
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_header("Authorization"),
            "Bearer sk_test_tabby_secret",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_merchant_code_header(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment_123",
            }
        )

        self.client.fetch_payment(
            "payment_123"
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_header("X-merchant-code"),
            "MHAMCLOUD",
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_identifier_is_url_encoded(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment/123",
            }
        )

        self.client.fetch_payment(
            "payment/123"
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            (
                "https://api.tabby.sa/"
                "api/v2/payments/payment%2F123"
            ),
        )

    def test_requires_secret_key(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TabbyClient(
                secret_key="",
                merchant_code="MHAMCLOUD",
            )

    def test_requires_merchant_code(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TabbyClient(
                secret_key="sk_test_secret",
                merchant_code="",
            )

    def test_requires_https_base_url(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TabbyClient(
                secret_key="sk_test_secret",
                merchant_code="MHAMCLOUD",
                base_url="http://api.tabby.sa",
            )

    def test_rejects_non_positive_timeout(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TabbyClient(
                secret_key="sk_test_secret",
                merchant_code="MHAMCLOUD",
                timeout=0,
            )

    def test_rejects_empty_payment_id(self):
        with self.assertRaises(ValueError):
            self.client.fetch_payment("")

    def test_rejects_long_payment_id(self):
        with self.assertRaises(ValueError):
            self.client.fetch_payment(
                "x" * 201
            )

    def test_rejects_empty_checkout_payload(self):
        with self.assertRaises(ValueError):
            self.client.create_checkout({})

    def test_rejects_empty_capture_payload(self):
        with self.assertRaises(ValueError):
            self.client.capture_payment(
                "payment_123",
                payload={},
            )

    def test_rejects_empty_refund_payload(self):
        with self.assertRaises(ValueError):
            self.client.refund_payment(
                "payment_123",
                payload={},
            )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_invalid_json_is_rejected(self, urlopen):
        urlopen.return_value = _FakeResponse(
            b"not-json"
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.client.fetch_payment(
                "payment_123"
            )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_non_object_json_is_rejected(self, urlopen):
        urlopen.return_value = _FakeResponse(
            b'["unexpected"]'
        )

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.client.fetch_payment(
                "payment_123"
            )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_http_error_is_sanitized(self, urlopen):
        urlopen.side_effect = urllib.error.HTTPError(
            url=(
                "https://api.tabby.sa/"
                "api/v2/payments/payment_123"
            ),
            code=401,
            msg="Unauthorized",
            hdrs=None,
            fp=io.BytesIO(
                b'{"error":"sensitive provider body"}'
            ),
        )

        with self.assertRaisesRegex(
            PaymentGatewayRequestError,
            r"HTTP 401",
        ) as context:
            self.client.fetch_payment(
                "payment_123"
            )

        self.assertNotIn(
            "sensitive provider body",
            str(context.exception),
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_network_error_is_sanitized(self, urlopen):
        urlopen.side_effect = urllib.error.URLError(
            "sensitive-network-details"
        )

        with self.assertRaisesRegex(
            PaymentGatewayRequestError,
            "Unable to reach Tabby",
        ) as context:
            self.client.fetch_payment(
                "payment_123"
            )

        self.assertNotIn(
            "sensitive-network-details",
            str(context.exception),
        )

    @patch(
        "integrations.payments.tabby.client."
        "urllib.request.urlopen"
    )
    def test_default_timeout_is_used(self, urlopen):
        urlopen.return_value = _FakeResponse(
            {
                "id": "payment_123",
            }
        )

        self.client.fetch_payment(
            "payment_123"
        )

        self.assertEqual(
            urlopen.call_args.kwargs["timeout"],
            15.0,
        )