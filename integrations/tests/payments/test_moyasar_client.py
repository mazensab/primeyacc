from __future__ import annotations

import base64
import json
import urllib.error
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayRequestError,
    PaymentGatewayResponseError,
)
from integrations.payments.moyasar.client import MoyasarClient


class MoyasarClientTests(SimpleTestCase):
    def setUp(self):
        self.client = MoyasarClient(
            secret_key="sk_test_example",
            timeout=5,
        )

    def test_requires_secret_key(self):
        with self.assertRaises(PaymentGatewayConfigurationError):
            MoyasarClient(secret_key="")

    def test_rejects_invalid_secret_key_prefix(self):
        with self.assertRaises(PaymentGatewayConfigurationError):
            MoyasarClient(secret_key="invalid-key")

    def test_requires_https_base_url(self):
        with self.assertRaises(PaymentGatewayConfigurationError):
            MoyasarClient(
                secret_key="sk_test_example",
                base_url="http://api.example.com/v1",
            )

    def test_rejects_non_positive_timeout(self):
        with self.assertRaises(PaymentGatewayConfigurationError):
            MoyasarClient(
                secret_key="sk_test_example",
                timeout=0,
            )

    def test_authorization_header_uses_basic_auth(self):
        expected = base64.b64encode(
            b"sk_test_example:"
        ).decode("ascii")

        self.assertEqual(
            self.client._authorization_header(),
            f"Basic {expected}",
        )

    @patch("integrations.payments.moyasar.client.urllib.request.urlopen")
    def test_fetch_payment(self, urlopen):
        response = MagicMock()
        response.read.return_value = json.dumps(
            {
                "id": "pay_123",
                "status": "paid",
                "amount": 12500,
                "currency": "SAR",
            }
        ).encode("utf-8")

        urlopen.return_value.__enter__.return_value = response

        result = self.client.fetch_payment("pay_123")

        self.assertEqual(result["id"], "pay_123")
        self.assertEqual(result["status"], "paid")

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            "https://api.moyasar.com/v1/payments/pay_123",
        )
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(
            request.get_header("Authorization"),
            self.client._authorization_header(),
        )

    @patch("integrations.payments.moyasar.client.urllib.request.urlopen")
    def test_partial_refund_sends_amount(self, urlopen):
        response = MagicMock()
        response.read.return_value = b'{"id":"pay_123","status":"refunded"}'
        urlopen.return_value.__enter__.return_value = response

        self.client.refund_payment(
            "pay_123",
            amount=5000,
        )

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            "https://api.moyasar.com/v1/payments/pay_123/refund",
        )
        self.assertEqual(request.get_method(), "POST")
        self.assertEqual(
            json.loads(request.data.decode("utf-8")),
            {"amount": 5000},
        )

    @patch("integrations.payments.moyasar.client.urllib.request.urlopen")
    def test_capture_payment(self, urlopen):
        response = MagicMock()
        response.read.return_value = b'{"id":"pay_123","status":"captured"}'
        urlopen.return_value.__enter__.return_value = response

        result = self.client.capture_payment("pay_123")

        self.assertEqual(result["status"], "captured")

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            "https://api.moyasar.com/v1/payments/pay_123/capture",
        )
        self.assertEqual(request.get_method(), "POST")

    @patch("integrations.payments.moyasar.client.urllib.request.urlopen")
    def test_void_payment(self, urlopen):
        response = MagicMock()
        response.read.return_value = b'{"id":"pay_123","status":"voided"}'
        urlopen.return_value.__enter__.return_value = response

        result = self.client.void_payment("pay_123")

        self.assertEqual(result["status"], "voided")

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.full_url,
            "https://api.moyasar.com/v1/payments/pay_123/void",
        )

    @patch("integrations.payments.moyasar.client.urllib.request.urlopen")
    def test_http_error_is_sanitized(self, urlopen):
        urlopen.side_effect = urllib.error.HTTPError(
            url="https://api.moyasar.com/v1/payments/pay_123",
            code=401,
            msg="Unauthorized",
            hdrs=None,
            fp=None,
        )

        with self.assertRaisesRegex(
            PaymentGatewayRequestError,
            "HTTP 401",
        ):
            self.client.fetch_payment("pay_123")

    @patch("integrations.payments.moyasar.client.urllib.request.urlopen")
    def test_invalid_json_is_rejected(self, urlopen):
        response = MagicMock()
        response.read.return_value = b"not-json"
        urlopen.return_value.__enter__.return_value = response

        with self.assertRaises(PaymentGatewayResponseError):
            self.client.fetch_payment("pay_123")

    def test_rejects_empty_payment_id(self):
        with self.assertRaises(ValueError):
            self.client.fetch_payment("")

    def test_rejects_invalid_refund_amount(self):
        with self.assertRaises(ValueError):
            self.client.refund_payment(
                "pay_123",
                amount=0,
            )