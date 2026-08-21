from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.exceptions import ValidationError

from billing.models import PlatformSubscriptionPayment
from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.exceptions import PaymentGatewayVerificationError
from integrations.payments.platform_bridge import verify_and_apply_gateway_payment
from integrations.payments.registry import get_payment_gateway_adapter, normalize_gateway_name
from integrations.payments.types import PaymentGatewayName

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

    def as_dict(self) -> dict[str, Any]:
        return {
            "payment_id": self.payment_id,
            "gateway": self.gateway,
            "event_type": self.event_type,
            "status": self.status,
        }

def _clean(value: Any) -> str:
    return str(value or "").strip()

def _find_platform_payment(*, gateway: PaymentGatewayName, provider_payment_id: str) -> PlatformSubscriptionPayment:
    provider_payment_id = _clean(provider_payment_id)
    if not provider_payment_id:
        raise PaymentGatewayVerificationError("Webhook provider payment ID is required.")
    rows = list(
        PlatformSubscriptionPayment.objects
        .filter(gateway=gateway.value.upper(), gateway_payment_id=provider_payment_id)
        .select_related("subscription", "subscription__plan", "company", "invoice", "receipt")
        .order_by("-id")[:2]
    )
    if not rows:
        raise PlatformWebhookPaymentNotFound("No platform payment matches the provider payment.")
    if len(rows) != 1:
        raise PlatformWebhookPaymentAmbiguous("Provider payment maps to multiple platform payments.")
    payment = rows[0]
    if _clean(payment.gateway).lower() != gateway.value:
        raise PaymentGatewayVerificationError("Webhook gateway does not match platform payment.")
    if _clean(payment.gateway_payment_id) != provider_payment_id:
        raise PaymentGatewayVerificationError("Webhook provider payment ID does not match platform payment.")
    return payment

def process_platform_payment_webhook(*, gateway: str | PaymentGatewayName, headers: dict[str, str], body: bytes, payload: dict[str, Any], adapter: PaymentGatewayAdapter | None = None) -> PlatformWebhookResult:
    gateway_name = normalize_gateway_name(gateway)
    gateway_adapter = adapter or get_payment_gateway_adapter(gateway_name)
    event = gateway_adapter.verify_webhook(
        headers=dict(headers or {}),
        body=bytes(body or b""),
        payload=dict(payload or {}),
    )
    if event.gateway != gateway_name:
        raise PaymentGatewayVerificationError("Webhook gateway does not match requested gateway.")
    provider_payment_id = _clean(event.provider_payment_id)
    if not provider_payment_id:
        raise PaymentGatewayVerificationError("Webhook provider payment ID is missing.")
    payment = _find_platform_payment(gateway=gateway_name, provider_payment_id=provider_payment_id)
    applied = verify_and_apply_gateway_payment(payment=payment, actor=None, adapter=gateway_adapter)
    applied_payment = applied[0] if isinstance(applied, tuple) else applied
    if getattr(applied_payment, "pk", None) != payment.pk:
        raise ValidationError({"payment": "Webhook verification returned a different platform payment."})
    return PlatformWebhookResult(
        payment_id=payment.pk,
        gateway=gateway_name.value,
        event_type=_clean(event.event_type),
        status=_clean(applied_payment.status),
    )
