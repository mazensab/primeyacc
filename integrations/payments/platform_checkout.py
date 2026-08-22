from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone

from billing.payment_models import PlatformSubscriptionPayment
from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.registry import (
    get_payment_gateway_adapter,
    normalize_gateway_name,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentResult,
    PaymentStatus,
)


SERVER_SIDE_CHECKOUT_GATEWAYS = frozenset(
    {
        PaymentGatewayName.TAMARA,
        PaymentGatewayName.TABBY,
    }
)


@dataclass(frozen=True, slots=True)
class PlatformCheckoutResult:
    payment_id: int
    payment_reference: str
    gateway: str
    mode: str
    provider_payment_id: str
    checkout_url: str
    status: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "payment_id": self.payment_id,
            "payment_reference": self.payment_reference,
            "gateway": self.gateway,
            "mode": self.mode,
            "provider_payment_id": self.provider_payment_id,
            "checkout_url": self.checkout_url,
            "status": self.status,
        }


def build_platform_payment_request(
    *,
    payment: PlatformSubscriptionPayment,
    metadata: dict[str, Any] | None = None,
    description: str = "",
) -> PaymentRequest:
    if payment.pk is None:
        raise ValidationError(
            "Platform subscription payment must be saved before checkout."
        )

    if payment.status != PlatformSubscriptionPayment.Status.PENDING:
        raise ValidationError(
            "Checkout can only be initiated for a pending payment."
        )

    amount = _major_to_minor(payment.amount)

    if amount <= 0:
        raise ValidationError(
            "Platform subscription payment amount must be greater than zero."
        )

    currency = str(payment.currency_code or "").strip().upper()

    if len(currency) != 3 or not currency.isalpha():
        raise ValidationError(
            "Platform subscription payment currency is invalid."
        )

    reference = str(payment.payment_reference or "").strip()

    if not reference:
        raise ValidationError(
            "Platform subscription payment reference is required."
        )

    request_metadata = dict(metadata or {})
    request_metadata.setdefault(
        "payment_reference",
        reference,
    )

    callback_url = str(
        request_metadata.pop("callback_url", "") or ""
    ).strip()

    customer_name = str(
        request_metadata.pop("customer_name", "") or ""
    ).strip()

    customer_email = str(
        request_metadata.pop("customer_email", "") or ""
    ).strip()

    customer_phone = str(
        request_metadata.pop("customer_phone", "") or ""
    ).strip()

    subscription = getattr(
        payment,
        "subscription",
        None,
    )

    if subscription is not None:
        subscription_reference = str(
            getattr(
                subscription,
                "subscription_number",
                "",
            )
            or getattr(
                subscription,
                "reference",
                "",
            )
            or ""
        ).strip()

        if subscription_reference:
            request_metadata.setdefault(
                "subscription_reference",
                subscription_reference,
            )

    return PaymentRequest(
        amount=amount,
        currency=currency,
        description=(
            str(description or "").strip()
            or "Mhamcloud platform subscription"
        ),
        callback_url=callback_url,
        reference=reference,
        customer_name=customer_name,
        customer_email=customer_email,
        customer_phone=customer_phone,
        metadata=request_metadata,
    )


