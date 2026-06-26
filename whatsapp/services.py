# ============================================================
# 📂 whatsapp/services.py
# 🧠 PrimeyAcc | Company WhatsApp Services V1.0
# ------------------------------------------------------------
# ✅ Tenant-isolated WhatsApp settings helpers
# ✅ Template create/update/status helpers
# ✅ Safe template rendering
# ✅ Mock send message foundation
# ✅ Message log helpers
# ✅ No real external provider call in Phase 14
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نثق بأي company_id من الفرونت
# - كل العمليات تستقبل company من request.company لاحقًا
# - الإرسال في هذه المرحلة mock آمن فقط
# - لا يتم الاتصال بأي WhatsApp API خارجي الآن
# ============================================================

from __future__ import annotations

import re
from typing import Any

from django.db import transaction
from django.db.models import QuerySet
from django.utils import timezone

from companies.models import Company
from whatsapp.models import (
    CompanyWhatsAppSetting,
    WhatsAppMessageDirection,
    WhatsAppMessageLog,
    WhatsAppMessageSourceType,
    WhatsAppMessageStatus,
    WhatsAppProvider,
    WhatsAppTemplate,
    WhatsAppTemplateCategory,
    WhatsAppTemplateStatus,
)


PLACEHOLDER_PATTERN = re.compile(r"{{\s*([a-zA-Z0-9_]+)\s*}}")


def normalize_phone_number(
    *,
    phone_number: str,
    default_country_code: str = "+966",
) -> str:
    """
    Normalize a phone number for storage/logging.

    This is intentionally conservative. Full E.164 validation can be added
    later when real provider integration is enabled.
    """
    phone = (phone_number or "").strip()
    country_code = (default_country_code or "+966").strip()

    if not phone:
        raise ValueError("Recipient phone number is required.")

    phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")

    if phone.startswith("00"):
        phone = "+" + phone[2:]

    if phone.startswith("+"):
        return phone

    if phone.startswith("0"):
        phone = phone[1:]

    if not country_code.startswith("+"):
        country_code = f"+{country_code}"

    return f"{country_code}{phone}"


def get_or_create_company_whatsapp_setting(
    *,
    company: Company,
    user=None,
) -> CompanyWhatsAppSetting:
    """
    Return company WhatsApp setting, creating a safe MOCK default if missing.
    """
    if not company:
        raise ValueError("Company is required.")

    setting, created = CompanyWhatsAppSetting.objects.get_or_create(
        company=company,
        defaults={
            "provider": WhatsAppProvider.MOCK,
            "is_enabled": False,
            "created_by": user,
            "updated_by": user,
        },
    )

    return setting


def update_company_whatsapp_setting(
    *,
    company: Company,
    data: dict[str, Any],
    user=None,
) -> CompanyWhatsAppSetting:
    """
    Update company WhatsApp settings safely.
    """
    setting = get_or_create_company_whatsapp_setting(
        company=company,
        user=user,
    )

    allowed_fields = [
        "is_enabled",
        "provider",
        "phone_number",
        "phone_number_id",
        "business_account_id",
        "access_token",
        "webhook_verify_token",
        "default_country_code",
        "send_invoice_notifications",
        "send_payment_notifications",
        "send_pos_notifications",
        "send_system_notifications",
        "provider_config",
    ]

    for field in allowed_fields:
        if field in data:
            setattr(setting, field, data[field])

    if user:
        setting.updated_by = user

    setting.save()
    return setting


def get_company_templates_queryset(
    *,
    company: Company,
) -> QuerySet[WhatsAppTemplate]:
    """
    Return templates scoped to one company only.
    """
    return WhatsAppTemplate.objects.filter(company=company).order_by(
        "name",
        "code",
    )


