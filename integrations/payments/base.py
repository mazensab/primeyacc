from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .types import (
    PaymentGatewayName,
    PaymentRequest,
    PaymentResult,
    RefundRequest,
    WebhookEvent,
)


class PaymentGatewayAdapter(ABC):
    """
    Stable internal contract used by Mhamcloud payment flows.

    Provider-specific details must remain inside each adapter.
    Platform subscription and billing business logic must not depend
    directly on Moyasar, Tamara, or Tabby response formats.
    """

    gateway: PaymentGatewayName

    @abstractmethod
    def create_payment(
        self,
        request: PaymentRequest,
    ) -> PaymentResult:
        raise NotImplementedError

    @abstractmethod
    def retrieve_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        raise NotImplementedError

    @abstractmethod
    def refund_payment(
        self,
        request: RefundRequest,
    ) -> PaymentResult:
        raise NotImplementedError

    @abstractmethod
    def cancel_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        raise NotImplementedError

    def verify_payment(
        self,
        provider_payment_id: str,
    ) -> PaymentResult:
        return self.retrieve_payment(
            provider_payment_id
        )

    @abstractmethod
    def verify_webhook(
        self,
        *,
        headers: dict[str, str],
        body: bytes,
        payload: dict[str, Any],
    ) -> WebhookEvent:
        raise NotImplementedError
