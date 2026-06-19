# ============================================================
# 📂 payments/services.py
# 🧠 PrimeyAcc | Company Payments Domain Services
# ------------------------------------------------------------
# ✅ Creates and updates company payment methods
# ✅ Creates and updates company payment gateways
# ✅ Creates and updates company payment terminals
# ✅ Protects tenant isolation between companies
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل العمليات يجب أن تكون مقيدة بالشركة
# - لا يتم خلط طرق دفع الشركة مع دفع اشتراكات المنصة
# - لا نعيد إعدادات البوابة الحساسة كاملة في serialization العامة
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction

from .models import (
    CompanyPaymentGateway,
    CompanyPaymentMethod,
    CompanyPaymentTerminal,
    ZERO_MONEY,
)


SENSITIVE_GATEWAY_KEYS = {
    "secret",
    "secret_key",
    "private_key",
    "api_secret",
    "api_key",
    "password",
    "token",
    "access_token",
    "webhook_secret",
}


def _clean_code(value: str | None, fallback: str) -> str:
    raw = (value or fallback or "").strip().lower()
    cleaned = "".join(ch if ch.isalnum() else "-" for ch in raw)
    cleaned = "-".join(part for part in cleaned.split("-") if part)
    if not cleaned:
        raise ValidationError("Code is required.")
    return cleaned[:80]


def _validate_same_company(company: Any, obj: Any, field_name: str) -> None:
    if obj is None:
        return

    obj_company_id = getattr(obj, "company_id", None)
    company_id = getattr(company, "id", None)

    if obj_company_id and company_id and obj_company_id != company_id:
        raise ValidationError({field_name: "Selected record does not belong to this company."})


def _mask_gateway_settings(settings: dict[str, Any] | None) -> dict[str, Any]:
    if not settings:
        return {}

    masked: dict[str, Any] = {}
    for key, value in settings.items():
        normalized_key = str(key).lower()

        if normalized_key in SENSITIVE_GATEWAY_KEYS or any(
            sensitive in normalized_key for sensitive in SENSITIVE_GATEWAY_KEYS
        ):
            masked[key] = "********" if value else ""
        else:
            masked[key] = value

    return masked


def serialize_payment_gateway(
    gateway: CompanyPaymentGateway,
    *,
    include_settings: bool = False,
) -> dict[str, Any]:
    data = {
        "id": gateway.id,
        "company_id": gateway.company_id,
        "name": gateway.name,
        "code": gateway.code,
        "gateway_type": gateway.gateway_type,
        "environment": gateway.environment,
        "public_key": gateway.public_key,
        "merchant_id": gateway.merchant_id,
        "settlement_account_code": gateway.settlement_account_code,
        "fee_account_code": gateway.fee_account_code,
        "supports_refunds": gateway.supports_refunds,
        "supports_partial_refunds": gateway.supports_partial_refunds,
        "supports_webhooks": gateway.supports_webhooks,
        "is_active": gateway.is_active,
        "is_default": gateway.is_default,
        "notes": gateway.notes,
        "created_at": gateway.created_at.isoformat() if gateway.created_at else None,
        "updated_at": gateway.updated_at.isoformat() if gateway.updated_at else None,
    }

    if include_settings:
        data["settings"] = _mask_gateway_settings(gateway.settings)

    return data


def serialize_payment_method(method: CompanyPaymentMethod) -> dict[str, Any]:
    return {
        "id": method.id,
        "company_id": method.company_id,
        "gateway_id": method.gateway_id,
        "gateway": serialize_payment_gateway(method.gateway) if method.gateway else None,
        "name": method.name,
        "code": method.code,
        "method_type": method.method_type,
        "settlement_behavior": method.settlement_behavior,
        "cashbox_account_code": method.cashbox_account_code,
        "bank_account_code": method.bank_account_code,
        "settlement_account_code": method.settlement_account_code,
        "fee_account_code": method.fee_account_code,
        "fee_percentage": str(method.fee_percentage),
        "fixed_fee": str(method.fixed_fee),
        "is_cash": method.is_cash,
        "is_bank_transfer": method.is_bank_transfer,
        "is_card": method.is_card,
        "is_online": method.is_online,
        "is_pos_terminal": method.is_pos_terminal,
        "requires_reference": method.requires_reference,
        "requires_manual_confirmation": method.requires_manual_confirmation,
        "allow_customer_checkout": method.allow_customer_checkout,
        "allow_pos": method.allow_pos,
        "is_active": method.is_active,
        "is_default": method.is_default,
        "sort_order": method.sort_order,
        "notes": method.notes,
        "created_at": method.created_at.isoformat() if method.created_at else None,
        "updated_at": method.updated_at.isoformat() if method.updated_at else None,
    }