def create_whatsapp_template(
    *,
    company: Company,
    name: str,
    code: str,
    body: str,
    category: str = WhatsAppTemplateCategory.GENERAL,
    status: str = WhatsAppTemplateStatus.DRAFT,
    language: str = "ar",
    footer: str = "",
    variables: list[str] | None = None,
    external_template_name: str = "",
    metadata: dict[str, Any] | None = None,
    created_by=None,
) -> WhatsAppTemplate:
    """
    Create one WhatsApp template scoped to company.
    """
    if not company:
        raise ValueError("Company is required.")

    name = (name or "").strip()
    code = (code or "").strip().upper()
    body = (body or "").strip()

    if not name:
        raise ValueError("Template name is required.")

    if not code:
        raise ValueError("Template code is required.")

    if not body:
        raise ValueError("Template body is required.")

    if variables is None:
        variables = extract_template_variables(body)

    return WhatsAppTemplate.objects.create(
        company=company,
        name=name,
        code=code,
        category=category,
        status=status,
        language=(language or "ar").strip(),
        body=body,
        footer=(footer or "").strip(),
        variables=variables,
        external_template_name=(external_template_name or "").strip(),
        metadata=metadata or {},
        created_by=created_by,
        updated_by=created_by,
    )


def get_whatsapp_template_for_company(
    *,
    company: Company,
    template_id: int | None = None,
    code: str = "",
) -> WhatsAppTemplate | None:
    """
    Return one template safely scoped by company.
    """
    queryset = get_company_templates_queryset(company=company)

    if template_id:
        return queryset.filter(id=template_id).first()

    code = (code or "").strip().upper()
    if code:
        return queryset.filter(code=code).first()

    return None


def update_whatsapp_template(
    *,
    company: Company,
    template_id: int,
    data: dict[str, Any],
    user=None,
) -> WhatsAppTemplate:
    """
    Update one WhatsApp template scoped by company.
    """
    template = get_whatsapp_template_for_company(
        company=company,
        template_id=template_id,
    )

    if not template:
        raise ValueError("WhatsApp template was not found.")

    allowed_fields = [
        "name",
        "code",
        "category",
        "status",
        "language",
        "body",
        "footer",
        "external_template_name",
        "variables",
        "metadata",
    ]

    for field in allowed_fields:
        if field in data:
            value = data[field]

            if field == "code":
                value = (value or "").strip().upper()

            if field in ["name", "body", "footer", "language", "external_template_name"]:
                value = (value or "").strip()

            setattr(template, field, value)

    if "variables" not in data and "body" in data:
        template.variables = extract_template_variables(template.body)

    if user:
        template.updated_by = user

    template.save()
    return template


def set_whatsapp_template_status(
    *,
    company: Company,
    template_id: int,
    status: str,
    user=None,
) -> WhatsAppTemplate:
    """
    Set template status safely.
    """
    template = get_whatsapp_template_for_company(
        company=company,
        template_id=template_id,
    )

    if not template:
        raise ValueError("WhatsApp template was not found.")

    allowed_statuses = {
        WhatsAppTemplateStatus.DRAFT,
        WhatsAppTemplateStatus.ACTIVE,
        WhatsAppTemplateStatus.INACTIVE,
        WhatsAppTemplateStatus.ARCHIVED,
    }

    if status not in allowed_statuses:
        raise ValueError("Invalid template status.")

    template.status = status

    if user:
        template.updated_by = user

    template.save(update_fields=["status", "updated_by", "updated_at"])
    return template


def extract_template_variables(body: str) -> list[str]:
    """
    Extract variables from template body.

    Example:
        "Hello {{customer_name}}" -> ["customer_name"]
    """
    found = PLACEHOLDER_PATTERN.findall(body or "")
    return sorted(set(found))


def render_template_body(
    *,
    template: WhatsAppTemplate,
    variables: dict[str, Any] | None = None,
) -> str:
    """
    Render a WhatsApp template body using provided variables.
    """
    variables = variables or {}
    body = template.body or ""

    def replace(match):
        key = match.group(1)
        value = variables.get(key, "")
        return str(value)

    return PLACEHOLDER_PATTERN.sub(replace, body)


