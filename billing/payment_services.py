from __future__ import annotations

import secrets
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from billing.models import (
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformSubscriptionPayment,
    PlatformSubscriptionPaymentEvent,
    money,
)
from billing.services import (
    create_or_get_subscription_invoice,
    create_or_get_subscription_payment_receipt,
)
from subscriptions.models import CompanySubscription
from subscriptions.services import activate_pending_subscription


def _clean(value: Any) -> str:
    return str(value or "").strip()


PROVIDER_MANAGED_GATEWAYS = frozenset(
    {"MOYASAR", "TAMARA", "TABBY"}
)


def is_provider_managed_subscription_payment(
    payment: PlatformSubscriptionPayment,
) -> bool:
    return (
        _clean(payment.gateway).upper()
        in PROVIDER_MANAGED_GATEWAYS
    )


def _json_object(
    value: dict[str, Any] | None,
    field_name: str,
) -> dict[str, Any]:
    if value is None:
        return {}

    if not isinstance(value, dict):
        raise ValidationError(
            {
                field_name: (
                    f"{field_name} يجب أن يكون JSON object."
                ),
            }
        )

    return dict(value)


def _payment_reference() -> str:
    return (
        "PPAY-"
        + timezone.localdate().strftime("%Y")
        + "-"
        + secrets.token_hex(8).upper()
    )


def _idempotency_key(subscription_id: int) -> str:
    return (
        f"subscription:{subscription_id}:"
        f"{secrets.token_hex(16)}"
    )


def record_payment_event(
    *,
    payment: PlatformSubscriptionPayment,
    event_type: str,
    actor=None,
    from_status: str = "",
    to_status: str = "",
    message: str = "",
    payload: dict[str, Any] | None = None,
) -> PlatformSubscriptionPaymentEvent:

    return PlatformSubscriptionPaymentEvent.objects.create(
        payment=payment,
        event_type=_clean(event_type).upper(),
        actor=actor,
        from_status=_clean(from_status).upper(),
        to_status=_clean(to_status).upper(),
        message=_clean(message),
        payload=_json_object(
            payload,
            "payload",
        ),
    )


def validate_payment_financial_contract(
    *,
    payment: PlatformSubscriptionPayment,
    subscription: CompanySubscription,
) -> None:

    invoice = payment.invoice

    if payment.company_id != subscription.company_id:
        raise ValidationError(
            {
                "company": (
                    "شركة الدفع لا تطابق شركة الاشتراك."
                ),
            }
        )

    if payment.subscription_id != subscription.id:
        raise ValidationError(
            {
                "subscription": (
                    "الدفع لا يخص هذا الاشتراك."
                ),
            }
        )

    if invoice.subscription_id != subscription.id:
        raise ValidationError(
            {
                "invoice": (
                    "الفاتورة لا تخص هذا الاشتراك."
                ),
            }
        )

    if invoice.company_id != subscription.company_id:
        raise ValidationError(
            {
                "invoice": (
                    "شركة الفاتورة لا تطابق شركة الاشتراك."
                ),
            }
        )

    if invoice.document_type != (
        PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
    ):
        raise ValidationError(
            {
                "invoice": (
                    "الدفع يجب أن يرتبط بفاتورة اشتراك منصة."
                ),
            }
        )

    if invoice.status == (
        PlatformBillingDocumentStatus.CANCELLED
    ):
        raise ValidationError(
            {
                "invoice": (
                    "لا يمكن الدفع لفاتورة ملغاة."
                ),
            }
        )

    if money(payment.amount) != money(
        subscription.total_amount
    ):
        raise ValidationError(
            {
                "amount": (
                    "مبلغ الدفع لا يطابق إجمالي الاشتراك."
                ),
            }
        )

    if money(payment.amount) != money(
        invoice.total_amount
    ):
        raise ValidationError(
            {
                "amount": (
                    "مبلغ الدفع لا يطابق إجمالي الفاتورة."
                ),
            }
        )

    payment_currency = (
        _clean(payment.currency_code) or "SAR"
    ).upper()

    invoice_currency = (
        _clean(invoice.currency_code) or "SAR"
    ).upper()

    if payment_currency != invoice_currency:
        raise ValidationError(
            {
                "currency_code": (
                    "عملة الدفع لا تطابق عملة الفاتورة."
                ),
            }
        )