def initiate_platform_checkout(
    *,
    payment: PlatformSubscriptionPayment,
    metadata: dict[str, Any] | None = None,
    description: str = "",
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformCheckoutResult:
    gateway = normalize_gateway_name(
        payment.gateway
    )

    if gateway == PaymentGatewayName.MOYASAR:
        return _build_moyasar_client_checkout(
            payment=payment,
        )

    if gateway not in SERVER_SIDE_CHECKOUT_GATEWAYS:
        raise ValidationError(
            f"Gateway '{gateway.value}' does not support "
            "platform server-side checkout."
        )

    gateway_adapter = (
        adapter
        if adapter is not None
        else get_payment_gateway_adapter(gateway)
    )

    request = build_platform_payment_request(
        payment=payment,
        metadata=metadata,
        description=description,
    )

    result = gateway_adapter.create_payment(
        request
    )

    _validate_checkout_result(
        payment=payment,
        result=result,
        expected_gateway=gateway,
    )

    payment.gateway_payment_id = (
        result.provider_payment_id
    )
    payment.provider_request_snapshot = (
        _payment_request_snapshot(request)
    )
    payment.provider_response_snapshot = (
        _safe_provider_snapshot(result.raw)
    )

    processing_started = False

    if result.status in {
        PaymentStatus.INITIATED,
        PaymentStatus.PENDING,
        PaymentStatus.AUTHORIZED,
    }:
        if (
            payment.status
            != PlatformSubscriptionPayment.Status.PROCESSING
        ):
            processing_started = True

        payment.status = (
            PlatformSubscriptionPayment.Status.PROCESSING
        )

        if payment.processing_at is None:
            payment.processing_at = timezone.now()

    payment.save(
        update_fields=[
            "gateway_payment_id",
            "provider_request_snapshot",
            "provider_response_snapshot",
            "status",
            "processing_at",
            "updated_at",
        ]
    )

    if processing_started:
        _record_processing_event(payment)

    return PlatformCheckoutResult(
        payment_id=payment.pk,
        payment_reference=payment.payment_reference,
        gateway=gateway.value,
        mode="redirect",
        provider_payment_id=result.provider_payment_id,
        checkout_url=result.checkout_url,
        status=payment.status,
    )


def attach_moyasar_client_payment(
    *,
    payment: PlatformSubscriptionPayment,
    provider_payment_id: str,
) -> PlatformCheckoutResult:
    gateway = normalize_gateway_name(
        payment.gateway
    )

    if gateway != PaymentGatewayName.MOYASAR:
        raise ValidationError(
            "Client payment attachment is only valid for Moyasar."
        )

    if payment.status not in {
        PlatformSubscriptionPayment.Status.PENDING,
        PlatformSubscriptionPayment.Status.PROCESSING,
    }:
        raise ValidationError(
            "Moyasar provider payment cannot be attached "
            "to a terminal platform payment."
        )

    provider_payment_id = str(
        provider_payment_id or ""
    ).strip()

    if not provider_payment_id:
        raise ValidationError(
            "Moyasar provider payment ID is required."
        )

    existing_provider_id = str(
        payment.gateway_payment_id or ""
    ).strip()

    if (
        existing_provider_id
        and existing_provider_id != provider_payment_id
    ):
        raise ValidationError(
            "Platform payment is already linked to a different "
            "Moyasar payment."
        )

    processing_started = (
        payment.status
        != PlatformSubscriptionPayment.Status.PROCESSING
    )

    payment.gateway_payment_id = provider_payment_id
    payment.status = (
        PlatformSubscriptionPayment.Status.PROCESSING
    )

    if payment.processing_at is None:
        payment.processing_at = timezone.now()

    payment.save(
        update_fields=[
            "gateway_payment_id",
            "status",
            "processing_at",
            "updated_at",
        ]
    )

    if processing_started:
        _record_processing_event(payment)

    return PlatformCheckoutResult(
        payment_id=payment.pk,
        payment_reference=payment.payment_reference,
        gateway=gateway.value,
        mode="client",
        provider_payment_id=provider_payment_id,
        checkout_url="",
        status=payment.status,
    )


def _build_moyasar_client_checkout(
    *,
    payment: PlatformSubscriptionPayment,
) -> PlatformCheckoutResult:
    build_platform_payment_request(
        payment=payment,
    )

    return PlatformCheckoutResult(
        payment_id=payment.pk,
        payment_reference=payment.payment_reference,
        gateway=PaymentGatewayName.MOYASAR.value,
        mode="client",
        provider_payment_id=str(
            payment.gateway_payment_id or ""
        ).strip(),
        checkout_url="",
        status=payment.status,
    )


def _validate_checkout_result(
    *,
    payment: PlatformSubscriptionPayment,
    result: PaymentResult,
    expected_gateway: PaymentGatewayName,
) -> None:
    if result.gateway != expected_gateway:
        raise ValidationError(
            "Gateway checkout result does not match "
            "the requested gateway."
        )

    provider_payment_id = str(
        result.provider_payment_id or ""
    ).strip()

    if not provider_payment_id:
        raise ValidationError(
            "Gateway checkout did not return a provider payment ID."
        )

    if not str(result.checkout_url or "").strip():
        raise ValidationError(
            "Gateway checkout did not return a checkout URL."
        )

    expected_amount = _major_to_minor(
        payment.amount
    )

    if result.amount != expected_amount:
        raise ValidationError(
            "Gateway checkout amount does not match "
            "the platform payment."
        )

    expected_currency = str(
        payment.currency_code or ""
    ).strip().upper()

    if str(result.currency or "").strip().upper() != expected_currency:
        raise ValidationError(
            "Gateway checkout currency does not match "
            "the platform payment."
        )

    expected_reference = str(
        payment.payment_reference or ""
    ).strip()

    provider_reference = str(
        result.reference or ""
    ).strip()

    if (
        provider_reference
        and provider_reference != expected_reference
    ):
        raise ValidationError(
            "Gateway checkout reference does not match "
            "the platform payment."
        )

    if result.status in {
        PaymentStatus.PAID,
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED,
        PaymentStatus.VOIDED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
        PaymentStatus.UNKNOWN,
    }:
        raise ValidationError(
            "Gateway checkout returned an invalid initial status."
        )


def _payment_request_snapshot(
    request: PaymentRequest,
) -> dict[str, Any]:
    return _safe_provider_snapshot(
        {
            "amount": request.amount,
            "currency": request.currency,
            "description": request.description,
            "callback_url": request.callback_url,
            "reference": request.reference,
            "customer_name": request.customer_name,
            "customer_email": request.customer_email,
            "customer_phone": request.customer_phone,
            "metadata": request.metadata,
        }
    )


def _record_processing_event(
    payment: PlatformSubscriptionPayment,
) -> None:
    from billing.payment_services import record_payment_event

    record_payment_event(
        payment=payment,
        event_type="PROCESSING",
        from_status=PlatformSubscriptionPayment.Status.PENDING,
        to_status=PlatformSubscriptionPayment.Status.PROCESSING,
        message="Payment checkout moved to processing.",
        payload={
            "gateway": str(payment.gateway or ""),
            "gateway_payment_id": str(
                payment.gateway_payment_id or ""
            ),
        },
    )

def _safe_provider_snapshot(
    payload: Any,
) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}

    blocked = {
        "authorization",
        "api_key",
        "apikey",
        "secret",
        "secret_key",
        "token",
        "access_token",
        "publishable_key",
        "private_key",
        "password",
    }

    def scrub(value: Any) -> Any:
        if isinstance(value, dict):
            cleaned: dict[str, Any] = {}

            for key, item in value.items():
                normalized_key = str(key).strip().lower()

                if normalized_key in blocked:
                    cleaned[str(key)] = "[REDACTED]"
                else:
                    cleaned[str(key)] = scrub(item)

            return cleaned

        if isinstance(value, list):
            return [
                scrub(item)
                for item in value
            ]

        if value is None or isinstance(
            value,
            (str, int, float, bool),
        ):
            return value

        return str(value)

    cleaned = scrub(payload)

    return cleaned if isinstance(
        cleaned,
        dict,
    ) else {}


def _major_to_minor(
    value: Any,
) -> int:
    from decimal import (
        Decimal,
        InvalidOperation,
        ROUND_HALF_UP,
    )

    if isinstance(value, bool):
        raise ValidationError(
            "Invalid platform payment amount."
        )

    try:
        amount = Decimal(str(value))
    except (
        InvalidOperation,
        TypeError,
        ValueError,
    ) as exc:
        raise ValidationError(
            "Invalid platform payment amount."
        ) from exc

    if not amount.is_finite() or amount < 0:
        raise ValidationError(
            "Invalid platform payment amount."
        )

    return int(
        (
            amount * Decimal("100")
        ).quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )
