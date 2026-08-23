from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone

from billing.models import (
    PlatformPaymentReconciliation,
    PlatformSubscriptionPayment,
)
from integrations.payments.base import PaymentGatewayAdapter
from integrations.payments.registry import (
    get_payment_gateway_adapter,
)
from integrations.payments.types import (
    PaymentResult,
    PaymentStatus,
)


_MINOR_QUANTIZER = Decimal("1")


_SENSITIVE_KEYS = {
    "authorization",
    "api_key",
    "apikey",
    "password",
    "private_key",
    "secret",
    "secret_key",
    "secret_token",
    "signature",
    "token",
    "access_token",
    "refresh_token",
}


def _clean(value: Any) -> str:
    return str(
        value or ""
    ).strip()


def _safe_provider_snapshot(
    value: Any,
) -> Any:
    if isinstance(value, dict):
        result: dict[str, Any] = {}

        for key, item in value.items():
            key_text = str(key)
            normalized = (
                key_text
                .strip()
                .lower()
            )

            if (
                normalized in _SENSITIVE_KEYS
                or "authorization" in normalized
                or "signature" in normalized
                or "secret" in normalized
                or normalized.endswith("_token")
            ):
                result[key_text] = "[REDACTED]"
            else:
                result[key_text] = (
                    _safe_provider_snapshot(
                        item
                    )
                )

        return result

    if isinstance(value, list):
        return [
            _safe_provider_snapshot(item)
            for item in value
        ]

    if value is None or isinstance(
        value,
        (str, int, float, bool),
    ):
        return value

    return str(value)


def _major_to_minor(
    value: Any,
) -> int:
    try:
        amount = Decimal(
            str(value)
        )
    except Exception as exc:
        raise ValidationError(
            {
                "amount": (
                    "Invalid local platform payment amount."
                )
            }
        ) from exc

    if (
        not amount.is_finite()
        or amount < 0
    ):
        raise ValidationError(
            {
                "amount": (
                    "Invalid local platform payment amount."
                )
            }
        )

    return int(
        (
            amount
            * Decimal("100")
        ).quantize(
            _MINOR_QUANTIZER,
            rounding=ROUND_HALF_UP,
        )
    )


def _local_reference(
    payment: PlatformSubscriptionPayment,
) -> str:
    return (
        _clean(
            payment.payment_reference
        )
        or _clean(
            payment.billing_reference
        )
    )


def _allowed_references(
    payment: PlatformSubscriptionPayment,
) -> set[str]:
    return {
        value
        for value in (
            _clean(
                payment.payment_reference
            ),
            _clean(
                payment.billing_reference
            ),
        )
        if value
    }


def _status_matches(
    *,
    local_status: str,
    provider_status: PaymentStatus,
) -> bool:
    local = _clean(
        local_status
    ).upper()

    allowed: dict[
        str,
        set[PaymentStatus],
    ] = {
        PlatformSubscriptionPayment.Status.PENDING: {
            PaymentStatus.INITIATED,
            PaymentStatus.PENDING,
        },
        PlatformSubscriptionPayment.Status.PROCESSING: {
            PaymentStatus.INITIATED,
            PaymentStatus.PENDING,
            PaymentStatus.AUTHORIZED,
        },
        PlatformSubscriptionPayment.Status.PAID: {
            PaymentStatus.PAID,
        },
        PlatformSubscriptionPayment.Status.FAILED: {
            PaymentStatus.FAILED,
        },
        PlatformSubscriptionPayment.Status.CANCELLED: {
            PaymentStatus.CANCELLED,
            PaymentStatus.VOIDED,
        },
    }

    return provider_status in allowed.get(
        local,
        set(),
    )


def _check(
    *,
    expected: Any,
    actual: Any,
    matched: bool,
    checked: bool = True,
) -> dict[str, Any]:
    return {
        "checked": checked,
        "matched": (
            bool(matched)
            if checked
            else None
        ),
        "expected": (
            expected
            if expected is not None
            else ""
        ),
        "actual": (
            actual
            if actual is not None
            else ""
        ),
    }


def _base_values(
    payment: PlatformSubscriptionPayment,
) -> dict[str, Any]:
    return {
        "payment": payment,
        "gateway": _clean(
            payment.gateway
        ).upper(),
        "provider_payment_id": _clean(
            payment.gateway_payment_id
        ),
        "local_status": _clean(
            payment.status
        ).upper(),
        "local_amount_minor": (
            _major_to_minor(
                payment.amount
            )
        ),
        "local_currency": _clean(
            payment.currency_code
        ).upper(),
        "local_reference": (
            _local_reference(
                payment
            )
        ),
    }


