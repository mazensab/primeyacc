from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from billing.models import (
    PlatformSubscriptionPayment,
)
from billing.payment_services import (
    cancel_subscription_payment_attempt,
    record_payment_event,
)
from integrations.payments.base import (
    PaymentGatewayAdapter,
)
from integrations.payments.platform_bridge import (
    validate_gateway_result,
)
from integrations.payments.registry import (
    get_payment_gateway_adapter,
)
from integrations.payments.types import (
    PaymentStatus,
)


VOIDABLE_GATEWAYS = frozenset(
    {
        "MOYASAR",
        "TAMARA",
    }
)


def _clean(value: Any) -> str:
    return str(value or "").strip()


def supports_platform_provider_void(
    payment: PlatformSubscriptionPayment,
) -> bool:
    gateway = _clean(
        getattr(payment, "gateway", "")
    ).upper()

    return (
        gateway in VOIDABLE_GATEWAYS
        and payment.status
        in {
            PlatformSubscriptionPayment.Status.PENDING,
            PlatformSubscriptionPayment.Status.PROCESSING,
        }
        and bool(
            _clean(
                getattr(
                    payment,
                    "gateway_payment_id",
                    "",
                )
            )
        )
    )


@transaction.atomic
def void_platform_payment_attempt(
    *,
    payment: PlatformSubscriptionPayment,
    actor=None,
    reason: str = "",
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformSubscriptionPayment:
    """
    Cancel/void an in-flight provider-managed platform payment.

    Safety:
    - PAID payments are never voided here;
    - Tabby is deliberately excluded because its current close operation
      normalizes to CLOSED/PAID and is not a confirmed void contract;
    - local cancellation occurs only after provider confirmation.
    """

    locked = (
        PlatformSubscriptionPayment
        .objects
        .select_for_update()
        .select_related(
            "subscription",
            "invoice",
        )
        .get(pk=payment.pk)
    )

    if locked.status == (
        PlatformSubscriptionPayment
        .Status
        .CANCELLED
    ):
        return locked

    if locked.status == (
        PlatformSubscriptionPayment
        .Status
        .PAID
    ):
        raise ValidationError(
            {
                "status": (
                    "A PAID platform payment cannot be voided. "
                    "Use the refund lifecycle."
                )
            }
        )

    if locked.status not in {
        PlatformSubscriptionPayment.Status.PENDING,
        PlatformSubscriptionPayment.Status.PROCESSING,
    }:
        raise ValidationError(
            {
                "status": (
                    "Only PENDING or PROCESSING platform payments "
                    "can be provider-voided."
                )
            }
        )

    gateway = _clean(
        locked.gateway
    ).upper()

    if gateway not in VOIDABLE_GATEWAYS:
        raise ValidationError(
            {
                "gateway": (
                    "This platform gateway does not have a safe "
                    "provider-void contract."
                )
            }
        )

    if not _clean(
        locked.gateway_payment_id
    ):
        raise ValidationError(
            {
                "gateway_payment_id": (
                    "Provider payment ID is required for void."
                )
            }
        )

    gateway_adapter = (
        adapter
        or get_payment_gateway_adapter(
            locked.gateway
        )
    )

    result = gateway_adapter.cancel_payment(
        locked.gateway_payment_id
    )

    validate_gateway_result(
        payment=locked,
        result=result,
    )

    if result.status not in {
        PaymentStatus.CANCELLED,
        PaymentStatus.VOIDED,
    }:
        raise ValidationError(
            {
                "provider_status": (
                    "Payment provider did not confirm cancellation/void."
                )
            }
        )

    cancelled = cancel_subscription_payment_attempt(
        payment=locked,
        actor=actor,
        reason=(
            _clean(reason)
            or (
                "Provider confirmed "
                f"{result.status.value}."
            )
        ),
    )

    if isinstance(result.raw, dict):
        from integrations.payments.platform_bridge import (
            _safe_provider_snapshot,
        )

        cancelled.provider_response_snapshot = (
            _safe_provider_snapshot(
                result.raw
            )
        )

    cancelled.gateway_payment_id = (
        result.provider_payment_id
        or cancelled.gateway_payment_id
    )

    cancelled.save(
        update_fields=[
            "provider_response_snapshot",
            "gateway_payment_id",
            "updated_at",
        ]
    )

    record_payment_event(
        payment=cancelled,
        event_type="PROVIDER_VOID_CONFIRMED",
        actor=actor,
        from_status=cancelled.status,
        to_status=cancelled.status,
        message=(
            "Provider cancellation/void confirmed."
        ),
        payload={
            "provider_status":
                result.status.value,
            "gateway":
                result.gateway.value,
            "gateway_payment_id":
                result.provider_payment_id,
        },
    )

    return cancelled
