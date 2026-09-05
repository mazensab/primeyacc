from __future__ import annotations

from typing import Any


REDACTED = "[REDACTED]"

SENSITIVE_KEYS = frozenset(
    {
        "authorization",
        "api-key",
        "api_key",
        "apikey",
        "client_secret",
        "secret",
        "secret_key",
        "secret_token",
        "token",
        "access_token",
        "refresh_token",
        "password",
        "signature",
        "cookie",
        "set-cookie",
    }
)


def _normalized_key(value: Any) -> str:
    return str(value or "").strip().lower().replace("_", "-")


def _is_sensitive_key(value: Any) -> bool:
    normalized = _normalized_key(value)

    if normalized in {
        item.replace("_", "-")
        for item in SENSITIVE_KEYS
    }:
        return True

    sensitive_fragments = (
        "password",
        "secret",
        "access-token",
        "refresh-token",
        "authorization",
    )
    return any(
        fragment in normalized
        for fragment in sensitive_fragments
    )


def redact_sensitive_data(value: Any) -> Any:
    """
    Recursively redact credentials before logs/audit snapshots.

    The function never mutates the input object.
    """

    if isinstance(value, dict):
        return {
            str(key): (
                REDACTED
                if _is_sensitive_key(key)
                else redact_sensitive_data(item)
            )
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [
            redact_sensitive_data(item)
            for item in value
        ]

    if isinstance(value, tuple):
        return tuple(
            redact_sensitive_data(item)
            for item in value
        )

    return value
