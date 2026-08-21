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


class TamaraClient:
    SANDBOX_BASE_URL = "https://api-sandbox.tamara.co"
    PRODUCTION_BASE_URL = "https://api.tamara.co"
    DEFAULT_BASE_URL = SANDBOX_BASE_URL

    # Tamara recommends a very short timeout for pre-checkout eligibility.
    # This timeout is isolated and does not affect checkout/order operations.
    ELIGIBILITY_TIMEOUT = 0.2

    def __init__(
        self,
        *,
        api_token: str,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 15.0,
    ) -> None:
        self.api_token = str(api_token or "").strip()
        self.base_url = str(base_url or "").strip().rstrip("/")
        self.timeout = float(timeout)

        if not self.api_token:
            raise PaymentGatewayConfigurationError(
                "Tamara API token is required."
            )

        parsed = urllib.parse.urlparse(self.base_url)

        if parsed.scheme != "https" or not parsed.netloc:
            raise PaymentGatewayConfigurationError(
                "Tamara base URL must use HTTPS."
            )

        if self.timeout <= 0:
            raise PaymentGatewayConfigurationError(
                "Tamara timeout must be greater than zero."
            )

    def check_eligibility(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Check whether Tamara is eligible for the current checkout.

        This request intentionally uses a dedicated short timeout so
        eligibility checks do not slow down the subscription/payment flow.
        """
        self._validate_payload(payload)

        return self._request(
            "POST",
            "/pre-checkout/v1/eligibility",
            payload=payload,
            timeout=self.ELIGIBILITY_TIMEOUT,
        )

    def create_checkout(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self._validate_payload(payload)

        return self._request(
            "POST",
            "/checkout",
            payload=payload,
        )

    def fetch_order(
        self,
        order_id: str,
    ) -> dict[str, Any]:
        order_id = self._validate_identifier(
            order_id,
            name="order ID",
        )

        return self._request(
            "GET",
            f"/orders/{urllib.parse.quote(order_id, safe='')}",
        )

    def authorise_order(
        self,
        order_id: str,
    ) -> dict[str, Any]:
        order_id = self._validate_identifier(
            order_id,
            name="order ID",
        )

        return self._request(
            "POST",
            f"/orders/{urllib.parse.quote(order_id, safe='')}/authorise",
        )

    def capture_order(
        self,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self._validate_payload(payload)

        return self._request(
            "POST",
            "/payments/capture",
            payload=payload,
        )

    def cancel_order(
        self,
        order_id: str,
        *,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        order_id = self._validate_identifier(
            order_id,
            name="order ID",
        )
        self._validate_payload(payload)

        return self._request(
            "POST",
            f"/orders/{urllib.parse.quote(order_id, safe='')}/cancel",
            payload=payload,
        )

    def refund_order(
        self,
        order_id: str,
        *,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        order_id = self._validate_identifier(
            order_id,
            name="order ID",
        )
        self._validate_payload(payload)

        return self._request(
            "POST",
            (
                "/payments/simplified-refund/"
                f"{urllib.parse.quote(order_id, safe='')}"
            ),
            payload=payload,
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        payload: dict[str, Any] | None = None,
        timeout: float | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"

        body = None
        headers = {
            "Accept": "application/json",
            "Authorization": f"Bearer {self.api_token}",
            "User-Agent": "Mhamcloud/1.0",
        }

        if payload is not None:
            body = json.dumps(
                payload,
                separators=(",", ":"),
            ).encode("utf-8")
            headers["Content-Type"] = "application/json"

        request_timeout = (
            self.timeout
            if timeout is None
            else float(timeout)
        )

        if request_timeout <= 0:
            raise PaymentGatewayConfigurationError(
                "Tamara request timeout must be greater than zero."
            )

        request = urllib.request.Request(
            url=url,
            data=body,
            headers=headers,
            method=method.upper(),
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=request_timeout,
            ) as response:
                raw_body = response.read()

        except urllib.error.HTTPError as exc:
            raise PaymentGatewayRequestError(
                f"Tamara request failed with HTTP {exc.code}."
            ) from exc

        except (
            urllib.error.URLError,
            TimeoutError,
            socket.timeout,
        ) as exc:
            raise PaymentGatewayRequestError(
                "Unable to reach Tamara."
            ) from exc

        try:
            decoded = raw_body.decode("utf-8")
            data = json.loads(decoded)
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PaymentGatewayResponseError(
                "Tamara returned an invalid JSON response."
            ) from exc

        if not isinstance(data, dict):
            raise PaymentGatewayResponseError(
                "Tamara returned an unexpected response."
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
                f"Tamara {name} is required."
            )

        if len(normalized) > 200:
            raise ValueError(
                f"Invalid Tamara {name}."
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
                "Tamara request payload must "
                "be a non-empty object."
            )
