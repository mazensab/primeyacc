from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from billing.models import PlatformSubscriptionPayment
from billing.payment_services import (
    cancel_subscription_payment_attempt,
    confirm_subscription_payment,
    fail_subscription_payment,
    record_payment_event,
    validate_payment_financial_contract,
)
from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.exceptions import (
    PaymentGatewayVerificationError,
)
from integrations.payments.registry import (
    get_payment_gateway_adapter,
)
from integrations.payments.types import (
    PaymentResult,
    PaymentStatus,
)


_MINOR_QUANTIZER = Decimal("1")


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _major_to_minor(value: Any) -> int:
    try:
        amount = Decimal(str(value))
    except Exception as exc:
        raise ValidationError(
            {"amount": "Invalid platform payment amount."}
        ) from exc

    if not amount.is_finite() or amount < 0:
        raise ValidationError(
            {"amount": "Invalid platform payment amount."}
        )

    return int(
        (amount * Decimal("100")).quantize(
            _MINOR_QUANTIZER,
            rounding=ROUND_HALF_UP,
        )
    )


def validate_gateway_result(
    *,
    payment: PlatformSubscriptionPayment,
    result: PaymentResult,
) -> None:
    validate_payment_financial_contract(
        payment=payment,
        subscription=payment.subscription,
    )

    expected_gateway = _clean(payment.gateway).lower()

    if expected_gateway and expected_gateway != result.gateway.value:
        raise PaymentGatewayVerificationError(
            "Gateway result does not match platform payment gateway."
        )

    expected_amount = _major_to_minor(payment.amount)

    if result.amount != expected_amount:
        raise PaymentGatewayVerificationError(
            "Gateway result amount does not match platform payment."
        )

    if (
        _clean(result.currency).upper()
        != _clean(payment.currency_code).upper()
    ):
        raise PaymentGatewayVerificationError(
            "Gateway result currency does not match platform payment."
        )

    if result.reference:
        allowed_references = {
            _clean(payment.payment_reference),
            _clean(payment.billing_reference),
        }

        if (
            _clean(result.reference)
            not in allowed_references
        ):
            raise PaymentGatewayVerificationError(
                "Gateway result reference does not match platform payment."
            )


@transaction.atomic
def apply_gateway_result(
    *,
    payment: PlatformSubscriptionPayment,
    result: PaymentResult,
    actor=None,
):
    """
    Apply a verified provider-neutral result to Phase 19 lifecycle.

    Terminal states are delegated to existing Phase 19 services.
    Non-terminal provider states move the attempt to PROCESSING.
    """

    locked = (
        PlatformSubscriptionPayment.objects
        .select_for_update()
        .select_related(
            "subscription",
            "invoice",
        )
        .get(pk=payment.pk)
    )

    validate_gateway_result(
        payment=locked,
        result=result,
    )

    provider_snapshot = (
        dict(result.raw)
        if isinstance(result.raw, dict)
        else {}
    )

    if result.status is PaymentStatus.PAID:
        return confirm_subscription_payment(
            payment=locked,
            actor=actor,
            gateway_payment_id=(
                result.provider_payment_id
            ),
            provider_response_snapshot=(
                provider_snapshot
            ),
        )

    if result.status is PaymentStatus.FAILED:
        failed = fail_subscription_payment(
            payment=locked,
            actor=actor,
            failure_code="PROVIDER_FAILED",
            failure_message=(
                "Payment provider reported a failed payment."
            ),
            provider_response_snapshot=(
                provider_snapshot
            ),
        )
        return failed

    if result.status in {
        PaymentStatus.CANCELLED,
        PaymentStatus.VOIDED,
    }:
        cancelled = (
            cancel_subscription_payment_attempt(
                payment=locked,
                actor=actor,
                reason=(
                    "Payment provider reported a "
                    f"{result.status.value} payment."
                ),
            )
        )

        if provider_snapshot:
            cancelled.provider_response_snapshot = (
                provider_snapshot
            )

        if result.provider_payment_id:
            cancelled.gateway_payment_id = (
                result.provider_payment_id
            )

        cancelled.save(
            update_fields=[
                "provider_response_snapshot",
                "gateway_payment_id",
                "updated_at",
            ]
        )

        return cancelled

    processing_provider_statuses = {
        PaymentStatus.INITIATED,
        PaymentStatus.PENDING,
        PaymentStatus.AUTHORIZED,
    }

    if result.status not in processing_provider_statuses:
        raise PaymentGatewayVerificationError(
            "Unsupported provider payment status for platform "
            f"payment lifecycle: {result.status.value}."
        )

    if locked.status in {
        PlatformSubscriptionPayment.Status.FAILED,
        PlatformSubscriptionPayment.Status.CANCELLED,
        PlatformSubscriptionPayment.Status.PAID,
    }:
        raise ValidationError(
            {
                "status": (
                    "Terminal platform payment cannot return "
                    "to a processing provider state."
                )
            }
        )

    old_status = locked.status

    locked.status = (
        PlatformSubscriptionPayment.Status.PROCESSING
    )
    locked.processing_at = (
        locked.processing_at or timezone.now()
    )
    locked.gateway = result.gateway.value.upper()
    locked.gateway_payment_id = (
        result.provider_payment_id
    )
    locked.provider_response_snapshot = (
        provider_snapshot
    )

    locked.save(
        update_fields=[
            "status",
            "processing_at",
            "gateway",
            "gateway_payment_id",
            "provider_response_snapshot",
            "updated_at",
        ]
    )

    record_payment_event(
        payment=locked,
        event_type="PROCESSING",
        actor=actor,
        from_status=old_status,
        to_status=locked.status,
        message=(
            "Payment provider reported a non-terminal state."
        ),
        payload={
            "provider_status": result.status.value,
            "gateway": result.gateway.value,
            "gateway_payment_id": (
                result.provider_payment_id
            ),
        },
    )

    return locked


def verify_and_apply_gateway_payment(
    *,
    payment: PlatformSubscriptionPayment,
    actor=None,
    adapter: PaymentGatewayAdapter | None = None,
):
    """
    Fetch and verify the payment directly from the provider before
    mutating Mhamcloud platform billing state.
    """

    if not payment.gateway:
        raise ValidationError(
            {"gateway": "Platform payment gateway is required."}
        )

    if not payment.gateway_payment_id:
        raise ValidationError(
            {
                "gateway_payment_id": (
                    "Provider payment ID is required."
                )
            }
        )

    gateway_adapter = (
        adapter
        or get_payment_gateway_adapter(
            payment.gateway
        )
    )

    # Retrieve the authoritative provider state directly.
    #
    # Do not accept a payment status from the browser. We intentionally
    # retrieve the provider payment here instead of using adapter-specific
    # success-only verify_payment() implementations because the platform
    # lifecycle must also be able to apply authoritative pending, failed,
    # cancelled, and other non-success provider states.
    result = gateway_adapter.retrieve_payment(
        payment.gateway_payment_id
    )

    if (
        _clean(result.provider_payment_id)
        != _clean(payment.gateway_payment_id)
    ):
        raise PaymentGatewayVerificationError(
            "Provider payment ID does not match platform payment."
        )

    return apply_gateway_result(
        payment=payment,
        result=result,
        actor=actor,
    )
