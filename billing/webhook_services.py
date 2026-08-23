from __future__ import annotations

import hashlib
import json
from datetime import timedelta
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from billing.models import (
    PlatformSubscriptionPayment,
    PlatformSubscriptionWebhookEvent,
)


_SENSITIVE_KEYS = {
    "authorization",
    "api-key",
    "api_key",
    "apikey",
    "password",
    "private_key",
    "publishable_key",
    "secret",
    "secret_key",
    "secret_token",
    "signature",
    "token",
    "access_token",
    "refresh_token",
    "webhook_secret",
}


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _safe_value(value: Any) -> Any:
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}

        for key, item in value.items():
            key_text = str(key)
            normalized = key_text.strip().lower()

            if (
                normalized in _SENSITIVE_KEYS
                or "authorization" in normalized
                or "signature" in normalized
                or "secret" in normalized
                or normalized.endswith("_token")
            ):
                cleaned[key_text] = "[REDACTED]"
            else:
                cleaned[key_text] = _safe_value(item)

        return cleaned

    if isinstance(value, list):
        return [
            _safe_value(item)
            for item in value
        ]

    if value is None or isinstance(
        value,
        (str, int, float, bool),
    ):
        return value

    return str(value)


def safe_webhook_payload(
    payload: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}

    cleaned = _safe_value(payload)

    return (
        cleaned
        if isinstance(cleaned, dict)
        else {}
    )


def safe_webhook_headers(
    headers: dict[str, Any] | None,
) -> dict[str, Any]:
    if not isinstance(headers, dict):
        return {}

    cleaned: dict[str, Any] = {}

    for key, value in headers.items():
        key_text = str(key)
        normalized = key_text.strip().lower()

        if (
            normalized == "authorization"
            or "signature" in normalized
            or "token" in normalized
            or "secret" in normalized
            or "api-key" in normalized
            or "api_key" in normalized
        ):
            cleaned[key_text] = "[REDACTED]"
        else:
            cleaned[key_text] = str(
                value or ""
            )[:1000]

    return cleaned


def _canonical_json(
    value: dict[str, Any],
) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        default=str,
    )


def _provider_event_id(
    *,
    gateway: str,
    payload: dict[str, Any],
) -> str:
    gateway = _clean(gateway).lower()

    for key in (
        "event_id",
        "notification_id",
        "webhook_id",
    ):
        value = _clean(payload.get(key))

        if value:
            return value

    if gateway == "moyasar":
        return _clean(payload.get("id"))

    return ""


def build_platform_webhook_fingerprint(
    *,
    gateway: str,
    event_type: str,
    provider_payment_id: str,
    payload: dict[str, Any],
) -> str:
    normalized = {
        "gateway": _clean(gateway).lower(),
        "event_type": _clean(event_type).lower(),
        "provider_payment_id": _clean(
            provider_payment_id
        ),
        "payload": payload,
    }

    encoded = _canonical_json(
        normalized
    ).encode("utf-8")

    return hashlib.sha256(
        encoded
    ).hexdigest()


def webhook_body_sha256(
    body: bytes | None,
) -> str:
    return hashlib.sha256(
        bytes(body or b"")
    ).hexdigest()


