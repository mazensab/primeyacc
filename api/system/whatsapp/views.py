# ============================================================
# 📂 api/system/whatsapp/views.py
# 🧠 PrimeyAcc | System WhatsApp API Views V1.0
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
    profile = getattr(user, "primeyacc_profile", None)
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
    queryset = _apply_message_filters(_base_messages_queryset(), request)
    total = queryset.count()
    limit, offset = _limit_offset(request)
    results = queryset[offset : offset + limit]
    return Response(
        {
            "success": True,
            "count": total,
            "limit": limit,
            "offset": offset,
            "stats": _message_stats(queryset),
            "results": [_serialize_message(item) for item in results],
            "choices": _choices_payload(),
        }
    )
@api_view(["GET"])
def system_whatsapp_message_detail(request, message_id: int):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    message = _base_messages_queryset().filter(id=message_id).first()
    if not message:
        return Response(
            {
                "success": False,
                "message": "WhatsApp message log was not found.",
            },
            status=404,
        )
    return Response(
        {
            "success": True,
            "message_log": _serialize_message(message),
            "choices": _choices_payload(),
        }
    )