@transaction.atomic
def create_or_get_subscription_payment(
    *,
    subscription: CompanySubscription,
    idempotency_key: str = "",
    gateway: str = "MANUAL",
    payment_method: str = "MANUAL",
    gateway_payment_id: str = "",
    transaction_reference: str = "",
    billing_reference: str = "",
    provider_request_snapshot: dict[str, Any] | None = None,
    provider_response_snapshot: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
    created_by=None,
) -> tuple[PlatformSubscriptionPayment, bool]:

    if not subscription or not subscription.pk:
        raise ValidationError(
            {
                "subscription": (
                    "الاشتراك المحفوظ مطلوب."
                ),
            }
        )

    normalized_key = _clean(
        idempotency_key
    )

    if normalized_key:
        existing = (
            PlatformSubscriptionPayment.objects
            .select_related(
                "subscription",
                "company",
                "invoice",
                "receipt",
            )
            .filter(
                idempotency_key=normalized_key
            )
            .first()
        )

        if existing:
            if (
                existing.subscription_id
                != subscription.id
            ):
                raise ValidationError(
                    {
                        "idempotency_key": (
                            "مفتاح منع التكرار مستخدم "
                            "لاشتراك مختلف."
                        ),
                    }
                )

            return existing, False

    locked_subscription = (
        CompanySubscription.objects
        .select_for_update()
        .get(pk=subscription.pk)
    )

    if locked_subscription.status != (
        CompanySubscription.Status.PENDING_PAYMENT
    ):
        raise ValidationError(
            {
                "status": (
                    "لا يمكن إنشاء محاولة دفع جديدة "
                    "إلا لاشتراك PENDING_PAYMENT."
                ),
            }
        )

    invoice, _ = create_or_get_subscription_invoice(
        subscription=locked_subscription,
        created_by=created_by,
    )

    invoice.refresh_from_db()

    if invoice.status == (
        PlatformBillingDocumentStatus.CANCELLED
    ):
        raise ValidationError(
            {
                "invoice": (
                    "فاتورة الاشتراك ملغاة."
                ),
            }
        )

    existing_paid = (
        PlatformSubscriptionPayment.objects
        .filter(
            subscription=locked_subscription,
            status=PlatformSubscriptionPayment.Status.PAID,
        )
        .order_by("-paid_at", "-id")
        .first()
    )

    if existing_paid:
        return existing_paid, False

    next_attempt = (
        PlatformSubscriptionPayment.objects
        .filter(
            subscription=locked_subscription
        )
        .aggregate(
            max_value=Max("attempt_number")
        )
        .get("max_value")
        or 0
    ) + 1

    effective_key = (
        normalized_key
        or _idempotency_key(
            locked_subscription.id
        )
    )

    effective_billing_reference = (
        _clean(billing_reference)
        or _clean(
            locked_subscription.billing_reference
        )
        or _clean(invoice.billing_reference)
    )

    payment = PlatformSubscriptionPayment.objects.create(
        payment_reference=_payment_reference(),
        idempotency_key=effective_key,
        subscription=locked_subscription,
        company=locked_subscription.company,
        invoice=invoice,
        attempt_number=next_attempt,
        status=PlatformSubscriptionPayment.Status.PENDING,
        gateway=(
            _clean(gateway).upper()
            or "MANUAL"
        ),
        payment_method=(
            _clean(payment_method).upper()
            or "MANUAL"
        ),
        gateway_payment_id=_clean(
            gateway_payment_id
        ),
        transaction_reference=_clean(
            transaction_reference
        ),
        billing_reference=(
            effective_billing_reference
        ),
        amount=money(
            locked_subscription.total_amount
        ),
        currency_code=(
            _clean(invoice.currency_code)
            or "SAR"
        ).upper(),
        provider_request_snapshot=_json_object(
            provider_request_snapshot,
            "provider_request_snapshot",
        ),
        provider_response_snapshot=_json_object(
            provider_response_snapshot,
            "provider_response_snapshot",
        ),
        metadata=_json_object(
            metadata,
            "metadata",
        ),
        created_by=created_by,
    )

    validate_payment_financial_contract(
        payment=payment,
        subscription=locked_subscription,
    )

    record_payment_event(
        payment=payment,
        event_type="CREATED",
        actor=created_by,
        to_status=payment.status,
        message=(
            "Platform subscription payment created."
        ),
        payload={
            "attempt_number": payment.attempt_number,
            "invoice_id": invoice.id,
            "invoice_number": invoice.document_number,
        },
    )

    return payment, True


