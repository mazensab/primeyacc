from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.exceptions import ValidationError

from billing.models import (
    PlatformSubscriptionPayment,
    PlatformSubscriptionWebhookEvent,
)
from billing.webhook_services import (
    begin_platform_webhook_processing,
    link_platform_webhook_payment,
    mark_platform_webhook_failed,
    mark_platform_webhook_processed,
    mark_platform_webhook_unmatched,
    record_platform_webhook_event,
)
from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.exceptions import (
    PaymentGatewayRequestError,
    PaymentGatewayResponseError,
    PaymentGatewayVerificationError,
)
from integrations.payments.platform_bridge import (
    verify_and_apply_gateway_payment,
)
from integrations.payments.registry import (
    get_payment_gateway_adapter,
    normalize_gateway_name,
)
from integrations.payments.types import (
    PaymentGatewayName,
    WebhookEvent,
)


class PlatformWebhookPaymentNotFound(RuntimeError):
    pass


class PlatformWebhookPaymentAmbiguous(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class PlatformWebhookResult:
    payment_id: int
    gateway: str
    event_type: str
    status: str
    webhook_event_id: int | None = None
    duplicate: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "payment_id": self.payment_id,
            "gateway": self.gateway,
            "event_type": self.event_type,
            "status": self.status,
            "webhook_event_id": self.webhook_event_id,
            "duplicate": self.duplicate,
        }


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _find_platform_payment(
    *,
    gateway: PaymentGatewayName,
    provider_payment_id: str,
) -> PlatformSubscriptionPayment:
    provider_payment_id = _clean(
        provider_payment_id
    )

    if not provider_payment_id:
        raise PaymentGatewayVerificationError(
            "Webhook provider payment ID is required."
        )

    rows = list(
        PlatformSubscriptionPayment
        .objects
        .filter(
            gateway=gateway.value.upper(),
            gateway_payment_id=provider_payment_id,
        )
        .select_related(
            "subscription",
            "subscription__plan",
            "company",
            "invoice",
            "receipt",
        )
        .order_by("-id")[:2]
    )

    if not rows:
        raise PlatformWebhookPaymentNotFound(
            "No platform payment matches the provider payment."
        )

    if len(rows) != 1:
        raise PlatformWebhookPaymentAmbiguous(
            "Provider payment maps to multiple platform payments."
        )

    payment = rows[0]

    if (
        _clean(payment.gateway).lower()
        != gateway.value
    ):
        raise PaymentGatewayVerificationError(
            "Webhook gateway does not match platform payment."
        )

    if (
        _clean(payment.gateway_payment_id)
        != provider_payment_id
    ):
        raise PaymentGatewayVerificationError(
            "Webhook provider payment ID does not match "
            "platform payment."
        )

    return payment


def _verify_platform_webhook(
    *,
    gateway: str | PaymentGatewayName,
    headers: dict[str, str],
    body: bytes,
    payload: dict[str, Any],
    adapter: PaymentGatewayAdapter | None = None,
) -> tuple[
    PaymentGatewayName,
    PaymentGatewayAdapter,
    WebhookEvent,
]:
    gateway_name = normalize_gateway_name(
        gateway
    )

    gateway_adapter = (
        adapter
        or get_payment_gateway_adapter(
            gateway_name
        )
    )

    event = gateway_adapter.verify_webhook(
        headers=dict(headers or {}),
        body=bytes(body or b""),
        payload=dict(payload or {}),
    )

    if event.gateway != gateway_name:
        raise PaymentGatewayVerificationError(
            "Webhook gateway does not match requested gateway."
        )

    provider_payment_id = _clean(
        event.provider_payment_id
    )

    if not provider_payment_id:
        raise PaymentGatewayVerificationError(
            "Webhook provider payment ID is missing."
        )

    return (
        gateway_name,
        gateway_adapter,
        event,
    )


