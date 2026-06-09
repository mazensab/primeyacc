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