@transaction.atomic
def confirm_subscription_payment(
    *,
    payment: PlatformSubscriptionPayment,
    actor=None,
    paid_at=None,
    transaction_reference: str = "",
    gateway_payment_id: str = "",
    billing_reference: str = "",
    payment_method: str = "",
    provider_response_snapshot: dict[str, Any] | None = None,
    payment_extra: dict[str, Any] | None = None,
    cancel_previous: bool = True,
    provider_verified: bool = False,
):

    locked_payment = (
        PlatformSubscriptionPayment.objects
        .select_for_update()
        .get(pk=payment.pk)
    )

    subscription = (
        CompanySubscription.objects
        .select_for_update()
        .get(pk=locked_payment.subscription_id)
    )

    if (
        is_provider_managed_subscription_payment(
            locked_payment
        )
        and not provider_verified
    ):
        raise ValidationError(
            {
                "gateway": [
                    "Provider-managed payments can only be confirmed "
                    "after authoritative provider verification."
                ]
            }
        )

    if locked_payment.status == (
        PlatformSubscriptionPayment.Status.PAID
    ):
        if subscription.status != (
            CompanySubscription.Status.ACTIVE
        ):
            raise ValidationError(
                {
                    "status": (
                        "الدفع PAID لكن الاشتراك ليس ACTIVE. "
                        "يتطلب مراجعة يدوية."
                    ),
                }
            )

        receipt = locked_payment.receipt

        if receipt is None:
            receipt = (
                subscription
                .platform_billing_documents
                .filter(
                    document_type=(
                        PlatformBillingDocumentType
                        .PAYMENT_RECEIPT
                    )
                )
                .first()
            )

        return (
            locked_payment,
            subscription,
            receipt,
        )

    if locked_payment.status in {
        PlatformSubscriptionPayment.Status.FAILED,
        PlatformSubscriptionPayment.Status.CANCELLED,
    }:
        raise ValidationError(
            {
                "status": (
                    "لا يمكن إعادة FAILED أو CANCELLED "
                    "إلى PAID. أنشئ محاولة جديدة."
                ),
            }
        )

    if locked_payment.status not in {
        PlatformSubscriptionPayment.Status.PENDING,
        PlatformSubscriptionPayment.Status.PROCESSING,
    }:
        raise ValidationError(
            {
                "status": (
                    "حالة الدفع غير قابلة للتأكيد."
                ),
            }
        )

    if subscription.status != (
        CompanySubscription.Status.PENDING_PAYMENT
    ):
        raise ValidationError(
            {
                "subscription": (
                    "الاشتراك يجب أن يكون "
                    "PENDING_PAYMENT."
                ),
            }
        )

    validate_payment_financial_contract(
        payment=locked_payment,
        subscription=subscription,
    )

    effective_paid_at = (
        paid_at or timezone.now()
    )

    effective_transaction_reference = (
        _clean(transaction_reference)
        or _clean(
            locked_payment.transaction_reference
        )
    )

    effective_billing_reference = (
        _clean(billing_reference)
        or _clean(
            locked_payment.billing_reference
        )
        or _clean(
            subscription.billing_reference
        )
    )

    effective_payment_method = (
        _clean(payment_method).upper()
        or locked_payment.payment_method
        or "MANUAL"
    )

    old_status = locked_payment.status

    locked_payment.status = (
        PlatformSubscriptionPayment.Status.PAID
    )
    locked_payment.paid_at = effective_paid_at
    locked_payment.failed_at = None
    locked_payment.cancelled_at = None
    locked_payment.failure_code = ""
    locked_payment.failure_message = ""
    locked_payment.cancellation_reason = ""
    locked_payment.confirmed_by = actor
    locked_payment.payment_method = (
        effective_payment_method
    )
    locked_payment.transaction_reference = (
        effective_transaction_reference
    )
    locked_payment.billing_reference = (
        effective_billing_reference
    )

    if gateway_payment_id:
        incoming_gateway_payment_id = _clean(
            gateway_payment_id
        )

        if (
            locked_payment.gateway_payment_id
            and locked_payment.gateway_payment_id
            != incoming_gateway_payment_id
        ):
            raise ValidationError(
                {
                    "gateway_payment_id": [
                        "Provider payment ID cannot be replaced."
                    ]
                }
            )

        locked_payment.gateway_payment_id = (
            incoming_gateway_payment_id
        )

    if provider_response_snapshot is not None:
        locked_payment.provider_response_snapshot = (
            _json_object(
                provider_response_snapshot,
                "provider_response_snapshot",
            )
        )

    locked_payment.save()

    receipt, _ = (
        create_or_get_subscription_payment_receipt(
            subscription=subscription,
            payment_method=effective_payment_method,
            transaction_reference=(
                effective_transaction_reference
            ),
            billing_reference=(
                effective_billing_reference
            ),
            paid_at=effective_paid_at,
            payment_extra={
                "platform_payment_id": (
                    locked_payment.id
                ),
                "platform_payment_reference": (
                    locked_payment.payment_reference
                ),
                "gateway": (
                    locked_payment.gateway
                ),
                "gateway_payment_id": (
                    locked_payment.gateway_payment_id
                ),
                **_json_object(
                    payment_extra,
                    "payment_extra",
                ),
            },
            created_by=actor,
            metadata={
                "source": (
                    "phase19-platform-payment-engine"
                ),
                "platform_payment_id": (
                    locked_payment.id
                ),
            },
        )
    )

    activated = activate_pending_subscription(
        subscription=subscription,
        paid_at=effective_paid_at,
        billing_reference=(
            effective_billing_reference
        ),
        cancel_previous=cancel_previous,
    )

    locked_payment.receipt = receipt
    locked_payment.save(
        update_fields=[
            "receipt",
            "updated_at",
        ]
    )

    record_payment_event(
        payment=locked_payment,
        event_type="PAID",
        actor=actor,
        from_status=old_status,
        to_status=locked_payment.status,
        message=(
            "Payment confirmed; invoice paid; "
            "receipt issued; subscription activated."
        ),
        payload={
            "subscription_id": activated.id,
            "invoice_id": locked_payment.invoice_id,
            "receipt_id": receipt.id,
            "transaction_reference": (
                effective_transaction_reference
            ),
        },
    )

    return (
        locked_payment,
        activated,
        receipt,
    )