def create_message_log(
    *,
    company: Company,
    recipient_phone: str,
    message_body: str,
    recipient_name: str = "",
    template: WhatsAppTemplate | None = None,
    rendered_variables: dict[str, Any] | None = None,
    provider: str = WhatsAppProvider.MOCK,
    direction: str = WhatsAppMessageDirection.OUTBOUND,
    status: str = WhatsAppMessageStatus.DRAFT,
    source_type: str = WhatsAppMessageSourceType.MANUAL,
    source_id: str | int = "",
    provider_response: dict[str, Any] | None = None,
    created_by=None,
) -> WhatsAppMessageLog:
    """
    Create one WhatsApp message log.
    """
    if not company:
        raise ValueError("Company is required.")

    setting = get_or_create_company_whatsapp_setting(company=company, user=created_by)

    normalized_phone = normalize_phone_number(
        phone_number=recipient_phone,
        default_country_code=setting.default_country_code,
    )

    body = (message_body or "").strip()
    if not body:
        raise ValueError("Message body is required.")

    return WhatsAppMessageLog.objects.create(
        company=company,
        template=template,
        direction=direction,
        status=status,
        source_type=source_type,
        source_id=str(source_id or "").strip(),
        recipient_name=(recipient_name or "").strip(),
        recipient_phone=normalized_phone,
        message_body=body,
        rendered_variables=rendered_variables or {},
        provider=provider,
        provider_response=provider_response or {},
        created_by=created_by,
    )


@transaction.atomic
def send_mock_whatsapp_message(
    *,
    company: Company,
    recipient_phone: str,
    message_body: str = "",
    recipient_name: str = "",
    template: WhatsAppTemplate | None = None,
    template_variables: dict[str, Any] | None = None,
    source_type: str = WhatsAppMessageSourceType.MANUAL,
    source_id: str | int = "",
    created_by=None,
) -> WhatsAppMessageLog:
    """
    Mock WhatsApp sending.

    This does not call any external provider.
    It logs the message and marks it as SENT with a mock provider response.
    """
    setting = get_or_create_company_whatsapp_setting(
        company=company,
        user=created_by,
    )

    if template:
        if template.company_id != company.id:
            raise ValueError("Template does not belong to this company.")

        if not template.is_active:
            raise ValueError("Template is not active.")

        final_body = render_template_body(
            template=template,
            variables=template_variables or {},
        )
    else:
        final_body = (message_body or "").strip()

    log = create_message_log(
        company=company,
        template=template,
        recipient_name=recipient_name,
        recipient_phone=recipient_phone,
        message_body=final_body,
        rendered_variables=template_variables or {},
        provider=setting.provider or WhatsAppProvider.MOCK,
        status=WhatsAppMessageStatus.QUEUED,
        source_type=source_type,
        source_id=source_id,
        created_by=created_by,
    )

    log.queued_at = timezone.now()
    log.save(update_fields=["queued_at", "updated_at"])

    log.mark_sent(
        provider_message_id=f"mock-{log.id}",
        provider_response={
            "mock": True,
            "provider": setting.provider,
            "message": "Message logged as sent in mock mode.",
        },
    )

    return log


def get_company_message_logs_queryset(
    *,
    company: Company,
) -> QuerySet[WhatsAppMessageLog]:
    """
    Return WhatsApp message logs scoped to one company.
    """
    return WhatsAppMessageLog.objects.select_related(
        "company",
        "template",
        "created_by",
    ).filter(company=company).order_by("-created_at")


def get_message_log_for_company(
    *,
    company: Company,
    message_id: int,
) -> WhatsAppMessageLog | None:
    """
    Return one WhatsApp message log scoped by company.
    """
    return get_company_message_logs_queryset(company=company).filter(
        id=message_id,
    ).first()


