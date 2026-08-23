from __future__ import annotations
import secrets
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from billing.models import (
    PlatformSubscriptionPayment,
    PlatformSubscriptionRefund,
    PlatformSubscriptionRefundEvent,
    ZERO_MONEY,
    money,
)
from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.registry import (
    get_payment_gateway_adapter,
)
from integrations.payments.types import (
    PaymentResult,
    PaymentStatus,
    RefundRequest,
)
REFUNDABLE_GATEWAYS = frozenset(
    {
        "MOYASAR",
        "TAMARA",
        "TABBY",
    }
)
_MINOR_QUANTIZER = Decimal("1")
def _clean(value: Any) -> str:
    return str(value or "").strip()
def _refund_reference() -> str:
    return (
        "PREF-"
        + timezone.localdate().strftime("%Y")
        + "-"
        + secrets.token_hex(8).upper()
    )
def _major_to_minor(value: Any) -> int:
    try:
        amount = Decimal(str(value))
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ValidationError(
            {"amount": "Invalid refund amount."}
        ) from exc
    if (
        not amount.is_finite()
        or amount <= ZERO_MONEY
    ):
        raise ValidationError(
            {
                "amount": (
                    "Refund amount must be "
                    "greater than zero."
                )
            }
        )
    return int(
        (
            amount * Decimal("100")
        ).quantize(
            _MINOR_QUANTIZER,
            rounding=ROUND_HALF_UP,
        )
    )
def _safe_snapshot(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}
    blocked = {
        "authorization",
        "api_key",
        "apikey",
        "secret",
        "secret_key",
        "secret_token",
        "token",
        "access_token",
        "refresh_token",
        "password",
        "signature",
        "private_key",
    }
    def scrub(item: Any) -> Any:
        if isinstance(item, dict):
            result: dict[str, Any] = {}
            for key, child in item.items():
                normalized = str(
                    key
                ).strip().lower()
                result[str(key)] = (
                    "[REDACTED]"
                    if normalized in blocked
                    else scrub(child)
                )
            return result
        if isinstance(item, list):
            return [
                scrub(child)
                for child in item
            ]
        if item is None or isinstance(
            item,
            (
                str,
                int,
                float,
                bool,
            ),
        ):
            return item
        return str(item)
    cleaned = scrub(value)
    return (
        cleaned
        if isinstance(cleaned, dict)
        else {}
    )
def record_refund_event(
    *,
    refund: PlatformSubscriptionRefund,
    event_type: str,
    actor=None,
    from_status: str = "",
    to_status: str = "",
    message: str = "",
    payload: dict[str, Any] | None = None,
) -> PlatformSubscriptionRefundEvent:
    return (
        PlatformSubscriptionRefundEvent
        .objects.create(
            refund=refund,
            event_type=_clean(
                event_type
            ).upper(),
            actor=actor,
            from_status=_clean(
                from_status
            ).upper(),
            to_status=_clean(
                to_status
            ).upper(),
            message=_clean(message),
            payload=_safe_snapshot(
                payload or {}
            ),
        )
    )
def get_successful_refunded_amount(
    payment: PlatformSubscriptionPayment,
) -> Decimal:
    if not payment or not payment.pk:
        return ZERO_MONEY
    value = (
        PlatformSubscriptionRefund.objects
        .filter(
            payment=payment,
            status=(
                PlatformSubscriptionRefund
                .Status
                .SUCCEEDED
            ),
        )
        .aggregate(total=Sum("amount"))
        .get("total")
        or ZERO_MONEY
    )
    return money(value)
def get_reserved_refund_amount(
    payment: PlatformSubscriptionPayment,
) -> Decimal:
    """
    Include in-flight refund requests so two concurrent refund
    requests cannot both reserve the same paid amount.
    """
    value = (
        PlatformSubscriptionRefund.objects
        .filter(
            payment=payment,
            status__in=[
                PlatformSubscriptionRefund
                .Status
                .PENDING,
                PlatformSubscriptionRefund
                .Status
                .PROCESSING,
                PlatformSubscriptionRefund
                .Status
                .SUCCEEDED,
            ],
        )
        .aggregate(total=Sum("amount"))
        .get("total")
        or ZERO_MONEY
    )
    return money(value)
def get_refundable_amount(
    payment: PlatformSubscriptionPayment,
) -> Decimal:
    if not payment or not payment.pk:
        return ZERO_MONEY
    return money(
        max(
            money(payment.amount)
            - get_reserved_refund_amount(
                payment
            ),
            ZERO_MONEY,
        )
    )