def serialize_payment_terminal(terminal: CompanyPaymentTerminal) -> dict[str, Any]:
    return {
        "id": terminal.id,
        "company_id": terminal.company_id,
        "branch_id": terminal.branch_id,
        "gateway_id": terminal.gateway_id,
        "payment_method_id": terminal.payment_method_id,
        "name": terminal.name,
        "terminal_code": terminal.terminal_code,
        "terminal_id": terminal.terminal_id,
        "serial_number": terminal.serial_number,
        "provider_name": terminal.provider_name,
        "location_note": terminal.location_note,
        "status": terminal.status,
        "is_active": terminal.is_active,
        "is_default_for_branch": terminal.is_default_for_branch,
        "settings": _mask_gateway_settings(terminal.settings),
        "notes": terminal.notes,
        "last_seen_at": terminal.last_seen_at.isoformat() if terminal.last_seen_at else None,
        "created_at": terminal.created_at.isoformat() if terminal.created_at else None,
        "updated_at": terminal.updated_at.isoformat() if terminal.updated_at else None,
    }


@transaction.atomic
def create_payment_gateway(company: Any, payload: dict[str, Any]) -> CompanyPaymentGateway:
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValidationError({"name": "Gateway name is required."})

    code = _clean_code(payload.get("code"), name)

    gateway = CompanyPaymentGateway(
        company=company,
        name=name,
        code=code,
        gateway_type=payload.get("gateway_type") or CompanyPaymentGateway.GatewayType.CUSTOM,
        environment=payload.get("environment") or CompanyPaymentGateway.Environment.SANDBOX,
        settings=payload.get("settings") or {},
        public_key=payload.get("public_key") or "",
        merchant_id=payload.get("merchant_id") or "",
        settlement_account_code=payload.get("settlement_account_code") or "",
        fee_account_code=payload.get("fee_account_code") or "",
        supports_refunds=bool(payload.get("supports_refunds", False)),
        supports_partial_refunds=bool(payload.get("supports_partial_refunds", False)),
        supports_webhooks=bool(payload.get("supports_webhooks", False)),
        is_active=bool(payload.get("is_active", True)),
        is_default=bool(payload.get("is_default", False)),
        notes=payload.get("notes") or "",
    )

    if gateway.is_default:
        CompanyPaymentGateway.objects.filter(company=company, is_default=True).update(is_default=False)

    gateway.full_clean()
    gateway.save()
    return gateway


@transaction.atomic
def update_payment_gateway(
    gateway: CompanyPaymentGateway,
    payload: dict[str, Any],
) -> CompanyPaymentGateway:
    for field in [
        "name",
        "gateway_type",
        "environment",
        "settings",
        "public_key",
        "merchant_id",
        "settlement_account_code",
        "fee_account_code",
        "supports_refunds",
        "supports_partial_refunds",
        "supports_webhooks",
        "is_active",
        "is_default",
        "notes",
    ]:
        if field in payload:
            setattr(gateway, field, payload.get(field))

    if "code" in payload:
        gateway.code = _clean_code(payload.get("code"), gateway.name)

    if gateway.is_default:
        CompanyPaymentGateway.objects.filter(
            company=gateway.company,
            is_default=True,
        ).exclude(pk=gateway.pk).update(is_default=False)

    gateway.full_clean()
    gateway.save()
    return gateway