def serialize_whatsapp_setting(setting: CompanyWhatsAppSetting) -> dict[str, Any]:
    """
    Serialize WhatsApp setting without exposing sensitive token values.
    """
    return {
        "id": setting.id,
        "company_id": setting.company_id,
        "is_enabled": setting.is_enabled,
        "provider": setting.provider,
        "phone_number": setting.phone_number,
        "phone_number_id": setting.phone_number_id,
        "business_account_id": setting.business_account_id,
        "has_access_token": bool(setting.access_token),
        "has_webhook_verify_token": bool(setting.webhook_verify_token),
        "default_country_code": setting.default_country_code,
        "send_invoice_notifications": setting.send_invoice_notifications,
        "send_payment_notifications": setting.send_payment_notifications,
        "send_pos_notifications": setting.send_pos_notifications,
        "send_system_notifications": setting.send_system_notifications,
        "provider_config": setting.provider_config,
        "last_verified_at": setting.last_verified_at.isoformat() if setting.last_verified_at else None,
        "created_at": setting.created_at.isoformat() if setting.created_at else None,
        "updated_at": setting.updated_at.isoformat() if setting.updated_at else None,
    }


def serialize_whatsapp_template(template: WhatsAppTemplate) -> dict[str, Any]:
    """
    Serialize WhatsApp template.
    """
    return {
        "id": template.id,
        "company_id": template.company_id,
        "name": template.name,
        "code": template.code,
        "category": template.category,
        "status": template.status,
        "language": template.language,
        "body": template.body,
        "footer": template.footer,
        "external_template_name": template.external_template_name,
        "variables": template.variables,
        "metadata": template.metadata,
        "is_active": template.is_active,
        "created_by_id": template.created_by_id,
        "updated_by_id": template.updated_by_id,
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "updated_at": template.updated_at.isoformat() if template.updated_at else None,
    }


def serialize_whatsapp_message_log(message: WhatsAppMessageLog) -> dict[str, Any]:
    """
    Serialize WhatsApp message log.
    """
    return {
        "id": message.id,
        "company_id": message.company_id,
        "template_id": message.template_id,
        "direction": message.direction,
        "status": message.status,
        "source_type": message.source_type,
        "source_id": message.source_id,
        "recipient_name": message.recipient_name,
        "recipient_phone": message.recipient_phone,
        "message_body": message.message_body,
        "rendered_variables": message.rendered_variables,
        "provider": message.provider,
        "provider_message_id": message.provider_message_id,
        "provider_response": message.provider_response,
        "error_message": message.error_message,
        "queued_at": message.queued_at.isoformat() if message.queued_at else None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "delivered_at": message.delivered_at.isoformat() if message.delivered_at else None,
        "read_at": message.read_at.isoformat() if message.read_at else None,
        "failed_at": message.failed_at.isoformat() if message.failed_at else None,
        "created_by_id": message.created_by_id,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "updated_at": message.updated_at.isoformat() if message.updated_at else None,
    }

# ============================================================
# ?? System WhatsApp Connection Services
# ============================================================
SYSTEM_WHATSAPP_GATEWAY_ENV_NAMES = (
    "WHATSAPP_SESSION_GATEWAY_URL",
    "WHATSAPP_GATEWAY_URL",
    "WHATSAPP_WEB_SESSION_GATEWAY_URL",
)
SYSTEM_WHATSAPP_GATEWAY_TOKEN_ENV_NAMES = (
    "WHATSAPP_SESSION_GATEWAY_TOKEN",
    "WHATSAPP_GATEWAY_TOKEN",
    "WHATSAPP_WEB_SESSION_GATEWAY_TOKEN",
)
def _system_safe_text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text or default
def _system_safe_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "on"}:
            return True
        if lowered in {"0", "false", "no", "off"}:
            return False
    if isinstance(value, int):
        return value == 1
    return default