def reconcile_platform_payment(
    *,
    payment: PlatformSubscriptionPayment,
    actor=None,
    adapter: PaymentGatewayAdapter | None = None,
) -> PlatformPaymentReconciliation:
    """
    Reconcile a local platform subscription payment against a fresh,
    authoritative provider result.

    IMPORTANT:
    This function is audit-only.

    It never calls apply_gateway_result(),
    verify_and_apply_gateway_payment(),
    confirm_subscription_payment(),
    fail_subscription_payment(),
    cancel_subscription_payment_attempt(),
    or any refund lifecycle mutation.
    """

    payment = (
        PlatformSubscriptionPayment
        .objects
        .select_related(
            "subscription",
            "company",
            "invoice",
            "receipt",
        )
        .get(pk=payment.pk)
    )

    base = _base_values(
        payment
    )

    if not base["gateway"]:
        raise ValidationError(
            {
                "gateway": (
                    "Platform payment gateway is required "
                    "for reconciliation."
                )
            }
        )

    if not base["provider_payment_id"]:
        raise ValidationError(
            {
                "gateway_payment_id": (
                    "Provider payment ID is required "
                    "for reconciliation."
                )
            }
        )

    try:
        gateway_adapter = (
            adapter
            or get_payment_gateway_adapter(
                payment.gateway
            )
        )

        result = (
            gateway_adapter
            .retrieve_payment(
                payment.gateway_payment_id
            )
        )

    except Exception as exc:
        return (
            PlatformPaymentReconciliation
            .objects
            .create(
                **base,
                status=(
                    PlatformPaymentReconciliation
                    .Status
                    .ERROR
                ),
                checks={},
                discrepancies=[],
                warnings=[],
                provider_snapshot={},
                error_code=(
                    exc.__class__.__name__
                    .upper()
                )[:100],
                error_message=(
                    "Provider reconciliation request failed."
                ),
                reconciled_by=actor,
                reconciled_at=timezone.now(),
            )
        )

    return _store_result(
        payment=payment,
        result=result,
        actor=actor,
    )


def _store_result(
    *,
    payment: PlatformSubscriptionPayment,
    result: PaymentResult,
    actor=None,
) -> PlatformPaymentReconciliation:
    base = _base_values(
        payment
    )

    discrepancies: list[str] = []
    warnings: list[str] = []
    checks: dict[str, Any] = {}

    expected_gateway = (
        base["gateway"].lower()
    )

    actual_gateway = (
        result.gateway.value
    )

    gateway_match = (
        expected_gateway
        == actual_gateway
    )

    checks["gateway"] = _check(
        expected=expected_gateway,
        actual=actual_gateway,
        matched=gateway_match,
    )

    if not gateway_match:
        discrepancies.append(
            "GATEWAY_MISMATCH"
        )

    expected_provider_id = (
        base["provider_payment_id"]
    )

    actual_provider_id = _clean(
        result.provider_payment_id
    )

    provider_id_match = (
        expected_provider_id
        == actual_provider_id
    )

    checks["provider_payment_id"] = _check(
        expected=expected_provider_id,
        actual=actual_provider_id,
        matched=provider_id_match,
    )

    if not provider_id_match:
        discrepancies.append(
            "PROVIDER_PAYMENT_ID_MISMATCH"
        )

    expected_amount = (
        base["local_amount_minor"]
    )

    actual_amount = result.amount

    amount_match = (
        actual_amount
        == expected_amount
    )

    checks["amount"] = _check(
        expected=expected_amount,
        actual=actual_amount,
        matched=amount_match,
    )

    if not amount_match:
        discrepancies.append(
            "AMOUNT_MISMATCH"
        )

    expected_currency = (
        base["local_currency"]
    )

    actual_currency = _clean(
        result.currency
    ).upper()

    currency_match = (
        expected_currency
        == actual_currency
    )

    checks["currency"] = _check(
        expected=expected_currency,
        actual=actual_currency,
        matched=currency_match,
    )

    if not currency_match:
        discrepancies.append(
            "CURRENCY_MISMATCH"
        )

    allowed_references = (
        _allowed_references(
            payment
        )
    )

    provider_reference = _clean(
        result.reference
    )

    if provider_reference:
        reference_match = (
            provider_reference
            in allowed_references
        )

        checks["reference"] = _check(
            expected=sorted(
                allowed_references
            ),
            actual=provider_reference,
            matched=reference_match,
        )

        if not reference_match:
            discrepancies.append(
                "REFERENCE_MISMATCH"
            )

    else:
        checks["reference"] = _check(
            expected=sorted(
                allowed_references
            ),
            actual="",
            matched=False,
            checked=False,
        )

        warnings.append(
            "PROVIDER_REFERENCE_NOT_RETURNED"
        )

    status_match = _status_matches(
        local_status=payment.status,
        provider_status=result.status,
    )

    checks["status"] = _check(
        expected=payment.status,
        actual=result.status.value,
        matched=status_match,
    )

    if not status_match:
        discrepancies.append(
            "STATUS_MISMATCH"
        )

    status = (
        PlatformPaymentReconciliation
        .Status
        .MATCHED
    )

    if discrepancies:
        status = (
            PlatformPaymentReconciliation
            .Status
            .DISCREPANCY
        )

    snapshot = (
        _safe_provider_snapshot(
            result.raw
        )
        if isinstance(
            result.raw,
            dict,
        )
        else {}
    )

    record_values = dict(base)

    record_values["provider_payment_id"] = (
        actual_provider_id
        or base["provider_payment_id"]
    )

    return (
        PlatformPaymentReconciliation
        .objects
        .create(
            **record_values,
            status=status,
            provider_status=(
                result.status.value
            ),
            provider_amount_minor=(
                result.amount
            ),
            provider_currency=(
                actual_currency
            ),
            provider_reference=(
                provider_reference
            ),
            checks=checks,
            discrepancies=discrepancies,
            warnings=warnings,
            provider_snapshot=snapshot,
            reconciled_by=actor,
            reconciled_at=timezone.now(),
        )
    )