@transaction.atomic
def create_or_get_platform_refund(
    *,
    payment: PlatformSubscriptionPayment,
    amount: Any,
    idempotency_key: str,
    reason: str = "",
    metadata: dict[str, Any] | None = None,
    created_by=None,
) -> tuple[
    PlatformSubscriptionRefund,
    bool,
]:
    if not payment or not payment.pk:
        raise ValidationError(
            {
                "payment": (
                    "Saved platform payment "
                    "is required."
                )
            }
        )
    normalized_key = _clean(
        idempotency_key
    )
    if not normalized_key:
        raise ValidationError(
            {
                "idempotency_key": (
                    "Refund idempotency key "
                    "is required."
                )
            }
        )
    requested_amount = money(amount)
    if requested_amount <= ZERO_MONEY:
        raise ValidationError(
            {
                "amount": (
                    "Refund amount must be "
                    "greater than zero."
                )
            }
        )
    existing = (
        PlatformSubscriptionRefund.objects
        .select_related(
            "payment",
            "subscription",
            "company",
        )
        .filter(
            idempotency_key=normalized_key
        )
        .first()
    )
    if existing:
        if existing.payment_id != payment.pk:
            raise ValidationError(
                {
                    "idempotency_key": (
                        "Idempotency key belongs "
                        "to another payment."
                    )
                }
            )
        if money(
            existing.amount
        ) != requested_amount:
            raise ValidationError(
                {
                    "idempotency_key": (
                        "Idempotency key was already "
                        "used with another amount."
                    )
                }
            )
        return existing, False
    locked_payment = (
        PlatformSubscriptionPayment
        .objects
        .select_for_update()
        .select_related(
            "subscription",
            "company",
            "invoice",
        )
        .get(pk=payment.pk)
    )
    if locked_payment.status != (
        PlatformSubscriptionPayment
        .Status
        .PAID
    ):
        raise ValidationError(
            {
                "payment": (
                    "Only a PAID platform "
                    "payment can be refunded."
                )
            }
        )
    gateway = _clean(
        locked_payment.gateway
    ).upper()
    if gateway not in REFUNDABLE_GATEWAYS:
        raise ValidationError(
            {
                "gateway": (
                    "This platform payment gateway "
                    "does not support automated refunds."
                )
            }
        )
    if not _clean(
        locked_payment.gateway_payment_id
    ):
        raise ValidationError(
            {
                "gateway_payment_id": (
                    "Provider payment ID is required "
                    "before refunding."
                )
            }
        )
    refundable = get_refundable_amount(
        locked_payment
    )
    if requested_amount > refundable:
        raise ValidationError(
            {
                "amount": (
                    "Refund amount exceeds the "
                    "remaining refundable amount."
                )
            }
        )
    refund = (
        PlatformSubscriptionRefund
        .objects.create(
            refund_reference=(
                _refund_reference()
            ),
            idempotency_key=(
                normalized_key
            ),
            payment=locked_payment,
            subscription=(
                locked_payment.subscription
            ),
            company=locked_payment.company,
            status=(
                PlatformSubscriptionRefund
                .Status
                .PENDING
            ),
            gateway=gateway,
            amount=requested_amount,
            currency_code=(
                _clean(
                    locked_payment.currency_code
                ).upper()
                or "SAR"
            ),
            reason=_clean(reason),
            metadata=_safe_snapshot(
                metadata or {}
            ),
            created_by=created_by,
        )
    )
    record_refund_event(
        refund=refund,
        event_type="CREATED",
        actor=created_by,
        to_status=refund.status,
        message=(
            "Platform subscription refund "
            "request created."
        ),
        payload={
            "payment_id": (
                locked_payment.id
            ),
            "payment_reference": (
                locked_payment
                .payment_reference
            ),
            "amount": (
                f"{requested_amount:.2f}"
            ),
            "currency_code": (
                refund.currency_code
            ),
            "gateway": gateway,
        },
    )
    return refund, True
def _provider_refund_identifier(
    result: PaymentResult,
) -> str:
    raw = (
        result.raw
        if isinstance(
            result.raw,
            dict,
        )
        else {}
    )
    for key in (
        "refund_id",
        "refundId",
        "id",
    ):
        value = _clean(
            raw.get(key)
        )
        if value:
            return value
    return _clean(
        result.provider_payment_id
    )
