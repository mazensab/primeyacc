from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
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


TAMARA_EVENT_STATUS = {
    "order_approved": PaymentStatus.PENDING,
    "order_declined": PaymentStatus.FAILED,
    "order_authorised": PaymentStatus.AUTHORIZED,
    "order_canceled": PaymentStatus.CANCELLED,
    "order_expired": PaymentStatus.FAILED,

    # These two events can represent either full or partial state.
    # Their authoritative state must be fetched from Tamara's API.
    "order_captured": PaymentStatus.UNKNOWN,
    "order_refunded": PaymentStatus.UNKNOWN,
}


def verify_tamara_webhook(
    *,
    token: str,
    notification_token: str,
    payload: dict[str, Any],
    now: int | None = None,
) -> WebhookEvent:
    """
    Authenticate and parse a Tamara order webhook.

    This layer proves the JWT is valid and validates the webhook structure.

    It intentionally does NOT make the webhook payload authoritative.
    Mhamcloud must fetch the order directly from Tamara before changing
    platform billing or subscription payment state.
    """

    secret = str(notification_token or "").strip()

    if not secret:
        raise PaymentGatewayConfigurationError(
            "Tamara notification token is not configured."
        )

    encoded_token = str(token or "").strip()

    if not encoded_token:
        raise PaymentGatewayVerificationError(
            "Tamara webhook token is missing."
        )

    if not isinstance(payload, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook payload."
        )

    claims = _decode_and_verify_jwt(
        token=encoded_token,
        secret=secret,
        now=now,
    )

    order_id = str(
        payload.get("order_id") or ""
    ).strip()

    if not order_id:
        raise PaymentGatewayVerificationError(
            "Tamara webhook order_id is missing."
        )

    event_type = str(
        payload.get("event_type") or ""
    ).strip().lower()

    if not event_type:
        raise PaymentGatewayVerificationError(
            "Tamara webhook event_type is missing."
        )

    status = TAMARA_EVENT_STATUS.get(event_type)

    if status is None:
        raise PaymentGatewayVerificationError(
            "Unsupported Tamara webhook event."
        )

    order_reference_id = str(
        payload.get("order_reference_id") or ""
    ).strip()

    if not order_reference_id:
        raise PaymentGatewayVerificationError(
            "Tamara webhook order_reference_id is missing."
        )

    issuer = claims.get("iss")

    if issuer is not None:
        normalized_issuer = str(
            issuer or ""
        ).strip().lower()

        if normalized_issuer != "tamara":
            raise PaymentGatewayVerificationError(
                "Invalid Tamara webhook token issuer."
            )

    return WebhookEvent(
        gateway=PaymentGatewayName.TAMARA,
        event_type=event_type,
        provider_payment_id=order_id,
        status=status,
        payload=payload,
    )


def extract_tamara_bearer_token(
    headers: dict[str, str],
) -> str:
    """
    Extract tamaraToken from Authorization: Bearer <token>.

    Header names are treated case-insensitively.
    """

    if not isinstance(headers, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook headers."
        )

    authorization = ""

    for key, value in headers.items():
        if str(key).strip().lower() == "authorization":
            authorization = str(value or "").strip()
            break

    if not authorization:
        raise PaymentGatewayVerificationError(
            "Tamara webhook Authorization header is missing."
        )

    parts = authorization.split(None, 1)

    if (
        len(parts) != 2
        or parts[0].lower() != "bearer"
        or not parts[1].strip()
    ):
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook Authorization header."
        )

    return parts[1].strip()


def _decode_and_verify_jwt(
    *,
    token: str,
    secret: str,
    now: int | None = None,
) -> dict[str, Any]:
    parts = token.split(".")

    if len(parts) != 3:
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook JWT format."
        )

    encoded_header, encoded_payload, encoded_signature = parts

    try:
        header_raw = _base64url_decode(encoded_header)
        payload_raw = _base64url_decode(encoded_payload)
        signature = _base64url_decode(encoded_signature)

        header = json.loads(
            header_raw.decode("utf-8")
        )
        claims = json.loads(
            payload_raw.decode("utf-8")
        )
    except (
        UnicodeDecodeError,
        json.JSONDecodeError,
        ValueError,
    ) as exc:
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook JWT."
        ) from exc

    if not isinstance(header, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook JWT header."
        )

    if not isinstance(claims, dict):
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook JWT claims."
        )

    algorithm = str(
        header.get("alg") or ""
    ).strip().upper()

    if algorithm != "HS256":
        raise PaymentGatewayVerificationError(
            "Unsupported Tamara webhook JWT algorithm."
        )

    signing_input = (
        f"{encoded_header}.{encoded_payload}"
    ).encode("ascii")

    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()

    if not hmac.compare_digest(
        signature,
        expected_signature,
    ):
        raise PaymentGatewayVerificationError(
            "Invalid Tamara webhook JWT signature."
        )

    current_time = (
        int(time.time())
        if now is None
        else int(now)
    )

    _validate_time_claims(
        claims=claims,
        now=current_time,
    )

    return claims


def _validate_time_claims(
    *,
    claims: dict[str, Any],
    now: int,
) -> None:
    exp = claims.get("exp")

    if exp is not None:
        expiration = _integer_claim(
            exp,
            name="exp",
        )

        if now >= expiration:
            raise PaymentGatewayVerificationError(
                "Tamara webhook JWT has expired."
            )

    nbf = claims.get("nbf")

    if nbf is not None:
        not_before = _integer_claim(
            nbf,
            name="nbf",
        )

        if now < not_before:
            raise PaymentGatewayVerificationError(
                "Tamara webhook JWT is not active yet."
            )

    iat = claims.get("iat")

    if iat is not None:
        issued_at = _integer_claim(
            iat,
            name="iat",
        )

        # Allow a small amount of clock skew.
        if issued_at > now + 300:
            raise PaymentGatewayVerificationError(
                "Tamara webhook JWT issued-at time is invalid."
            )


def _integer_claim(
    value: Any,
    *,
    name: str,
) -> int:
    if isinstance(value, bool):
        raise PaymentGatewayVerificationError(
            f"Invalid Tamara webhook JWT {name} claim."
        )

    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise PaymentGatewayVerificationError(
            f"Invalid Tamara webhook JWT {name} claim."
        ) from exc


def _base64url_decode(
    value: str,
) -> bytes:
    normalized = str(value or "").strip()

    if not normalized:
        raise ValueError(
            "Empty base64url value."
        )

    padding = "=" * (
        (-len(normalized)) % 4
    )

    try:
        return base64.urlsafe_b64decode(
            normalized + padding
        )
    except Exception as exc:
        raise ValueError(
            "Invalid base64url value."
        ) from exc