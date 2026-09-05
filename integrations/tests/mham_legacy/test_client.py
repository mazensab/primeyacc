from __future__ import annotations

import io
import os
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request

from integrations.mham_legacy.client import MhamLegacyClient
from integrations.mham_legacy.config import MhamLegacyConfig
from integrations.mham_legacy.exceptions import (
    MhamLegacyAuthenticationError,
    MhamLegacyConfigurationError,
    MhamLegacyReadOnlyViolation,
    MhamLegacyRequestError,
    MhamLegacyResponseError,
)
from integrations.mham_legacy.redaction import (
    REDACTED,
    redact_sensitive_data,
)


class FakeResponse:
    def __init__(
        self,
        payload: bytes,
        *,
        status: int = 200,
        headers: dict[str, str] | None = None,
    ) -> None:
        self._payload = payload
        self.status = status
        self.headers = headers or {
            "Content-Type": "application/json",
        }

    def read(self) -> bytes:
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


class MhamLegacyConfigTests(unittest.TestCase):
    def test_https_is_required(self):
        with self.assertRaises(
            MhamLegacyConfigurationError
        ):
            MhamLegacyConfig(
                base_url="http://mham.example/api",
                token="secret",
            ).validated()

    def test_token_is_required(self):
        with self.assertRaises(
            MhamLegacyConfigurationError
        ):
            MhamLegacyConfig(
                base_url="https://mham.example/api",
                token="",
            ).validated()

    def test_credentials_cannot_be_embedded_in_url(self):
        with self.assertRaises(
            MhamLegacyConfigurationError
        ):
            MhamLegacyConfig(
                base_url="https://user:pass@mham.example/api",
                token="secret",
            ).validated()

    def test_repr_never_contains_raw_token(self):
        config = MhamLegacyConfig(
            base_url="https://mham.example/api",
            token="SUPER-SECRET-TOKEN",
        )

        self.assertNotIn(
            "SUPER-SECRET-TOKEN",
            repr(config),
        )

    def test_environment_configuration(self):
        env = {
            "MHAM_LEGACY_API_BASE_URL": (
                "https://mham.example/connector/api"
            ),
            "MHAM_LEGACY_API_TOKEN": "development-token",
            "MHAM_LEGACY_API_TIMEOUT": "15",
        }

        with patch.dict(
            os.environ,
            env,
            clear=True,
        ):
            config = (
                MhamLegacyConfig
                .from_environment()
            )

        self.assertEqual(
            config.base_url,
            "https://mham.example/connector/api",
        )
        self.assertEqual(
            config.timeout,
            15.0,
        )


class MhamLegacyRedactionTests(unittest.TestCase):
    def test_nested_secrets_are_redacted(self):
        payload = {
            "token": "one",
            "nested": {
                "client_secret": "two",
                "safe": "visible",
            },
            "rows": [
                {
                    "Authorization": "Bearer three",
                }
            ],
        }

        safe = redact_sensitive_data(payload)

        self.assertEqual(
            safe["token"],
            REDACTED,
        )
        self.assertEqual(
            safe["nested"]["client_secret"],
            REDACTED,
        )
        self.assertEqual(
            safe["nested"]["safe"],
            "visible",
        )
        self.assertEqual(
            safe["rows"][0]["Authorization"],
            REDACTED,
        )


class MhamLegacyClientTests(unittest.TestCase):
    def setUp(self):
        self.config = MhamLegacyConfig(
            base_url=(
                "https://mham.example/connector/api"
            ),
            token="development-token",
            timeout=10,
        )
        self.client = MhamLegacyClient(
            config=self.config,
        )

    def test_write_methods_are_blocked(self):
        for method in (
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
        ):
            with self.subTest(method=method):
                with self.assertRaises(
                    MhamLegacyReadOnlyViolation
                ):
                    self.client.request(
                        method,
                        "packages",
                    )

    def test_absolute_external_url_is_rejected(self):
        with self.assertRaises(
            MhamLegacyRequestError
        ):
            self.client.get_json(
                "https://evil.example/data"
            )

    @patch(
        "integrations.mham_legacy.client.urlopen"
    )
    def test_get_uses_bearer_and_https(
        self,
        mocked_urlopen,
    ):
        mocked_urlopen.return_value = FakeResponse(
            b'{"data":[{"id":1}]}'
        )

        result = self.client.get_json(
            "packages",
            params={
                "page": 1,
                "empty": None,
            },
        )

        self.assertEqual(
            result.status_code,
            200,
        )
        self.assertEqual(
            result.data["data"][0]["id"],
            1,
        )

        request = (
            mocked_urlopen.call_args.args[0]
        )

        self.assertIsInstance(
            request,
            Request,
        )
        self.assertEqual(
            request.get_method(),
            "GET",
        )
        self.assertTrue(
            request.full_url.startswith(
                "https://mham.example/"
            )
        )
        self.assertEqual(
            request.get_header(
                "Authorization"
            ),
            "Bearer development-token",
        )

    @patch(
        "integrations.mham_legacy.client.urlopen"
    )
    def test_invalid_json_is_rejected(
        self,
        mocked_urlopen,
    ):
        mocked_urlopen.return_value = (
            FakeResponse(
                b"not-json"
            )
        )

        with self.assertRaises(
            MhamLegacyResponseError
        ):
            self.client.get_json(
                "packages"
            )

    @patch(
        "integrations.mham_legacy.client.urlopen"
    )
    def test_authentication_error_is_safe(
        self,
        mocked_urlopen,
    ):
        mocked_urlopen.side_effect = HTTPError(
            url=(
                "https://mham.example/"
                "connector/api/packages"
            ),
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=io.BytesIO(b"secret response"),
        )

        with self.assertRaises(
            MhamLegacyAuthenticationError
        ) as context:
            self.client.get_json(
                "packages"
            )

        self.assertNotIn(
            "development-token",
            str(context.exception),
        )

    @patch(
        "integrations.mham_legacy.client.urlopen"
    )
    def test_safe_response_snapshot_redacts_secrets(
        self,
        mocked_urlopen,
    ):
        mocked_urlopen.return_value = FakeResponse(
            (
                b'{"token":"provider-secret",'
                b'"data":{"id":7}}'
            ),
            headers={
                "Authorization": (
                    "Bearer response-secret"
                ),
                "Content-Type": (
                    "application/json"
                ),
            },
        )

        response = self.client.get_json(
            "business-details"
        )

        snapshot = response.safe_snapshot()

        self.assertEqual(
            snapshot["data"]["token"],
            REDACTED,
        )
        self.assertEqual(
            snapshot["headers"]["Authorization"],
            REDACTED,
        )
        self.assertEqual(
            snapshot["data"]["data"]["id"],
            7,
        )


if __name__ == "__main__":
    unittest.main()