@transaction.atomic
def execute_platform_refund(
    *,
    refund: PlatformSubscriptionRefund,
    actor=None,
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformSubscriptionRefund:
    locked = (
        PlatformSubscriptionRefund
        .objects
        .select_for_update()
        .select_related(
            "payment",
            "subscription",
            "company",
        )
        .get(pk=refund.pk)
    )
    if locked.status == (
        PlatformSubscriptionRefund
        .Status
        .SUCCEEDED
    ):
        return locked
    if locked.status in {
        PlatformSubscriptionRefund
        .Status
        .FAILED,
        PlatformSubscriptionRefund
        .Status
        .CANCELLED,
    }:
        raise ValidationError(
            {
                "status": (
                    "Terminal refund cannot "
                    "be executed again."
                )
            }
        )
    payment = (
        PlatformSubscriptionPayment
        .objects
        .select_for_update()
        .get(pk=locked.payment_id)
    )
    if payment.status != (
        PlatformSubscriptionPayment
        .Status
        .PAID
    ):
        raise ValidationError(
            {
                "payment": (
                    "Original payment is no "
                    "longer PAID."
                )
            }
        )
    gateway_adapter = (
        adapter
        or get_payment_gateway_adapter(
            locked.gateway
        )
    )
    request = RefundRequest(
        provider_payment_id=(
            payment.gateway_payment_id
        ),
        amount=_major_to_minor(
            locked.amount
        ),
        reason=locked.reason,
        metadata={
            "refund_reference": (
                locked.refund_reference
            ),
            "payment_reference": (
                payment.payment_reference
            ),
            "subscription_id": (
                payment.subscription_id
            ),
        },
    )
    old_status = locked.status
    locked.status = (
        PlatformSubscriptionRefund
        .Status
        .PROCESSING
    )
    locked.processing_at = (
        locked.processing_at
        or timezone.now()
    )
    locked.provider_request_snapshot = {
        "provider_payment_id": (
            request.provider_payment_id
        ),
        "amount": request.amount,
        "reason": request.reason,
        "metadata": dict(
            request.metadata
        ),
    }
    locked.save(
        update_fields=[
            "status",
            "processing_at",
            "provider_request_snapshot",
            "updated_at",
        ]
    )
    record_refund_event(
        refund=locked,
        event_type="PROCESSING",
        actor=actor,
        from_status=old_status,
        to_status=locked.status,
        message=(
            "Refund request sent to "
            "payment provider."
        ),
    )
    result = gateway_adapter.refund_payment(
        request
    )
    if result.gateway.value.lower() != (
        locked.gateway.lower()
    ):
        raise ValidationError(
            {
                "gateway": (
                    "Refund provider result does "
                    "not match payment gateway."
                )
            }
        )
    provider_snapshot = _safe_snapshot(
        result.raw
    )
    locked.provider_response_snapshot = (
        provider_snapshot
    )
    locked.provider_refund_id = (
        _provider_refund_identifier(
            result
        )
    )
    if result.status not in {
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED,
    }:
        old_status = locked.status
        locked.status = (
            PlatformSubscriptionRefund
            .Status
            .FAILED
        )
        locked.failed_at = timezone.now()
        locked.failure_code = (
            "PROVIDER_REFUND_NOT_CONFIRMED"
        )
        locked.failure_message = (
            "Provider did not confirm the refund."
        )
        locked.save()
        record_refund_event(
            refund=locked,
            event_type="FAILED",
            actor=actor,
            from_status=old_status,
            to_status=locked.status,
            message=(
                locked.failure_message
            ),
            payload={
                "provider_status": (
                    result.status.value
                )
            },
        )
        return locked
    old_status = locked.status
    locked.status = (
        PlatformSubscriptionRefund
        .Status
        .SUCCEEDED
    )
    locked.refunded_at = timezone.now()
    locked.failed_at = None
    locked.failure_code = ""
    locked.failure_message = ""
    locked.confirmed_by = actor
    locked.save()
    record_refund_event(
        refund=locked,
        event_type="SUCCEEDED",
        actor=actor,
        from_status=old_status,
        to_status=locked.status,
        message=(
            "Platform subscription refund "
            "confirmed by provider."
        ),
        payload={
            "provider_status": (
                result.status.value
            ),
            "provider_refund_id": (
                locked.provider_refund_id
            ),
        },
    )
    return locked
@transaction.atomic
def cancel_pending_platform_refund(
    *,
    refund: PlatformSubscriptionRefund,
    actor=None,
    reason: str = "",
) -> PlatformSubscriptionRefund:
    locked = (
        PlatformSubscriptionRefund
        .objects
        .select_for_update()
        .get(pk=refund.pk)
    )
    if locked.status == (
        PlatformSubscriptionRefund
        .Status
        .CANCELLED
    ):
        return locked
    if locked.status != (
        PlatformSubscriptionRefund
        .Status
        .PENDING
    ):
        raise ValidationError(
            {
                "status": (
                    "Only a PENDING refund "
                    "can be cancelled locally."
                )
            }
        )
    old_status = locked.status
    locked.status = (
        PlatformSubscriptionRefund
        .Status
        .CANCELLED
    )
    locked.cancelled_at = timezone.now()
    if reason:
        locked.reason = _clean(reason)
    locked.save()
    record_refund_event(
        refund=locked,
        event_type="CANCELLED",
        actor=actor,
        from_status=old_status,
        to_status=locked.status,
        message=(
            locked.reason
            or "Refund cancelled before execution."
        ),
    )
    return locked
