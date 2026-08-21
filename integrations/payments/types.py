from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class PaymentGatewayName(StrEnum):
    MOYASAR = "moyasar"
    TAMARA = "tamara"
    TABBY = "tabby"


class PaymentStatus(StrEnum):
    INITIATED = "initiated"
    PENDING = "pending"
    AUTHORIZED = "authorized"
    PAID = "paid"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"
    VOIDED = "voided"
    UNKNOWN = "unknown"


@dataclass(frozen=True, slots=True)
class PaymentRequest:
    amount: int
    currency: str
    description: str
    callback_url: str = ""
    reference: str = ""
    customer_name: str = ""
    customer_email: str = ""
    customer_phone: str = ""
    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def __post_init__(self) -> None:
        if (
            isinstance(self.amount, bool)
            or not isinstance(self.amount, int)
        ):
            raise ValueError(
                "Payment amount must be an integer in minor units."
            )

        if self.amount <= 0:
            raise ValueError(
                "Payment amount must be greater than zero."
            )

        currency = str(
            self.currency or ""
        ).strip().upper()

        if (
            len(currency) != 3
            or not currency.isalpha()
        ):
            raise ValueError(
                "Payment currency must be a 3-letter ISO currency code."
            )

        if not str(
            self.description or ""
        ).strip():
            raise ValueError(
                "Payment description is required."
            )

        object.__setattr__(
            self,
            "currency",
            currency,
        )


@dataclass(frozen=True, slots=True)
class PaymentResult:
    gateway: PaymentGatewayName
    provider_payment_id: str
    status: PaymentStatus
    amount: int
    currency: str
    checkout_url: str = ""
    reference: str = ""
    raw: dict[str, Any] = field(
        default_factory=dict
    )


@dataclass(frozen=True, slots=True)
class RefundRequest:
    provider_payment_id: str
    amount: int | None = None
    reason: str = ""
    metadata: dict[str, Any] = field(
        default_factory=dict
    )

    def __post_init__(self) -> None:
        if not str(
            self.provider_payment_id or ""
        ).strip():
            raise ValueError(
                "Provider payment ID is required."
            )

        if self.amount is not None:
            if (
                isinstance(self.amount, bool)
                or not isinstance(self.amount, int)
            ):
                raise ValueError(
                    "Refund amount must be an integer in minor units."
                )

            if self.amount <= 0:
                raise ValueError(
                    "Refund amount must be greater than zero."
                )


@dataclass(frozen=True, slots=True)
class WebhookEvent:
    gateway: PaymentGatewayName
    event_type: str
    provider_payment_id: str
    status: PaymentStatus
    payload: dict[str, Any] = field(
        default_factory=dict
    )
