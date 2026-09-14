# ============================================================
# 📂 api/system/whatsapp/views.py
# 🧠 Mhamcloud | System WhatsApp API Views V1.0
# ------------------------------------------------------------
# ✅ System overview for WhatsApp settings/templates/messages
# ✅ Real DB only
# ✅ Read-only aggregation across companies after system permission
# ✅ Template status management for system admins
# ✅ No external WhatsApp provider calls
# ✅ No frontend-trusted tenant mutation
# ============================================================
from __future__ import annotations
from typing import Any
from django.db.models import Count, Q, QuerySet
from django.utils.dateparse import parse_datetime
from rest_framework.decorators import api_view
from rest_framework.response import Response
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
from whatsapp.services import (
    serialize_whatsapp_message_log,
    serialize_whatsapp_setting,
    serialize_whatsapp_template,
    set_whatsapp_template_status,
)
def _query(request, key: str, default: str = "") -> str:
    return str(request.GET.get(key, default) or "").strip()
def _int_query(request, key: str, default: int = 0) -> int:
    value = _query(request, key, "")
    if not value:
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
def _bool_query(request, key: str) -> bool | None:
    value = _query(request, key, "").lower()
    if value in {"true", "1", "yes", "y"}:
        return True
    if value in {"false", "0", "no", "n"}:
        return False
    return None
def _limit_offset(request) -> tuple[int, int]:
    limit = _int_query(request, "limit", 50)
    offset = _int_query(request, "offset", 0)
    if limit <= 0:
        limit = 50
    if limit > 200:
        limit = 200
    if offset < 0:
        offset = 0
    return limit, offset
