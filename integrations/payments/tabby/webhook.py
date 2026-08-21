from __future__ import annotations

import hmac
from typing import Any

from integrations.payments.exceptions import (
    PaymentGatewayConfigurationError,
    PaymentGatewayVerificationError,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentStatus,
    WebhookEvent,
)


TABBY_EVENT_STATUS = {
    "created": PaymentStatus.INITIATED,
    "authorized": PaymentStatus.AUTHORIZED,
    "closed": PaymentStatus.PAID,
    "rejected": PaymentStatus.FAILED,
    "expired": PaymentStatus.FAILED,
}


def verify_tabby_webhook(
    *,
    headers: dict[str, str],
    payload: dict[str, Any],
    header_name: str,
    header_value: str,
) -> WebhookEvent:
    """
    Authenticate and parse a Tabby payment webhook.

    The static webhook header proves the notification was sent using
    the credential configured during webhook registration.

    The payload itself is NOT authoritative for the final payment state.
    The adapter must retrieve the payment directly from Tabby afterwards.
    """

    expected_header_name = str(
        header_name or ""
    ).strip()

    expected_header_value = str(
        header_value or ""
    ).strip()

    if not expected_header_name:
        raise PaymentGatewayConfigurationError(
            "Tabby webhook header name is not configured."
        )

    if not expected_header_value:
        raise PaymentGatewayConfigurationError(
            "Tabby webhook header value is not configured."
        )

    if not isinstance(headers, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Tabby webhook headers."
        )

    received_value = _extract_header(
        headers,
        expected_header_name,
    )

    if not received_value:
        raise PaymentGatewayVerificationError(
            "Tabby webhook authentication header is missing."
        )

    if not hmac.compare_digest(
        received_value.encode("utf-8"),
        expected_header_value.encode("utf-8"),
    ):
        raise PaymentGatewayVerificationError(
            "Invalid Tabby webhook authentication header."
        )

    if not isinstance(payload, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Tabby webhook payload."
        )

    payment_id = str(
        payload.get("payment_id")
        or payload.get("id")
        or ""
    ).strip()

    if not payment_id:
        raise PaymentGatewayVerificationError(
            "Tabby webhook payment_id is missing."
        )

    provider_status = str(
        payload.get("status") or ""
    ).strip().lower()

    if not provider_status:
        raise PaymentGatewayVerificationError(
            "Tabby webhook status is missing."
        )

    status = TABBY_EVENT_STATUS.get(
        provider_status,
        PaymentStatus.UNKNOWN,
    )

    return WebhookEvent(
        gateway=PaymentGatewayName.TABBY,
        event_type=provider_status,
        provider_payment_id=payment_id,
        status=status,
        payload=payload,
    )


def _extract_header(
    headers: dict[str, str],
    expected_name: str,
) -> str:
    normalized_name = expected_name.strip().lower()

    for key, value in headers.items():
        if str(key).strip().lower() == normalized_name:
            return str(value or "").strip()

    return ""