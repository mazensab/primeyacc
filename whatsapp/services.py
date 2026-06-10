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