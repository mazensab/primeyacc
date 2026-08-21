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


MOYASAR_PAYMENT_EVENT_STATUS = {
    "payment_paid": PaymentStatus.PAID,
    "payment_failed": PaymentStatus.FAILED,

    # Defensive compatibility with the spelling currently shown
    # on one Moyasar webhook reference table.
    "payment_faild": PaymentStatus.FAILED,

    "payment_authorized": PaymentStatus.AUTHORIZED,
    "payment_captured": PaymentStatus.PAID,
    "payment_refunded": PaymentStatus.REFUNDED,
    "payment_voided": PaymentStatus.VOIDED,
    "payment_verified": PaymentStatus.PAID,
}


def verify_moyasar_webhook(
    *,
    payload: dict[str, Any],
    shared_secret: str,
) -> WebhookEvent:
    """
    Authenticate and parse a Moyasar payment webhook.

    Important:
    This verifies the webhook transport secret and structure only.
    The payment itself must still be fetched from Moyasar's API
    before Mhamcloud changes any platform billing/payment state.
    """

    expected_secret = str(shared_secret or "").strip()

    if not expected_secret:
        raise PaymentGatewayConfigurationError(
            "Moyasar webhook shared secret is not configured."
        )

    if not isinstance(payload, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Moyasar webhook payload."
        )

    received_secret = str(
        payload.get("secret_token") or ""
    )

    if not received_secret or not hmac.compare_digest(
        received_secret,
        expected_secret,
    ):
        raise PaymentGatewayVerificationError(
            "Invalid Moyasar webhook secret."
        )

    event_id = str(payload.get("id") or "").strip()

    if not event_id:
        raise PaymentGatewayVerificationError(
            "Moyasar webhook event ID is missing."
        )

    event_type = str(payload.get("type") or "").strip().lower()

    if not event_type:
        raise PaymentGatewayVerificationError(
            "Moyasar webhook event type is missing."
        )

    status = MOYASAR_PAYMENT_EVENT_STATUS.get(event_type)

    if status is None:
        raise PaymentGatewayVerificationError(
            "Unsupported Moyasar webhook event."
        )

    data = payload.get("data")

    if not isinstance(data, dict):
        raise PaymentGatewayVerificationError(
            "Moyasar webhook payment data is missing."
        )

    payment_id = str(data.get("id") or "").strip()

    if not payment_id:
        raise PaymentGatewayVerificationError(
            "Moyasar webhook payment ID is missing."
        )

    provider_status = str(
        data.get("status") or ""
    ).strip().lower()

    if not provider_status:
        raise PaymentGatewayVerificationError(
            "Moyasar webhook payment status is missing."
        )

    _validate_event_status_consistency(
        event_type=event_type,
        provider_status=provider_status,
    )

    return WebhookEvent(
        gateway=PaymentGatewayName.MOYASAR,
        event_type=event_type,
        provider_payment_id=payment_id,
        status=status,
        payload=payload,
    )


def _validate_event_status_consistency(
    *,
    event_type: str,
    provider_status: str,
) -> None:
    expected_statuses = {
        "payment_paid": {"paid"},
        "payment_failed": {"failed"},
        "payment_faild": {"failed"},
        "payment_authorized": {"authorized"},
        "payment_captured": {"captured"},
        "payment_refunded": {"refunded"},
        "payment_voided": {"voided"},
        "payment_verified": {"verified"},
    }

    allowed = expected_statuses.get(event_type)

    if not allowed or provider_status not in allowed:
        raise PaymentGatewayVerificationError(
            "Moyasar webhook event and payment status do not match."
        )