@transaction.atomic
def set_payment_gateway_status(
    gateway: CompanyPaymentGateway,
    *,
    is_active: bool,
) -> CompanyPaymentGateway:
    gateway.is_active = bool(is_active)
    gateway.full_clean()
    gateway.save(update_fields=["is_active", "updated_at"])
    return gateway


@transaction.atomic
def create_payment_method(company: Any, payload: dict[str, Any]) -> CompanyPaymentMethod:
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValidationError({"name": "Payment method name is required."})

    code = _clean_code(payload.get("code"), name)

    gateway = payload.get("gateway")
    _validate_same_company(company, gateway, "gateway")

    method = CompanyPaymentMethod(
        company=company,
        gateway=gateway,
        name=name,
        code=code,
        method_type=payload.get("method_type") or CompanyPaymentMethod.MethodType.CASH,
        settlement_behavior=payload.get("settlement_behavior")
        or CompanyPaymentMethod.SettlementBehavior.IMMEDIATE,
        cashbox_account_code=payload.get("cashbox_account_code") or "",
        bank_account_code=payload.get("bank_account_code") or "",
        settlement_account_code=payload.get("settlement_account_code") or "",
        fee_account_code=payload.get("fee_account_code") or "",
        fee_percentage=payload.get("fee_percentage") or 0,
        fixed_fee=payload.get("fixed_fee") or 0,
        requires_reference=bool(payload.get("requires_reference", False)),
        requires_manual_confirmation=bool(payload.get("requires_manual_confirmation", False)),
        allow_customer_checkout=bool(payload.get("allow_customer_checkout", False)),
        allow_pos=bool(payload.get("allow_pos", True)),
        is_active=bool(payload.get("is_active", True)),
        is_default=bool(payload.get("is_default", False)),
        sort_order=payload.get("sort_order") or 100,
        notes=payload.get("notes") or "",
    )

    if method.is_default:
        CompanyPaymentMethod.objects.filter(company=company, is_default=True).update(is_default=False)

    method.full_clean()
    method.save()
    return method


@transaction.atomic
def update_payment_method(
    method: CompanyPaymentMethod,
    payload: dict[str, Any],
) -> CompanyPaymentMethod:
    if "gateway" in payload:
        _validate_same_company(method.company, payload.get("gateway"), "gateway")
        method.gateway = payload.get("gateway")

    for field in [
        "name",
        "method_type",
        "settlement_behavior",
        "cashbox_account_code",
        "bank_account_code",
        "settlement_account_code",
        "fee_account_code",
        "fee_percentage",
        "fixed_fee",
        "requires_reference",
        "requires_manual_confirmation",
        "allow_customer_checkout",
        "allow_pos",
        "is_active",
        "is_default",
        "sort_order",
        "notes",
    ]:
        if field in payload:
            setattr(method, field, payload.get(field))

    if "code" in payload:
        method.code = _clean_code(payload.get("code"), method.name)

    if method.is_default:
        CompanyPaymentMethod.objects.filter(
            company=method.company,
            is_default=True,
        ).exclude(pk=method.pk).update(is_default=False)

    method.full_clean()
    method.save()
    return method


@transaction.atomic
def set_payment_method_status(
    method: CompanyPaymentMethod,
    *,
    is_active: bool,
) -> CompanyPaymentMethod:
    method.is_active = bool(is_active)
    method.full_clean()
    method.save(update_fields=["is_active", "updated_at"])
    return method


