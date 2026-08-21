from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
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

from .client import TamaraClient
from .webhook import (
    extract_tamara_bearer_token,
    verify_tamara_webhook,
)


class TamaraAdapter(PaymentGatewayAdapter):
    gateway = PaymentGatewayName.TAMARA

    STATUS_MAP = {
        "new": PaymentStatus.INITIATED,
        "approved": PaymentStatus.PENDING,
        "authorised": PaymentStatus.AUTHORIZED,
        "authorized": PaymentStatus.AUTHORIZED,
        "fully_captured": PaymentStatus.PAID,
        "captured": PaymentStatus.PAID,
        "partially_captured": PaymentStatus.AUTHORIZED,
        "declined": PaymentStatus.FAILED,
        "expired": PaymentStatus.FAILED,
        "canceled": PaymentStatus.CANCELLED,
        "cancelled": PaymentStatus.CANCELLED,
        "fully_refunded": PaymentStatus.REFUNDED,
        "refunded": PaymentStatus.REFUNDED,
        "partially_refunded": PaymentStatus.PARTIALLY_REFUNDED,
        "updated": PaymentStatus.AUTHORIZED,
    }

    def __init__(
        self,
        *,
        client: TamaraClient,
        notification_token: str = "",
    ) -> None:
        self.client = client
        self.notification_token = str(
            notification_token or ""
        ).strip()

    def create_payment(
        self,
        request: PaymentRequest,
    ) -> PaymentResult:
        payload = self._build_checkout_payload(request)
        response = self.client.create_checkout(payload)

        return self._normalize_checkout(
            response,
            request=request,
        )

    def retrieve_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        payload = self.client.fetch_order(
            provider_payment_id
        )
        return self._normalize_order(payload)

    def refund_payment(
        self,
        request: RefundRequest,
    ) -> PaymentResult:
        current = self.retrieve_payment(
            request.provider_payment_id
        )

        refund_amount = (
            current.amount
            if request.amount is None
            else request.amount
        )

        payload = {
            "total_amount": self._money_object(
                refund_amount,
                current.currency,
            ),
        }

        if request.reason:
            payload["comment"] = request.reason

        self.client.refund_order(
            request.provider_payment_id,
            payload=payload,
        )

        return self.retrieve_payment(
            request.provider_payment_id
        )

    def cancel_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        current = self.retrieve_payment(
            provider_payment_id
        )

        payload = {
            "total_amount": self._money_object(
                0,
                current.currency,
            ),
        }

        self.client.cancel_order(
            provider_payment_id,
            payload=payload,
        )

        return self.retrieve_payment(
            provider_payment_id
        )

    def capture_payment(
        self,
        provider_payment_id: str,
        *,
        amount: int | None = None,
    ) -> PaymentResult:
        current = self.retrieve_payment(
            provider_payment_id
        )

        capture_amount = (
            current.amount
            if amount is None
            else self._validate_minor_amount(amount)
        )

        payload = {
            "order_id": provider_payment_id,
            "total_amount": self._money_object(
                capture_amount,
                current.currency,
            ),
        }

        self.client.capture_order(payload)

        return self.retrieve_payment(
            provider_payment_id
        )

    def authorise_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        self.client.authorise_order(
            provider_payment_id
        )

        return self.retrieve_payment(
            provider_payment_id
        )

    def verify_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        result = self.retrieve_payment(
            provider_payment_id
        )

        if result.status not in {
            PaymentStatus.AUTHORIZED,
            PaymentStatus.PAID,
        }:
            raise PaymentGatewayVerificationError(
                "Tamara order is not in a successful payment state."
            )

        return result

    def verify_webhook(
        self,
        *,
        headers: dict[str, str],
        body: bytes,
        payload: dict[str, Any],
    ) -> WebhookEvent:
        del body

        token = extract_tamara_bearer_token(
            headers
        )

        webhook_event = verify_tamara_webhook(
            token=token,
            notification_token=self.notification_token,
            payload=payload,
        )

        provider_order = self.retrieve_payment(
            webhook_event.provider_payment_id
        )

        self._verify_webhook_order(
            webhook_event=webhook_event,
            provider_order=provider_order,
            payload=payload,
        )

        return WebhookEvent(
            gateway=self.gateway,
            event_type=webhook_event.event_type,
            provider_payment_id=(
                provider_order.provider_payment_id
            ),
            status=provider_order.status,
            payload=payload,
        )

    def _verify_webhook_order(
        self,
        *,
        webhook_event: WebhookEvent,
        provider_order: PaymentResult,
        payload: dict[str, Any],
    ) -> None:
        if (
            provider_order.provider_payment_id
            != webhook_event.provider_payment_id
        ):
            raise PaymentGatewayVerificationError(
                "Tamara webhook order ID does not match "
                "the provider order."
            )

        webhook_reference = str(
            payload.get("order_reference_id") or ""
        ).strip()

        provider_reference = str(
            provider_order.reference or ""
        ).strip()

        if not provider_reference:
            raise PaymentGatewayVerificationError(
                "Tamara provider order is missing "
                "order_reference_id."
            )

        if webhook_reference != provider_reference:
            raise PaymentGatewayVerificationError(
                "Tamara webhook order reference does not "
                "match the provider order."
            )

        if provider_order.status is PaymentStatus.UNKNOWN:
            raise PaymentGatewayVerificationError(
                "Tamara provider returned an unknown "
                "order status."
            )

    def _build_checkout_payload(
        self,
        request: PaymentRequest,
    ) -> dict[str, Any]:
        metadata = dict(request.metadata or {})

        reference = str(
            request.reference
            or metadata.get("reference")
            or metadata.get("subscription_reference")
            or metadata.get("payment_reference")
            or ""
        ).strip()

        if not reference:
            raise ValueError(
                "Tamara checkout requires a merchant reference."
            )

        description = str(
            request.description
            or metadata.get("description")
            or "Platform subscription"
        ).strip()

        consumer = metadata.get("consumer")
        shipping_address = metadata.get("shipping_address")
        merchant_url = metadata.get("merchant_url")
        items = metadata.get("items")

        if not isinstance(consumer, dict) or not consumer:
            raise ValueError(
                "Tamara checkout requires consumer details."
            )

        if (
            not isinstance(shipping_address, dict)
            or not shipping_address
        ):
            raise ValueError(
                "Tamara checkout requires a shipping address."
            )

        if not isinstance(merchant_url, dict) or not merchant_url:
            raise ValueError(
                "Tamara checkout requires merchant redirect URLs."
            )

        if not isinstance(items, list) or not items:
            raise ValueError(
                "Tamara checkout requires at least one item."
            )

        currency = self._normalize_currency(
            request.currency
        )

        total_amount = self._money_object(
            request.amount,
            currency,
        )

        zero_amount = self._money_object(
            0,
            currency,
        )

        payload: dict[str, Any] = {
            "total_amount": total_amount,
            "shipping_amount": metadata.get(
                "shipping_amount",
                zero_amount,
            ),
            "tax_amount": metadata.get(
                "tax_amount",
                zero_amount,
            ),
            "order_reference_id": reference,
            "order_number": str(
                metadata.get("order_number")
                or reference
            ),
            "items": items,
            "consumer": consumer,
            "country_code": str(
                metadata.get("country_code")
                or "SA"
            ).strip().upper(),
            "description": description[:256],
            "merchant_url": merchant_url,
            "shipping_address": shipping_address,
            "platform": str(
                metadata.get("platform")
                or "Mhamcloud"
            ).strip(),
        }

        billing_address = metadata.get(
            "billing_address"
        )
        if isinstance(billing_address, dict):
            payload["billing_address"] = (
                billing_address
            )

        discount = metadata.get("discount")
        if isinstance(discount, dict):
            payload["discount"] = discount

        risk_assessment = metadata.get(
            "risk_assessment"
        )
        if isinstance(risk_assessment, dict):
            payload["risk_assessment"] = (
                risk_assessment
            )

        return payload

    def _normalize_checkout(
        self,
        payload: dict[str, Any],
        *,
        request: PaymentRequest,
    ) -> PaymentResult:
        if not isinstance(payload, dict):
            raise PaymentGatewayResponseError(
                "Invalid Tamara checkout response."
            )

        order_id = str(
            payload.get("order_id") or ""
        ).strip()

        checkout_url = str(
            payload.get("checkout_url") or ""
        ).strip()

        if not order_id:
            raise PaymentGatewayResponseError(
                "Tamara checkout response is missing order_id."
            )

        if not checkout_url:
            raise PaymentGatewayResponseError(
                "Tamara checkout response is missing checkout_url."
            )

        provider_status = str(
            payload.get("status") or "new"
        ).strip().lower()

        return PaymentResult(
            gateway=self.gateway,
            provider_payment_id=order_id,
            status=self.STATUS_MAP.get(
                provider_status,
                PaymentStatus.UNKNOWN,
            ),
            amount=request.amount,
            currency=self._normalize_currency(
                request.currency
            ),
            checkout_url=checkout_url,
            reference=request.reference,
            raw=payload,
        )

    def _normalize_order(
        self,
        payload: dict[str, Any],
    ) -> PaymentResult:
        if not isinstance(payload, dict):
            raise PaymentGatewayResponseError(
                "Invalid Tamara order response."
            )

        order_id = str(
            payload.get("order_id")
            or payload.get("id")
            or ""
        ).strip()

        provider_status = str(
            payload.get("status") or ""
        ).strip().lower()

        if not order_id:
            raise PaymentGatewayResponseError(
                "Tamara order response is missing order_id."
            )

        if not provider_status:
            raise PaymentGatewayResponseError(
                "Tamara order response is missing status."
            )

        total_amount = payload.get("total_amount")

        if not isinstance(total_amount, dict):
            raise PaymentGatewayResponseError(
                "Tamara order response is missing total_amount."
            )

        amount = self._major_to_minor(
            total_amount.get("amount")
        )

        currency = self._normalize_currency(
            total_amount.get("currency")
        )

        return PaymentResult(
            gateway=self.gateway,
            provider_payment_id=order_id,
            status=self.STATUS_MAP.get(
                provider_status,
                PaymentStatus.UNKNOWN,
            ),
            amount=amount,
            currency=currency,
            checkout_url=str(
                payload.get("checkout_url") or ""
            ).strip(),
            reference=str(
                payload.get("order_reference_id")
                or ""
            ).strip(),
            raw=payload,
        )

    @classmethod
    def _money_object(
        cls,
        minor_amount: int,
        currency: str,
    ) -> dict[str, Any]:
        minor_amount = cls._validate_minor_amount(
            minor_amount
        )

        currency = cls._normalize_currency(
            currency
        )

        return {
            "amount": cls._minor_to_major(
                minor_amount
            ),
            "currency": currency,
        }

    @staticmethod
    def _validate_minor_amount(
        value: Any,
    ) -> int:
        if isinstance(value, bool) or not isinstance(
            value,
            int,
        ):
            raise ValueError(
                "Tamara amount must be integer minor units."
            )

        if value < 0:
            raise ValueError(
                "Tamara amount cannot be negative."
            )

        return value

    @staticmethod
    def _minor_to_major(
        value: int,
    ) -> float:
        value = TamaraAdapter._validate_minor_amount(
            value
        )

        return float(
            (
                Decimal(value)
                / Decimal("100")
            ).quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
        )

    @staticmethod
    def _major_to_minor(
        value: Any,
    ) -> int:
        if isinstance(value, bool):
            raise PaymentGatewayResponseError(
                "Invalid Tamara order amount."
            )

        try:
            amount = Decimal(str(value))
        except (
            InvalidOperation,
            TypeError,
            ValueError,
        ) as exc:
            raise PaymentGatewayResponseError(
                "Invalid Tamara order amount."
            ) from exc

        if not amount.is_finite() or amount < 0:
            raise PaymentGatewayResponseError(
                "Invalid Tamara order amount."
            )

        return int(
            (
                amount * Decimal("100")
            ).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )

    @staticmethod
    def _normalize_currency(
        value: Any,
    ) -> str:
        currency = str(
            value or ""
        ).strip().upper()

        if (
            len(currency) != 3
            or not currency.isalpha()
        ):
            raise PaymentGatewayResponseError(
                "Invalid Tamara currency."
            )

        return currency