@transaction.atomic
def fail_subscription_payment(
    *,
    payment: PlatformSubscriptionPayment,
    actor=None,
    failure_code: str = "",
    failure_message: str = "",
    provider_response_snapshot: dict[str, Any] | None = None,
):

    locked = (
        PlatformSubscriptionPayment.objects
        .select_for_update()
        .get(pk=payment.pk)
    )

    if locked.status == (
        PlatformSubscriptionPayment.Status.FAILED
    ):
        return locked

    if locked.status == (
        PlatformSubscriptionPayment.Status.PAID
    ):
        raise ValidationError(
            {
                "status": (
                    "لا يمكن تحويل PAID إلى FAILED."
                ),
            }
        )

    if locked.status == (
        PlatformSubscriptionPayment.Status.CANCELLED
    ):
        raise ValidationError(
            {
                "status": (
                    "لا يمكن تحويل CANCELLED إلى FAILED."
                ),
            }
        )

    old_status = locked.status

    locked.status = (
        PlatformSubscriptionPayment.Status.FAILED
    )
    locked.failed_at = timezone.now()
    locked.failure_code = _clean(
        failure_code
    )
    locked.failure_message = _clean(
        failure_message
    )

    if provider_response_snapshot is not None:
        locked.provider_response_snapshot = (
            _json_object(
                provider_response_snapshot,
                "provider_response_snapshot",
            )
        )

    locked.save()

    record_payment_event(
        payment=locked,
        event_type="FAILED",
        actor=actor,
        from_status=old_status,
        to_status=locked.status,
        message=(
            locked.failure_message
            or "Platform payment failed."
        ),
        payload={
            "failure_code": locked.failure_code,
        },
    )

    return locked


@transaction.atomic
def cancel_subscription_payment_attempt(
    *,
    payment: PlatformSubscriptionPayment,
    actor=None,
    reason: str = "",
):

    locked = (
        PlatformSubscriptionPayment.objects
        .select_for_update()
        .get(pk=payment.pk)
    )

    if locked.status == (
        PlatformSubscriptionPayment.Status.CANCELLED
    ):
        return locked

    if locked.status == (
        PlatformSubscriptionPayment.Status.PAID
    ):
        raise ValidationError(
            {
                "status": (
                    "لا يمكن إلغاء دفعة ناجحة."
                ),
            }
        )

    old_status = locked.status

    locked.status = (
        PlatformSubscriptionPayment.Status.CANCELLED
    )
    locked.cancelled_at = timezone.now()
    locked.cancellation_reason = _clean(
        reason
    )
    locked.cancelled_by = actor
    locked.save()

    record_payment_event(
        payment=locked,
        event_type="CANCELLED",
        actor=actor,
        from_status=old_status,
        to_status=locked.status,
        message=(
            locked.cancellation_reason
            or "Platform payment cancelled."
        ),
    )

    return locked