@transaction.atomic
def create_payment_terminal(company: Any, payload: dict[str, Any]) -> CompanyPaymentTerminal:
    name = (payload.get("name") or "").strip()
    if not name:
        raise ValidationError({"name": "Terminal name is required."})

    code = _clean_code(payload.get("terminal_code") or payload.get("code"), name)

    branch = payload.get("branch")
    gateway = payload.get("gateway")
    payment_method = payload.get("payment_method")

    _validate_same_company(company, branch, "branch")
    _validate_same_company(company, gateway, "gateway")
    _validate_same_company(company, payment_method, "payment_method")

    terminal = CompanyPaymentTerminal(
        company=company,
        branch=branch,
        gateway=gateway,
        payment_method=payment_method,
        name=name,
        terminal_code=code,
        terminal_id=payload.get("terminal_id") or "",
        serial_number=payload.get("serial_number") or "",
        provider_name=payload.get("provider_name") or "",
        location_note=payload.get("location_note") or "",
        status=payload.get("status") or CompanyPaymentTerminal.TerminalStatus.ACTIVE,
        is_active=bool(payload.get("is_active", True)),
        is_default_for_branch=bool(payload.get("is_default_for_branch", False)),
        settings=payload.get("settings") or {},
        notes=payload.get("notes") or "",
        last_seen_at=payload.get("last_seen_at"),
    )

    if terminal.is_default_for_branch and terminal.branch_id:
        CompanyPaymentTerminal.objects.filter(
            company=company,
            branch=terminal.branch,
            is_default_for_branch=True,
        ).update(is_default_for_branch=False)

    terminal.full_clean()
    terminal.save()
    return terminal


@transaction.atomic
def update_payment_terminal(
    terminal: CompanyPaymentTerminal,
    payload: dict[str, Any],
) -> CompanyPaymentTerminal:
    if "branch" in payload:
        _validate_same_company(terminal.company, payload.get("branch"), "branch")
        terminal.branch = payload.get("branch")

    if "gateway" in payload:
        _validate_same_company(terminal.company, payload.get("gateway"), "gateway")
        terminal.gateway = payload.get("gateway")

    if "payment_method" in payload:
        _validate_same_company(terminal.company, payload.get("payment_method"), "payment_method")
        terminal.payment_method = payload.get("payment_method")

    for field in [
        "name",
        "terminal_id",
        "serial_number",
        "provider_name",
        "location_note",
        "status",
        "is_active",
        "is_default_for_branch",
        "settings",
        "notes",
        "last_seen_at",
    ]:
        if field in payload:
            setattr(terminal, field, payload.get(field))

    if "terminal_code" in payload or "code" in payload:
        terminal.terminal_code = _clean_code(
            payload.get("terminal_code") or payload.get("code"),
            terminal.name,
        )

    if terminal.is_default_for_branch and terminal.branch_id:
        CompanyPaymentTerminal.objects.filter(
            company=terminal.company,
            branch=terminal.branch,
            is_default_for_branch=True,
        ).exclude(pk=terminal.pk).update(is_default_for_branch=False)

    terminal.full_clean()
    terminal.save()
    return terminal


@transaction.atomic
def set_payment_terminal_status(
    terminal: CompanyPaymentTerminal,
    *,
    is_active: bool,
    status: str | None = None,
) -> CompanyPaymentTerminal:
    terminal.is_active = bool(is_active)

    if status:
        terminal.status = status
    else:
        terminal.status = (
            CompanyPaymentTerminal.TerminalStatus.ACTIVE
            if terminal.is_active
            else CompanyPaymentTerminal.TerminalStatus.INACTIVE
        )

    terminal.full_clean()
    terminal.save(update_fields=["is_active", "status", "updated_at"])
    return terminal


# ============================================================
# 🧠 PrimeyAcc | Phase 23 Real Payment Integrations & Settlements Services
# ------------------------------------------------------------
# ✅ Create checkout sessions
# ✅ Record and process payment webhooks
# ✅ Calculate gateway fees and net amounts
# ✅ Create and finalize settlement batches
# ✅ Safe company-scoped serialization
# ============================================================

from decimal import Decimal, ROUND_HALF_UP
from django.utils import timezone

from .models import (
    PaymentCheckoutSession,
    PaymentWebhookEvent,
    PaymentSettlementBatch,
    PaymentSettlementItem,
)


MONEY_QUANT = Decimal("0.01")


def _to_decimal_money(value: Any, field_name: str = "amount") -> Decimal:
    try:
        amount = Decimal(str(value or "0")).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)
    except Exception as exc:
        raise ValidationError({field_name: "Invalid money amount."}) from exc

    return amount


