from __future__ import annotations


class PaymentGatewayError(RuntimeError):
    """Base error for payment gateway integrations."""


class PaymentGatewayConfigurationError(PaymentGatewayError):
    """Raised when a gateway is not configured correctly."""


class PaymentGatewayRequestError(PaymentGatewayError):
    """Raised when a request to a payment provider fails."""


class PaymentGatewayResponseError(PaymentGatewayError):
    """Raised when a provider returns an invalid or unexpected response."""


class PaymentGatewayVerificationError(PaymentGatewayError):
    """Raised when payment or webhook verification fails."""