def _safe_has_system_permission(user, permission_code: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    profile = getattr(user, "Mhamcloud_profile", None)
    if profile and bool(getattr(profile, "can_access_system", False)):
        try:
            profile_permissions = set(getattr(profile, "system_permissions", []) or [])
        except Exception:
            profile_permissions = set()
        if "*" in profile_permissions or permission_code in profile_permissions:
            return True
    checker = getattr(user, "has_system_permission", None)
    if callable(checker):
        attempts = [
            lambda: checker(permission_code),
            lambda: checker(permission_code=permission_code),
            lambda: checker(codename=permission_code),
        ]
        for attempt in attempts:
            try:
                if attempt():
                    return True
            except TypeError:
                continue
            except Exception:
                continue
    return False
def _user_is_system_member(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    profile = getattr(user, "Mhamcloud_profile", None)
    if profile:
        role = str(getattr(profile, "system_role", "") or "").upper()
        if role in {"SUPER_ADMIN", "SYSTEM_ADMIN", "SUPPORT", "BILLING_MANAGER"}:
            return True
        if bool(getattr(profile, "is_system_user", False)):
            return True
    return False
def _can_view(user) -> bool:
    return (
        _safe_has_system_permission(user, "system.whatsapp.view")
        or _safe_has_system_permission(user, "system.whatsapp.manage")
        or _safe_has_system_permission(user, "system.notifications.view")
        or _safe_has_system_permission(user, "system.companies.view")
        or _user_is_system_member(user)
    )
def _can_manage(user) -> bool:
    return (
        _safe_has_system_permission(user, "system.whatsapp.manage")
        or _safe_has_system_permission(user, "system.settings.manage")
        or getattr(user, "is_superuser", False)
    )
def _permission_response(request, *, manage: bool = False):
    if not request.user or not request.user.is_authenticated:
        return Response(
            {
                "success": False,
                "message": "Authentication is required.",
            },
            status=401,
        )
    if manage:
        allowed = _can_manage(request.user)
    else:
        allowed = _can_view(request.user)
    if not allowed:
        return Response(
            {
                "success": False,
                "message": "You do not have permission to access system WhatsApp APIs.",
            },
            status=403,
        )
    return None
def _company_payload(company) -> dict[str, Any] | None:
    if not company:
        return None
    return {
        "id": company.id,
        "name": (
            getattr(company, "display_name", None)
            or getattr(company, "name", "")
            or str(company)
        ),
        "company_code": getattr(company, "company_code", "") or getattr(company, "code", ""),
        "is_active": bool(getattr(company, "is_active", False)),
        "status": getattr(company, "status", ""),
    }
def _user_payload(user) -> dict[str, Any] | None:
    if not user:
        return None
    full_name = ""
    try:
        full_name = user.get_full_name()
    except Exception:
        full_name = ""
    return {
        "id": user.id,
        "username": getattr(user, "username", ""),
        "email": getattr(user, "email", ""),
        "name": full_name or getattr(user, "username", "") or getattr(user, "email", ""),
    }
def _choice_payload(choices) -> list[dict[str, str]]:
    return [
        {
            "value": value,
            "label": str(label),
        }
        for value, label in choices
    ]
def _choices_payload() -> dict[str, list[dict[str, str]]]:
    return {
        "providers": _choice_payload(WhatsAppProvider.choices),
        "template_statuses": _choice_payload(WhatsAppTemplateStatus.choices),
        "template_categories": _choice_payload(WhatsAppTemplateCategory.choices),
        "message_directions": _choice_payload(WhatsAppMessageDirection.choices),
        "message_statuses": _choice_payload(WhatsAppMessageStatus.choices),
        "message_source_types": _choice_payload(WhatsAppMessageSourceType.choices),
    }
def _count_by(queryset: QuerySet, field_name: str) -> dict[str, int]:
    rows = queryset.values(field_name).annotate(total=Count("id")).order_by()
    return {
        str(row[field_name] or ""): int(row["total"] or 0)
        for row in rows
    }
def _base_settings_queryset() -> QuerySet[CompanyWhatsAppSetting]:
    return CompanyWhatsAppSetting.objects.select_related(
        "company",
        "created_by",
        "updated_by",
    ).order_by("-created_at", "-id")
def _base_templates_queryset() -> QuerySet[WhatsAppTemplate]:
    return WhatsAppTemplate.objects.select_related(
        "company",
        "created_by",
        "updated_by",
    ).order_by("-created_at", "-id")
def _base_messages_queryset() -> QuerySet[WhatsAppMessageLog]:
    return WhatsAppMessageLog.objects.select_related(
        "company",
        "template",
        "created_by",
    ).order_by("-created_at", "-id")
def _apply_settings_filters(queryset: QuerySet[CompanyWhatsAppSetting], request) -> QuerySet[CompanyWhatsAppSetting]:
    company_id = _query(request, "company_id")
    provider = _query(request, "provider").upper()
    search = _query(request, "q") or _query(request, "search")
    is_enabled = _bool_query(request, "is_enabled")
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if provider:
        queryset = queryset.filter(provider=provider)
    if is_enabled is not None:
        queryset = queryset.filter(is_enabled=is_enabled)
    if search:
        queryset = queryset.filter(
            Q(company__name__icontains=search)
            | Q(company__company_code__icontains=search)
            | Q(phone_number__icontains=search)
            | Q(phone_number_id__icontains=search)
            | Q(business_account_id__icontains=search)
        )
    return queryset
def _apply_template_filters(queryset: QuerySet[WhatsAppTemplate], request) -> QuerySet[WhatsAppTemplate]:
    company_id = _query(request, "company_id")
    status = _query(request, "status").upper()
    category = _query(request, "category").upper()
    language = _query(request, "language")
    search = _query(request, "q") or _query(request, "search")
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if status:
        queryset = queryset.filter(status=status)
    if category:
        queryset = queryset.filter(category=category)
    if language:
        queryset = queryset.filter(language__iexact=language)
    if search:
        queryset = queryset.filter(
            Q(company__name__icontains=search)
            | Q(company__company_code__icontains=search)
            | Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(body__icontains=search)
            | Q(external_template_name__icontains=search)
        )
    return queryset
def _apply_message_filters(queryset: QuerySet[WhatsAppMessageLog], request) -> QuerySet[WhatsAppMessageLog]:
    company_id = _query(request, "company_id")
    status = _query(request, "status").upper()
    direction = _query(request, "direction").upper()
    provider = _query(request, "provider").upper()
    source_type = _query(request, "source_type").upper()
    search = _query(request, "q") or _query(request, "search")
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if status:
        queryset = queryset.filter(status=status)
    if direction:
        queryset = queryset.filter(direction=direction)
    if provider:
        queryset = queryset.filter(provider=provider)
    if source_type:
        queryset = queryset.filter(source_type=source_type)
    if search:
        queryset = queryset.filter(
            Q(company__name__icontains=search)
            | Q(company__company_code__icontains=search)
            | Q(recipient_name__icontains=search)
            | Q(recipient_phone__icontains=search)
            | Q(message_body__icontains=search)
            | Q(provider_message_id__icontains=search)
            | Q(source_id__icontains=search)
        )
    return queryset
def _serialize_setting(setting: CompanyWhatsAppSetting) -> dict[str, Any]:
    payload = serialize_whatsapp_setting(setting)
    payload["company"] = _company_payload(setting.company)
    payload["created_by"] = _user_payload(setting.created_by)
    payload["updated_by"] = _user_payload(setting.updated_by)
    return payload
def _serialize_template(template: WhatsAppTemplate) -> dict[str, Any]:
    payload = serialize_whatsapp_template(template)
    payload["company"] = _company_payload(template.company)
    payload["created_by"] = _user_payload(template.created_by)
    payload["updated_by"] = _user_payload(template.updated_by)
    return payload
def _serialize_message(message: WhatsAppMessageLog) -> dict[str, Any]:
    payload = serialize_whatsapp_message_log(message)
    payload["company"] = _company_payload(message.company)
    payload["created_by"] = _user_payload(message.created_by)
    if message.template:
        payload["template"] = {
            "id": message.template.id,
            "name": message.template.name,
            "code": message.template.code,
            "status": message.template.status,
            "category": message.template.category,
            "language": message.template.language,
        }
    else:
        payload["template"] = None
    return payload
def _settings_stats(queryset: QuerySet[CompanyWhatsAppSetting]) -> dict[str, Any]:
    return {
        "total": queryset.count(),
        "enabled": queryset.filter(is_enabled=True).count(),
        "disabled": queryset.filter(is_enabled=False).count(),
        "providers": _count_by(queryset, "provider"),
    }
def _template_stats(queryset: QuerySet[WhatsAppTemplate]) -> dict[str, Any]:
    return {
        "total": queryset.count(),
        "statuses": _count_by(queryset, "status"),
        "categories": _count_by(queryset, "category"),
        "languages": _count_by(queryset, "language"),
    }
def _message_stats(queryset: QuerySet[WhatsAppMessageLog]) -> dict[str, Any]:
    return {
        "total": queryset.count(),
        "statuses": _count_by(queryset, "status"),
        "directions": _count_by(queryset, "direction"),
        "providers": _count_by(queryset, "provider"),
        "source_types": _count_by(queryset, "source_type"),
    }


def _system_inbox_history_queryset():
    from whatsapp.models import WhatsAppConversationMessage
    return (
        WhatsAppConversationMessage.objects
        .select_related("contact", "conversation", "sent_by", "company")
        .prefetch_related("attachments")
        .filter(scope="SYSTEM", company__isnull=True)
        .order_by("-created_at", "-id")
    )


def _serialize_system_inbox_history_message(message) -> dict[str, Any]:
    contact = message.contact
    conversation = message.conversation
    attachments = list(message.attachments.all())
    message_type = str(message.message_type or "TEXT").upper()
    body = str(message.body or "").strip()

    if not body:
        body = f"[{message_type}]"
    elif body == f"[{message_type}]" and attachments:
        names = [
            str(item.original_filename or "").strip()
            for item in attachments
            if str(item.original_filename or "").strip()
        ]
        if names:
            body = f"[{message_type}] {', '.join(names[:3])}"

    recipient_name = (
        str(getattr(contact, "display_name", "") or "").strip()
        or str(getattr(contact, "push_name", "") or "").strip()
        or str(getattr(contact, "normalized_phone", "") or "").strip()
        or str(getattr(contact, "whatsapp_jid", "") or "").strip()
    )
    recipient_phone = (
        str(getattr(contact, "normalized_phone", "") or "").strip()
        or str(getattr(contact, "phone_number", "") or "").strip()
    )

    return {
        "id": f"inbox-{message.id}",
        "source_record_type": "INBOX_MESSAGE",
        "source_record_id": message.id,
        "conversation_id": message.conversation_id,
        "company_id": None,
        "company": None,
        "template_id": None,
        "template": None,
        "direction": message.direction,
        "status": message.status,
        "source_type": "INBOX",
        "source_id": str(message.conversation_id),
        "recipient_name": recipient_name,
        "recipient_phone": recipient_phone,
        "message_body": body,
        "message_type": message_type,
        "attachment_count": len(attachments),
        "attachments": [
            {
                "id": item.id,
                "attachment_type": item.attachment_type,
                "original_filename": item.original_filename,
                "mime_type": item.mime_type,
                "file_size": item.file_size,
            }
            for item in attachments
        ],
        "rendered_variables": {},
        "provider": message.provider,
        "provider_message_id": message.external_message_id,
        "provider_response": message.provider_response or {},
        "error_message": (
            str((message.provider_response or {}).get("error_message") or "")
            if message.status == "FAILED"
            else ""
        ),
        "queued_at": None,
        "sent_at": message.sent_at.isoformat() if message.sent_at else None,
        "delivered_at": None,
        "read_at": None,
        "failed_at": (
            message.updated_at.isoformat()
            if message.status == "FAILED" and message.updated_at
            else None
        ),
        "created_by_id": message.sent_by_id,
        "created_by": _user_payload(message.sent_by) if message.sent_by_id else None,
        "created_at": message.created_at.isoformat() if message.created_at else None,
        "updated_at": message.updated_at.isoformat() if message.updated_at else None,
        "contact": {
            "id": contact.id,
            "display_name": contact.display_name,
            "push_name": contact.push_name,
            "normalized_phone": contact.normalized_phone,
            "whatsapp_jid": contact.whatsapp_jid,
        },
        "conversation": {
            "id": conversation.id,
            "status": conversation.status,
            "session_name": conversation.session_name,
        },
    }


def _serialize_legacy_history_message(message: WhatsAppMessageLog) -> dict[str, Any]:
    payload = _serialize_message(message)
    payload["id"] = f"log-{message.id}"
    payload["source_record_type"] = "MESSAGE_LOG"
    payload["source_record_id"] = message.id
    payload["message_type"] = "TEXT"
    payload["attachment_count"] = 0
    payload["attachments"] = []
    return payload


def _unified_history_items(request) -> list[dict[str, Any]]:
    status = _query(request, "status").upper()
    direction = _query(request, "direction").upper()
    provider = _query(request, "provider").upper()
    source_type = _query(request, "source_type").upper()
    company_id = _query(request, "company_id")
    search = _query(request, "q") or _query(request, "search")

    inbox_queryset = _system_inbox_history_queryset()
    if status:
        inbox_queryset = inbox_queryset.filter(status=status)
    if direction:
        inbox_queryset = inbox_queryset.filter(direction=direction)
    if provider:
        inbox_queryset = inbox_queryset.filter(provider__iexact=provider)
    if source_type and source_type not in {"INBOX", "SYSTEM"}:
        inbox_queryset = inbox_queryset.none()
    if company_id:
        inbox_queryset = inbox_queryset.none()
    if search:
        inbox_queryset = inbox_queryset.filter(
            Q(contact__display_name__icontains=search)
            | Q(contact__push_name__icontains=search)
            | Q(contact__normalized_phone__icontains=search)
            | Q(contact__whatsapp_jid__icontains=search)
            | Q(body__icontains=search)
            | Q(external_message_id__icontains=search)
            | Q(message_type__icontains=search)
        )

    inbox_items = [
        _serialize_system_inbox_history_message(item)
        for item in inbox_queryset
    ]

    inbox_external_ids = {
        str(item.get("provider_message_id") or "").strip()
        for item in inbox_items
        if str(item.get("provider_message_id") or "").strip()
    }

    legacy_queryset = _apply_message_filters(_base_messages_queryset(), request)
    legacy_items = []
    for item in legacy_queryset:
        provider_id = str(item.provider_message_id or "").strip()
        if provider_id and provider_id in inbox_external_ids:
            continue
        legacy_items.append(_serialize_legacy_history_message(item))

    combined = inbox_items + legacy_items

    def created_key(item):
        raw = str(item.get("created_at") or "")
        parsed = parse_datetime(raw)
        return parsed.timestamp() if parsed is not None else 0.0

    combined.sort(
        key=lambda item: (created_key(item), int(item.get("source_record_id") or 0)),
        reverse=True,
    )
    return combined


def _unified_message_stats(items: list[dict[str, Any]]) -> dict[str, Any]:
    statuses: dict[str, int] = {}
    directions: dict[str, int] = {}
    providers: dict[str, int] = {}
    source_types: dict[str, int] = {}

    for item in items:
        for target, key in (
            (statuses, "status"),
            (directions, "direction"),
            (providers, "provider"),
            (source_types, "source_type"),
        ):
            value = str(item.get(key) or "")
            target[value] = target.get(value, 0) + 1

    return {
        "total": len(items),
        "statuses": statuses,
        "directions": directions,
        "providers": providers,
        "source_types": source_types,
    }
@api_view(["GET"])
def system_whatsapp_overview(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    settings_queryset = _apply_settings_filters(_base_settings_queryset(), request)
    templates_queryset = _apply_template_filters(_base_templates_queryset(), request)
    messages_queryset = _apply_message_filters(_base_messages_queryset(), request)
    return Response(
        {
            "success": True,
            "module": "system_whatsapp",
            "stats": {
                "settings": _settings_stats(settings_queryset),
                "templates": _template_stats(templates_queryset),
                "messages": _message_stats(messages_queryset),
            },
            "settings": [_serialize_setting(item) for item in settings_queryset[:10]],
            "templates": [_serialize_template(item) for item in templates_queryset[:10]],
            "messages": [_serialize_message(item) for item in messages_queryset[:10]],
            "choices": _choices_payload(),
        }
    )
@api_view(["GET"])
def system_whatsapp_settings_list(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    queryset = _apply_settings_filters(_base_settings_queryset(), request)
    total = queryset.count()
    limit, offset = _limit_offset(request)
    results = queryset[offset : offset + limit]
    return Response(
        {
            "success": True,
            "count": total,
            "limit": limit,
            "offset": offset,
            "stats": _settings_stats(queryset),
            "results": [_serialize_setting(item) for item in results],
            "choices": _choices_payload(),
        }
    )
@api_view(["GET"])
def system_whatsapp_templates_list(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    queryset = _apply_template_filters(_base_templates_queryset(), request)
    total = queryset.count()
    limit, offset = _limit_offset(request)
    results = queryset[offset : offset + limit]
    return Response(
        {
            "success": True,
            "count": total,
            "limit": limit,
            "offset": offset,
            "stats": _template_stats(queryset),
            "results": [_serialize_template(item) for item in results],
            "choices": _choices_payload(),
        }
    )
@api_view(["GET"])
def system_whatsapp_template_detail(request, template_id: int):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    template = _base_templates_queryset().filter(id=template_id).first()
    if not template:
        return Response(
            {
                "success": False,
                "message": "WhatsApp template was not found.",
            },
            status=404,
        )
    return Response(
        {
            "success": True,
            "template": _serialize_template(template),
            "choices": _choices_payload(),
        }
    )
@api_view(["POST"])
def system_whatsapp_template_status(request, template_id: int):
    permission_error = _permission_response(request, manage=True)
    if permission_error:
        return permission_error
    template = _base_templates_queryset().filter(id=template_id).first()
    if not template:
        return Response(
            {
                "success": False,
                "message": "WhatsApp template was not found.",
            },
            status=404,
        )
    status_value = str(request.data.get("status", "") or "").strip().upper()
    allowed_statuses = {value for value, _label in WhatsAppTemplateStatus.choices}
    if status_value not in allowed_statuses:
        return Response(
            {
                "success": False,
                "message": "Invalid WhatsApp template status.",
                "allowed_statuses": sorted(allowed_statuses),
            },
            status=400,
        )
    try:
        updated_template = set_whatsapp_template_status(
            company=template.company,
            template_id=template.id,
            status=status_value,
            user=request.user,
        )
    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    return Response(
        {
            "success": True,
            "message": "WhatsApp template status updated successfully.",
            "template": _serialize_template(updated_template),
        }
    )
@api_view(["GET"])
def system_whatsapp_messages_list(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error

    items = _unified_history_items(request)
    total = len(items)
    limit, offset = _limit_offset(request)
    results = items[offset : offset + limit]

    return Response(
        {
            "success": True,
            "count": total,
            "limit": limit,
            "offset": offset,
            "stats": _unified_message_stats(items),
            "results": results,
            "choices": _choices_payload(),
            "history_source": "UNIFIED",
        }
    )
@api_view(["GET"])
def system_whatsapp_message_detail(request, message_id: int):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error

    inbox_message = _system_inbox_history_queryset().filter(id=message_id).first()
    if inbox_message is not None:
        return Response(
            {
                "success": True,
                "message_log": _serialize_system_inbox_history_message(inbox_message),
                "choices": _choices_payload(),
                "history_source": "INBOX_MESSAGE",
            }
        )

    message = _base_messages_queryset().filter(id=message_id).first()
    if not message:
        return Response(
            {
                "success": False,
                "message": "WhatsApp message was not found.",
            },
            status=404,
        )

    return Response(
        {
            "success": True,
            "message_log": _serialize_legacy_history_message(message),
            "choices": _choices_payload(),
            "history_source": "MESSAGE_LOG",
        }
    )

# ============================================================
# ?? System WhatsApp Connection API
# ============================================================
@api_view(["GET", "POST"])
def system_whatsapp_connection(request):
    permission_error = _permission_response(request, manage=request.method != "GET")
    if permission_error:
        return permission_error
    from whatsapp.services import (
        get_or_create_system_whatsapp_connection,
        serialize_system_whatsapp_connection,
        update_system_whatsapp_connection,
    )
    if request.method == "POST":
        connection = update_system_whatsapp_connection(
            data=request.data or {},
            user=request.user,
        )
        message = "System WhatsApp connection updated successfully."
    else:
        connection = get_or_create_system_whatsapp_connection(user=request.user)
        message = "System WhatsApp connection loaded successfully."
    return Response(
        {
            "success": True,
            "message": message,
            "connection": serialize_system_whatsapp_connection(connection),
        }
    )
@api_view(["GET", "POST"])
def system_whatsapp_connection_status(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    from whatsapp.services import system_whatsapp_session_status
    payload = system_whatsapp_session_status(user=request.user)
    return Response(payload)
@api_view(["POST"])
def system_whatsapp_connection_qr(request):
    permission_error = _permission_response(request, manage=True)
    if permission_error:
        return permission_error
    from whatsapp.services import system_whatsapp_create_qr
    payload = system_whatsapp_create_qr(user=request.user)
    return Response(payload)
@api_view(["POST"])
def system_whatsapp_connection_pairing(request):
    permission_error = _permission_response(request, manage=True)
    if permission_error:
        return permission_error
    from whatsapp.services import system_whatsapp_create_pairing_code
    phone_number = str(request.data.get("phone_number", "") or "").strip()
    payload = system_whatsapp_create_pairing_code(
        phone_number=phone_number,
        user=request.user,
    )
    return Response(payload)
@api_view(["POST"])
def system_whatsapp_connection_disconnect(request):
    permission_error = _permission_response(request, manage=True)
    if permission_error:
        return permission_error
    from whatsapp.services import system_whatsapp_disconnect
    payload = system_whatsapp_disconnect(user=request.user)
    return Response(payload)
@api_view(["POST"])
def system_whatsapp_connection_test(request):
    permission_error = _permission_response(request, manage=True)
    if permission_error:
        return permission_error
    from whatsapp.services import system_whatsapp_send_test_message
    recipient_phone = str(request.data.get("recipient_phone", "") or "").strip()
    message_body = str(request.data.get("message_body", "") or "").strip()
    try:
        payload = system_whatsapp_send_test_message(
            recipient_phone=recipient_phone,
            message_body=message_body,
            user=request.user,
        )
    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    return Response(payload)

# ============================================================
# System WhatsApp Inbox Webhook API
# ============================================================
from django.views.decorators.csrf import csrf_exempt as _whatsapp_inbox_csrf_exempt
from rest_framework.decorators import api_view as _whatsapp_inbox_api_view
from rest_framework.decorators import permission_classes as _whatsapp_inbox_permission_classes
from rest_framework.permissions import AllowAny as _WhatsAppInboxAllowAny
@_whatsapp_inbox_csrf_exempt
@_whatsapp_inbox_api_view(["POST"])
@_whatsapp_inbox_permission_classes([_WhatsAppInboxAllowAny])
def system_whatsapp_inbox_webhook(request):
    """
    Internal webhook used by the local WhatsApp Session Gateway.
    Security model:
    - In production, set WHATSAPP_INCOMING_WEBHOOK_TOKEN and send it in:
      X-Mhamcloud-Webhook-Token.
    - In DEBUG development mode, the endpoint accepts local gateway calls
      without a token to keep local testing simple.
    """
    import hmac
    import os
    from django.conf import settings
    from rest_framework import status as drf_status
    from rest_framework.response import Response as DRFResponse
    from whatsapp.services import record_whatsapp_incoming_message
    required_token = str(
        getattr(settings, "WHATSAPP_INCOMING_WEBHOOK_TOKEN", "")
        or os.environ.get("WHATSAPP_INCOMING_WEBHOOK_TOKEN", "")
        or ""
    ).strip()
    provided_token = str(
        request.headers.get("X-Mhamcloud-Webhook-Token")
        or request.headers.get("X-Webhook-Token")
        or request.query_params.get("token")
        or ""
    ).strip()
    if required_token and not hmac.compare_digest(provided_token, required_token):
        return DRFResponse(
            {
                "ok": False,
                "success": False,
                "message": "Invalid WhatsApp incoming webhook token.",
            },
            status=drf_status.HTTP_403_FORBIDDEN,
        )
    if not required_token and not settings.DEBUG:
        return DRFResponse(
            {
                "ok": False,
                "success": False,
                "message": "WhatsApp incoming webhook token is required in production.",
            },
            status=drf_status.HTTP_403_FORBIDDEN,
        )
    if hasattr(request.data, "dict"):
        data = request.data.dict()
    elif isinstance(request.data, dict):
        data = dict(request.data)
    else:
        data = {}
    media_file = request.FILES.get("media")
    data.pop("media", None)

    metadata_value = data.get("metadata")
    if isinstance(metadata_value, str) and metadata_value.strip():
        try:
            import json
            data["metadata"] = json.loads(metadata_value)
        except (TypeError, ValueError):
            data["metadata"] = {"raw": metadata_value}

    try:
        payload = record_whatsapp_incoming_message(
            data,
            media_file=media_file,
        )
    except (ValueError, TypeError) as exc:
        return DRFResponse(
            {
                "ok": False,
                "success": False,
                "message": "Invalid incoming WhatsApp webhook payload.",
                "errors": {"detail": str(exc)},
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )
    http_status = (
        drf_status.HTTP_200_OK
        if payload.get("duplicate")
        else drf_status.HTTP_201_CREATED
    )
    return DRFResponse(
        {
            "ok": True,
            "success": True,
            "message": "Incoming WhatsApp message recorded successfully.",
            **payload,
        },
        status=http_status,
    )

# ============================================================
# System WhatsApp Inbox Conversation APIs
# ============================================================
from rest_framework.permissions import IsAuthenticated as _WhatsAppInboxIsAuthenticated
def _system_whatsapp_inbox_can_view(user) -> bool:
    # Keep Inbox reads aligned with the canonical System WhatsApp read contract.
    return bool(
        getattr(user, "is_authenticated", False)
        and _can_view(user)
    )
def _system_whatsapp_inbox_can_manage(user) -> bool:
    # Keep Inbox mutations aligned with the canonical management contract.
    return bool(
        getattr(user, "is_authenticated", False)
        and _can_manage(user)
    )
def _system_whatsapp_inbox_forbidden(message="You do not have permission to access system WhatsApp inbox."):
    from rest_framework import status as drf_status
    from rest_framework.response import Response as DRFResponse
    return DRFResponse(
        {
            "success": False,
            "message": message,
            "errors": {"permission": message},
        },
        status=drf_status.HTTP_403_FORBIDDEN,
    )
def _system_whatsapp_inbox_queryset():
    from whatsapp.models import WhatsAppConversation
    return (
        WhatsAppConversation.objects
        .select_related("contact", "assigned_to")
        .filter(scope="SYSTEM", company__isnull=True)
        .order_by("-is_pinned", "-last_message_at", "-updated_at", "-id")
    )
def _parse_positive_int(value, default=1, maximum=100):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    if parsed < 1:
        return default
    return min(parsed, maximum)
@_whatsapp_inbox_api_view(["GET"])
@_whatsapp_inbox_permission_classes([_WhatsAppInboxIsAuthenticated])
def system_whatsapp_inbox_list(request):
    from rest_framework.response import Response as DRFResponse
    from whatsapp.services import (
        serialize_whatsapp_inbox_conversation,
        serialize_whatsapp_inbox_summary,
    )
    if not _system_whatsapp_inbox_can_view(request.user):
        return _system_whatsapp_inbox_forbidden()
    queryset = _system_whatsapp_inbox_queryset()
    status_value = str(request.GET.get("status") or "").upper().strip()
    if status_value:
        queryset = queryset.filter(status=status_value)
    search = str(request.GET.get("search") or "").strip()
    if search:
        queryset = queryset.filter(
            Q(contact__display_name__icontains=search)
            | Q(contact__push_name__icontains=search)
            | Q(contact__normalized_phone__icontains=search)
            | Q(contact__whatsapp_jid__icontains=search)
            | Q(last_message_preview__icontains=search)
        )
    unread = str(request.GET.get("unread") or "").lower().strip()
    if unread in {"1", "true", "yes"}:
        queryset = queryset.filter(unread_count__gt=0)
    page = _parse_positive_int(request.GET.get("page"), default=1, maximum=100000)
    page_size = _parse_positive_int(request.GET.get("page_size"), default=25, maximum=100)
    total = queryset.count()
    offset = (page - 1) * page_size
    items = list(queryset[offset:offset + page_size])
    return DRFResponse(
        {
            "success": True,
            "message": "System WhatsApp inbox conversations loaded successfully.",
            "summary": serialize_whatsapp_inbox_summary(scope="SYSTEM", session_name="Mhamcloud-system-session"),
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "has_next": offset + page_size < total,
            },
            "conversations": [
                serialize_whatsapp_inbox_conversation(item)
                for item in items
            ],
        }
    )
@_whatsapp_inbox_api_view(["GET"])
@_whatsapp_inbox_permission_classes([_WhatsAppInboxIsAuthenticated])
def system_whatsapp_inbox_detail(request, conversation_id: int):
    from rest_framework import status as drf_status
    from rest_framework.response import Response as DRFResponse
    from whatsapp.services import serialize_whatsapp_inbox_conversation
    if not _system_whatsapp_inbox_can_view(request.user):
        return _system_whatsapp_inbox_forbidden()
    conversation = _system_whatsapp_inbox_queryset().filter(id=conversation_id).first()
    if conversation is None:
        return DRFResponse(
            {
                "success": False,
                "message": "WhatsApp inbox conversation was not found.",
            },
            status=drf_status.HTTP_404_NOT_FOUND,
        )
    return DRFResponse(
        {
            "success": True,
            "message": "System WhatsApp inbox conversation loaded successfully.",
            "conversation": serialize_whatsapp_inbox_conversation(conversation),
        }
    )
@_whatsapp_inbox_api_view(["GET"])
@_whatsapp_inbox_permission_classes([_WhatsAppInboxIsAuthenticated])
def system_whatsapp_inbox_messages(request, conversation_id: int):
    from rest_framework import status as drf_status
    from rest_framework.response import Response as DRFResponse
    from whatsapp.services import (
        serialize_whatsapp_inbox_conversation,
        serialize_whatsapp_inbox_message,
    )
    if not _system_whatsapp_inbox_can_view(request.user):
        return _system_whatsapp_inbox_forbidden()
    conversation = _system_whatsapp_inbox_queryset().filter(id=conversation_id).first()
    if conversation is None:
        return DRFResponse(
            {
                "success": False,
                "message": "WhatsApp inbox conversation was not found.",
            },
            status=drf_status.HTTP_404_NOT_FOUND,
        )
    messages = (
        conversation.messages
        .select_related("contact", "sent_by")
        .prefetch_related("attachments")
        .order_by("created_at", "id")
    )
    conversation.unread_count = 0
    conversation.save(update_fields=["unread_count", "updated_at"])
    return DRFResponse(
        {
            "success": True,
            "message": "System WhatsApp inbox messages loaded successfully.",
            "conversation": serialize_whatsapp_inbox_conversation(conversation),
            "messages": [
                serialize_whatsapp_inbox_message(item)
                for item in messages
            ],
        }
    )
@_whatsapp_inbox_api_view(["GET"])
@_whatsapp_inbox_permission_classes([_WhatsAppInboxIsAuthenticated])
def system_whatsapp_inbox_attachment_media(request, attachment_id: int):
    from django.http import FileResponse
    from rest_framework.response import Response as DRFResponse
    from whatsapp.models import WhatsAppMessageAttachment

    if not _system_whatsapp_inbox_can_view(request.user):
        return _system_whatsapp_inbox_forbidden()

    attachment = (
        WhatsAppMessageAttachment.objects
        .select_related("message")
        .filter(
            id=attachment_id,
            message__scope="SYSTEM",
            message__company__isnull=True,
        )
        .first()
    )
    if attachment is None or not attachment.file:
        return DRFResponse(
            {"success": False, "message": "WhatsApp media was not found."},
            status=404,
        )

    response = FileResponse(
        attachment.file.open("rb"),
        content_type=attachment.mime_type or "application/octet-stream",
        as_attachment=False,
        filename=attachment.original_filename or "whatsapp-media",
    )
    response["X-Content-Type-Options"] = "nosniff"
    return response


@_whatsapp_inbox_api_view(["POST"])
@_whatsapp_inbox_permission_classes([_WhatsAppInboxIsAuthenticated])
def system_whatsapp_inbox_reply(request, conversation_id: int):
    from rest_framework import status as drf_status
    from rest_framework.response import Response as DRFResponse
    from whatsapp.services import send_system_whatsapp_inbox_reply

    if not _system_whatsapp_inbox_can_manage(request.user):
        return _system_whatsapp_inbox_forbidden(
            "You do not have permission to reply to system WhatsApp inbox conversations."
        )

    conversation = _system_whatsapp_inbox_queryset().filter(id=conversation_id).first()
    if conversation is None:
        return DRFResponse(
            {"success": False, "message": "WhatsApp inbox conversation was not found."},
            status=drf_status.HTTP_404_NOT_FOUND,
        )

    body = str(
        request.data.get("body")
        or request.data.get("message")
        or request.data.get("text")
        or ""
    ).strip()
    media_file = request.FILES.get("media")
    message_type = str(request.data.get("message_type") or "").strip().upper()

    reply_to_message_id = request.data.get("reply_to_message_id")
    reply_to_message = None
    if reply_to_message_id not in (None, ""):
        try:
            reply_to_message_id = int(reply_to_message_id)
        except (TypeError, ValueError):
            return DRFResponse(
                {
                    "success": False,
                    "message": "Invalid reply_to_message_id.",
                    "errors": {"reply_to_message_id": "Invalid message ID."},
                },
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        reply_to_message = (
            conversation.messages
            .select_related("contact", "sent_by")
            .prefetch_related("attachments")
            .filter(id=reply_to_message_id)
            .first()
        )
        if reply_to_message is None:
            return DRFResponse(
                {
                    "success": False,
                    "message": "Quoted WhatsApp message was not found in this conversation.",
                    "errors": {
                        "reply_to_message_id": "Quoted message was not found in this conversation."
                    },
                },
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

    if media_file is None and not body:
        return DRFResponse(
            {
                "success": False,
                "message": "Reply body or media is required.",
                "errors": {"body": "Reply body or media is required."},
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    try:
        payload = send_system_whatsapp_inbox_reply(
            conversation=conversation,
            body=body,
            user=request.user,
            media_file=media_file,
            message_type=message_type,
            reply_to_message=reply_to_message,
        )
    except ValueError as exc:
        return DRFResponse(
            {
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=drf_status.HTTP_400_BAD_REQUEST,
        )

    http_status = (
        drf_status.HTTP_200_OK
        if payload.get("success")
        else drf_status.HTTP_502_BAD_GATEWAY
    )
    return DRFResponse(payload, status=http_status)