def get_or_create_system_whatsapp_connection(*, user=None):
    """
    Return the singleton system WhatsApp connection.
    """
    from whatsapp.models import SystemWhatsAppConnection
    connection, created = SystemWhatsAppConnection.objects.get_or_create(
        id=1,
        defaults={
            "provider": "WEB_SESSION",
            "session_name": "primeyacc-system-session",
            "created_by": user,
            "updated_by": user,
        },
    )
    return connection
def update_system_whatsapp_connection(*, data: dict[str, Any], user=None):
    """
    Update system WhatsApp connection settings safely.
    """
    connection = get_or_create_system_whatsapp_connection(user=user)
    allowed_fields = [
        "provider",
        "is_enabled",
        "is_active",
        "business_name",
        "phone_number",
        "phone_number_id",
        "business_account_id",
        "app_id",
        "access_token",
        "webhook_verify_token",
        "webhook_callback_url",
        "webhook_verified",
        "api_version",
        "default_language_code",
        "default_country_code",
        "allow_broadcasts",
        "send_test_enabled",
        "default_test_recipient",
        "session_name",
        "session_mode",
        "provider_config",
    ]
    for field in allowed_fields:
        if field in data:
            setattr(connection, field, data[field])
    if user:
        connection.updated_by = user
    connection.save()
    return connection
def _system_gateway_base_url() -> str:
    import os
    for env_name in SYSTEM_WHATSAPP_GATEWAY_ENV_NAMES:
        value = _system_safe_text(os.getenv(env_name))
        if value:
            return value.rstrip("/")
    return ""
def _system_gateway_token() -> str:
    import os
    for env_name in SYSTEM_WHATSAPP_GATEWAY_TOKEN_ENV_NAMES:
        value = _system_safe_text(os.getenv(env_name))
        if value:
            return value
    return ""
def _system_gateway_configured() -> bool:
    return bool(_system_gateway_base_url())
def _system_gateway_request(
    *,
    path: str,
    payload: dict[str, Any] | None = None,
    method: str = "POST",
) -> dict[str, Any]:
    """
    Call the external WhatsApp session gateway if configured.
    """
    import json
    from urllib.error import HTTPError, URLError
    from urllib.parse import urljoin
    from urllib.request import Request, urlopen
    base_url = _system_gateway_base_url()
    if not base_url:
        message = (
            "WHATSAPP_SESSION_GATEWAY_URL is not configured. "
            "Set it in .env, for example: WHATSAPP_SESSION_GATEWAY_URL=http://127.0.0.1:3100"
        )
        return {
            "success": False,
            "status_code": 500,
            "provider_status": "gateway_not_configured",
            "message": message,
            "error_message": message,
            "session_status": "failed",
            "connected": False,
            "gateway_configured": False,
        }
    target_url = urljoin(f"{base_url}/", path.lstrip("/"))
    body = json.dumps(payload or {}).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    token = _system_gateway_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request_obj = Request(
        target_url,
        data=body,
        headers=headers,
        method=method.upper(),
    )
    try:
        with urlopen(request_obj, timeout=20) as response:
            raw = response.read().decode("utf-8") or "{}"
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = {"raw_response": raw}
            if not isinstance(data, dict):
                data = {"raw_response": data}
            data.setdefault("success", True)
            data.setdefault("status_code", getattr(response, "status", 200))
            data["gateway_configured"] = True
            return data
    except HTTPError as exc:
        raw = ""
        try:
            raw = exc.read().decode("utf-8") or "{}"
            parsed = json.loads(raw)
            if not isinstance(parsed, dict):
                parsed = {"raw_response": parsed}
        except Exception:
            parsed = {"raw_response": raw}
        message = _system_safe_text(
            parsed.get("message")
            or parsed.get("error")
            or parsed.get("error_message"),
            f"Gateway HTTP error {exc.code}",
        )
        return {
            "success": False,
            "status_code": exc.code,
            "provider_status": "gateway_http_error",
            "message": message,
            "error_message": message,
            "details": parsed,
            "session_status": parsed.get("session_status") or "failed",
            "connected": _system_safe_bool(parsed.get("connected"), False),
            "gateway_configured": True,
        }
    except URLError as exc:
        reason = _system_safe_text(getattr(exc, "reason", ""), "unknown")
        message = f"Gateway connection failed: {reason}"
        return {
            "success": False,
            "status_code": 503,
            "provider_status": "gateway_connection_failed",
            "message": message,
            "error_message": message,
            "session_status": "failed",
            "connected": False,
            "gateway_configured": True,
        }
    except Exception as exc:
        message = f"Unexpected gateway error: {str(exc)}"
        return {
            "success": False,
            "status_code": 500,
            "provider_status": "gateway_unexpected_error",
            "message": message,
            "error_message": message,
            "session_status": "failed",
            "connected": False,
            "gateway_configured": True,
        }