def calculate_payment_gateway_fee(
    *,
    amount: Decimal,
    fee_percentage: Decimal | str | int | float | None = None,
    fixed_fee: Decimal | str | int | float | None = None,
) -> Decimal:
    """
    Calculate gateway fee using method percentage + fixed fee.

    fee_percentage is stored as a percent value.
    Example: 2.5000 means 2.5%.
    """
    amount = _to_decimal_money(amount)
    percentage = Decimal(str(fee_percentage or "0"))
    fixed = _to_decimal_money(fixed_fee or "0", "fixed_fee")

    fee = ((amount * percentage) / Decimal("100")) + fixed
    if fee < ZERO_MONEY:
        raise ValidationError({"fee": "Gateway fee cannot be negative."})

    return fee.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def serialize_checkout_session(session: PaymentCheckoutSession) -> dict[str, Any]:
    return {
        "id": session.id,
        "company_id": session.company_id,
        "payment_method_id": session.payment_method_id,
        "gateway_id": session.gateway_id,
        "terminal_id": session.terminal_id,
        "source_type": session.source_type,
        "source_id": session.source_id,
        "amount": str(session.amount),
        "currency_code": session.currency_code,
        "description": session.description,
        "customer_email": session.customer_email,
        "customer_phone": session.customer_phone,
        "status": session.status,
        "external_checkout_id": session.external_checkout_id,
        "external_payment_id": session.external_payment_id,
        "checkout_url": session.checkout_url,
        "idempotency_key": session.idempotency_key,
        "gateway_fee_amount": str(session.gateway_fee_amount),
        "net_amount": str(session.net_amount),
        "metadata": session.metadata or {},
        "failure_reason": session.failure_reason,
        "expires_at": session.expires_at.isoformat() if session.expires_at else None,
        "paid_at": session.paid_at.isoformat() if session.paid_at else None,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "updated_at": session.updated_at.isoformat() if session.updated_at else None,
    }


def serialize_webhook_event(event: PaymentWebhookEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "company_id": event.company_id,
        "gateway_id": event.gateway_id,
        "checkout_session_id": event.checkout_session_id,
        "event_type": event.event_type,
        "external_event_id": event.external_event_id,
        "external_payment_id": event.external_payment_id,
        "idempotency_key": event.idempotency_key,
        "status": event.status,
        "payload": event.payload or {},
        "headers": event.headers or {},
        "signature": "********" if event.signature else "",
        "error_message": event.error_message,
        "processed_at": event.processed_at.isoformat() if event.processed_at else None,
        "created_at": event.created_at.isoformat() if event.created_at else None,
    }


def serialize_settlement_batch(batch: PaymentSettlementBatch, *, include_items: bool = False) -> dict[str, Any]:
    payload = {
        "id": batch.id,
        "company_id": batch.company_id,
        "gateway_id": batch.gateway_id,
        "payment_method_id": batch.payment_method_id,
        "settlement_reference": batch.settlement_reference,
        "status": batch.status,
        "currency_code": batch.currency_code,
        "gross_amount": str(batch.gross_amount),
        "fee_amount": str(batch.fee_amount),
        "net_amount": str(batch.net_amount),
        "settlement_date": batch.settlement_date.isoformat() if batch.settlement_date else None,
        "posted_at": batch.posted_at.isoformat() if batch.posted_at else None,
        "notes": batch.notes,
        "metadata": batch.metadata or {},
        "created_at": batch.created_at.isoformat() if batch.created_at else None,
        "updated_at": batch.updated_at.isoformat() if batch.updated_at else None,
    }

    if include_items:
        payload["items"] = [
            serialize_settlement_item(item)
            for item in batch.items.select_related("checkout_session", "webhook_event").all()
        ]

    return payload


