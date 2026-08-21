from __future__ import annotations

import base64
import hashlib
import hmac
import json

from django.test import SimpleTestCase

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayVerificationError,
)
from integrations.payments.tamara.webhook import (
    extract_tamara_bearer_token,
    verify_tamara_webhook,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentStatus,
)


class TamaraWebhookTests(SimpleTestCase):
    SECRET = "tamara-notification-secret"
    NOW = 1_700_000_000

    @classmethod
    def token(
        cls,
        *,
        secret=None,
        algorithm="HS256",
        issuer="Tamara",
        exp=None,
        iat=None,
        extra_claims=None,
    ):
        if secret is None:
            secret = cls.SECRET

        if exp is None:
            exp = cls.NOW + 900

        if iat is None:
            iat = cls.NOW - 10

        header = {
            "typ": "JWT",
            "alg": algorithm,
        }

        claims = {
            "exp": exp,
            "iat": iat,
            "iss": issuer,
        }

        if extra_claims:
            claims.update(extra_claims)

        encoded_header = cls._encode_json(
            header
        )
        encoded_claims = cls._encode_json(
            claims
        )

        signing_input = (
            f"{encoded_header}.{encoded_claims}"
        ).encode("ascii")

        signature = hmac.new(
            secret.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()

        encoded_signature = (
            base64.urlsafe_b64encode(
                signature
            )
            .decode("ascii")
            .rstrip("=")
        )

        return (
            f"{encoded_header}."
            f"{encoded_claims}."
            f"{encoded_signature}"
        )

    @staticmethod
    def _encode_json(value):
        raw = json.dumps(
            value,
            separators=(",", ":"),
        ).encode("utf-8")

        return (
            base64.urlsafe_b64encode(raw)
            .decode("ascii")
            .rstrip("=")
        )

    @staticmethod
    def payload(
        *,
        event_type="order_authorised",
    ):
        return {
            "order_id": "order_123",
            "order_reference_id": "subscription_123",
            "order_number": "subscription_123",
            "event_type": event_type,
            "data": [],
        }

    def test_accepts_valid_authorised_webhook(self):
        result = verify_tamara_webhook(
            token=self.token(),
            notification_token=self.SECRET,
            payload=self.payload(),
            now=self.NOW,
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
            result.event_type,
            "order_authorised",
        )
        self.assertEqual(
            result.status,
            PaymentStatus.AUTHORIZED,
        )

    def test_approved_maps_pending(self):
        result = verify_tamara_webhook(
            token=self.token(),
            notification_token=self.SECRET,
            payload=self.payload(
                event_type="order_approved"
            ),
            now=self.NOW,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.PENDING,
        )

    def test_declined_maps_failed(self):
        result = verify_tamara_webhook(
            token=self.token(),
            notification_token=self.SECRET,
            payload=self.payload(
                event_type="order_declined"
            ),
            now=self.NOW,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.FAILED,
        )

    def test_canceled_maps_cancelled(self):
        result = verify_tamara_webhook(
            token=self.token(),
            notification_token=self.SECRET,
            payload=self.payload(
                event_type="order_canceled"
            ),
            now=self.NOW,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.CANCELLED,
        )

    def test_captured_requires_api_verification(self):
        result = verify_tamara_webhook(
            token=self.token(),
            notification_token=self.SECRET,
            payload=self.payload(
                event_type="order_captured"
            ),
            now=self.NOW,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.UNKNOWN,
        )

    def test_refunded_requires_api_verification(self):
        result = verify_tamara_webhook(
            token=self.token(),
            notification_token=self.SECRET,
            payload=self.payload(
                event_type="order_refunded"
            ),
            now=self.NOW,
        )

        self.assertEqual(
            result.status,
            PaymentStatus.UNKNOWN,
        )

    def test_rejects_missing_notification_token(self):
        with self.assertRaises(
            PaymentGatewayConfigurationError
        ):
            verify_tamara_webhook(
                token=self.token(),
                notification_token="",
                payload=self.payload(),
                now=self.NOW,
            )

    def test_rejects_wrong_signature(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(
                    secret="wrong-secret"
                ),
                notification_token=self.SECRET,
                payload=self.payload(),
                now=self.NOW,
            )

    def test_rejects_expired_token(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(
                    exp=self.NOW - 1
                ),
                notification_token=self.SECRET,
                payload=self.payload(),
                now=self.NOW,
            )

    def test_rejects_future_issued_at(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(
                    iat=self.NOW + 301
                ),
                notification_token=self.SECRET,
                payload=self.payload(),
                now=self.NOW,
            )

    def test_rejects_wrong_issuer(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(
                    issuer="SomeoneElse"
                ),
                notification_token=self.SECRET,
                payload=self.payload(),
                now=self.NOW,
            )

    def test_rejects_unknown_event(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(),
                notification_token=self.SECRET,
                payload=self.payload(
                    event_type="unknown_event"
                ),
                now=self.NOW,
            )

    def test_rejects_missing_order_id(self):
        payload = self.payload()
        payload.pop("order_id")

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(),
                notification_token=self.SECRET,
                payload=payload,
                now=self.NOW,
            )

    def test_rejects_missing_reference(self):
        payload = self.payload()
        payload.pop(
            "order_reference_id"
        )

        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            verify_tamara_webhook(
                token=self.token(),
                notification_token=self.SECRET,
                payload=payload,
                now=self.NOW,
            )

    def test_extracts_bearer_token(self):
        token = self.token()

        result = extract_tamara_bearer_token(
            {
                "Authorization":
                    f"Bearer {token}"
            }
        )

        self.assertEqual(
            result,
            token,
        )

    def test_header_name_is_case_insensitive(self):
        token = self.token()

        result = extract_tamara_bearer_token(
            {
                "authorization":
                    f"Bearer {token}"
            }
        )

        self.assertEqual(
            result,
            token,
        )

    def test_rejects_invalid_authorization_header(self):
        with self.assertRaises(
            PaymentGatewayVerificationError
        ):
            extract_tamara_bearer_token(
                {
                    "Authorization":
                        "Basic abc123"
                }
            )