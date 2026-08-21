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

from .client import TabbyClient
from .webhook import verify_tabby_webhook


class TabbyAdapter(PaymentGatewayAdapter):
    gateway = PaymentGatewayName.TABBY

    STATUS_MAP = {
        "created": PaymentStatus.INITIATED,
        "authorized": PaymentStatus.AUTHORIZED,
        "closed": PaymentStatus.PAID,
        "rejected": PaymentStatus.FAILED,
        "expired": PaymentStatus.FAILED,
    }

    def __init__(
        self,
        *,
        client: TabbyClient,
        webhook_header_name: str = "",
        webhook_header_value: str = "",
    ) -> None:
        self.client = client
        self.webhook_header_name = str(
            webhook_header_name or ""
        ).strip()
        self.webhook_header_value = str(
            webhook_header_value or ""
        ).strip()

    def create_payment(
        self,
        request: PaymentRequest,
    ) -> PaymentResult:
        checkout_payload = self._build_checkout_payload(
            request
        )

        response = self.client.create_checkout(
            checkout_payload
        )

        return self._normalize_checkout(
            response,
            request=request,
        )

    def retrieve_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        payload = self.client.fetch_payment(
            provider_payment_id
        )

        return self._normalize_payment(payload)

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
            else self._validate_minor_amount(
                request.amount
            )
        )

        payload: dict[str, Any] = {
            "amount": self._minor_to_major_string(
                refund_amount
            ),
        }

        if request.reason:
            payload["reason"] = str(
                request.reason
            ).strip()[:256]

        self.client.refund_payment(
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
        self.client.close_payment(
            provider_payment_id
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
            else self._validate_minor_amount(
                amount
            )
        )

        payload = {
            "amount": self._minor_to_major_string(
                capture_amount
            ),
        }

        self.client.capture_payment(
            provider_payment_id,
            payload=payload,
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
                "Tabby payment is not in a successful state."
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

        event = verify_tabby_webhook(
            headers=headers,
            payload=payload,
            header_name=self.webhook_header_name,
            header_value=self.webhook_header_value,
        )

        provider_payment = self.retrieve_payment(
            event.provider_payment_id
        )

        self._verify_webhook_payment(
            event=event,
            provider_payment=provider_payment,
            payload=payload,
        )

        return WebhookEvent(
            gateway=self.gateway,
            event_type=event.event_type,
            provider_payment_id=(
                provider_payment.provider_payment_id
            ),
            status=provider_payment.status,
            payload=payload,
        )

    def _verify_webhook_payment(
        self,
        *,
        event: WebhookEvent,
        provider_payment: PaymentResult,
        payload: dict[str, Any],
    ) -> None:
        if (
            provider_payment.provider_payment_id
            != event.provider_payment_id
        ):
            raise PaymentGatewayVerificationError(
                "Tabby webhook payment ID does not match "
                "the provider payment."
            )

        if provider_payment.status is PaymentStatus.UNKNOWN:
            raise PaymentGatewayVerificationError(
                "Tabby provider returned an unknown payment status."
            )

        webhook_reference = self._extract_reference(
            payload
        )
        provider_reference = str(
            provider_payment.reference or ""
        ).strip()

        if webhook_reference:
            if not provider_reference:
                raise PaymentGatewayVerificationError(
                    "Tabby provider payment is missing reference."
                )

            if webhook_reference != provider_reference:
                raise PaymentGatewayVerificationError(
                    "Tabby webhook reference does not match "
                    "the provider payment."
                )

        webhook_amount = payload.get("amount")

        if webhook_amount not in {
            None,
            "",
        }:
            normalized_webhook_amount = (
                self._major_to_minor(
                    webhook_amount
                )
            )

            if (
                normalized_webhook_amount
                != provider_payment.amount
            ):
                raise PaymentGatewayVerificationError(
                    "Tabby webhook amount does not match "
                    "the provider payment."
                )

        webhook_currency = str(
            payload.get("currency") or ""
        ).strip()

        if webhook_currency:
            normalized_webhook_currency = (
                self._normalize_currency(
                    webhook_currency
                )
            )

            if (
                normalized_webhook_currency
                != provider_payment.currency
            ):
                raise PaymentGatewayVerificationError(
                    "Tabby webhook currency does not match "
                    "the provider payment."
                )

    def _build_checkout_payload(
        self,
        request: PaymentRequest,
    ) -> dict[str, Any]:
        metadata = dict(
            request.metadata or {}
        )

        reference = str(
            request.reference
            or metadata.get("reference")
            or metadata.get("subscription_reference")
            or metadata.get("payment_reference")
            or ""
        ).strip()

        if not reference:
            raise ValueError(
                "Tabby checkout requires a merchant reference."
            )

        buyer = metadata.get("buyer")

        if not isinstance(buyer, dict) or not buyer:
            raise ValueError(
                "Tabby checkout requires buyer details."
            )

        order = metadata.get("order")

        if not isinstance(order, dict) or not order:
            raise ValueError(
                "Tabby checkout requires order details."
            )

        merchant_urls = metadata.get(
            "merchant_urls"
        )

        if (
            not isinstance(merchant_urls, dict)
            or not merchant_urls
        ):
            raise ValueError(
                "Tabby checkout requires merchant URLs."
            )

        currency = self._normalize_currency(
            request.currency
        )

        payment: dict[str, Any] = {
            "amount": self._minor_to_major_string(
                request.amount
            ),
            "currency": currency,
            "description": str(
                request.description
            ).strip()[:256],
            "buyer": buyer,
            "order": dict(order),
        }

        payment["order"]["reference_id"] = (
            reference
        )

        buyer_history = metadata.get(
            "buyer_history"
        )

        if isinstance(buyer_history, dict):
            payment["buyer_history"] = (
                buyer_history
            )

        order_history = metadata.get(
            "order_history"
        )

        if isinstance(order_history, list):
            payment["order_history"] = (
                order_history
            )

        shipping_address = metadata.get(
            "shipping_address"
        )

        if isinstance(shipping_address, dict):
            payment["shipping_address"] = (
                shipping_address
            )

        payload: dict[str, Any] = {
            "payment": payment,
            "lang": self._normalize_language(
                metadata.get("lang")
            ),
            "merchant_code": self.client.merchant_code,
            "merchant_urls": merchant_urls,
        }

        return payload

    def _normalize_checkout(
        self,
        payload: dict[str, Any],
        *,
        request: PaymentRequest,
    ) -> PaymentResult:
        if not isinstance(payload, dict):
            raise PaymentGatewayResponseError(
                "Invalid Tabby checkout response."
            )

        payment_payload = payload.get(
            "payment"
        )

        if not isinstance(payment_payload, dict):
            raise PaymentGatewayResponseError(
                "Tabby checkout response is missing payment."
            )

        payment_id = str(
            payment_payload.get("id") or ""
        ).strip()

        if not payment_id:
            raise PaymentGatewayResponseError(
                "Tabby checkout response is missing payment ID."
            )

        configuration = payload.get(
            "configuration"
        )

        checkout_url = self._extract_checkout_url(
            configuration
        )

        if not checkout_url:
            raise PaymentGatewayResponseError(
                "Tabby checkout response is missing checkout URL."
            )

        provider_status = str(
            payment_payload.get("status")
            or "created"
        ).strip().lower()

        return PaymentResult(
            gateway=self.gateway,
            provider_payment_id=payment_id,
            status=self.STATUS_MAP.get(
                provider_status,
                PaymentStatus.UNKNOWN,
            ),
            amount=request.amount,
            currency=self._normalize_currency(
                request.currency
            ),
            checkout_url=checkout_url,
            reference=(
                request.reference
                or self._extract_reference(
                    payment_payload
                )
            ),
            raw=payload,
        )

    def _normalize_payment(
        self,
        payload: dict[str, Any],
    ) -> PaymentResult:
        if not isinstance(payload, dict):
            raise PaymentGatewayResponseError(
                "Invalid Tabby payment response."
            )

        payment_id = str(
            payload.get("id") or ""
        ).strip()

        provider_status = str(
            payload.get("status") or ""
        ).strip().lower()

        if not payment_id:
            raise PaymentGatewayResponseError(
                "Tabby payment response is missing id."
            )

        if not provider_status:
            raise PaymentGatewayResponseError(
                "Tabby payment response is missing status."
            )

        amount = self._major_to_minor(
            payload.get("amount")
        )

        currency = self._normalize_currency(
            payload.get("currency")
        )

        return PaymentResult(
            gateway=self.gateway,
            provider_payment_id=payment_id,
            status=self.STATUS_MAP.get(
                provider_status,
                PaymentStatus.UNKNOWN,
            ),
            amount=amount,
            currency=currency,
            checkout_url="",
            reference=self._extract_reference(
                payload
            ),
            raw=payload,
        )

    @staticmethod
    def _extract_checkout_url(
        configuration: Any,
    ) -> str:
        if not isinstance(
            configuration,
            dict,
        ):
            return ""

        available_products = configuration.get(
            "available_products"
        )

        if not isinstance(
            available_products,
            dict,
        ):
            return ""

        installments = available_products.get(
            "installments"
        )

        if not isinstance(
            installments,
            list,
        ):
            return ""

        for installment in installments:
            if not isinstance(
                installment,
                dict,
            ):
                continue

            web_url = str(
                installment.get("web_url")
                or ""
            ).strip()

            if web_url:
                return web_url

        return ""

    @staticmethod
    def _extract_reference(
        payload: dict[str, Any],
    ) -> str:
        order = payload.get("order")

        if isinstance(order, dict):
            reference = str(
                order.get("reference_id")
                or ""
            ).strip()

            if reference:
                return reference

        return str(
            payload.get("reference_id")
            or payload.get("order_reference_id")
            or ""
        ).strip()

    @staticmethod
    def _normalize_language(
        value: Any,
    ) -> str:
        language = str(
            value or "en"
        ).strip().lower()

        if language not in {
            "ar",
            "en",
        }:
            return "en"

        return language

    @staticmethod
    def _validate_minor_amount(
        value: Any,
    ) -> int:
        if (
            isinstance(value, bool)
            or not isinstance(value, int)
        ):
            raise ValueError(
                "Tabby amount must be integer minor units."
            )

        if value <= 0:
            raise ValueError(
                "Tabby amount must be greater than zero."
            )

        return value

    @classmethod
    def _minor_to_major_string(
        cls,
        value: int,
    ) -> str:
        value = cls._validate_minor_amount(
            value
        )

        amount = (
            Decimal(value)
            / Decimal("100")
        ).quantize(
            Decimal("0.01"),
            rounding=ROUND_HALF_UP,
        )

        return format(
            amount,
            ".2f",
        )

    @staticmethod
    def _major_to_minor(
        value: Any,
    ) -> int:
        if isinstance(value, bool):
            raise PaymentGatewayResponseError(
                "Invalid Tabby payment amount."
            )

        try:
            amount = Decimal(
                str(value)
            )
        except (
            InvalidOperation,
            TypeError,
            ValueError,
        ) as exc:
            raise PaymentGatewayResponseError(
                "Invalid Tabby payment amount."
            ) from exc

        if (
            not amount.is_finite()
            or amount < 0
        ):
            raise PaymentGatewayResponseError(
                "Invalid Tabby payment amount."
            )

        return int(
            (
                amount
                * Decimal("100")
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
                "Invalid Tabby currency."
            )

        return currency