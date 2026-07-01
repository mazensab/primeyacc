# ============================================================
# 📂 whatsapp/services.py
# 🧠 Mhamcloud | Company WhatsApp Services V1.0
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


def _get_system_whatsapp_message_log_company(*, user=None):
    """
    Resolve a backend-owned company record for system WhatsApp test logs.
    WhatsAppMessageLog is company-scoped. For system test messages, use the
    user's primary active company when available, otherwise use the first
    active company. No company_id is accepted from the frontend.
    """
    try:
        from django.apps import apps
        Company = apps.get_model("companies", "Company")
    except Exception:
        Company = None
    if user and getattr(user, "is_authenticated", False):
        try:
            for related_name in ("companymembership_set", "memberships", "company_memberships"):
                manager = getattr(user, related_name, None)
                if not manager:
                    continue
                membership = (
                    manager.select_related("company")
                    .filter(company__is_active=True)
                    .order_by("-is_primary", "id")
                    .first()
                )
                if membership and getattr(membership, "company_id", None):
                    return membership.company
        except Exception:
            pass
    if Company is not None:
        company = Company.objects.filter(is_active=True).order_by("id").first()
        if company:
            return company
        company = Company.objects.order_by("id").first()
        if company:
            return company
    raise ValueError("At least one company is required to log system WhatsApp test messages.")

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



