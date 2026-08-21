from __future__ import annotations

import base64
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


class MoyasarClient:
    DEFAULT_BASE_URL = "https://api.moyasar.com/v1"

    def __init__(
        self,
        *,
        secret_key: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 15.0,
    ) -> None:
        self.secret_key = str(secret_key or "").strip()
        self.base_url = str(base_url or "").strip().rstrip("/")
        self.timeout = float(timeout)

        if not self.secret_key:
            raise PaymentGatewayConfigurationError(
                "Moyasar secret key is required."
            )

        if not self.secret_key.startswith(("sk_test_", "sk_live_")):
            raise PaymentGatewayConfigurationError(
                "Invalid Moyasar secret key prefix."
            )

        parsed = urllib.parse.urlparse(self.base_url)

        if parsed.scheme != "https" or not parsed.netloc:
            raise PaymentGatewayConfigurationError(
                "Moyasar base URL must use HTTPS."
            )

        if self.timeout <= 0:
            raise PaymentGatewayConfigurationError(
                "Moyasar timeout must be greater than zero."
            )

    def fetch_payment(self, payment_id: str) -> dict[str, Any]:
        payment_id = self._validate_payment_id(payment_id)

        return self._request(
            "GET",
            f"/payments/{urllib.parse.quote(payment_id, safe='')}",
        )

    def refund_payment(
        self,
        payment_id: str,
        *,
        amount: int | None = None,
    ) -> dict[str, Any]:
        payment_id = self._validate_payment_id(payment_id)
        payload: dict[str, Any] | None = None

        if amount is not None:
            self._validate_amount(amount)
            payload = {"amount": amount}

        return self._request(
            "POST",
            f"/payments/{urllib.parse.quote(payment_id, safe='')}/refund",
            payload=payload,
        )

    def capture_payment(
        self,
        payment_id: str,
        *,
        amount: int | None = None,
    ) -> dict[str, Any]:
        payment_id = self._validate_payment_id(payment_id)
        payload: dict[str, Any] | None = None

        if amount is not None:
            self._validate_amount(amount)
            payload = {"amount": amount}

        return self._request(
            "POST",
            f"/payments/{urllib.parse.quote(payment_id, safe='')}/capture",
            payload=payload,
        )

    def void_payment(self, payment_id: str) -> dict[str, Any]:
        payment_id = self._validate_payment_id(payment_id)

        return self._request(
            "POST",
            f"/payments/{urllib.parse.quote(payment_id, safe='')}/void",
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
            "Authorization": self._authorization_header(),
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
                f"Moyasar request failed with HTTP {exc.code}."
            ) from exc

        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
        ) as exc:
            raise PaymentGatewayRequestError(
                "Unable to reach Moyasar."
            ) from exc

        try:
            decoded = raw_body.decode("utf-8")
            data = json.loads(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PaymentGatewayResponseError(
                "Moyasar returned an invalid JSON response."
            ) from exc

        if not isinstance(data, dict):
            raise PaymentGatewayResponseError(
                "Moyasar returned an unexpected response."
            )

        return data

    def _authorization_header(self) -> str:
        credentials = f"{self.secret_key}:".encode("utf-8")
        encoded = base64.b64encode(credentials).decode("ascii")
        return f"Basic {encoded}"

    @staticmethod
    def _validate_payment_id(
        payment_id: str,
    ) -> str:
        value = str(
            payment_id or ""
        ).strip()

        if not value:
            raise ValueError(
                "Moyasar payment ID is required."
            )

        if len(value) > 200:
            raise ValueError(
                "Invalid Moyasar payment ID."
            )

        return value

    @staticmethod
    def _validate_amount(
        amount: int,
    ) -> None:
        if (
            isinstance(amount, bool)
            or not isinstance(amount, int)
            or amount <= 0
        ):
            raise ValueError(
                "Amount must be a positive integer "
                "in minor units."
            )
