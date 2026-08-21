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
from integrations.payments.tamara.client import TamaraClient


class TamaraClientTests(SimpleTestCase):
    def setUp(self):
        self.client = TamaraClient(
            api_token="tamara-test-token",
        )

    @staticmethod
    def response(payload):
        response = MagicMock()
        response.read.return_value = json.dumps(
            payload
        ).encode("utf-8")
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        return response

    def test_requires_api_token(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TamaraClient(api_token="")

    def test_requires_https_base_url(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TamaraClient(
                api_token="token",
                base_url="http://api.example.com",
            )

    def test_rejects_non_positive_timeout(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            TamaraClient(
                api_token="token",
                timeout=0,
            )

    @patch("urllib.request.urlopen")
    def test_authorization_header_uses_bearer_token(
        self,
        urlopen,
    ):
        urlopen.return_value = self.response(
            {"order_id": "order_123"}
        )

        self.client.fetch_order("order_123")

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_header("Authorization"),
            "Bearer tamara-test-token",
        )

    @patch("urllib.request.urlopen")
    def test_check_eligibility(self, urlopen):
        payload = {
            "order_value": {
                "amount": 125.0,
                "currency": "SAR",
            },
            "phone_number": "966500000000",
        }

        urlopen.return_value = self.response(
            {
                "eligible": True,
            }
        )

        result = self.client.check_eligibility(payload)

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_method(),
            "POST",
        )
        self.assertTrue(
            request.full_url.endswith(
                "/pre-checkout/v1/eligibility"
            )
        )
        self.assertEqual(
            json.loads(request.data.decode("utf-8")),
            payload,
        )
        self.assertTrue(result["eligible"])

    @patch("urllib.request.urlopen")
    def test_eligibility_uses_dedicated_timeout(
        self,
        urlopen,
    ):
        urlopen.return_value = self.response(
            {"eligible": True}
        )

        self.client.check_eligibility(
            {
                "order_value": {
                    "amount": 125.0,
                    "currency": "SAR",
                },
            }
        )

        self.assertEqual(
            urlopen.call_args.kwargs["timeout"],
            0.2,
        )

    @patch("urllib.request.urlopen")
    def test_normal_requests_keep_default_timeout(
        self,
        urlopen,
    ):
        urlopen.return_value = self.response(
            {"order_id": "order_123"}
        )

        self.client.fetch_order("order_123")

        self.assertEqual(
            urlopen.call_args.kwargs["timeout"],
            15.0,
        )

    def test_eligibility_rejects_empty_payload(self):
        with self.assertRaises(ValueError):
            self.client.check_eligibility({})

    @patch("urllib.request.urlopen")
    def test_create_checkout(self, urlopen):
        payload = {
            "order_reference_id": "subscription_123",
            "total_amount": {
                "amount": 125.0,
                "currency": "SAR",
            },
        }

        urlopen.return_value = self.response(
            {
                "order_id": "order_123",
                "checkout_id": "checkout_123",
                "checkout_url": "https://checkout.example",
            }
        )

        result = self.client.create_checkout(payload)

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_method(),
            "POST",
        )
        self.assertTrue(
            request.full_url.endswith("/checkout")
        )
        self.assertEqual(
            json.loads(request.data.decode("utf-8")),
            payload,
        )
        self.assertEqual(
            result["order_id"],
            "order_123",
        )

    @patch("urllib.request.urlopen")
    def test_fetch_order(self, urlopen):
        urlopen.return_value = self.response(
            {
                "order_id": "order_123",
                "status": "authorised",
            }
        )

        result = self.client.fetch_order("order_123")

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_method(),
            "GET",
        )
        self.assertTrue(
            request.full_url.endswith(
                "/orders/order_123"
            )
        )
        self.assertEqual(
            result["status"],
            "authorised",
        )

    @patch("urllib.request.urlopen")
    def test_authorise_order(self, urlopen):
        urlopen.return_value = self.response(
            {
                "order_id": "order_123",
                "status": "authorised",
            }
        )

        self.client.authorise_order("order_123")

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_method(),
            "POST",
        )
        self.assertTrue(
            request.full_url.endswith(
                "/orders/order_123/authorise"
            )
        )

    @patch("urllib.request.urlopen")
    def test_capture_order(self, urlopen):
        payload = {
            "order_id": "order_123",
            "total_amount": {
                "amount": 125.0,
                "currency": "SAR",
            },
        }

        urlopen.return_value = self.response(
            {"capture_id": "capture_123"}
        )

        self.client.capture_order(payload)

        request = urlopen.call_args.args[0]

        self.assertEqual(
            request.get_method(),
            "POST",
        )
        self.assertTrue(
            request.full_url.endswith(
                "/payments/capture"
            )
        )
        self.assertEqual(
            json.loads(request.data.decode("utf-8")),
            payload,
        )

    @patch("urllib.request.urlopen")
    def test_cancel_order(self, urlopen):
        payload = {
            "total_amount": {
                "amount": 125.0,
                "currency": "SAR",
            },
        }

        urlopen.return_value = self.response(
            {
                "order_id": "order_123",
                "status": "canceled",
            }
        )

        self.client.cancel_order(
            "order_123",
            payload=payload,
        )

        request = urlopen.call_args.args[0]

        self.assertTrue(
            request.full_url.endswith(
                "/orders/order_123/cancel"
            )
        )

    @patch("urllib.request.urlopen")
    def test_refund_order(self, urlopen):
        payload = {
            "total_amount": {
                "amount": 25.0,
                "currency": "SAR",
            },
        }

        urlopen.return_value = self.response(
            {"refund_id": "refund_123"}
        )

        self.client.refund_order(
            "order_123",
            payload=payload,
        )

        request = urlopen.call_args.args[0]

        self.assertTrue(
            request.full_url.endswith(
                "/payments/simplified-refund/order_123"
            )
        )

    def test_rejects_empty_order_id(self):
        with self.assertRaises(ValueError):
            self.client.fetch_order("")

    def test_rejects_empty_payload(self):
        with self.assertRaises(ValueError):
            self.client.create_checkout({})

    @patch("urllib.request.urlopen")
    def test_http_error_is_sanitized(
        self,
        urlopen,
    ):
        urlopen.side_effect = urllib.error.HTTPError(
            url="https://api-sandbox.tamara.co/checkout",
            code=401,
            msg="Unauthorized",
            hdrs=None,
            fp=io.BytesIO(
                b'{"secret":"do-not-expose"}'
            ),
        )

        with self.assertRaises(
            PaymentGatewayRequestError
        ) as context:
            self.client.create_checkout(
                {
                    "order_reference_id":
                        "subscription_123",
                }
            )

        self.assertEqual(
            str(context.exception),
            "Tamara request failed with HTTP 401.",
        )
        self.assertNotIn(
            "do-not-expose",
            str(context.exception),
        )

    @patch("urllib.request.urlopen")
    def test_invalid_json_is_rejected(
        self,
        urlopen,
    ):
        response = MagicMock()
        response.read.return_value = b"not-json"
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        urlopen.return_value = response

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.client.fetch_order(
                "order_123"
            )

    @patch("urllib.request.urlopen")
    def test_non_object_json_is_rejected(
        self,
        urlopen,
    ):
        response = MagicMock()
        response.read.return_value = b"[]"
        response.__enter__.return_value = response
        response.__exit__.return_value = False
        urlopen.return_value = response

        with self.assertRaises(
            PaymentGatewayResponseError
        ):
            self.client.fetch_order(
                "order_123"
            )

    def test_identifier_is_url_encoded(self):
        with patch(
            "urllib.request.urlopen"
        ) as urlopen:
            urlopen.return_value = self.response(
                {"order_id": "order/test"}
            )

            self.client.fetch_order(
                "order/test"
            )

            request = urlopen.call_args.args[0]

            self.assertTrue(
                request.full_url.endswith(
                    "/orders/order%2Ftest"
                )
            )