def _sync_system_connection_from_gateway(connection, result: dict[str, Any]):
    from django.utils import timezone
    if not isinstance(result, dict):
        result = {}
    connected = _system_safe_bool(result.get("connected"), False)
    status = _system_safe_text(
        result.get("session_status") or result.get("status"),
        "connected" if connected else "disconnected",
    )
    connection.session_status = status
    connection.session_connected_phone = _system_safe_text(
        result.get("connected_phone") or result.get("phone_number") or result.get("phone")
    )
    connection.session_device_label = _system_safe_text(
        result.get("device_label") or result.get("device_name") or result.get("browser")
    )
    connection.session_qr_code = _system_safe_text(
        result.get("qr_code") or result.get("qr") or result.get("qrDataUrl")
    )
    connection.session_pairing_code = _system_safe_text(
        result.get("pairing_code") or result.get("pairingCode")
    )
    connection.last_error_message = _system_safe_text(
        result.get("error_message") or result.get("message")
    )
    connection.last_health_check_at = timezone.now()
    if connected:
        connection.is_enabled = True
        connection.is_active = True
        connection.session_last_connected_at = timezone.now()
    if status == "disconnected":
        connection.is_active = False
        connection.session_qr_code = ""
        connection.session_pairing_code = ""
    connection.save()
    return connection
def serialize_system_whatsapp_connection(connection) -> dict[str, Any]:
    """
    Serialize system WhatsApp connection without exposing secrets.
    """
    return {
        "id": connection.id,
        "provider": connection.provider,
        "is_enabled": connection.is_enabled,
        "is_active": connection.is_active,
        "business_name": connection.business_name,
        "phone_number": connection.phone_number,
        "phone_number_id": connection.phone_number_id,
        "business_account_id": connection.business_account_id,
        "app_id": connection.app_id,
        "has_access_token": bool(connection.access_token),
        "has_webhook_verify_token": bool(connection.webhook_verify_token),
        "webhook_callback_url": connection.webhook_callback_url,
        "webhook_verified": connection.webhook_verified,
        "api_version": connection.api_version,
        "default_language_code": connection.default_language_code,
        "default_country_code": connection.default_country_code,
        "allow_broadcasts": connection.allow_broadcasts,
        "send_test_enabled": connection.send_test_enabled,
        "default_test_recipient": connection.default_test_recipient,
        "session_name": connection.session_name,
        "session_mode": connection.session_mode,
        "session_status": connection.session_status,
        "session_connected_phone": connection.session_connected_phone,
        "session_device_label": connection.session_device_label,
        "session_last_connected_at": connection.session_last_connected_at.isoformat() if connection.session_last_connected_at else None,
        "session_qr_code": connection.session_qr_code,
        "session_pairing_code": connection.session_pairing_code,
        "last_health_check_at": connection.last_health_check_at.isoformat() if connection.last_health_check_at else None,
        "last_error_message": connection.last_error_message,
        "provider_config": connection.provider_config or {},
        "gateway_configured": _system_gateway_configured(),
        "created_at": connection.created_at.isoformat() if connection.created_at else None,
        "updated_at": connection.updated_at.isoformat() if connection.updated_at else None,
    }