def serialize_settlement_item(item: PaymentSettlementItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "batch_id": item.batch_id,
        "checkout_session_id": item.checkout_session_id,
        "webhook_event_id": item.webhook_event_id,
        "external_payment_id": item.external_payment_id,
        "gross_amount": str(item.gross_amount),
        "fee_amount": str(item.fee_amount),
        "net_amount": str(item.net_amount),
        "status": item.status,
        "notes": item.notes,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@transaction.atomic
def create_checkout_session(company: Any, payload: dict[str, Any]) -> PaymentCheckoutSession:
    payment_method = payload.get("payment_method")
    gateway = payload.get("gateway")
    terminal = payload.get("terminal")

    _validate_same_company(company, payment_method, "payment_method")
    _validate_same_company(company, gateway, "gateway")
    _validate_same_company(company, terminal, "terminal")

    if payment_method is None:
        raise ValidationError({"payment_method": "Payment method is required."})

    if gateway is None:
        gateway = payment_method.gateway

    if gateway is None:
        raise ValidationError({"gateway": "Payment gateway is required."})

    amount = _to_decimal_money(payload.get("amount"), "amount")
    if amount <= ZERO_MONEY:
        raise ValidationError({"amount": "Checkout amount must be greater than zero."})

    idempotency_key = (payload.get("idempotency_key") or "").strip()
    if idempotency_key:
        existing = PaymentCheckoutSession.objects.filter(
            company=company,
            idempotency_key=idempotency_key,
        ).first()
        if existing:
            return existing

    fee = calculate_payment_gateway_fee(
        amount=amount,
        fee_percentage=getattr(payment_method, "fee_percentage", ZERO_MONEY),
        fixed_fee=getattr(payment_method, "fixed_fee", ZERO_MONEY),
    )

    session = PaymentCheckoutSession(
        company=company,
        payment_method=payment_method,
        gateway=gateway,
        terminal=terminal,
        source_type=payload.get("source_type") or PaymentCheckoutSession.SourceType.MANUAL,
        source_id=payload.get("source_id"),
        amount=amount,
        currency_code=payload.get("currency_code") or getattr(company, "currency_code", "SAR") or "SAR",
        description=payload.get("description") or "",
        customer_email=payload.get("customer_email") or "",
        customer_phone=payload.get("customer_phone") or "",
        status=PaymentCheckoutSession.Status.PENDING,
        external_checkout_id=payload.get("external_checkout_id") or "",
        external_payment_id=payload.get("external_payment_id") or "",
        checkout_url=payload.get("checkout_url") or "",
        idempotency_key=idempotency_key,
        gateway_fee_amount=fee,
        net_amount=amount - fee,
        metadata=payload.get("metadata") or {},
        expires_at=payload.get("expires_at"),
    )
    session.save()
    return session


@transaction.atomic
def mark_checkout_session_processing(
    session: PaymentCheckoutSession,
    *,
    external_checkout_id: str = "",
    checkout_url: str = "",
) -> PaymentCheckoutSession:
    if session.status not in {
        PaymentCheckoutSession.Status.PENDING,
        PaymentCheckoutSession.Status.PROCESSING,
    }:
        raise ValidationError({"status": "Only pending checkout sessions can be moved to processing."})

    session.status = PaymentCheckoutSession.Status.PROCESSING
    if external_checkout_id:
        session.external_checkout_id = external_checkout_id
    if checkout_url:
        session.checkout_url = checkout_url

    session.save(update_fields=["status", "external_checkout_id", "checkout_url", "updated_at"])
    return session


@transaction.atomic
def complete_checkout_session(
    session: PaymentCheckoutSession,
    *,
    external_payment_id: str = "",
    paid_at=None,
) -> PaymentCheckoutSession:
    if session.status == PaymentCheckoutSession.Status.PAID:
        return session

    if session.status in {
        PaymentCheckoutSession.Status.CANCELLED,
        PaymentCheckoutSession.Status.EXPIRED,
    }:
        raise ValidationError({"status": "Cancelled or expired checkout sessions cannot be paid."})

    session.status = PaymentCheckoutSession.Status.PAID
    if external_payment_id:
        session.external_payment_id = external_payment_id
    session.paid_at = paid_at or timezone.now()
    session.failure_reason = ""
    session.save(update_fields=["status", "external_payment_id", "paid_at", "failure_reason", "updated_at"])
    return session


@transaction.atomic
def fail_checkout_session(
    session: PaymentCheckoutSession,
    *,
    reason: str = "",
) -> PaymentCheckoutSession:
    if session.status == PaymentCheckoutSession.Status.PAID:
        raise ValidationError({"status": "Paid checkout sessions cannot be failed."})

    session.status = PaymentCheckoutSession.Status.FAILED
    session.failure_reason = reason or "Gateway payment failed."
    session.save(update_fields=["status", "failure_reason", "updated_at"])
    return session


@transaction.atomic
def record_payment_webhook_event(company: Any, payload: dict[str, Any]) -> PaymentWebhookEvent:
    gateway = payload.get("gateway")
    checkout_session = payload.get("checkout_session")

    _validate_same_company(company, gateway, "gateway")
    _validate_same_company(company, checkout_session, "checkout_session")

    if gateway is None:
        raise ValidationError({"gateway": "Payment gateway is required."})

    external_event_id = (payload.get("external_event_id") or "").strip()
    idempotency_key = (payload.get("idempotency_key") or "").strip()

    if external_event_id:
        existing = PaymentWebhookEvent.objects.filter(
            company=company,
            gateway=gateway,
            external_event_id=external_event_id,
        ).first()
        if existing:
            return existing

    if idempotency_key:
        existing = PaymentWebhookEvent.objects.filter(
            company=company,
            gateway=gateway,
            idempotency_key=idempotency_key,
        ).first()
        if existing:
            return existing

    event = PaymentWebhookEvent(
        company=company,
        gateway=gateway,
        checkout_session=checkout_session,
        event_type=payload.get("event_type") or "payment.event",
        external_event_id=external_event_id,
        external_payment_id=payload.get("external_payment_id") or "",
        idempotency_key=idempotency_key,
        status=PaymentWebhookEvent.Status.RECEIVED,
        payload=payload.get("payload") or {},
        headers=payload.get("headers") or {},
        signature=payload.get("signature") or "",
    )
    event.save()
    return event


@transaction.atomic
def process_payment_webhook_event(
    event: PaymentWebhookEvent,
    *,
    checkout_session: PaymentCheckoutSession | None = None,
    payment_status: str = "",
    external_payment_id: str = "",
) -> PaymentWebhookEvent:
    session = checkout_session or event.checkout_session
    normalized_status = str(payment_status or "").strip().lower()

    try:
        if normalized_status in {"paid", "succeeded", "success", "captured", "authorized"}:
            if not session:
                raise ValidationError({"checkout_session": "Checkout session is required to mark payment as paid."})
            session = complete_checkout_session(
                session,
                external_payment_id=external_payment_id or event.external_payment_id,
            )
            event.checkout_session = session
            event.status = PaymentWebhookEvent.Status.PROCESSED
            event.processed_at = timezone.now()
            event.error_message = ""

        elif normalized_status in {"failed", "declined", "cancelled", "canceled"}:
            if session:
                fail_checkout_session(session, reason="Gateway webhook reported failure.")
                event.checkout_session = session
            event.status = PaymentWebhookEvent.Status.PROCESSED
            event.processed_at = timezone.now()
            event.error_message = ""

        else:
            event.status = PaymentWebhookEvent.Status.IGNORED
            event.processed_at = timezone.now()
            event.error_message = "Webhook event recorded without a supported payment status."

        event.save(update_fields=["checkout_session", "status", "processed_at", "error_message"])
        return event

    except ValidationError as exc:
        event.status = PaymentWebhookEvent.Status.FAILED
        event.error_message = str(exc)
        event.processed_at = timezone.now()
        event.save(update_fields=["status", "error_message", "processed_at"])
        raise


@transaction.atomic
def create_settlement_batch(company: Any, payload: dict[str, Any]) -> PaymentSettlementBatch:
    gateway = payload.get("gateway")
    payment_method = payload.get("payment_method")

    _validate_same_company(company, gateway, "gateway")
    _validate_same_company(company, payment_method, "payment_method")

    if gateway is None:
        raise ValidationError({"gateway": "Payment gateway is required."})

    settlement_reference = (payload.get("settlement_reference") or "").strip()
    if not settlement_reference:
        raise ValidationError({"settlement_reference": "Settlement reference is required."})

    batch = PaymentSettlementBatch(
        company=company,
        gateway=gateway,
        payment_method=payment_method,
        settlement_reference=settlement_reference,
        status=payload.get("status") or PaymentSettlementBatch.Status.DRAFT,
        currency_code=payload.get("currency_code") or getattr(company, "currency_code", "SAR") or "SAR",
        settlement_date=payload.get("settlement_date"),
        notes=payload.get("notes") or "",
        metadata=payload.get("metadata") or {},
    )
    batch.save()
    return batch


@transaction.atomic
def add_settlement_item(batch: PaymentSettlementBatch, payload: dict[str, Any]) -> PaymentSettlementItem:
    checkout_session = payload.get("checkout_session")
    webhook_event = payload.get("webhook_event")

    if checkout_session is not None and checkout_session.company_id != batch.company_id:
        raise ValidationError({"checkout_session": "Checkout session must belong to the same company."})

    if webhook_event is not None and webhook_event.company_id != batch.company_id:
        raise ValidationError({"webhook_event": "Webhook event must belong to the same company."})

    gross_amount = _to_decimal_money(payload.get("gross_amount"), "gross_amount")
    fee_amount = _to_decimal_money(payload.get("fee_amount") or "0", "fee_amount")

    item = PaymentSettlementItem(
        batch=batch,
        checkout_session=checkout_session,
        webhook_event=webhook_event,
        external_payment_id=payload.get("external_payment_id") or "",
        gross_amount=gross_amount,
        fee_amount=fee_amount,
        net_amount=gross_amount - fee_amount,
        status=payload.get("status") or PaymentSettlementItem.Status.INCLUDED,
        notes=payload.get("notes") or "",
    )
    item.save()

    recalculate_settlement_batch_totals(batch)
    return item


@transaction.atomic
def recalculate_settlement_batch_totals(batch: PaymentSettlementBatch) -> PaymentSettlementBatch:
    items = batch.items.filter(status=PaymentSettlementItem.Status.INCLUDED)

    gross = ZERO_MONEY
    fee = ZERO_MONEY

    for item in items:
        gross += item.gross_amount or ZERO_MONEY
        fee += item.fee_amount or ZERO_MONEY

    batch.gross_amount = gross.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)
    batch.fee_amount = fee.quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)
    batch.net_amount = (batch.gross_amount - batch.fee_amount).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)
    batch.save(update_fields=["gross_amount", "fee_amount", "net_amount", "updated_at"])
    return batch


@transaction.atomic
def finalize_settlement_batch(batch: PaymentSettlementBatch) -> PaymentSettlementBatch:
    if batch.status == PaymentSettlementBatch.Status.CANCELLED:
        raise ValidationError({"status": "Cancelled settlement batches cannot be finalized."})

    recalculate_settlement_batch_totals(batch)

    if not batch.items.filter(status=PaymentSettlementItem.Status.INCLUDED).exists():
        raise ValidationError({"items": "Settlement batch must include at least one item."})

    batch.status = PaymentSettlementBatch.Status.POSTED
    batch.posted_at = timezone.now()
    batch.save(update_fields=["status", "posted_at", "gross_amount", "fee_amount", "net_amount", "updated_at"])
    return batch


@transaction.atomic
def cancel_settlement_batch(batch: PaymentSettlementBatch, *, reason: str = "") -> PaymentSettlementBatch:
    if batch.status == PaymentSettlementBatch.Status.POSTED:
        raise ValidationError({"status": "Posted settlement batches cannot be cancelled."})

    batch.status = PaymentSettlementBatch.Status.CANCELLED
    if reason:
        batch.notes = (batch.notes + "\n" + reason).strip()
    batch.save(update_fields=["status", "notes", "updated_at"])
    return batch
