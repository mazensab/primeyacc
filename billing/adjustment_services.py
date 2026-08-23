from __future__ import annotations

import secrets
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from billing.models import (
    PlatformSubscriptionAdjustment,
    PlatformSubscriptionAdjustmentEvent,
    PlatformSubscriptionPayment,
    ZERO_MONEY,
    money,
)


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _reference() -> str:
    return (
        "PADJ-"
        + timezone.localdate().strftime("%Y")
        + "-"
        + secrets.token_hex(8).upper()
    )


def _safe_metadata(value: Any) -> dict[str, Any]:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise ValidationError(
            {
                "metadata":
                    "Adjustment metadata must be a JSON object."
            }
        )

    return dict(value)


def record_adjustment_event(
    *,
    adjustment: PlatformSubscriptionAdjustment,
    event_type: str,
    actor=None,
    message: str = "",
    payload: dict[str, Any] | None = None,
) -> PlatformSubscriptionAdjustmentEvent:
    return (
        PlatformSubscriptionAdjustmentEvent
        .objects
        .create(
            adjustment=adjustment,
            event_type=_clean(
                event_type
            ).upper(),
            actor=actor,
            message=_clean(message),
            payload=_safe_metadata(
                payload
            ),
        )
    )


@transaction.atomic
def create_or_get_platform_adjustment(
    *,
    payment: PlatformSubscriptionPayment,
    adjustment_type: str,
    amount: Any,
    idempotency_key: str,
    reason: str = "",
    accounting_reference: str = "",
    metadata: dict[str, Any] | None = None,
    created_by=None,
) -> tuple[
    PlatformSubscriptionAdjustment,
    bool,
]:
    if not payment or not payment.pk:
        raise ValidationError(
            {
                "payment":
                    "Saved platform payment is required."
            }
        )

    normalized_key = _clean(
        idempotency_key
    )

    if not normalized_key:
        raise ValidationError(
            {
                "idempotency_key":
                    "Adjustment idempotency key is required."
            }
        )

    normalized_type = _clean(
        adjustment_type
    ).upper()

    if normalized_type not in {
        value
        for value, _
        in PlatformSubscriptionAdjustment
        .AdjustmentType
        .choices
    }:
        raise ValidationError(
            {
                "adjustment_type":
                    "Invalid platform adjustment type."
            }
        )

    normalized_amount = money(
        amount
    )

    if normalized_amount <= ZERO_MONEY:
        raise ValidationError(
            {
                "amount":
                    "Adjustment amount must be greater than zero."
            }
        )

    existing = (
        PlatformSubscriptionAdjustment
        .objects
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
                        "Adjustment idempotency key belongs "
                        "to another payment."
                    )
                }
            )

        if (
            existing.adjustment_type
            != normalized_type
            or money(existing.amount)
            != normalized_amount
        ):
            raise ValidationError(
                {
                    "idempotency_key": (
                        "Adjustment idempotency key was already "
                        "used with another financial contract."
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
        )
        .get(pk=payment.pk)
    )

    adjustment = (
        PlatformSubscriptionAdjustment
        .objects
        .create(
            adjustment_reference=_reference(),
            idempotency_key=normalized_key,
            payment=locked_payment,
            subscription=(
                locked_payment.subscription
            ),
            company=locked_payment.company,
            adjustment_type=normalized_type,
            status=(
                PlatformSubscriptionAdjustment
                .Status
                .POSTED
            ),
            amount=normalized_amount,
            currency_code=(
                _clean(
                    locked_payment.currency_code
                ).upper()
                or "SAR"
            ),
            reason=_clean(reason),
            accounting_reference=_clean(
                accounting_reference
            ),
            metadata=_safe_metadata(
                metadata
            ),
            created_by=created_by,
        )
    )

    record_adjustment_event(
        adjustment=adjustment,
        event_type="POSTED",
        actor=created_by,
        message=(
            "Platform financial adjustment posted."
        ),
        payload={
            "payment_id":
                locked_payment.id,
            "payment_reference":
                locked_payment.payment_reference,
            "adjustment_type":
                normalized_type,
            "amount":
                f"{normalized_amount:.2f}",
            "currency_code":
                adjustment.currency_code,
            "accounting_reference":
                adjustment.accounting_reference,
        },
    )

    return adjustment, True


@transaction.atomic
def reverse_platform_adjustment(
    *,
    adjustment: PlatformSubscriptionAdjustment,
    actor=None,
    reason: str = "",
) -> PlatformSubscriptionAdjustment:
    locked = (
        PlatformSubscriptionAdjustment
        .objects
        .select_for_update()
        .get(pk=adjustment.pk)
    )

    if locked.status == (
        PlatformSubscriptionAdjustment
        .Status
        .REVERSED
    ):
        return locked

    locked.status = (
        PlatformSubscriptionAdjustment
        .Status
        .REVERSED
    )

    locked.reversed_at = timezone.now()
    locked.reversed_by = actor

    if reason:
        metadata = dict(
            locked.metadata or {}
        )

        metadata[
            "reversal_reason"
        ] = _clean(reason)

        locked.metadata = metadata

    locked.save()

    record_adjustment_event(
        adjustment=locked,
        event_type="REVERSED",
        actor=actor,
        message=(
            _clean(reason)
            or "Platform financial adjustment reversed."
        ),
    )

    return locked