def _apply_verified_platform_webhook(
    *,
    gateway_name: PaymentGatewayName,
    gateway_adapter: PaymentGatewayAdapter,
    event: WebhookEvent,
):
    provider_payment_id = _clean(
        event.provider_payment_id
    )

    payment = _find_platform_payment(
        gateway=gateway_name,
        provider_payment_id=provider_payment_id,
    )

    applied = verify_and_apply_gateway_payment(
        payment=payment,
        actor=None,
        adapter=gateway_adapter,
    )

    applied_payment = (
        applied[0]
        if isinstance(applied, tuple)
        else applied
    )

    if (
        getattr(
            applied_payment,
            "pk",
            None,
        )
        != payment.pk
    ):
        raise ValidationError(
            {
                "payment": (
                    "Webhook verification returned a "
                    "different platform payment."
                )
            }
        )

    return payment, applied_payment


def process_platform_payment_webhook(
    *,
    gateway: str | PaymentGatewayName,
    headers: dict[str, str],
    body: bytes,
    payload: dict[str, Any],
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformWebhookResult:
    """
    Existing provider-verification orchestration.

    Kept intentionally stable for the previously approved payment
    architecture and its unit tests.

    Public webhook endpoints use the durable wrapper below.
    """

    (
        gateway_name,
        gateway_adapter,
        event,
    ) = _verify_platform_webhook(
        gateway=gateway,
        headers=headers,
        body=body,
        payload=payload,
        adapter=adapter,
    )

    payment, applied_payment = (
        _apply_verified_platform_webhook(
            gateway_name=gateway_name,
            gateway_adapter=gateway_adapter,
            event=event,
        )
    )

    return PlatformWebhookResult(
        payment_id=payment.pk,
        gateway=gateway_name.value,
        event_type=_clean(
            event.event_type
        ),
        status=_clean(
            applied_payment.status
        ),
    )


def process_durable_platform_payment_webhook(
    *,
    gateway: str | PaymentGatewayName,
    headers: dict[str, str],
    body: bytes,
    payload: dict[str, Any],
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformWebhookResult:
    """
    Production webhook path.

    Sequence:
    1. authenticate/verify provider notification;
    2. persist sanitized authenticated event durably;
    3. apply replay/idempotency protection;
    4. lock processing attempt;
    5. resolve platform payment;
    6. fetch provider state authoritatively again;
    7. apply existing payment lifecycle;
    8. mark event processed or preserve failure/unmatched state.
    """

    (
        gateway_name,
        gateway_adapter,
        event,
    ) = _verify_platform_webhook(
        gateway=gateway,
        headers=headers,
        body=body,
        payload=payload,
        adapter=adapter,
    )

    ledger, created = (
        record_platform_webhook_event(
            gateway=gateway_name.value,
            event_type=event.event_type,
            provider_payment_id=(
                event.provider_payment_id
            ),
            payload=event.payload,
            headers=headers,
            body=body,
        )
    )

    ledger.refresh_from_db()

    # Processed duplicate/replay:
    # never mutate subscription/payment state twice.
    if (
        ledger.status
        == PlatformSubscriptionWebhookEvent
        .Status
        .PROCESSED
    ):
        payment = ledger.payment

        if payment is None:
            raise ValidationError(
                {
                    "webhook": (
                        "Processed webhook event has no "
                        "linked platform payment."
                    )
                }
            )

        return PlatformWebhookResult(
            payment_id=payment.pk,
            gateway=gateway_name.value,
            event_type=ledger.event_type,
            status=_clean(
                payment.status
            ),
            webhook_event_id=ledger.pk,
            duplicate=True,
        )

    try:
        ledger = (
            begin_platform_webhook_processing(
                ledger
            )
        )

        payment = _find_platform_payment(
            gateway=gateway_name,
            provider_payment_id=(
                event.provider_payment_id
            ),
        )

        ledger = link_platform_webhook_payment(
            ledger,
            payment=payment,
        )

        applied = (
            verify_and_apply_gateway_payment(
                payment=payment,
                actor=None,
                adapter=gateway_adapter,
            )
        )

        applied_payment = (
            applied[0]
            if isinstance(applied, tuple)
            else applied
        )

        if (
            getattr(
                applied_payment,
                "pk",
                None,
            )
            != payment.pk
        ):
            raise ValidationError(
                {
                    "payment": (
                        "Webhook verification returned a "
                        "different platform payment."
                    )
                }
            )

        ledger = (
            mark_platform_webhook_processed(
                ledger,
                payment=payment,
            )
        )

        return PlatformWebhookResult(
            payment_id=payment.pk,
            gateway=gateway_name.value,
            event_type=ledger.event_type,
            status=_clean(
                applied_payment.status
            ),
            webhook_event_id=ledger.pk,
            duplicate=not created,
        )

    except PlatformWebhookPaymentNotFound as exc:
        mark_platform_webhook_unmatched(
            ledger,
            error_message=str(exc),
        )
        raise

    except PlatformWebhookPaymentAmbiguous as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="PAYMENT_AMBIGUOUS",
            error_message=str(exc),
            retryable=False,
        )
        raise

    except (
        PaymentGatewayRequestError,
        PaymentGatewayResponseError,
    ) as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="PROVIDER_UNAVAILABLE",
            error_message=str(exc),
            retryable=True,
        )
        raise

    except PaymentGatewayVerificationError as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="PROVIDER_VERIFICATION_FAILED",
            error_message=str(exc),
            retryable=False,
        )
        raise

    except ValidationError as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="PAYMENT_STATE_CONFLICT",
            error_message=str(exc),
            retryable=False,
        )
        raise

    except Exception as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="PROCESSING_ERROR",
            error_message=(
                exc.__class__.__name__
            ),
            retryable=True,
        )
        raise