@transaction.atomic
def record_platform_webhook_event(
    *,
    gateway: str,
    event_type: str,
    provider_payment_id: str,
    payload: dict[str, Any],
    headers: dict[str, Any] | None = None,
    body: bytes | None = None,
    max_attempts: int = 5,
) -> tuple[
    PlatformSubscriptionWebhookEvent,
    bool,
]:
    """
    Record an already-authenticated provider webhook.

    Transport verification must happen BEFORE this function.

    Duplicate provider deliveries return the existing event and increment
    duplicate_count instead of creating another processing record.
    """

    safe_payload = safe_webhook_payload(
        payload,
    )

    safe_headers = safe_webhook_headers(
        headers,
    )

    gateway_value = _clean(
        gateway
    ).upper()

    event_type_value = _clean(
        event_type
    ).lower()

    provider_payment_id_value = _clean(
        provider_payment_id
    )

    if not gateway_value:
        raise ValidationError(
            {"gateway": "Webhook gateway is required."}
        )

    if not event_type_value:
        raise ValidationError(
            {
                "event_type": (
                    "Webhook event type is required."
                )
            }
        )

    if not provider_payment_id_value:
        raise ValidationError(
            {
                "provider_payment_id": (
                    "Provider payment ID is required."
                )
            }
        )

    try:
        attempts = int(max_attempts)
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            {
                "max_attempts": (
                    "Webhook max attempts is invalid."
                )
            }
        ) from exc

    if attempts < 1:
        raise ValidationError(
            {
                "max_attempts": (
                    "Webhook max attempts must be at least 1."
                )
            }
        )

    fingerprint = (
        build_platform_webhook_fingerprint(
            gateway=gateway_value,
            event_type=event_type_value,
            provider_payment_id=(
                provider_payment_id_value
            ),
            payload=safe_payload,
        )
    )

    now = timezone.now()

    defaults = {
        "gateway": gateway_value,
        "provider_event_id": _provider_event_id(
            gateway=gateway_value,
            payload=payload,
        ),
        "event_type": event_type_value,
        "provider_payment_id": (
            provider_payment_id_value
        ),
        "body_sha256": webhook_body_sha256(
            body
        ),
        "status": (
            PlatformSubscriptionWebhookEvent
            .Status
            .RECEIVED
        ),
        "payload": safe_payload,
        "headers": safe_headers,
        "max_attempts": attempts,
        "received_at": now,
        "last_received_at": now,
    }

    try:
        event, created = (
            PlatformSubscriptionWebhookEvent
            .objects
            .get_or_create(
                event_fingerprint=fingerprint,
                defaults=defaults,
            )
        )
    except IntegrityError:
        event = (
            PlatformSubscriptionWebhookEvent
            .objects
            .select_for_update()
            .get(
                event_fingerprint=fingerprint
            )
        )
        created = False

    if created:
        return event, True

    (
        PlatformSubscriptionWebhookEvent
        .objects
        .filter(pk=event.pk)
        .update(
            duplicate_count=F(
                "duplicate_count"
            ) + 1,
            last_received_at=now,
            updated_at=now,
        )
    )

    event.refresh_from_db()

    return event, False


@transaction.atomic
def begin_platform_webhook_processing(
    event: PlatformSubscriptionWebhookEvent,
    *,
    force: bool = False,
) -> PlatformSubscriptionWebhookEvent:
    locked = (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_for_update()
        .get(pk=event.pk)
    )

    if (
        locked.status
        == PlatformSubscriptionWebhookEvent
        .Status
        .PROCESSED
    ):
        return locked

    if (
        locked.status
        == PlatformSubscriptionWebhookEvent
        .Status
        .PROCESSING
        and not force
    ):
        raise ValidationError(
            {
                "webhook": (
                    "Webhook event is already being processed."
                )
            }
        )

    if (
        locked.attempt_count
        >= locked.max_attempts
        and not force
    ):
        raise ValidationError(
            {
                "webhook": (
                    "Webhook event reached the maximum "
                    "processing attempts."
                )
            }
        )

    locked.status = (
        PlatformSubscriptionWebhookEvent
        .Status
        .PROCESSING
    )

    locked.attempt_count += 1
    locked.last_attempt_at = timezone.now()
    locked.next_retry_at = None
    locked.error_code = ""
    locked.error_message = ""
    locked.failed_at = None

    locked.save(
        update_fields=[
            "status",
            "attempt_count",
            "last_attempt_at",
            "next_retry_at",
            "error_code",
            "error_message",
            "failed_at",
            "updated_at",
        ]
    )

    return locked


def _retry_delay_seconds(
    attempt_count: int,
) -> int:
    attempt = max(
        int(attempt_count or 1),
        1,
    )

    # 30, 60, 120, 240, 480...
    return min(
        30 * (2 ** (attempt - 1)),
        3600,
    )


@transaction.atomic
def link_platform_webhook_payment(
    event: PlatformSubscriptionWebhookEvent,
    *,
    payment: PlatformSubscriptionPayment,
) -> PlatformSubscriptionWebhookEvent:
    locked = (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_for_update()
        .get(pk=event.pk)
    )

    if (
        locked.payment_id
        and locked.payment_id != payment.pk
    ):
        raise ValidationError(
            {
                "payment": (
                    "Webhook event is already linked to "
                    "another platform payment."
                )
            }
        )

    payment_gateway = _clean(
        payment.gateway
    ).upper()

    if payment_gateway != locked.gateway:
        raise ValidationError(
            {
                "payment": (
                    "Webhook gateway does not match "
                    "platform payment."
                )
            }
        )

    if (
        _clean(payment.gateway_payment_id)
        != locked.provider_payment_id
    ):
        raise ValidationError(
            {
                "payment": (
                    "Webhook provider payment ID does not "
                    "match platform payment."
                )
            }
        )

    locked.payment = payment
    locked.save(
        update_fields=[
            "payment",
            "updated_at",
        ]
    )

    return locked


