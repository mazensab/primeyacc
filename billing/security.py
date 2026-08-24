from __future__ import annotations

from typing import Any


REDACTED = "[REDACTED]"

SENSITIVE_KEYS = frozenset(
    {
        "authorization",
        "api_key",
        "apikey",
        "api_secret",
        "client_secret",
        "secret",
        "secret_key",
        "secret_token",
        "webhook_secret",
        "password",
        "passcode",
        "private_key",
        "signature",
        "token",
        "access_token",
        "refresh_token",
        "bearer_token",
    }
)


def is_sensitive_key(key: Any) -> bool:
    value = (
        str(key or "")
        .strip()
        .lower()
        .replace("-", "_")
    )

    if not value:
        return False

    if value in SENSITIVE_KEYS:
        return True

    if "authorization" in value:
        return True

    if "signature" in value:
        return True

    if "secret" in value:
        return True

    if value.endswith("_token"):
        return True

    if value.endswith("_password"):
        return True

    if value.endswith("_private_key"):
        return True

    return False


def redact_sensitive_data(value: Any) -> Any:
    if isinstance(value, dict):
        return {
            str(key): (
                REDACTED
                if is_sensitive_key(key)
                else redact_sensitive_data(child)
            )
            for key, child in value.items()
        }

    if isinstance(value, (list, tuple)):
        return [
            redact_sensitive_data(child)
            for child in value
        ]

    if value is None or isinstance(
        value,
        (str, int, float, bool),
    ):
        return value

    return str(value)