def reprocess_platform_webhook_event(
    *,
    event_id: int,
    force: bool = False,
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformWebhookResult:
    """
    Safely reprocess an already-authenticated stored webhook.

    Transport authentication is intentionally NOT re-run from stored
    headers because secrets are redacted.

    Security is preserved because the local payment is resolved using the
    persisted provider payment ID and the provider's authoritative API is
    fetched again before any payment/subscription state mutation.
    """

    ledger = (
        PlatformSubscriptionWebhookEvent
        .objects
        .select_related(
            "payment",
        )
        .get(pk=event_id)
    )

    gateway_name = normalize_gateway_name(
        ledger.gateway
    )

    gateway_adapter = (
        adapter
        or get_payment_gateway_adapter(
            gateway_name
        )
    )

    if (
        ledger.status
        == PlatformSubscriptionWebhookEvent
        .Status
        .PROCESSED
        and not force
    ):
        payment = ledger.payment

        if payment is None:
            raise ValidationError(
                {
                    "webhook": (
                        "Processed webhook event has no "
                        "linked payment."
                    )
                }
            )

        return PlatformWebhookResult(
            payment_id=payment.pk,
            gateway=gateway_name.value,
            event_type=ledger.event_type,
            status=payment.status,
            webhook_event_id=ledger.pk,
            duplicate=True,
        )

    try:
        ledger = (
            begin_platform_webhook_processing(
                ledger,
                force=force,
            )
        )

        payment = _find_platform_payment(
            gateway=gateway_name,
            provider_payment_id=(
                ledger.provider_payment_id
            ),
        )

        ledger = link_platform_webhook_payment(
            ledger,
            payment=payment,
        )

        applied = verify_and_apply_gateway_payment(
            payment=payment,
            actor=None,
            adapter=gateway_adapter,
        )

        applied_payment = (
            applied[0]
            if isinstance(applied, tuple)
            else applied
        )

        ledger = (
            mark_platform_webhook_processed(
                ledger,
                payment=payment,
            )
        )

        return PlatformWebhookResult(
            payment_id=payment.pk,
            gateway=gateway_name.value,
            event_type=ledger.event_type,
            status=_clean(
                applied_payment.status
            ),
            webhook_event_id=ledger.pk,
            duplicate=False,
        )

    except PlatformWebhookPaymentNotFound as exc:
        mark_platform_webhook_unmatched(
            ledger,
            error_message=str(exc),
        )
        raise

    except (
        PaymentGatewayRequestError,
        PaymentGatewayResponseError,
    ) as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="PROVIDER_UNAVAILABLE",
            error_message=str(exc),
            retryable=True,
        )
        raise

    except Exception as exc:
        mark_platform_webhook_failed(
            ledger,
            error_code="REPROCESS_FAILED",
            error_message=(
                str(exc)
                if isinstance(
                    exc,
                    (
                        ValidationError,
                        PaymentGatewayVerificationError,
                    ),
                )
                else exc.__class__.__name__
            ),
            retryable=False,
        )
        raise
