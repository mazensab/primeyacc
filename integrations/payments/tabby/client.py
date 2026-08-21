from __future__ import annotations

import json
import socket
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayRequestError,
    PaymentGatewayResponseError,
)


class TabbyClient:
    KSA_BASE_URL = "https://api.tabby.sa"
    DEFAULT_BASE_URL = KSA_BASE_URL

    def __init__(
        self,
        *,
        secret_key: str,
        merchant_code: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 15.0,
    ) -> None:
        self.secret_key = str(secret_key or "").strip()
        self.merchant_code = str(merchant_code or "").strip()
        self.base_url = str(base_url or "").strip().rstrip("/")
        self.timeout = float(timeout)

        if not self.secret_key:
            raise PaymentGatewayConfigurationError(
                "Tabby secret key is required."
            )

        if not self.merchant_code:
            raise PaymentGatewayConfigurationError(
                "Tabby merchant code is required."
            )

        parsed = urllib.parse.urlparse(self.base_url)

        if parsed.scheme != "https" or not parsed.netloc:
            raise PaymentGatewayConfigurationError(
                "Tabby base URL must use HTTPS."
            )

        if self.timeout <= 0:
            raise PaymentGatewayConfigurationError(
                "Tabby timeout must be greater than zero."
            )

    def create_checkout(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self._validate_payload(payload)

        return self._request(
            "POST",
            "/api/v2/checkout",
            payload=payload,
        )

    def fetch_payment(
        self,
        payment_id: str,
    ) -> dict[str, Any]:
        payment_id = self._validate_identifier(
            payment_id,
            name="payment ID",
        )

        return self._request(
            "GET",
            (
                "/api/v2/payments/"
                f"{urllib.parse.quote(payment_id, safe='')}"
            ),
        )

    def capture_payment(
        self,
        payment_id: str,
        *,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        payment_id = self._validate_identifier(
            payment_id,
            name="payment ID",
        )
        self._validate_payload(payload)

        return self._request(
            "POST",
            (
                "/api/v2/payments/"
                f"{urllib.parse.quote(payment_id, safe='')}"
                "/captures"
            ),
            payload=payload,
        )

    def refund_payment(
        self,
        payment_id: str,
        *,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        payment_id = self._validate_identifier(
            payment_id,
            name="payment ID",
        )
        self._validate_payload(payload)

        return self._request(
            "POST",
            (
                "/api/v2/payments/"
                f"{urllib.parse.quote(payment_id, safe='')}"
                "/refunds"
            ),
            payload=payload,
        )

    def close_payment(
        self,
        payment_id: str,
    ) -> dict[str, Any]:
        payment_id = self._validate_identifier(
            payment_id,
            name="payment ID",
        )

        return self._request(
            "POST",
            (
                "/api/v2/payments/"
                f"{urllib.parse.quote(payment_id, safe='')}"
                "/close"
            ),
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"

        body = None

        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.secret_key}",
            "X-Merchant-Code": self.merchant_code,
            "User-Agent": "Mhamcloud/1.0",
        }

        if payload is not None:
            body = json.dumps(
                payload,
                separators=(",", ":"),
            ).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request = urllib.request.Request(
            url=url,
            data=body,
            headers=headers,
            method=method.upper(),
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=self.timeout,
            ) as response:
                raw_body = response.read()

        except urllib.error.HTTPError as exc:
            raise PaymentGatewayRequestError(
                f"Tabby request failed with HTTP {exc.code}."
            ) from exc

        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
        ) as exc:
            raise PaymentGatewayRequestError(
                "Unable to reach Tabby."
            ) from exc

        try:
            decoded = raw_body.decode("utf-8")
            data = json.loads(decoded)
        except (
            UnicodeDecodeError,
            json.JSONDecodeError,
        ) as exc:
            raise PaymentGatewayResponseError(
                "Tabby returned an invalid JSON response."
            ) from exc

        if not isinstance(data, dict):
            raise PaymentGatewayResponseError(
                "Tabby returned an unexpected response."
            )

        return data

    @staticmethod
    def _validate_identifier(
        value: str,
        *,
        name: str,
    ) -> str:
        normalized = str(
            value or ""
        ).strip()

        if not normalized:
            raise ValueError(
                f"Tabby {name} is required."
            )

        if len(normalized) > 200:
            raise ValueError(
                f"Invalid Tabby {name}."
            )

        return normalized

    @staticmethod
    def _validate_payload(
        payload: dict[str, Any],
    ) -> None:
        if (
            not isinstance(payload, dict)
            or not payload
        ):
            raise ValueError(
                "Tabby request payload must "
                "be a non-empty object."
            )
