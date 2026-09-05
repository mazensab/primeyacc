from __future__ import annotations


class MhamLegacyError(RuntimeError):
    """Base error for the Mham V1 legacy integration."""


class MhamLegacyConfigurationError(MhamLegacyError):
    """Raised when connector configuration is missing or unsafe."""


class MhamLegacyReadOnlyViolation(MhamLegacyError):
    """Raised if a caller attempts a non-GET provider operation."""


class MhamLegacyRequestError(MhamLegacyError):
    """Raised when an outbound request is invalid."""


class MhamLegacyTransportError(MhamLegacyError):
    """Raised when the provider cannot be reached safely."""


class MhamLegacyAuthenticationError(MhamLegacyError):
    """Raised when Mham rejects connector authentication."""


class MhamLegacyResponseError(MhamLegacyError):
    """Raised for invalid or unexpected provider responses."""
