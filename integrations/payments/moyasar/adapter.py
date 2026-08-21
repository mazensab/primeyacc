from __future__ import annotations

from typing import Any

from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.exceptions import (
    PaymentGatewayResponseError,
    PaymentGatewayVerificationError,
)
from integrations.payments.types import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentResult,
    PaymentStatus,
    RefundRequest,
    WebhookEvent,
)

from .client import MoyasarClient
from .webhook import verify_moyasar_webhook


class MoyasarAdapter(PaymentGatewayAdapter):
    gateway = PaymentGatewayName.MOYASAR

    STATUS_MAP = {
        "initiated": PaymentStatus.INITIATED,
        "paid": PaymentStatus.PAID,
        "failed": PaymentStatus.FAILED,
        "authorized": PaymentStatus.AUTHORIZED,
        "captured": PaymentStatus.PAID,
        "refunded": PaymentStatus.REFUNDED,
        "voided": PaymentStatus.VOIDED,
        "verified": PaymentStatus.PAID,
    }

    def __init__(
        self,
        *,
        client: MoyasarClient,
        webhook_secret: str = "",
    ) -> None:
        self.client = client
        self.webhook_secret = str(webhook_secret or "").strip()

    def create_payment(
        self,
        request: PaymentRequest,
    ) -> PaymentResult:
        raise NotImplementedError(
            "Moyasar card, mada, and Apple Pay payment creation "
            "must be initiated client-side using the publishable key."
        )

    def retrieve_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        payload = self.client.fetch_payment(provider_payment_id)
        return self._normalize_payment(payload)

    def refund_payment(
        self,
        request: RefundRequest,
    ) -> PaymentResult:
        payload = self.client.refund_payment(
            request.provider_payment_id,
            amount=request.amount,
        )
        return self._normalize_payment(payload)

    def cancel_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        payload = self.client.void_payment(provider_payment_id)
        return self._normalize_payment(payload)

    def capture_payment(
        self,
        provider_payment_id: str,
        *,
        amount: int | None = None,
    ) -> PaymentResult:
        payload = self.client.capture_payment(
            provider_payment_id,
            amount=amount,
        )
        return self._normalize_payment(payload)

    def verify_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        result = self.retrieve_payment(provider_payment_id)

        if result.status not in {
            PaymentStatus.PAID,
            PaymentStatus.AUTHORIZED,
        }:
            raise PaymentGatewayVerificationError(
                "Moyasar payment is not in a successful state."
            )

        return result

    def verify_webhook(
        self,
        *,
        headers: dict[str, str],
        body: bytes,
        payload: dict[str, Any],
    ) -> WebhookEvent:
        del headers, body

        event = verify_moyasar_webhook(
            payload=payload,
            shared_secret=self.webhook_secret,
        )

        provider_payload = self.client.fetch_payment(
            event.provider_payment_id
        )
        provider_payment = self._normalize_payment(provider_payload)

        if (
            provider_payment.provider_payment_id
            != event.provider_payment_id
        ):
            raise PaymentGatewayVerificationError(
                "Moyasar webhook payment ID does not match "
                "the provider payment."
            )

        if provider_payment.status != event.status:
            raise PaymentGatewayVerificationError(
                "Moyasar webhook payment status does not match "
                "the provider payment."
            )

        webhook_data = payload.get("data")

        if not isinstance(webhook_data, dict):
            raise PaymentGatewayVerificationError(
                "Moyasar webhook payment data is missing."
            )

        webhook_amount = self._normalize_amount(
            webhook_data.get("amount")
        )
        webhook_currency = self._normalize_currency(
            webhook_data.get("currency")
        )

        if webhook_amount != provider_payment.amount:
            raise PaymentGatewayVerificationError(
                "Moyasar webhook payment amount does not match "
                "the provider payment."
            )

        if webhook_currency != provider_payment.currency:
            raise PaymentGatewayVerificationError(
                "Moyasar webhook payment currency does not match "
                "the provider payment."
            )

        return WebhookEvent(
            gateway=event.gateway,
            event_type=event.event_type,
            provider_payment_id=provider_payment.provider_payment_id,
            status=provider_payment.status,
            payload=payload,
        )

    def _normalize_payment(
        self,
        payload: dict[str, Any],
    ) -> PaymentResult:
        if not isinstance(payload, dict):
            raise PaymentGatewayResponseError(
                "Invalid Moyasar payment response."
            )

        payment_id = str(payload.get("id") or "").strip()
        provider_status = str(
            payload.get("status") or ""
        ).strip().lower()

        if not payment_id:
            raise PaymentGatewayResponseError(
                "Moyasar payment response is missing id."
            )

        if not provider_status:
            raise PaymentGatewayResponseError(
                "Moyasar payment response is missing status."
            )

        amount = self._normalize_amount(payload.get("amount"))
        currency = self._normalize_currency(payload.get("currency"))

        status = self.STATUS_MAP.get(
            provider_status,
            PaymentStatus.UNKNOWN,
        )

        return PaymentResult(
            gateway=self.gateway,
            provider_payment_id=payment_id,
            status=status,
            amount=amount,
            currency=currency,
            checkout_url=self._extract_checkout_url(payload),
            reference=self._extract_reference(payload),
            raw=payload,
        )

    @staticmethod
    def _normalize_amount(value: Any) -> int:
        if isinstance(value, bool):
            raise PaymentGatewayResponseError(
                "Invalid Moyasar payment amount."
            )

        try:
            amount = int(value)
        except (TypeError, ValueError) as exc:
            raise PaymentGatewayResponseError(
                "Invalid Moyasar payment amount."
            ) from exc

        if amount < 0:
            raise PaymentGatewayResponseError(
                "Invalid Moyasar payment amount."
            )

        return amount

    @staticmethod
    def _normalize_currency(value: Any) -> str:
        currency = str(value or "").strip().upper()

        if len(currency) != 3 or not currency.isalpha():
            raise PaymentGatewayResponseError(
                "Invalid Moyasar payment currency."
            )

        return currency

    @staticmethod
    def _extract_checkout_url(
        payload: dict[str, Any],
    ) -> str:
        source = payload.get("source")

        if not isinstance(source, dict):
            return ""

        return str(
            source.get("transaction_url")
            or source.get("checkout_url")
            or ""
        ).strip()

    @staticmethod
    def _extract_reference(
        payload: dict[str, Any],
    ) -> str:
        metadata = payload.get("metadata")

        if isinstance(metadata, dict):
            for key in (
                "reference",
                "subscription_reference",
                "payment_reference",
            ):
                value = str(metadata.get(key) or "").strip()

                if value:
                    return value

        return str(payload.get("given_id") or "").strip()