from __future__ import annotations

from types import SimpleNamespace

from django.core.cache import cache
from django.test import SimpleTestCase

from api.throttling import LoginRateThrottle
from billing.payment_services import _json_object
from billing.security import (
    REDACTED,
    redact_sensitive_data,
)


class Phase31CLoginThrottleTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def request(self):
        return SimpleNamespace(
            data={
                "username": "security@example.com",
                "password": "wrong-password",
            },
            META={
                "REMOTE_ADDR": "127.0.0.1",
            },
        )

    def test_blocks_eleventh_attempt(self):
        request = self.request()

        for _ in range(10):
            allowed = LoginRateThrottle().allow_request(
                request,
                None,
            )
            self.assertTrue(allowed)

        allowed = LoginRateThrottle().allow_request(
            request,
            None,
        )

        self.assertFalse(allowed)

    def test_cache_key_does_not_expose_login_identifier(self):
        request = self.request()

        key = LoginRateThrottle().get_cache_key(
            request,
            None,
        )

        self.assertIsNotNone(key)
        self.assertNotIn(
            "security@example.com",
            key,
        )


class Phase31CRedactionTests(SimpleTestCase):
    def test_deep_redaction(self):
        source = {
            "authorization": "Bearer secret",
            "safe": "visible",
            "nested": {
                "client_secret": "secret-value",
                "access_token": "access-value",
            },
            "rows": [
                {
                    "signature": "signature-value",
                    "amount": 100,
                }
            ],
        }

        result = redact_sensitive_data(source)

        self.assertEqual(
            result["authorization"],
            REDACTED,
        )
        self.assertEqual(
            result["nested"]["client_secret"],
            REDACTED,
        )
        self.assertEqual(
            result["nested"]["access_token"],
            REDACTED,
        )
        self.assertEqual(
            result["rows"][0]["signature"],
            REDACTED,
        )
        self.assertEqual(
            result["rows"][0]["amount"],
            100,
        )
        self.assertEqual(
            result["safe"],
            "visible",
        )

    def test_payment_json_object_is_sanitized(self):
        result = _json_object(
            {
                "authorization": "Bearer hidden",
                "safe": "visible",
            },
            "provider_snapshot",
        )

        self.assertEqual(
            result["authorization"],
            REDACTED,
        )
        self.assertEqual(
            result["safe"],
            "visible",
        )
