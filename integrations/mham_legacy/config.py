from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

from .exceptions import MhamLegacyConfigurationError


DEFAULT_TIMEOUT_SECONDS = 20.0


def _clean(value: object) -> str:
    return str(value or "").strip()


def _read_timeout(value: object) -> float:
    if value in (None, ""):
        return DEFAULT_TIMEOUT_SECONDS

    try:
        timeout = float(value)
    except (TypeError, ValueError) as exc:
        raise MhamLegacyConfigurationError(
            "MHAM_LEGACY_API_TIMEOUT must be numeric."
        ) from exc

    if timeout <= 0 or timeout > 120:
        raise MhamLegacyConfigurationError(
            "MHAM_LEGACY_API_TIMEOUT must be between 0 and 120 seconds."
        )

    return timeout


@dataclass(frozen=True, slots=True)
class MhamLegacyConfig:
    """
    Backend-only Mham V1 connector configuration.

    The raw token must come from environment/secrets and must never
    be exposed by frontend responses, reprs, or logs.
    """

    base_url: str
    token: str
    timeout: float = DEFAULT_TIMEOUT_SECONDS

    @classmethod
    def from_environment(cls) -> "MhamLegacyConfig":
        return cls(
            base_url=_clean(
                os.environ.get("MHAM_LEGACY_API_BASE_URL")
            ),
            token=_clean(
                os.environ.get("MHAM_LEGACY_API_TOKEN")
            ),
            timeout=_read_timeout(
                os.environ.get("MHAM_LEGACY_API_TIMEOUT")
            ),
        ).validated()

    def validated(self) -> "MhamLegacyConfig":
        base_url = _clean(self.base_url).rstrip("/")
        token = _clean(self.token)

        if not base_url:
            raise MhamLegacyConfigurationError(
                "MHAM_LEGACY_API_BASE_URL is required."
            )

        parsed = urlparse(base_url)

        if parsed.scheme.lower() != "https":
            raise MhamLegacyConfigurationError(
                "Mham Legacy API base URL must use HTTPS."
            )

        if not parsed.hostname:
            raise MhamLegacyConfigurationError(
                "Mham Legacy API base URL must contain a valid host."
            )

        if parsed.username or parsed.password:
            raise MhamLegacyConfigurationError(
                "Credentials must not be embedded in the Mham API URL."
            )

        if parsed.query or parsed.fragment:
            raise MhamLegacyConfigurationError(
                "Mham Legacy API base URL must not contain query or fragment."
            )

        if not token:
            raise MhamLegacyConfigurationError(
                "MHAM_LEGACY_API_TOKEN is required."
            )

        return MhamLegacyConfig(
            base_url=base_url,
            token=token,
            timeout=_read_timeout(self.timeout),
        )

    def safe_summary(self) -> dict[str, object]:
        validated = self.validated()
        parsed = urlparse(validated.base_url)

        return {
            "configured": True,
            "scheme": parsed.scheme,
            "host": parsed.hostname,
            "base_url": validated.base_url,
            "token_configured": bool(validated.token),
            "timeout": validated.timeout,
        }

    def __repr__(self) -> str:
        token_state = "configured" if bool(_clean(self.token)) else "missing"
        return (
            "MhamLegacyConfig("
            f"base_url={self.base_url!r}, "
            f"token={token_state!r}, "
            f"timeout={self.timeout!r}"
            ")"
        )
