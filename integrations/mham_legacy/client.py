from __future__ import annotations

import json
import socket
import ssl
from dataclasses import dataclass
from typing import Any, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen

from .config import MhamLegacyConfig
from .exceptions import (
    MhamLegacyAuthenticationError,
    MhamLegacyReadOnlyViolation,
    MhamLegacyRequestError,
    MhamLegacyResponseError,
    MhamLegacyTransportError,
)
from .redaction import redact_sensitive_data


ALLOWED_METHOD = "GET"


@dataclass(frozen=True, slots=True)
class MhamLegacyResponse:
    status_code: int
    url: str
    data: Any
    headers: dict[str, str]

    def safe_snapshot(self) -> dict[str, Any]:
        return redact_sensitive_data(
            {
                "status_code": self.status_code,
                "url": self.url,
                "data": self.data,
                "headers": self.headers,
            }
        )


class MhamLegacyClient:
    """
    Read-only HTTP client for the legacy Mham V1 API.

    Phase 47A1 intentionally supports GET only.
    No POST / PUT / PATCH / DELETE provider calls are available.
    """

    user_agent = "PrimeyAcc-MhamLegacy/47A1"

    def __init__(
        self,
        *,
        config: MhamLegacyConfig | None = None,
    ) -> None:
        self.config = (
            config
            or MhamLegacyConfig.from_environment()
        ).validated()

        self._base = urlparse(self.config.base_url)

    @classmethod
    def from_environment(cls) -> "MhamLegacyClient":
        return cls(
            config=MhamLegacyConfig.from_environment()
        )

    def safe_configuration(self) -> dict[str, object]:
        return self.config.safe_summary()

    def _validate_relative_path(self, path: str) -> str:
        raw = str(path or "").strip()

        if not raw:
            raise MhamLegacyRequestError(
                "Mham API path is required."
            )

        parsed = urlparse(raw)

        if parsed.scheme or parsed.netloc:
            raise MhamLegacyRequestError(
                "Mham API path must be relative to the configured base URL."
            )

        if parsed.fragment:
            raise MhamLegacyRequestError(
                "Mham API path must not contain a fragment."
            )

        normalized = raw.lstrip("/")

        if not normalized:
            raise MhamLegacyRequestError(
                "Mham API path is required."
            )

        return normalized

    def _build_url(
        self,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
    ) -> str:
        relative_path = self._validate_relative_path(path)

        base = self.config.base_url.rstrip("/") + "/"
        url = urljoin(base, relative_path)

        parsed = urlparse(url)

        if (
            parsed.scheme.lower() != "https"
            or parsed.hostname != self._base.hostname
            or parsed.port != self._base.port
        ):
            raise MhamLegacyRequestError(
                "Mham API request escaped the configured HTTPS host."
            )

        if params:
            query_items: list[tuple[str, Any]] = []

            for key, value in params.items():
                if value is None:
                    continue

                if isinstance(value, (list, tuple)):
                    for item in value:
                        query_items.append((str(key), item))
                else:
                    query_items.append((str(key), value))

            query = urlencode(
                query_items,
                doseq=True,
            )

            if query:
                separator = "&" if parsed.query else "?"
                url = f"{url}{separator}{query}"

        return url

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
    ) -> MhamLegacyResponse:
        method = str(method or "").strip().upper()

        if method != ALLOWED_METHOD:
            raise MhamLegacyReadOnlyViolation(
                "Mham Legacy connector is read-only in Phase 47A1; "
                "only GET requests are permitted."
            )

        url = self._build_url(
            path,
            params=params,
        )

        request = Request(
            url=url,
            method="GET",
            headers={
                "Accept": "application/json",
                "Authorization": (
                    f"Bearer {self.config.token}"
                ),
                "User-Agent": self.user_agent,
            },
        )

        try:
            with urlopen(
                request,
                timeout=self.config.timeout,
                context=ssl.create_default_context(),
            ) as response:
                status_code = int(
                    getattr(response, "status", 200)
                )

                raw = response.read()

                response_headers = {
                    str(key): str(value)
                    for key, value
                    in response.headers.items()
                }

        except HTTPError as exc:
            if exc.code in {401, 403}:
                raise MhamLegacyAuthenticationError(
                    "Mham API authentication was rejected."
                ) from exc

            raise MhamLegacyTransportError(
                f"Mham API returned HTTP {exc.code}."
            ) from exc

        except (
            URLError,
            TimeoutError,
            socket.timeout,
            ssl.SSLError,
            OSError,
        ) as exc:
            raise MhamLegacyTransportError(
                "Unable to reach the Mham API."
            ) from exc

        if status_code in {401, 403}:
            raise MhamLegacyAuthenticationError(
                "Mham API authentication was rejected."
            )

        if not 200 <= status_code < 300:
            raise MhamLegacyTransportError(
                f"Mham API returned HTTP {status_code}."
            )

        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise MhamLegacyResponseError(
                "Mham API response is not valid UTF-8."
            ) from exc

        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            raise MhamLegacyResponseError(
                "Mham API response is not valid JSON."
            ) from exc

        return MhamLegacyResponse(
            status_code=status_code,
            url=url,
            data=data,
            headers=response_headers,
        )

    def get_json(
        self,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
    ) -> MhamLegacyResponse:
        return self._request(
            "GET",
            path,
            params=params,
        )

    def request(
        self,
        method: str,
        path: str,
        *,
        params: Mapping[str, Any] | None = None,
    ) -> MhamLegacyResponse:
        """
        Explicit low-level entry point.

        It exists primarily so tests and future service layers can prove
        that provider write methods remain impossible during migration.
        """
        return self._request(
            method,
            path,
            params=params,
        )