SYSTEM_WHATSAPP_TEMPLATE_COMPANY_CODE = "SYSTEM-WHATSAPP-TEMPLATES"
SYSTEM_WHATSAPP_READY_TEMPLATES: list[dict[str, Any]] = [{'code': 'SYSTEM_COMPANY_CREATED', 'name_ar': 'إنشاء شركة جديدة', 'name_en': 'New company created', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'مرحبًا {{owner_name}}، تم إنشاء شركة {{company_name}} بنجاح في Mhamcloud. يمكنك الدخول من الرابط: {{login_url}}', 'body_en': 'Hello {{owner_name}}, company {{company_name}} has been created successfully in Mhamcloud. Sign in here: {{login_url}}', 'variables': ['owner_name', 'company_name', 'login_url'], 'metadata': {'scope': 'SYSTEM', 'event': 'company.created', 'module': 'companies', 'i18n': {'ar': {'name': 'إنشاء شركة جديدة', 'body': 'مرحبًا {{owner_name}}، تم إنشاء شركة {{company_name}} بنجاح في Mhamcloud. يمكنك الدخول من الرابط: {{login_url}}'}, 'en': {'name': 'New company created', 'body': 'Hello {{owner_name}}, company {{company_name}} has been created successfully in Mhamcloud. Sign in here: {{login_url}}'}}}}, {'code': 'SYSTEM_COMPANY_ACTIVATED', 'name_ar': 'تفعيل شركة', 'name_en': 'Company activated', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم تفعيل شركة {{company_name}} بنجاح. حالة الشركة الآن: نشطة. رابط الدخول: {{login_url}}', 'body_en': 'Company {{company_name}} has been activated successfully. Sign in here: {{login_url}}', 'variables': ['company_name', 'login_url'], 'metadata': {'scope': 'SYSTEM', 'event': 'company.activated', 'module': 'companies', 'i18n': {'ar': {'name': 'تفعيل شركة', 'body': 'تم تفعيل شركة {{company_name}} بنجاح. حالة الشركة الآن: نشطة. رابط الدخول: {{login_url}}'}, 'en': {'name': 'Company activated', 'body': 'Company {{company_name}} has been activated successfully. Sign in here: {{login_url}}'}}}}, {'code': 'SYSTEM_COMPANY_DEACTIVATED', 'name_ar': 'تعطيل شركة', 'name_en': 'Company deactivated', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم تعطيل شركة {{company_name}} مؤقتًا. للمراجعة أو إعادة التفعيل يرجى التواصل مع الدعم. السبب: {{reason}}', 'body_en': 'Company {{company_name}} has been temporarily deactivated. Reason: {{reason}}. Please contact support for review or reactivation.', 'variables': ['company_name', 'reason'], 'metadata': {'scope': 'SYSTEM', 'event': 'company.deactivated', 'module': 'companies', 'i18n': {'ar': {'name': 'تعطيل شركة', 'body': 'تم تعطيل شركة {{company_name}} مؤقتًا. للمراجعة أو إعادة التفعيل يرجى التواصل مع الدعم. السبب: {{reason}}'}, 'en': {'name': 'Company deactivated', 'body': 'Company {{company_name}} has been temporarily deactivated. Reason: {{reason}}. Please contact support for review or reactivation.'}}}}, {'code': 'SYSTEM_USER_INVITED', 'name_ar': 'دعوة مستخدم', 'name_en': 'User invitation', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'مرحبًا {{user_name}}، تمت دعوتك للانضمام إلى شركة {{company_name}} على Mhamcloud بدور {{role_name}}. رابط الدخول: {{login_url}}', 'body_en': 'Hello {{user_name}}, you have been invited to join {{company_name}} on Mhamcloud as {{role_name}}. Sign in here: {{login_url}}', 'variables': ['user_name', 'company_name', 'role_name', 'login_url'], 'metadata': {'scope': 'SYSTEM', 'event': 'user.invited', 'module': 'users', 'i18n': {'ar': {'name': 'دعوة مستخدم', 'body': 'مرحبًا {{user_name}}، تمت دعوتك للانضمام إلى شركة {{company_name}} على Mhamcloud بدور {{role_name}}. رابط الدخول: {{login_url}}'}, 'en': {'name': 'User invitation', 'body': 'Hello {{user_name}}, you have been invited to join {{company_name}} on Mhamcloud as {{role_name}}. Sign in here: {{login_url}}'}}}}, {'code': 'SYSTEM_USER_ACTIVATED', 'name_ar': 'تفعيل مستخدم', 'name_en': 'User activated', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'مرحبًا {{user_name}}، تم تفعيل حسابك في شركة {{company_name}} ويمكنك الآن استخدام النظام. رابط الدخول: {{login_url}}', 'body_en': 'Hello {{user_name}}, your account at {{company_name}} has been activated. You can now use the system: {{login_url}}', 'variables': ['user_name', 'company_name', 'login_url'], 'metadata': {'scope': 'SYSTEM', 'event': 'user.activated', 'module': 'users', 'i18n': {'ar': {'name': 'تفعيل مستخدم', 'body': 'مرحبًا {{user_name}}، تم تفعيل حسابك في شركة {{company_name}} ويمكنك الآن استخدام النظام. رابط الدخول: {{login_url}}'}, 'en': {'name': 'User activated', 'body': 'Hello {{user_name}}, your account at {{company_name}} has been activated. You can now use the system: {{login_url}}'}}}}, {'code': 'SYSTEM_USER_DEACTIVATED', 'name_ar': 'تعطيل مستخدم', 'name_en': 'User deactivated', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'مرحبًا {{user_name}}، تم تعطيل حسابك في شركة {{company_name}}. للمزيد من التفاصيل يرجى التواصل مع مسؤول النظام.', 'body_en': 'Hello {{user_name}}, your account at {{company_name}} has been deactivated. Please contact the system administrator for details.', 'variables': ['user_name', 'company_name'], 'metadata': {'scope': 'SYSTEM', 'event': 'user.deactivated', 'module': 'users', 'i18n': {'ar': {'name': 'تعطيل مستخدم', 'body': 'مرحبًا {{user_name}}، تم تعطيل حسابك في شركة {{company_name}}. للمزيد من التفاصيل يرجى التواصل مع مسؤول النظام.'}, 'en': {'name': 'User deactivated', 'body': 'Hello {{user_name}}, your account at {{company_name}} has been deactivated. Please contact the system administrator for details.'}}}}, {'code': 'SYSTEM_PASSWORD_RESET', 'name_ar': 'إعادة تعيين كلمة المرور', 'name_en': 'Password reset', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'مرحبًا {{user_name}}، يمكنك إعادة تعيين كلمة المرور من الرابط التالي: {{reset_url}}. تجاهل الرسالة إذا لم تطلب ذلك.', 'body_en': 'Hello {{user_name}}, reset your password using this link: {{reset_url}}. Ignore this message if you did not request it.', 'variables': ['user_name', 'reset_url'], 'metadata': {'scope': 'SYSTEM', 'event': 'user.password_reset', 'module': 'auth', 'i18n': {'ar': {'name': 'إعادة تعيين كلمة المرور', 'body': 'مرحبًا {{user_name}}، يمكنك إعادة تعيين كلمة المرور من الرابط التالي: {{reset_url}}. تجاهل الرسالة إذا لم تطلب ذلك.'}, 'en': {'name': 'Password reset', 'body': 'Hello {{user_name}}, reset your password using this link: {{reset_url}}. Ignore this message if you did not request it.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_CREATED', 'name_ar': 'إضافة اشتراك', 'name_en': 'Subscription created', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم إنشاء اشتراك جديد لشركة {{company_name}} على باقة {{plan_name}}. يبدأ من {{start_date}} وينتهي في {{end_date}}.', 'body_en': 'A new subscription has been created for {{company_name}} on plan {{plan_name}}. It starts on {{start_date}} and ends on {{end_date}}.', 'variables': ['company_name', 'plan_name', 'start_date', 'end_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.created', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'إضافة اشتراك', 'body': 'تم إنشاء اشتراك جديد لشركة {{company_name}} على باقة {{plan_name}}. يبدأ من {{start_date}} وينتهي في {{end_date}}.'}, 'en': {'name': 'Subscription created', 'body': 'A new subscription has been created for {{company_name}} on plan {{plan_name}}. It starts on {{start_date}} and ends on {{end_date}}.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_ACTIVATED', 'name_ar': 'تفعيل اشتراك', 'name_en': 'Subscription activated', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم تفعيل اشتراك شركة {{company_name}} على باقة {{plan_name}} بنجاح. تاريخ الانتهاء: {{end_date}}.', 'body_en': 'The subscription for {{company_name}} on plan {{plan_name}} has been activated. Expiry date: {{end_date}}.', 'variables': ['company_name', 'plan_name', 'end_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.activated', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'تفعيل اشتراك', 'body': 'تم تفعيل اشتراك شركة {{company_name}} على باقة {{plan_name}} بنجاح. تاريخ الانتهاء: {{end_date}}.'}, 'en': {'name': 'Subscription activated', 'body': 'The subscription for {{company_name}} on plan {{plan_name}} has been activated. Expiry date: {{end_date}}.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_RENEWED', 'name_ar': 'تجديد اشتراك', 'name_en': 'Subscription renewed', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم تجديد اشتراك شركة {{company_name}} على باقة {{plan_name}} حتى تاريخ {{end_date}}. شكرًا لاستخدام Mhamcloud.', 'body_en': 'The subscription for {{company_name}} on plan {{plan_name}} has been renewed until {{end_date}}. Thank you for using Mhamcloud.', 'variables': ['company_name', 'plan_name', 'end_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.renewed', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'تجديد اشتراك', 'body': 'تم تجديد اشتراك شركة {{company_name}} على باقة {{plan_name}} حتى تاريخ {{end_date}}. شكرًا لاستخدام Mhamcloud.'}, 'en': {'name': 'Subscription renewed', 'body': 'The subscription for {{company_name}} on plan {{plan_name}} has been renewed until {{end_date}}. Thank you for using Mhamcloud.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_UPGRADED', 'name_ar': 'ترقية اشتراك', 'name_en': 'Subscription upgraded', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تمت ترقية اشتراك شركة {{company_name}} من باقة {{old_plan_name}} إلى باقة {{new_plan_name}}. يبدأ التحديث من {{effective_date}}.', 'body_en': 'The subscription for {{company_name}} has been upgraded from {{old_plan_name}} to {{new_plan_name}}. Effective date: {{effective_date}}.', 'variables': ['company_name', 'old_plan_name', 'new_plan_name', 'effective_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.upgraded', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'ترقية اشتراك', 'body': 'تمت ترقية اشتراك شركة {{company_name}} من باقة {{old_plan_name}} إلى باقة {{new_plan_name}}. يبدأ التحديث من {{effective_date}}.'}, 'en': {'name': 'Subscription upgraded', 'body': 'The subscription for {{company_name}} has been upgraded from {{old_plan_name}} to {{new_plan_name}}. Effective date: {{effective_date}}.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_EXPIRING_SOON', 'name_ar': 'اشتراك قريب الانتهاء', 'name_en': 'Subscription expiring soon', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تنبيه: اشتراك شركة {{company_name}} على باقة {{plan_name}} سينتهي بتاريخ {{end_date}}. يرجى التجديد قبل الانتهاء لتجنب الإيقاف.', 'body_en': 'Alert: {{company_name}} subscription on plan {{plan_name}} will expire on {{end_date}}. Please renew before expiry to avoid suspension.', 'variables': ['company_name', 'plan_name', 'end_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.expiring_soon', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'اشتراك قريب الانتهاء', 'body': 'تنبيه: اشتراك شركة {{company_name}} على باقة {{plan_name}} سينتهي بتاريخ {{end_date}}. يرجى التجديد قبل الانتهاء لتجنب الإيقاف.'}, 'en': {'name': 'Subscription expiring soon', 'body': 'Alert: {{company_name}} subscription on plan {{plan_name}} will expire on {{end_date}}. Please renew before expiry to avoid suspension.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_EXPIRED', 'name_ar': 'انتهاء اشتراك', 'name_en': 'Subscription expired', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'انتهى اشتراك شركة {{company_name}} على باقة {{plan_name}} بتاريخ {{end_date}}. يرجى التجديد لاستمرار الخدمة.', 'body_en': 'The subscription for {{company_name}} on plan {{plan_name}} expired on {{end_date}}. Please renew to continue the service.', 'variables': ['company_name', 'plan_name', 'end_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.expired', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'انتهاء اشتراك', 'body': 'انتهى اشتراك شركة {{company_name}} على باقة {{plan_name}} بتاريخ {{end_date}}. يرجى التجديد لاستمرار الخدمة.'}, 'en': {'name': 'Subscription expired', 'body': 'The subscription for {{company_name}} on plan {{plan_name}} expired on {{end_date}}. Please renew to continue the service.'}}}}, {'code': 'SYSTEM_SUBSCRIPTION_CANCELLED', 'name_ar': 'إلغاء اشتراك', 'name_en': 'Subscription cancelled', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم إلغاء اشتراك شركة {{company_name}} على باقة {{plan_name}}. السبب: {{reason}}.', 'body_en': 'The subscription for {{company_name}} on plan {{plan_name}} has been cancelled. Reason: {{reason}}.', 'variables': ['company_name', 'plan_name', 'reason'], 'metadata': {'scope': 'SYSTEM', 'event': 'subscription.cancelled', 'module': 'subscriptions', 'i18n': {'ar': {'name': 'إلغاء اشتراك', 'body': 'تم إلغاء اشتراك شركة {{company_name}} على باقة {{plan_name}}. السبب: {{reason}}.'}, 'en': {'name': 'Subscription cancelled', 'body': 'The subscription for {{company_name}} on plan {{plan_name}} has been cancelled. Reason: {{reason}}.'}}}}, {'code': 'SYSTEM_PAYMENT_CONFIRMED', 'name_ar': 'تأكيد دفع', 'name_en': 'Payment confirmed', 'category': 'TREASURY', 'body_ar': 'تم تأكيد دفع مبلغ {{amount}} {{currency}} لشركة {{company_name}} بنجاح. رقم العملية: {{payment_reference}}.', 'body_en': 'Payment of {{amount}} {{currency}} for {{company_name}} has been confirmed. Payment reference: {{payment_reference}}.', 'variables': ['amount', 'currency', 'company_name', 'payment_reference'], 'metadata': {'scope': 'SYSTEM', 'event': 'payment.confirmed', 'module': 'payments', 'i18n': {'ar': {'name': 'تأكيد دفع', 'body': 'تم تأكيد دفع مبلغ {{amount}} {{currency}} لشركة {{company_name}} بنجاح. رقم العملية: {{payment_reference}}.'}, 'en': {'name': 'Payment confirmed', 'body': 'Payment of {{amount}} {{currency}} for {{company_name}} has been confirmed. Payment reference: {{payment_reference}}.'}}}}, {'code': 'SYSTEM_PAYMENT_FAILED', 'name_ar': 'فشل دفع', 'name_en': 'Payment failed', 'category': 'TREASURY', 'body_ar': 'تعذر إتمام عملية الدفع لشركة {{company_name}} بمبلغ {{amount}} {{currency}}. السبب: {{failure_reason}}.', 'body_en': 'Payment for {{company_name}} amount {{amount}} {{currency}} could not be completed. Reason: {{failure_reason}}.', 'variables': ['company_name', 'amount', 'currency', 'failure_reason'], 'metadata': {'scope': 'SYSTEM', 'event': 'payment.failed', 'module': 'payments', 'i18n': {'ar': {'name': 'فشل دفع', 'body': 'تعذر إتمام عملية الدفع لشركة {{company_name}} بمبلغ {{amount}} {{currency}}. السبب: {{failure_reason}}.'}, 'en': {'name': 'Payment failed', 'body': 'Payment for {{company_name}} amount {{amount}} {{currency}} could not be completed. Reason: {{failure_reason}}.'}}}}, {'code': 'SYSTEM_INVOICE_ISSUED', 'name_ar': 'إصدار فاتورة', 'name_en': 'Invoice issued', 'category': 'ACCOUNTING', 'body_ar': 'تم إصدار فاتورة رقم {{invoice_number}} لشركة {{company_name}} بمبلغ {{amount}} {{currency}}. تاريخ الاستحقاق: {{due_date}}.', 'body_en': 'Invoice {{invoice_number}} has been issued for {{company_name}} for {{amount}} {{currency}}. Due date: {{due_date}}.', 'variables': ['invoice_number', 'company_name', 'amount', 'currency', 'due_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'invoice.issued', 'module': 'billing', 'i18n': {'ar': {'name': 'إصدار فاتورة', 'body': 'تم إصدار فاتورة رقم {{invoice_number}} لشركة {{company_name}} بمبلغ {{amount}} {{currency}}. تاريخ الاستحقاق: {{due_date}}.'}, 'en': {'name': 'Invoice issued', 'body': 'Invoice {{invoice_number}} has been issued for {{company_name}} for {{amount}} {{currency}}. Due date: {{due_date}}.'}}}}, {'code': 'SYSTEM_INVOICE_PDF_READY', 'name_ar': 'إرسال PDF الفاتورة', 'name_en': 'Invoice PDF ready', 'category': 'ACCOUNTING', 'body_ar': 'فاتورتك رقم {{invoice_number}} جاهزة. يمكنك تحميل نسخة PDF من الرابط: {{pdf_url}}', 'body_en': 'Your invoice {{invoice_number}} is ready. Download the PDF copy here: {{pdf_url}}', 'variables': ['invoice_number', 'pdf_url'], 'metadata': {'scope': 'SYSTEM', 'event': 'invoice.pdf_ready', 'module': 'billing', 'attachment': 'pdf', 'i18n': {'ar': {'name': 'إرسال PDF الفاتورة', 'body': 'فاتورتك رقم {{invoice_number}} جاهزة. يمكنك تحميل نسخة PDF من الرابط: {{pdf_url}}'}, 'en': {'name': 'Invoice PDF ready', 'body': 'Your invoice {{invoice_number}} is ready. Download the PDF copy here: {{pdf_url}}'}}}}, {'code': 'SYSTEM_INVOICE_PAYMENT_REMINDER', 'name_ar': 'تذكير فاتورة غير مدفوعة', 'name_en': 'Unpaid invoice reminder', 'category': 'ACCOUNTING', 'body_ar': 'تذكير: فاتورة رقم {{invoice_number}} لشركة {{company_name}} بمبلغ {{amount}} {{currency}} مستحقة بتاريخ {{due_date}}.', 'body_en': 'Reminder: Invoice {{invoice_number}} for {{company_name}} amount {{amount}} {{currency}} is due on {{due_date}}.', 'variables': ['invoice_number', 'company_name', 'amount', 'currency', 'due_date'], 'metadata': {'scope': 'SYSTEM', 'event': 'invoice.payment_reminder', 'module': 'billing', 'i18n': {'ar': {'name': 'تذكير فاتورة غير مدفوعة', 'body': 'تذكير: فاتورة رقم {{invoice_number}} لشركة {{company_name}} بمبلغ {{amount}} {{currency}} مستحقة بتاريخ {{due_date}}.'}, 'en': {'name': 'Unpaid invoice reminder', 'body': 'Reminder: Invoice {{invoice_number}} for {{company_name}} amount {{amount}} {{currency}} is due on {{due_date}}.'}}}}, {'code': 'SYSTEM_GENERAL_ANNOUNCEMENT', 'name_ar': 'إشعار نظام عام', 'name_en': 'General system announcement', 'category': 'GENERAL', 'body_ar': 'إشعار من Mhamcloud: {{announcement_title}}\n{{announcement_body}}', 'body_en': 'Mhamcloud announcement: {{announcement_title}}\n{{announcement_body}}', 'variables': ['announcement_title', 'announcement_body'], 'metadata': {'scope': 'SYSTEM', 'event': 'system.announcement', 'module': 'system', 'i18n': {'ar': {'name': 'إشعار نظام عام', 'body': 'إشعار من Mhamcloud: {{announcement_title}}\n{{announcement_body}}'}, 'en': {'name': 'General system announcement', 'body': 'Mhamcloud announcement: {{announcement_title}}\n{{announcement_body}}'}}}}, {'code': 'SYSTEM_SECURITY_ALERT', 'name_ar': 'تنبيه أمني', 'name_en': 'Security alert', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تنبيه أمني: تم رصد عملية {{security_event}} على حساب {{user_name}} في شركة {{company_name}} بتاريخ {{event_time}}.', 'body_en': 'Security alert: {{security_event}} was detected for user {{user_name}} at {{company_name}} on {{event_time}}.', 'variables': ['security_event', 'user_name', 'company_name', 'event_time'], 'metadata': {'scope': 'SYSTEM', 'event': 'security.alert', 'module': 'security', 'i18n': {'ar': {'name': 'تنبيه أمني', 'body': 'تنبيه أمني: تم رصد عملية {{security_event}} على حساب {{user_name}} في شركة {{company_name}} بتاريخ {{event_time}}.'}, 'en': {'name': 'Security alert', 'body': 'Security alert: {{security_event}} was detected for user {{user_name}} at {{company_name}} on {{event_time}}.'}}}}, {'code': 'SYSTEM_SUPPORT_TICKET_CREATED', 'name_ar': 'فتح تذكرة دعم', 'name_en': 'Support ticket created', 'category': 'CUSTOMER_SERVICE', 'body_ar': 'تم فتح تذكرة دعم رقم {{ticket_number}} لشركة {{company_name}} بعنوان: {{ticket_title}}. سنقوم بالمتابعة قريبًا.', 'body_en': 'Support ticket {{ticket_number}} has been created for {{company_name}} with title: {{ticket_title}}. We will follow up soon.', 'variables': ['ticket_number', 'company_name', 'ticket_title'], 'metadata': {'scope': 'SYSTEM', 'event': 'support.ticket_created', 'module': 'support', 'i18n': {'ar': {'name': 'فتح تذكرة دعم', 'body': 'تم فتح تذكرة دعم رقم {{ticket_number}} لشركة {{company_name}} بعنوان: {{ticket_title}}. سنقوم بالمتابعة قريبًا.'}, 'en': {'name': 'Support ticket created', 'body': 'Support ticket {{ticket_number}} has been created for {{company_name}} with title: {{ticket_title}}. We will follow up soon.'}}}}]
def get_or_create_system_whatsapp_templates_company(*, user=None) -> Company:
    """
    Return the backend-owned company used to host system WhatsApp templates.
    WhatsAppTemplate is currently company-scoped, so system templates are stored
    under a dedicated internal company. No company_id is accepted from frontend.
    """
    company = Company.objects.filter(company_code=SYSTEM_WHATSAPP_TEMPLATE_COMPANY_CODE).first()
    if company:
        return company
    return Company.objects.create(
        company_code=SYSTEM_WHATSAPP_TEMPLATE_COMPANY_CODE,
        name="Mhamcloud System WhatsApp Templates",
        is_active=True,
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )
def seed_system_whatsapp_ready_templates(*, user=None) -> dict[str, Any]:
    """
    Create or update Mhamcloud system WhatsApp ready templates.
    Arabic is stored as the primary template content.
    English content is stored in metadata.i18n.en for UI language switching.
    Idempotent behavior:
    - Existing template by company/code is updated in place.
    - Missing template is created.
    - All seeded templates are ACTIVE and Arabic by default.
    """
    company = get_or_create_system_whatsapp_templates_company(user=user)
    created_count = 0
    updated_count = 0
    template_ids: list[int] = []
    for item in SYSTEM_WHATSAPP_READY_TEMPLATES:
        code = _system_safe_text(item["code"]).upper()
        body = _system_safe_text(item["body_ar"])
        variables = item.get("variables") or extract_template_variables(body)
        metadata = item.get("metadata") or {}
        template, created = WhatsAppTemplate.objects.get_or_create(
            company=company,
            code=code,
            defaults={
                "name": _system_safe_text(item["name_ar"]),
                "category": item.get("category") or WhatsAppTemplateCategory.GENERAL,
                "status": WhatsAppTemplateStatus.ACTIVE,
                "language": "ar",
                "body": body,
                "footer": "Mhamcloud",
                "external_template_name": code.lower(),
                "variables": variables,
                "metadata": metadata,
                "created_by": user if getattr(user, "is_authenticated", False) else None,
                "updated_by": user if getattr(user, "is_authenticated", False) else None,
            },
        )
        if created:
            created_count += 1
        else:
            template.name = _system_safe_text(item["name_ar"])
            template.category = item.get("category") or WhatsAppTemplateCategory.GENERAL
            template.status = WhatsAppTemplateStatus.ACTIVE
            template.language = "ar"
            template.body = body
            template.footer = "Mhamcloud"
            template.external_template_name = code.lower()
            template.variables = variables
            template.metadata = metadata
            if getattr(user, "is_authenticated", False):
                template.updated_by = user
            template.save()
            updated_count += 1
        template_ids.append(template.id)
    return {
        "success": True,
        "message": "System WhatsApp ready templates seeded.",
        "company_id": company.id,
        "company_code": company.company_code,
        "created_count": created_count,
        "updated_count": updated_count,
        "total_count": len(template_ids),
        "template_ids": template_ids,
        "templates": [
            serialize_whatsapp_template(template)
            for template in WhatsAppTemplate.objects.filter(id__in=template_ids).order_by("category", "code")
        ],
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
            "session_name": "Mhamcloud-system-session",
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

def _normalize_system_whatsapp_test_phone(
    *,
    phone_number: str,
    default_country_code: str = "966",
) -> str:
    """
    Normalize System WhatsApp test recipient phones.
    Saudi default behavior:
    - 0505263775      -> +966505263775
    - 505263775       -> +966505263775
    - 966505263775    -> +966505263775
    - +966505263775   -> +966505263775
    - 00966505263775  -> +966505263775
    External numbers are accepted when the user enters a country code:
    - +971501234567   -> +971501234567
    - 00971501234567  -> +971501234567
    - 971501234567    -> +971501234567
    """
    raw = _system_safe_text(phone_number).strip()
    country_code = "".join(
        ch for ch in _system_safe_text(default_country_code, "966") if ch.isdigit()
    ) or "966"
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return normalize_phone_number(
            phone_number=phone_number,
            default_country_code=country_code,
        )
    if raw.startswith("+"):
        return f"+{digits}"
    if digits.startswith("00") and len(digits) > 2:
        return f"+{digits[2:]}"
    if digits.startswith(country_code):
        return f"+{digits}"
    if country_code == "966":
        if digits.startswith("05") and len(digits) == 10:
            return f"+966{digits[1:]}"
        if digits.startswith("5") and len(digits) == 9:
            return f"+966{digits}"
        if digits.startswith("0"):
            return f"+966{digits[1:]}"
        if len(digits) >= 10:
            return f"+{digits}"
        return f"+966{digits}"
    if digits.startswith("0"):
        return f"+{country_code}{digits[1:]}"
    if len(digits) >= 10:
        return f"+{digits}"
    return f"+{country_code}{digits}"


def system_whatsapp_send_test_message(
    *,
    recipient_phone: str,
    message_body: str,
    user=None,
) -> dict[str, Any]:
    connection = get_or_create_system_whatsapp_connection(user=user)
    if not connection.send_test_enabled:
        return {
            "success": False,
            "message": "System WhatsApp test messages are disabled.",
            "connection": serialize_system_whatsapp_connection(connection),
            "message_log": None,
        }
    phone = _normalize_system_whatsapp_test_phone(
        phone_number=recipient_phone,
        default_country_code=connection.default_country_code,
    )
    body = _system_safe_text(message_body, "Mhamcloud system WhatsApp test message.")
    result = _system_gateway_request(
        path="/messages/send-text",
        payload={
            "session_name": connection.session_name,
            "to_phone": phone,
            "body": body,
        },
    )
    connection = _sync_system_connection_from_gateway(connection, result)
    provider_message_id = _system_safe_text(
        result.get("message_id")
        or result.get("external_message_id")
        or result.get("provider_message_id")
        or result.get("id")
    )
    log_company = _get_system_whatsapp_message_log_company(user=user)
    now = timezone.now()
    success = bool(result.get("success"))
    message_log = WhatsAppMessageLog.objects.create(
        company=log_company,
        template=None,
        direction="OUTBOUND",
        status="SENT" if success else "FAILED",
        source_type="SYSTEM",
        source_id=f"system-whatsapp-test-{connection.id}",
        recipient_name="System WhatsApp Test",
        recipient_phone=phone,
        message_body=body,
        rendered_variables={
            "system_connection_id": connection.id,
            "session_name": connection.session_name,
        },
        provider=str(connection.provider or "WEB_SESSION"),
        provider_message_id=provider_message_id if success else "",
        provider_response=result,
        error_message=""
        if success
        else _system_safe_text(
            result.get("error_message")
            or result.get("message")
            or "System WhatsApp test message failed."
        ),
        queued_at=now,
        sent_at=now if success else None,
        failed_at=None if success else now,
        created_by=user if getattr(user, "is_authenticated", False) else None,
    )
    return {
        "success": success,
        "message": _system_safe_text(result.get("message")),
        "result": result,
        "connection": serialize_system_whatsapp_connection(connection),
        "message_log": serialize_whatsapp_message_log(message_log),
    }

# ============================================================
# WhatsApp Inbox Foundation Services
# ============================================================
def _normalize_whatsapp_inbox_phone(value) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    raw = raw.split("@", 1)[0]
    raw = raw.split(":", 1)[0]
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 10:
        digits = "966" + digits[1:]
    if len(digits) == 9 and digits.startswith("5"):
        digits = "966" + digits
    return digits
def _parse_whatsapp_inbox_datetime(value):
    from datetime import datetime
    from django.utils import timezone
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        candidate = float(value)
        if candidate > 10_000_000_000:
            candidate = candidate / 1000
        return datetime.fromtimestamp(candidate, tz=timezone.get_current_timezone())
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        if timezone.is_naive(parsed):
            parsed = timezone.make_aware(parsed, timezone.get_current_timezone())
        return parsed
    except ValueError:
        return None
def _whatsapp_inbox_safe_dict(value) -> dict:
    return value if isinstance(value, dict) else {}
def _whatsapp_inbox_event_uid(payload: dict) -> str:
    import hashlib
    import json
    session_name = str(payload.get("session_name") or "Mhamcloud-system-session")
    message_id = str(
        payload.get("message_id")
        or payload.get("external_message_id")
        or payload.get("id")
        or ""
    ).strip()
    if message_id:
        return f"{session_name}:{message_id}"
    raw = json.dumps(payload, ensure_ascii=False, sort_keys=True, default=str)
    return f"{session_name}:{hashlib.sha256(raw.encode('utf-8')).hexdigest()}"
def serialize_whatsapp_inbox_contact(contact) -> dict:
    return {
        "id": contact.id,
        "scope": contact.scope,
        "company_id": contact.company_id,
        "session_name": contact.session_name,
        "phone_number": contact.phone_number,
        "normalized_phone": contact.normalized_phone,
        "whatsapp_jid": contact.whatsapp_jid,
        "display_name": contact.display_name,
        "push_name": contact.push_name,
        "last_seen_at": contact.last_seen_at.isoformat() if contact.last_seen_at else None,
        "metadata": contact.metadata or {},
        "created_at": contact.created_at.isoformat() if contact.created_at else None,
        "updated_at": contact.updated_at.isoformat() if contact.updated_at else None,
    }
def serialize_whatsapp_inbox_message(message) -> dict:
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "contact_id": message.contact_id,
        "company_id": message.company_id,
        "scope": message.scope,
        "session_name": message.session_name,
        "direction": message.direction,
        "status": message.status,
        "message_type": message.message_type,
        "body": message.body,
        "external_message_id": message.external_message_id,
        "provider": message.provider,
        "provider_response": message.provider_response or {},
        "sent_by_id": message.sent_by_id,
        "received_at": message.received_at.isoformat() if message.received_at else None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "metadata": message.metadata or {},
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "updated_at": message.updated_at.isoformat() if message.updated_at else None,
    }
def serialize_whatsapp_inbox_conversation(conversation, *, include_contact: bool = True) -> dict:
    payload = {
        "id": conversation.id,
        "scope": conversation.scope,
        "company_id": conversation.company_id,
        "contact_id": conversation.contact_id,
        "session_name": conversation.session_name,
        "status": conversation.status,
        "is_pinned": conversation.is_pinned,
        "is_resolved": conversation.is_resolved,
        "assigned_to_id": conversation.assigned_to_id,
        "assigned_to_name": (
            conversation.assigned_to.get_full_name()
            or conversation.assigned_to.get_username()
            if conversation.assigned_to_id and conversation.assigned_to
            else ""
        ),
        "last_message_preview": conversation.last_message_preview,
        "last_message_at": conversation.last_message_at.isoformat() if conversation.last_message_at else None,
        "unread_count": conversation.unread_count,
        "metadata": conversation.metadata or {},
        "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
        "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None,
    }
    if include_contact:
        payload["contact"] = serialize_whatsapp_inbox_contact(conversation.contact)
    return payload
def serialize_whatsapp_inbox_summary(*, scope: str = "SYSTEM", company=None, session_name: str = "Mhamcloud-system-session") -> dict:
    from django.apps import apps
    Conversation = apps.get_model("whatsapp", "WhatsAppConversation")
    queryset = Conversation.objects.filter(scope=scope, session_name=session_name)
    if company is not None:
        queryset = queryset.filter(company=company)
    elif scope == "SYSTEM":
        queryset = queryset.filter(company__isnull=True)
    return {
        "scope": scope,
        "company_id": getattr(company, "id", None),
        "session_name": session_name,
        "total_conversations": queryset.count(),
        "open_conversations": queryset.filter(status="OPEN").count(),
        "closed_conversations": queryset.filter(status="CLOSED").count(),
        "archived_conversations": queryset.filter(status="ARCHIVED").count(),
        "spam_conversations": queryset.filter(status="SPAM").count(),
        "unread_conversations": queryset.filter(unread_count__gt=0).count(),
        "resolved_conversations": queryset.filter(is_resolved=True).count(),
        "pinned_conversations": queryset.filter(is_pinned=True).count(),
    }
def record_system_whatsapp_incoming_message(payload: dict) -> dict:
    """
    Record an inbound WhatsApp Gateway message into the system inbox.
    This function is idempotent by session_name + message_id/event_uid.
    It does not trust frontend company_id and stores system-level inbox rows
    with company=NULL.
    """
    from django.apps import apps
    from django.db import transaction
    from django.utils import timezone
    if not isinstance(payload, dict):
        raise ValueError("Incoming WhatsApp payload must be a dictionary.")
    Contact = apps.get_model("whatsapp", "WhatsAppContact")
    Conversation = apps.get_model("whatsapp", "WhatsAppConversation")
    Message = apps.get_model("whatsapp", "WhatsAppConversationMessage")
    WebhookEvent = apps.get_model("whatsapp", "WhatsAppWebhookEvent")
    session_name = str(payload.get("session_name") or "Mhamcloud-system-session").strip()
    from_jid = str(
        payload.get("from_jid")
        or payload.get("remote_jid")
        or payload.get("jid")
        or payload.get("from")
        or ""
    ).strip()
    from_phone = str(payload.get("from_phone") or payload.get("phone_number") or "").strip()
    normalized_phone = _normalize_whatsapp_inbox_phone(from_phone or from_jid)
    if not normalized_phone:
        raise ValueError("Incoming WhatsApp phone/JID could not be resolved.")
    message_id = str(
        payload.get("message_id")
        or payload.get("external_message_id")
        or payload.get("id")
        or ""
    ).strip()
    body = str(
        payload.get("body")
        or payload.get("message")
        or payload.get("text")
        or payload.get("message_body")
        or ""
    )
    push_name = str(payload.get("push_name") or payload.get("pushName") or "").strip()
    display_name = str(payload.get("display_name") or payload.get("name") or push_name or normalized_phone).strip()
    event_uid = str(payload.get("event_uid") or _whatsapp_inbox_event_uid(payload)).strip()
    message_at = (
        _parse_whatsapp_inbox_datetime(payload.get("timestamp"))
        or _parse_whatsapp_inbox_datetime(payload.get("messageTimestamp"))
        or timezone.now()
    )
    with transaction.atomic():
        webhook_event, event_created = WebhookEvent.objects.get_or_create(
            event_uid=event_uid,
            defaults={
                "session_name": session_name,
                "event_type": str(payload.get("event_type") or "message.incoming"),
                "status": "RECEIVED",
                "external_message_id": message_id,
                "payload": payload,
            },
        )
        existing_message = None
        if message_id:
            existing_message = Message.objects.filter(
                scope="SYSTEM",
                session_name=session_name,
                external_message_id=message_id,
            ).select_related("conversation", "contact").first()
        if existing_message:
            webhook_event.status = "PROCESSED"
            webhook_event.processed_at = timezone.now()
            webhook_event.save(update_fields=["status", "processed_at"])
            return {
                "success": True,
                "duplicate": True,
                "event": {
                    "id": webhook_event.id,
                    "event_uid": webhook_event.event_uid,
                    "status": webhook_event.status,
                },
                "contact": serialize_whatsapp_inbox_contact(existing_message.contact),
                "conversation": serialize_whatsapp_inbox_conversation(existing_message.conversation),
                "message": serialize_whatsapp_inbox_message(existing_message),
            }
        contact = Contact.objects.filter(
            scope="SYSTEM",
            company__isnull=True,
            session_name=session_name,
            normalized_phone=normalized_phone,
        ).first()
        if contact is None:
            contact = Contact.objects.create(
                scope="SYSTEM",
                company=None,
                session_name=session_name,
                phone_number=from_phone or normalized_phone,
                normalized_phone=normalized_phone,
                whatsapp_jid=from_jid,
                display_name=display_name,
                push_name=push_name,
                last_seen_at=message_at,
                metadata={
                    "source": "gateway",
                    "created_from": "incoming_message",
                },
            )
        else:
            changed_fields = []
            if from_jid and contact.whatsapp_jid != from_jid:
                contact.whatsapp_jid = from_jid
                changed_fields.append("whatsapp_jid")
            if display_name and contact.display_name != display_name:
                contact.display_name = display_name
                changed_fields.append("display_name")
            if push_name and contact.push_name != push_name:
                contact.push_name = push_name
                changed_fields.append("push_name")
            contact.last_seen_at = message_at
            changed_fields.append("last_seen_at")
            changed_fields.append("updated_at")
            contact.save(update_fields=changed_fields)
        conversation = Conversation.objects.filter(
            scope="SYSTEM",
            company__isnull=True,
            session_name=session_name,
            contact=contact,
            status__in=["OPEN", "CLOSED"],
        ).order_by("-last_message_at", "-id").first()
        if conversation is None:
            conversation = Conversation.objects.create(
                scope="SYSTEM",
                company=None,
                contact=contact,
                session_name=session_name,
                status="OPEN",
                is_resolved=False,
                last_message_preview=body[:500],
                last_message_at=message_at,
                unread_count=0,
                metadata={
                    "source": "gateway",
                    "created_from": "incoming_message",
                },
            )
        message = Message.objects.create(
            conversation=conversation,
            contact=contact,
            company=None,
            scope="SYSTEM",
            session_name=session_name,
            direction="INBOUND",
            status="RECEIVED",
            message_type=str(payload.get("message_type") or "TEXT").upper()[:30] or "TEXT",
            body=body,
            external_message_id=message_id,
            provider="WHATSAPP_GATEWAY",
            provider_response=payload,
            received_at=message_at,
            metadata={
                "source": "gateway",
                "event_uid": event_uid,
                "raw_from_jid": from_jid,
            },
        )
        conversation.last_message_preview = body[:500]
        conversation.last_message_at = message_at
        conversation.unread_count = (conversation.unread_count or 0) + 1
        if conversation.status == "CLOSED":
            conversation.status = "OPEN"
            conversation.is_resolved = False
        conversation.save(
            update_fields=[
                "last_message_preview",
                "last_message_at",
                "unread_count",
                "status",
                "is_resolved",
                "updated_at",
            ]
        )
        webhook_event.status = "PROCESSED"
        webhook_event.processed_at = timezone.now()
        webhook_event.save(update_fields=["status", "processed_at"])
    return {
        "success": True,
        "duplicate": False,
        "event": {
            "id": webhook_event.id,
            "event_uid": webhook_event.event_uid,
            "status": webhook_event.status,
        },
        "contact": serialize_whatsapp_inbox_contact(contact),
        "conversation": serialize_whatsapp_inbox_conversation(conversation),
        "message": serialize_whatsapp_inbox_message(message),
    }

# ============================================================
# WhatsApp Inbox Reply Services
# ============================================================
def _post_system_whatsapp_gateway_text(*, session_name: str, body: str, to_phone: str = "", to_jid: str = "") -> dict:
    import json
    import os
    import urllib.error
    import urllib.request
    from django.conf import settings
    gateway_url = str(
        getattr(settings, "WHATSAPP_SESSION_GATEWAY_URL", "")
        or os.environ.get("WHATSAPP_SESSION_GATEWAY_URL", "")
        or "http://127.0.0.1:3100"
    ).rstrip("/")
    timeout = int(
        getattr(settings, "WHATSAPP_SESSION_GATEWAY_TIMEOUT", None)
        or os.environ.get("WHATSAPP_SESSION_GATEWAY_TIMEOUT", "")
        or 20
    )
    token = str(
        getattr(settings, "WHATSAPP_SESSION_GATEWAY_TOKEN", "")
        or os.environ.get("WHATSAPP_SESSION_GATEWAY_TOKEN", "")
        or ""
    ).strip()
    payload = {
        "session_name": session_name or "Mhamcloud-system-session",
        "to_phone": to_phone or "",
        "to_jid": to_jid or "",
        "body": body,
    }
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        f"{gateway_url}/messages/send-text",
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            **({"X-Mhamcloud-Gateway-Token": token} if token else {}),
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw or "{}")
            if isinstance(parsed, dict):
                return parsed
            return {"success": False, "message": "Unexpected gateway response.", "raw": parsed}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw or "{}")
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        return {
            "success": False,
            "provider_status": "gateway_http_error",
            "message": str(exc),
            "error_message": str(exc),
            "status_code": exc.code,
            "response": parsed,
        }
    except Exception as exc:
        return {
            "success": False,
            "provider_status": "gateway_error",
            "message": str(exc),
            "error_message": str(exc),
        }
def _conversation_reply_target(conversation) -> dict:
    contact = conversation.contact
    target_jid = (
        contact.whatsapp_jid
        or (contact.metadata or {}).get("whatsapp_jid")
        or ""
    )
    if not target_jid:
        last_inbound = (
            conversation.messages
            .filter(direction="INBOUND")
            .order_by("-created_at", "-id")
            .first()
        )
        if last_inbound:
            response_payload = last_inbound.provider_response or {}
            target_jid = (
                response_payload.get("from_jid")
                or response_payload.get("remote_jid")
                or response_payload.get("jid")
                or ""
            )
    target_phone = contact.normalized_phone or contact.phone_number or ""
    return {
        "to_jid": str(target_jid or "").strip(),
        "to_phone": str(target_phone or "").strip(),
    }
def send_system_whatsapp_inbox_reply(*, conversation, body: str, user=None) -> dict:
    from django.utils import timezone
    body = str(body or "").strip()
    if not body:
        raise ValueError("Reply body is required.")
    target = _conversation_reply_target(conversation)
    if not target["to_jid"] and not target["to_phone"]:
        raise ValueError("Conversation has no WhatsApp reply target.")
    gateway_payload = _post_system_whatsapp_gateway_text(
        session_name=conversation.session_name,
        body=body,
        to_phone=target["to_phone"],
        to_jid=target["to_jid"],
    )
    success = bool(gateway_payload.get("success"))
    now = timezone.now()
    message = conversation.messages.create(
        contact=conversation.contact,
        company=conversation.company,
        scope=conversation.scope,
        session_name=conversation.session_name,
        direction="OUTBOUND",
        status="SENT" if success else "FAILED",
        message_type="TEXT",
        body=body,
        external_message_id=str(
            gateway_payload.get("message_id")
            or gateway_payload.get("provider_message_id")
            or gateway_payload.get("id")
            or ""
        ),
        provider="WHATSAPP_GATEWAY",
        provider_response={
            **gateway_payload,
            "reply_target": target,
        },
        sent_by=user if getattr(user, "is_authenticated", False) else None,
        sent_at=now if success else None,
        metadata={
            "source": "system_inbox_reply",
            "target_jid": target["to_jid"],
            "target_phone": target["to_phone"],
        },
    )
    conversation.last_message_preview = body[:500]
    conversation.last_message_at = now
    conversation.unread_count = 0
    conversation.status = "OPEN"
    conversation.is_resolved = False
    conversation.save(
        update_fields=[
            "last_message_preview",
            "last_message_at",
            "unread_count",
            "status",
            "is_resolved",
            "updated_at",
        ]
    )
    return {
        "success": success,
        "message": (
            "WhatsApp reply sent successfully."
            if success
            else gateway_payload.get("message") or "WhatsApp reply failed."
        ),
        "gateway": gateway_payload,
        "reply_target": target,
        "conversation": serialize_whatsapp_inbox_conversation(conversation),
        "reply": serialize_whatsapp_inbox_message(message),
    }

# ============================================================
# Company WhatsApp Connection Services V1.0
# ============================================================
# ============================================================
# Company WhatsApp Connection Services V1.0
# ============================================================
def _company_safe_text(value, fallback: str = "") -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback
def _company_whatsapp_session_name(setting: CompanyWhatsAppSetting) -> str:
    """
    Return a backend-owned session name for this company.
    Important:
    - Do not trust session_name from frontend.
    - Each company gets a separate Gateway session folder.
    """
    company_id = getattr(setting, "company_id", None)
    return f"company-{company_id}-whatsapp"
def _company_gateway_env_value(*names: str) -> str:
    import os
    from django.conf import settings as django_settings
    for name in names:
        value = str(getattr(django_settings, name, "") or os.environ.get(name, "") or "").strip()
        if value:
            return value
    return ""
def _company_gateway_url() -> str:
    return _company_gateway_env_value(
        "WHATSAPP_SESSION_GATEWAY_URL",
        "WHATSAPP_GATEWAY_URL",
        "WHATSAPP_WEB_SESSION_GATEWAY_URL",
    ).rstrip("/")
def _company_gateway_token() -> str:
    return _company_gateway_env_value(
        "WHATSAPP_SESSION_GATEWAY_TOKEN",
        "WHATSAPP_GATEWAY_TOKEN",
        "WHATSAPP_WEB_SESSION_GATEWAY_TOKEN",
    )
def _company_gateway_request(*, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Call the local WhatsApp Session Gateway.
    Uses stdlib urllib to avoid adding requests dependency.
    """
    import json
    import urllib.error
    import urllib.request
    base_url = _company_gateway_url()
    if not base_url:
        return {
            "success": False,
            "message": (
                "WHATSAPP_SESSION_GATEWAY_URL is not configured. "
                "Set it in .env, for example: WHATSAPP_SESSION_GATEWAY_URL=http://127.0.0.1:3100"
            ),
            "provider_status": "gateway_not_configured",
            "gateway_configured": False,
            "session_status": "disconnected",
            "connected": False,
            "error_message": "Gateway URL is missing.",
        }
    url = f"{base_url}/{str(path or '').lstrip('/')}"
    body = json.dumps(payload or {}).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    token = _company_gateway_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=35) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw or "{}")
            if isinstance(data, dict):
                data.setdefault("gateway_configured", True)
                return data
            return {
                "success": False,
                "message": "Unexpected gateway response.",
                "provider_status": "invalid_response",
                "gateway_configured": True,
                "raw": data,
            }
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(raw or "{}")
        except Exception:
            data = {}
        if not isinstance(data, dict):
            data = {}
        data.setdefault("success", False)
        data.setdefault("message", f"Gateway HTTP error {exc.code}.")
        data.setdefault("provider_status", "gateway_http_error")
        data.setdefault("gateway_configured", True)
        data.setdefault("error_message", data.get("message", "Gateway HTTP error."))
        data["http_status"] = exc.code
        return data
    except Exception as exc:
        return {
            "success": False,
            "message": str(exc),
            "provider_status": "gateway_request_failed",
            "gateway_configured": True,
            "session_status": "failed",
            "connected": False,
            "error_message": str(exc),
        }
def _company_connection_config(setting: CompanyWhatsAppSetting) -> dict[str, Any]:
    config = dict(setting.provider_config or {})
    config["session_name"] = _company_whatsapp_session_name(setting)
    return config
def _sync_company_connection_from_gateway(
    setting: CompanyWhatsAppSetting,
    result: dict[str, Any],
    *,
    user=None,
) -> CompanyWhatsAppSetting:
    from django.utils import timezone as django_timezone
    config = _company_connection_config(setting)
    session_status = (
        result.get("session_status")
        or result.get("status")
        or config.get("session_status")
        or "disconnected"
    )
    connected = bool(result.get("connected"))
    config.update(
        {
            "session_name": _company_whatsapp_session_name(setting),
            "session_status": session_status,
            "is_active": connected,
            "session_connected_phone": _company_safe_text(
                result.get("connected_phone") or result.get("phone_number")
            ),
            "session_device_label": _company_safe_text(
                result.get("device_label") or result.get("browser")
            ),
            "session_qr_code": _company_safe_text(
                result.get("qr_code") or result.get("qrDataUrl") or result.get("qr")
            ),
            "session_pairing_code": _company_safe_text(
                result.get("pairing_code") or result.get("pairingCode")
            ),
            "gateway_configured": bool(result.get("gateway_configured")),
            "last_error_message": _company_safe_text(
                result.get("error_message") or result.get("message")
            ) if not result.get("success", False) else "",
            "last_health_check_at": django_timezone.now().isoformat(),
        }
    )
    setting.provider_config = config
    update_fields = ["provider_config", "updated_at"]
    if connected:
        setting.last_verified_at = django_timezone.now()
        update_fields.append("last_verified_at")
    if user:
        setting.updated_by = user
        update_fields.append("updated_by")
    setting.save(update_fields=update_fields)
    return setting
def get_or_create_company_whatsapp_connection(
    *,
    company: Company,
    user=None,
) -> CompanyWhatsAppSetting:
    setting = get_or_create_company_whatsapp_setting(company=company, user=user)
    config = _company_connection_config(setting)
    changed = False
    defaults = {
        "session_status": "disconnected",
        "is_active": False,
        "session_mode": "qr",
        "gateway_configured": bool(_company_gateway_url()),
        "default_test_recipient": setting.phone_number or "",
        "send_test_enabled": True,
        "business_name": getattr(company, "display_name", "") or getattr(company, "name", "") or "",
        "api_version": "v1",
        "default_language_code": "ar",
        "allow_broadcasts": False,
    }
    for key, value in defaults.items():
        if key not in config:
            config[key] = value
            changed = True
    # Enforce backend-owned session name every time.
    enforced_session_name = _company_whatsapp_session_name(setting)
    if config.get("session_name") != enforced_session_name:
        config["session_name"] = enforced_session_name
        changed = True
    if changed:
        setting.provider_config = config
        if user:
            setting.updated_by = user
            setting.save(update_fields=["provider_config", "updated_by", "updated_at"])
        else:
            setting.save(update_fields=["provider_config", "updated_at"])
    return setting
def update_company_whatsapp_connection(
    *,
    company: Company,
    data: dict[str, Any],
    user=None,
) -> CompanyWhatsAppSetting:
    """
    Update company WhatsApp connection safely.
    session_name is intentionally ignored from frontend and generated from company id.
    """
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    data = data or {}
    allowed_model_fields = [
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
    ]
    for field in allowed_model_fields:
        if field in data:
            setattr(setting, field, data[field])
    config = _company_connection_config(setting)
    safe_config_fields = [
        "business_name",
        "app_id",
        "api_version",
        "default_language_code",
        "webhook_callback_url",
        "webhook_verified",
        "allow_broadcasts",
        "send_test_enabled",
        "default_test_recipient",
        "session_mode",
    ]
    for field in safe_config_fields:
        if field in data:
            config[field] = data[field]
    # Never trust frontend session_name.
    config["session_name"] = _company_whatsapp_session_name(setting)
    config["gateway_configured"] = bool(_company_gateway_url())
    setting.provider_config = config
    if user:
        setting.updated_by = user
    setting.save()
    return setting
def serialize_company_whatsapp_connection(setting: CompanyWhatsAppSetting) -> dict[str, Any]:
    """
    Serialize company WhatsApp connection without exposing raw secrets.
    """
    base = serialize_whatsapp_setting(setting)
    config = _company_connection_config(setting)
    session_status = _company_safe_text(config.get("session_status"), "disconnected")
    connected = session_status == "connected" or bool(config.get("is_active"))
    base.update(
        {
            "business_name": _company_safe_text(
                config.get("business_name"),
                getattr(setting.company, "display_name", "") or getattr(setting.company, "name", "") or "",
            ),
            "app_id": _company_safe_text(config.get("app_id")),
            "api_version": _company_safe_text(config.get("api_version"), "v1"),
            "default_language_code": _company_safe_text(config.get("default_language_code"), "ar"),
            "webhook_callback_url": _company_safe_text(config.get("webhook_callback_url")),
            "webhook_verified": bool(config.get("webhook_verified")),
            "allow_broadcasts": bool(config.get("allow_broadcasts")),
            "send_test_enabled": bool(config.get("send_test_enabled", True)),
            "default_test_recipient": _company_safe_text(
                config.get("default_test_recipient"),
                setting.phone_number or "",
            ),
            "session_name": _company_whatsapp_session_name(setting),
            "session_mode": _company_safe_text(config.get("session_mode"), "qr"),
            "session_status": session_status,
            "is_active": connected,
            "is_connected": connected,
            "connected": connected,
            "session_connected_phone": _company_safe_text(config.get("session_connected_phone")),
            "session_device_label": _company_safe_text(config.get("session_device_label")),
            "session_qr_code": _company_safe_text(config.get("session_qr_code")),
            "session_pairing_code": _company_safe_text(config.get("session_pairing_code")),
            "last_health_check_at": config.get("last_health_check_at"),
            "last_error_message": _company_safe_text(config.get("last_error_message")),
            "gateway_configured": bool(_company_gateway_url()),
            "gateway_url_configured": bool(_company_gateway_url()),
        }
    )
    return base
def company_whatsapp_session_status(
    *,
    company: Company,
    user=None,
) -> dict[str, Any]:
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    result = _company_gateway_request(
        path="/session/status",
        payload={"session_name": _company_whatsapp_session_name(setting)},
    )
    setting = _sync_company_connection_from_gateway(setting, result, user=user)
    return {
        "success": bool(result.get("success")),
        "message": _company_safe_text(result.get("message"), "Company WhatsApp connection status loaded."),
        "result": result,
        "connection": serialize_company_whatsapp_connection(setting),
    }
def company_whatsapp_create_qr(
    *,
    company: Company,
    user=None,
) -> dict[str, Any]:
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    config = _company_connection_config(setting)
    config["session_mode"] = "qr"
    setting.provider_config = config
    if user:
        setting.updated_by = user
    setting.save()
    result = _company_gateway_request(
        path="/session/create-qr",
        payload={"session_name": _company_whatsapp_session_name(setting)},
    )
    setting = _sync_company_connection_from_gateway(setting, result, user=user)
    return {
        "success": bool(result.get("success")),
        "message": _company_safe_text(result.get("message"), "Company WhatsApp QR requested."),
        "result": result,
        "connection": serialize_company_whatsapp_connection(setting),
    }
def company_whatsapp_create_pairing_code(
    *,
    company: Company,
    phone_number: str = "",
    user=None,
) -> dict[str, Any]:
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    config = _company_connection_config(setting)
    config["session_mode"] = "pairing_code"
    setting.provider_config = config
    if user:
        setting.updated_by = user
    setting.save()
    phone = _company_safe_text(
        phone_number
        or config.get("default_test_recipient")
        or setting.phone_number
    )
    result = _company_gateway_request(
        path="/session/create-pairing-code",
        payload={
            "session_name": _company_whatsapp_session_name(setting),
            "phone_number": phone,
        },
    )
    setting = _sync_company_connection_from_gateway(setting, result, user=user)
    return {
        "success": bool(result.get("success")),
        "message": _company_safe_text(result.get("message"), "Company WhatsApp pairing code requested."),
        "result": result,
        "connection": serialize_company_whatsapp_connection(setting),
    }
def company_whatsapp_disconnect(
    *,
    company: Company,
    user=None,
) -> dict[str, Any]:
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    result = _company_gateway_request(
        path="/session/disconnect",
        payload={"session_name": _company_whatsapp_session_name(setting)},
    )
    setting = _sync_company_connection_from_gateway(setting, result, user=user)
    if bool(result.get("success")):
        config = _company_connection_config(setting)
        config.update(
            {
                "session_status": "disconnected",
                "is_active": False,
                "session_qr_code": "",
                "session_pairing_code": "",
                "session_connected_phone": "",
                "last_error_message": "",
            }
        )
        setting.provider_config = config
        if user:
            setting.updated_by = user
        setting.save()
    return {
        "success": bool(result.get("success")),
        "message": _company_safe_text(result.get("message"), "Company WhatsApp disconnected."),
        "result": result,
        "connection": serialize_company_whatsapp_connection(setting),
    }

def _normalize_company_whatsapp_test_phone(
    *,
    phone_number: str,
    default_country_code: str = "966",
) -> str:
    """
    Normalize Company WhatsApp test recipient phones.
    Saudi default behavior:
    - 0505263775      -> +966505263775
    - 505263775       -> +966505263775
    - 966505263775    -> +966505263775
    - +966505263775   -> +966505263775
    - 00966505263775  -> +966505263775
    External numbers are accepted when the user enters a country code:
    - +971501234567   -> +971501234567
    - 00971501234567  -> +971501234567
    - 971501234567    -> +971501234567
    """
    raw = _company_safe_text(phone_number).strip()
    country_code = "".join(
        ch for ch in _company_safe_text(default_country_code, "966") if ch.isdigit()
    ) or "966"
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return normalize_phone_number(
            phone_number=phone_number,
            default_country_code=country_code,
        )
    if raw.startswith("+"):
        return f"+{digits}"
    if digits.startswith("00") and len(digits) > 2:
        return f"+{digits[2:]}"
    if digits.startswith(country_code):
        return f"+{digits}"
    if country_code == "966":
        if digits.startswith("05") and len(digits) == 10:
            return f"+966{digits[1:]}"
        if digits.startswith("5") and len(digits) == 9:
            return f"+966{digits}"
        if digits.startswith("0"):
            return f"+966{digits[1:]}"
        if len(digits) >= 10:
            return f"+{digits}"
        return f"+966{digits}"
    if digits.startswith("0"):
        return f"+{country_code}{digits[1:]}"
    if len(digits) >= 10:
        return f"+{digits}"
    return f"+{country_code}{digits}"

def _record_company_outbound_inbox_message_from_log(
    *,
    setting: CompanyWhatsAppSetting,
    log: WhatsAppMessageLog,
    result: dict[str, Any],
    user=None,
) -> None:
    """
    Mirror company Gateway outbound test messages into the conversation inbox.
    This keeps /company/whatsapp/inbox conversation-oriented while
    /company/whatsapp/messages remains an audit log table.
    """
    from whatsapp.models import (
        WhatsAppContact,
        WhatsAppConversation,
        WhatsAppConversationMessage,
        WhatsAppInboxScope,
    )
    company = setting.company
    session_name = _company_whatsapp_session_name(setting)
    normalized_phone = _normalize_whatsapp_inbox_phone(log.recipient_phone)
    recipient_jid = _company_safe_text(
        result.get("recipient_jid")
        or result.get("remote_jid")
        or result.get("to_jid")
    )
    if not recipient_jid and normalized_phone:
        recipient_jid = f"{normalized_phone}@s.whatsapp.net"
    contact_queryset = WhatsAppContact.objects.filter(
        scope=WhatsAppInboxScope.COMPANY,
        company=company,
        session_name=session_name,
    )
    if recipient_jid:
        contact = contact_queryset.filter(whatsapp_jid=recipient_jid).first()
    else:
        contact = None
    if contact is None and normalized_phone:
        contact = contact_queryset.filter(normalized_phone=normalized_phone).first()
    if contact is None:
        contact = WhatsAppContact.objects.create(
            scope=WhatsAppInboxScope.COMPANY,
            company=company,
            session_name=session_name,
            phone_number=log.recipient_phone,
            normalized_phone=normalized_phone,
            whatsapp_jid=recipient_jid,
            display_name=log.recipient_name or "Company WhatsApp Test",
            push_name=log.recipient_name or "",
            metadata={"source": "company_gateway_outbound"},
        )
    else:
        changed = False
        if normalized_phone and contact.normalized_phone != normalized_phone:
            contact.normalized_phone = normalized_phone
            changed = True
        if log.recipient_phone and contact.phone_number != log.recipient_phone:
            contact.phone_number = log.recipient_phone
            changed = True
        if recipient_jid and contact.whatsapp_jid != recipient_jid:
            contact.whatsapp_jid = recipient_jid
            changed = True
        if not contact.display_name and log.recipient_name:
            contact.display_name = log.recipient_name
            changed = True
        if changed:
            contact.save()
    conversation = (
        WhatsAppConversation.objects
        .filter(
            scope=WhatsAppInboxScope.COMPANY,
            company=company,
            session_name=session_name,
            contact=contact,
        )
        .first()
    )
    if conversation is None:
        conversation = WhatsAppConversation.objects.create(
            scope=WhatsAppInboxScope.COMPANY,
            company=company,
            contact=contact,
            session_name=session_name,
            status="OPEN",
            is_resolved=False,
            last_message_preview=log.message_body[:500],
            last_message_at=timezone.now(),
            unread_count=0,
            metadata={"source": "company_gateway_outbound"},
        )
    external_message_id = _company_safe_text(
        log.provider_message_id
        or result.get("message_id")
        or result.get("external_message_id")
        or result.get("provider_message_id")
        or result.get("id")
    )
    if external_message_id:
        existing = conversation.messages.filter(
            external_message_id=external_message_id,
            direction="OUTBOUND",
        ).first()
        if existing:
            return
    now = timezone.now()
    success = bool(result.get("success"))
    message = WhatsAppConversationMessage.objects.create(
        conversation=conversation,
        contact=contact,
        company=company,
        scope=WhatsAppInboxScope.COMPANY,
        session_name=session_name,
        direction="OUTBOUND",
        status="SENT" if success else "FAILED",
        message_type="TEXT",
        body=log.message_body,
        external_message_id=external_message_id,
        provider="WHATSAPP_GATEWAY",
        provider_response={
            **(result or {}),
            "message_log_id": log.id,
        },
        sent_by=user if getattr(user, "is_authenticated", False) else None,
        sent_at=now if success else None,
        metadata={
            "source": "company_connection_test",
            "message_log_id": log.id,
            "target_jid": recipient_jid,
            "target_phone": normalized_phone,
        },
    )
    conversation.last_message_preview = message.body[:500]
    conversation.last_message_at = now
    conversation.status = "OPEN"
    conversation.is_resolved = False
    conversation.save(
        update_fields=[
            "last_message_preview",
            "last_message_at",
            "status",
            "is_resolved",
            "updated_at",
        ]
    )
def company_whatsapp_send_test_message(
    *,
    company: Company,
    recipient_phone: str = "",
    message_body: str = "",
    user=None,
) -> dict[str, Any]:
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    config = _company_connection_config(setting)
    phone = _normalize_company_whatsapp_test_phone(
        phone_number=_company_safe_text(
            recipient_phone
            or config.get("default_test_recipient")
            or setting.phone_number
        ),
        default_country_code=setting.default_country_code,
    )
    body = _company_safe_text(
        message_body,
        "Company WhatsApp test message from Mhamcloud.",
    )
    result = _company_gateway_request(
        path="/messages/send-text",
        payload={
            "session_name": _company_whatsapp_session_name(setting),
            "to_phone": phone,
            "body": body,
        },
    )
    status = WhatsAppMessageStatus.QUEUED
    log = create_message_log(
        company=company,
        recipient_name="Company WhatsApp Test",
        recipient_phone=phone,
        message_body=body,
        provider=WhatsAppProvider.CUSTOM,
        status=status,
        source_type=WhatsAppMessageSourceType.MANUAL,
        source_id=f"company-whatsapp-test-{company.id}",
        provider_response=result,
        created_by=user,
    )
    if bool(result.get("success")):
        log.status = WhatsAppMessageStatus.SENT
        log.sent_at = timezone.now()
        log.provider_message_id = _company_safe_text(
            result.get("external_message_id")
            or result.get("message_id")
        )
        log.error_message = ""
    else:
        log.status = WhatsAppMessageStatus.FAILED
        log.failed_at = timezone.now()
        log.error_message = _company_safe_text(
            result.get("error_message")
            or result.get("message"),
            "Gateway failed to send message.",
        )
    log.provider_response = result
    log.save()
    _record_company_outbound_inbox_message_from_log(
        setting=setting,
        log=log,
        result=result,
        user=user,
    )
    setting = _sync_company_connection_from_gateway(setting, result, user=user)
    return {
        "success": bool(result.get("success")),
        "message": _company_safe_text(result.get("message"), "Company WhatsApp test message processed."),
        "result": result,
        "connection": serialize_company_whatsapp_connection(setting),
        "message_log": serialize_whatsapp_message_log(log),
    }