@transaction.atomic
def mark_platform_webhook_processed(
    event: PlatformSubscriptionWebhookEvent,
    *,
    payment: PlatformSubscriptionPayment,
) -> PlatformSubscriptionWebhookEvent:
    locked = (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_for_update()
        .get(pk=event.pk)
    )

    if (
        locked.payment_id
        and locked.payment_id != payment.pk
    ):
        raise ValidationError(
            {
                "payment": (
                    "Webhook event is linked to another "
                    "platform payment."
                )
            }
        )

    locked.payment = payment
    locked.status = (
        PlatformSubscriptionWebhookEvent
        .Status
        .PROCESSED
    )
    locked.processed_at = timezone.now()
    locked.failed_at = None
    locked.next_retry_at = None
    locked.error_code = ""
    locked.error_message = ""

    locked.save(
        update_fields=[
            "payment",
            "status",
            "processed_at",
            "failed_at",
            "next_retry_at",
            "error_code",
            "error_message",
            "updated_at",
        ]
    )

    return locked


@transaction.atomic
def mark_platform_webhook_unmatched(
    event: PlatformSubscriptionWebhookEvent,
    *,
    error_message: str = "",
) -> PlatformSubscriptionWebhookEvent:
    locked = (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_for_update()
        .get(pk=event.pk)
    )

    now = timezone.now()

    locked.status = (
        PlatformSubscriptionWebhookEvent
        .Status
        .UNMATCHED
    )

    locked.failed_at = now
    locked.error_code = (
        "PAYMENT_NOT_FOUND"
    )

    locked.error_message = (
        _clean(error_message)
        or "Platform payment could not be resolved."
    )

    if (
        locked.attempt_count
        < locked.max_attempts
    ):
        locked.next_retry_at = (
            now
            + timedelta(
                seconds=_retry_delay_seconds(
                    locked.attempt_count
                )
            )
        )
    else:
        locked.next_retry_at = None

    locked.save(
        update_fields=[
            "status",
            "failed_at",
            "error_code",
            "error_message",
            "next_retry_at",
            "updated_at",
        ]
    )

    return locked


@transaction.atomic
def mark_platform_webhook_failed(
    event: PlatformSubscriptionWebhookEvent,
    *,
    error_code: str,
    error_message: str = "",
    retryable: bool = False,
) -> PlatformSubscriptionWebhookEvent:
    locked = (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_for_update()
        .get(pk=event.pk)
    )

    now = timezone.now()

    locked.status = (
        PlatformSubscriptionWebhookEvent
        .Status
        .FAILED
    )

    locked.failed_at = now
    locked.error_code = (
        _clean(error_code).upper()
        or "PROCESSING_FAILED"
    )

    locked.error_message = _clean(
        error_message
    )[:4000]

    if (
        retryable
        and locked.attempt_count
        < locked.max_attempts
    ):
        locked.next_retry_at = (
            now
            + timedelta(
                seconds=_retry_delay_seconds(
                    locked.attempt_count
                )
            )
        )
    else:
        locked.next_retry_at = None

    locked.save(
        update_fields=[
            "status",
            "failed_at",
            "error_code",
            "error_message",
            "next_retry_at",
            "updated_at",
        ]
    )

    return locked


def due_platform_webhook_events(
    *,
    limit: int = 100,
):
    now = timezone.now()

    normalized_limit = max(
        min(int(limit or 100), 1000),
        1,
    )

    return (
        PlatformSubscriptionWebhookEvent
        .objects
        .filter(
            status__in=[
                PlatformSubscriptionWebhookEvent
                .Status
                .FAILED,
                PlatformSubscriptionWebhookEvent
                .Status
                .UNMATCHED,
            ],
            next_retry_at__isnull=False,
            next_retry_at__lte=now,
        )
        .filter(
            attempt_count__lt=F(
                "max_attempts"
            )
        )
        .order_by(
            "next_retry_at",
            "id",
        )[:normalized_limit]
    )