def system_whatsapp_session_status(*, user=None) -> dict[str, Any]:
    connection = get_or_create_system_whatsapp_connection(user=user)
    result = _system_gateway_request(
        path="/session/status",
        payload={"session_name": connection.session_name},
    )
    connection = _sync_system_connection_from_gateway(connection, result)
    return {
        "success": bool(result.get("success")),
        "message": _system_safe_text(result.get("message")),
        "result": result,
        "connection": serialize_system_whatsapp_connection(connection),
    }
def system_whatsapp_create_qr(*, user=None) -> dict[str, Any]:
    connection = get_or_create_system_whatsapp_connection(user=user)
    connection.session_mode = "qr"
    if user:
        connection.updated_by = user
    connection.save(update_fields=["session_mode", "updated_by", "updated_at"])
    result = _system_gateway_request(
        path="/session/create-qr",
        payload={"session_name": connection.session_name},
    )
    connection = _sync_system_connection_from_gateway(connection, result)
    return {
        "success": bool(result.get("success")),
        "message": _system_safe_text(result.get("message")),
        "result": result,
        "connection": serialize_system_whatsapp_connection(connection),
    }
def system_whatsapp_create_pairing_code(*, phone_number: str = "", user=None) -> dict[str, Any]:
    connection = get_or_create_system_whatsapp_connection(user=user)
    phone = _system_safe_text(phone_number or connection.default_test_recipient or connection.phone_number)
    connection.session_mode = "pairing_code"
    if user:
        connection.updated_by = user
    connection.save(update_fields=["session_mode", "updated_by", "updated_at"])
    result = _system_gateway_request(
        path="/session/create-pairing-code",
        payload={
            "session_name": connection.session_name,
            "phone_number": phone,
        },
    )
    connection = _sync_system_connection_from_gateway(connection, result)
    return {
        "success": bool(result.get("success")),
        "message": _system_safe_text(result.get("message")),
        "result": result,
        "connection": serialize_system_whatsapp_connection(connection),
    }
def system_whatsapp_disconnect(*, user=None) -> dict[str, Any]:
    connection = get_or_create_system_whatsapp_connection(user=user)
    result = _system_gateway_request(
        path="/session/disconnect",
        payload={"session_name": connection.session_name},
    )
    connection = _sync_system_connection_from_gateway(connection, result)
    if bool(result.get("success")):
        connection.session_status = "disconnected"
        connection.session_qr_code = ""
        connection.session_pairing_code = ""
        connection.is_active = False
        if user:
            connection.updated_by = user
        connection.save()
    return {
        "success": bool(result.get("success")),
        "message": _system_safe_text(result.get("message")),
        "result": result,
        "connection": serialize_system_whatsapp_connection(connection),
    }
def system_whatsapp_send_test_message(
    *,
    recipient_phone: str,
    message_body: str,
    user=None,
) -> dict[str, Any]:
    connection = get_or_create_system_whatsapp_connection(user=user)
    if not connection.send_test_enabled:
        raise ValueError("System WhatsApp test sending is disabled.")
    normalized_phone = normalize_phone_number(
        phone_number=recipient_phone,
        default_country_code=connection.default_country_code,
    )
    body = _system_safe_text(message_body, "PrimeyAcc system WhatsApp test message.")
    result = _system_gateway_request(
        path="/messages/send-text",
        payload={
            "session_name": connection.session_name,
            "to_phone": normalized_phone,
            "body": body,
        },
    )
    connection = _sync_system_connection_from_gateway(connection, result)
    return {
        "success": bool(result.get("success")),
        "message": _system_safe_text(result.get("message")),
        "result": result,
        "connection": serialize_system_whatsapp_connection(connection),
    }

