# 📂 api/system/business_controls/views.py
# 🧠 PrimeyAcc | System Business Controls API Views v1
# ============================================================
# ✅ Read-only system overview for business controls
# ✅ Audit events + idempotency keys + reference sequences
# ✅ System scoped access only
# ✅ No migrations
# ✅ No tenant leakage from unauthenticated frontend input
# ============================================================
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from django.apps import apps
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_GET
try:
    from api.permissions import user_has_system_permission
except Exception:  # pragma: no cover
    user_has_system_permission = None
SYSTEM_VIEW_PERMISSIONS = (
    "system.business_controls.view",
    "system.companies.view",
    "system.release_readiness.view",
    "system.view",
)
def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value
def _text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return str(value).strip() or default
def _number(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default
def _query(request, key: str, default: str = "") -> str:
    return _text(request.GET.get(key), default)
def _int_query(request, key: str, default: int = 0, maximum: int | None = None) -> int:
    value = _number(request.GET.get(key, default), default)
    if value < 0:
        value = default
    if maximum is not None:
        value = min(value, maximum)
    return value
def _limit_offset(request) -> tuple[int, int]:
    limit = _int_query(request, "limit", 50, 250)
    offset = _int_query(request, "offset", 0)
    return limit or 50, offset
def _safe_has_system_permission(user, permission_code: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    if user_has_system_permission is None:
        return False
    try:
        return bool(user_has_system_permission(user, permission_code))
    except Exception:
        return False
def _user_is_system_member(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False) or getattr(user, "is_staff", False):
        return True
    profile = getattr(user, "primeyacc_profile", None)
    if profile:
        role = _text(getattr(profile, "system_role", "")).upper()
        if role in {"SUPER_ADMIN", "SYSTEM_ADMIN", "SUPPORT", "BILLING_MANAGER"}:
            return True
        if bool(getattr(profile, "is_system_user", False)):
            return True
        if bool(getattr(profile, "can_access_system", False)):
            return True
    return False
def _can_view(user) -> bool:
    return _user_is_system_member(user) or any(
        _safe_has_system_permission(user, permission)
        for permission in SYSTEM_VIEW_PERMISSIONS
    )
def _permission_response(request):
    user = getattr(request, "user", None)
    if not user or not getattr(user, "is_authenticated", False):
        return JsonResponse(
            {
                "success": False,
                "message": "Authentication is required to access business controls.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=401,
        )
    if not _can_view(user):
        return JsonResponse(
            {
                "success": False,
                "message": "You do not have permission to access business controls.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=403,
        )
    return None
def _get_model(app_label: str, model_name: str):
    try:
        return apps.get_model(app_label, model_name)
    except LookupError:
        return None
def _company_model():
    return _get_model("companies", "Company")
def _audit_model():
    return _get_model("business_controls", "BusinessAuditEvent")
def _idempotency_model():
    return _get_model("business_controls", "BusinessIdempotencyKey")
def _reference_model():
    return _get_model("business_controls", "BusinessReferenceSequence")
def _display_name(obj) -> str:
    if not obj:
        return ""
    for field_name in ("display_name", "name_ar", "name_en", "name", "company_name", "code"):
        if hasattr(obj, field_name):
            value = getattr(obj, field_name)
            if value:
                return _text(value)
    return str(obj)
def _company_payload(company) -> dict[str, Any]:
    if not company:
        return {}
    return {
        "id": getattr(company, "pk", None),
        "name": _display_name(company),
        "display_name": _display_name(company),
        "company_code": _text(getattr(company, "company_code", getattr(company, "code", ""))),
        "status": _text(getattr(company, "status", "ACTIVE"), "ACTIVE"),
        "is_active": bool(getattr(company, "is_active", True)),
    }
def _actor_payload(actor) -> dict[str, Any]:
    if not actor:
        return {}
    full_name = ""
    if hasattr(actor, "get_full_name"):
        try:
            full_name = _text(actor.get_full_name())
        except Exception:
            full_name = ""
    return {
        "id": getattr(actor, "pk", None),
        "name": full_name or _text(getattr(actor, "username", "")) or _text(getattr(actor, "email", "")),
        "email": _text(getattr(actor, "email", "")),
        "username": _text(getattr(actor, "username", "")),
    }
def _base_queryset(model, *select_related_fields: str):
    if not model:
        return None
    queryset = model.objects.all()
    for field_name in select_related_fields:
        try:
            queryset = queryset.select_related(field_name)
        except Exception:
            pass
    if any(field.name == "created_at" for field in model._meta.fields):
        queryset = queryset.order_by("-created_at", "-id")
    else:
        queryset = queryset.order_by("-id")
    return queryset
def _apply_common_filters(queryset, request):
    if queryset is None:
        return queryset
    company_id = _query(request, "company_id")
    search = _query(request, "search") or _query(request, "q")
    if company_id and company_id.isdigit() and any(field.name == "company" for field in queryset.model._meta.fields):
        queryset = queryset.filter(company_id=int(company_id))
    if search:
        fields = {field.name for field in queryset.model._meta.fields}
        search_query = Q()
        for field_name in (
            "event_type",
            "severity",
            "source_app",
            "source_model",
            "object_id",
            "object_reference",
            "action",
            "message",
            "request_id",
            "idempotency_key",
            "key",
            "scope",
            "operation",
            "status",
            "error_message",
            "prefix",
            "description",
        ):
            if field_name in fields:
                search_query |= Q(**{f"{field_name}__icontains": search})
        queryset = queryset.filter(search_query)
    return queryset
def _audit_payload(event) -> dict[str, Any]:
    return {
        "id": event.pk,
        "company": _company_payload(getattr(event, "company", None)),
        "actor": _actor_payload(getattr(event, "actor", None)),
        "event_type": _text(getattr(event, "event_type", "")),
        "severity": _text(getattr(event, "severity", "")),
        "source_app": _text(getattr(event, "source_app", "")),
        "source_model": _text(getattr(event, "source_model", "")),
        "object_id": _text(getattr(event, "object_id", "")),
        "object_reference": _text(getattr(event, "object_reference", "")),
        "action": _text(getattr(event, "action", "")),
        "message": _text(getattr(event, "message", "")),
        "metadata": getattr(event, "metadata", {}) or {},
        "request_id": _text(getattr(event, "request_id", "")),
        "idempotency_key": _text(getattr(event, "idempotency_key", "")),
        "ip_address": _text(getattr(event, "ip_address", "")),
        "created_at": getattr(event, "created_at", None),
    }
def _idempotency_payload(item) -> dict[str, Any]:
    return {
        "id": item.pk,
        "company": _company_payload(getattr(item, "company", None)),
        "key": _text(getattr(item, "key", "")),
        "scope": _text(getattr(item, "scope", "")),
        "operation": _text(getattr(item, "operation", "")),
        "request_hash": _text(getattr(item, "request_hash", "")),
        "status": _text(getattr(item, "status", "")),
        "response_snapshot": getattr(item, "response_snapshot", {}) or {},
        "error_message": _text(getattr(item, "error_message", "")),
        "expires_at": getattr(item, "expires_at", None),
        "created_at": getattr(item, "created_at", None),
        "updated_at": getattr(item, "updated_at", None),
        "completed_at": getattr(item, "completed_at", None),
    }
def _reference_payload(item) -> dict[str, Any]:
    return {
        "id": item.pk,
        "company": _company_payload(getattr(item, "company", None)),
        "scope": _text(getattr(item, "scope", "")),
        "prefix": _text(getattr(item, "prefix", "")),
        "current_number": getattr(item, "current_number", 0),
        "padding": getattr(item, "padding", 0),
        "is_active": bool(getattr(item, "is_active", True)),
        "description": _text(getattr(item, "description", "")),
        "created_at": getattr(item, "created_at", None),
        "updated_at": getattr(item, "updated_at", None),
    }
def _model_count(model) -> int:
    if not model:
        return 0
    return model.objects.count()
def _count_filter(model, **filters) -> int:
    if not model:
        return 0
    try:
        return model.objects.filter(**filters).count()
    except Exception:
        return 0
def _distinct_count(model, field_name: str) -> int:
    if not model:
        return 0
    try:
        return (
            model.objects.exclude(**{f"{field_name}__isnull": True})
            .values_list(field_name, flat=True)
            .distinct()
            .count()
        )
    except Exception:
        return 0
def _distribution(model, field_name: str) -> list[dict[str, Any]]:
    if not model:
        return []
    if field_name not in {field.name for field in model._meta.fields}:
        return []
    return [
        {"value": _text(row[field_name], "unknown"), "count": row["count"]}
        for row in model.objects.values(field_name).annotate(count=Count("id")).order_by("-count", field_name)
    ]
def _summary_payload() -> dict[str, Any]:
    Audit = _audit_model()
    Idempotency = _idempotency_model()
    Reference = _reference_model()
    Company = _company_model()
    now = timezone.now()
    expired_keys = 0
    if Idempotency:
        expired_keys = Idempotency.objects.filter(expires_at__lt=now).count()
    return {
        "audit_events_count": _model_count(Audit),
        "audit_warning_count": _count_filter(Audit, severity="warning"),
        "audit_critical_count": _count_filter(Audit, severity="critical"),
        "idempotency_keys_count": _model_count(Idempotency),
        "idempotency_started_count": _count_filter(Idempotency, status="started"),
        "idempotency_succeeded_count": _count_filter(Idempotency, status="succeeded"),
        "idempotency_failed_count": _count_filter(Idempotency, status="failed"),
        "idempotency_expired_count": expired_keys,
        "reference_sequences_count": _model_count(Reference),
        "active_reference_sequences_count": _count_filter(Reference, is_active=True),
        "companies_count": _model_count(Company),
        "companies_with_audit_events": _distinct_count(Audit, "company_id"),
        "companies_with_idempotency_keys": _distinct_count(Idempotency, "company_id"),
        "companies_with_reference_sequences": _distinct_count(Reference, "company_id"),
        "severity_distribution": _distribution(Audit, "severity"),
        "idempotency_status_distribution": _distribution(Idempotency, "status"),
    }
def _choices_payload() -> dict[str, Any]:
    Audit = _audit_model()
    Idempotency = _idempotency_model()
    Reference = _reference_model()
    return {
        "severities": _distribution(Audit, "severity"),
        "idempotency_statuses": _distribution(Idempotency, "status"),
        "reference_scopes": _distribution(Reference, "scope"),
        "audit_event_types": _distribution(Audit, "event_type")[:30],
        "source_apps": _distribution(Audit, "source_app")[:30],
    }
def _paginate(queryset, request):
    if queryset is None:
        return [], 0, 50, 0
    limit, offset = _limit_offset(request)
    total = queryset.count()
    return list(queryset[offset : offset + limit]), total, limit, offset
def _json_response(data: dict[str, Any], status: int = 200):
    return JsonResponse(_json_safe(data), status=status)
@require_GET
def system_business_controls_overview(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    Audit = _audit_model()
    Idempotency = _idempotency_model()
    Reference = _reference_model()
    audit_queryset = _apply_common_filters(_base_queryset(Audit, "company", "actor"), request)
    idempotency_queryset = _apply_common_filters(_base_queryset(Idempotency, "company"), request)
    reference_queryset = _apply_common_filters(_base_queryset(Reference, "company"), request)
    audit_items = list(audit_queryset[:10]) if audit_queryset is not None else []
    idempotency_items = list(idempotency_queryset[:10]) if idempotency_queryset is not None else []
    reference_items = list(reference_queryset[:10]) if reference_queryset is not None else []
    data = {
        "summary": _summary_payload(),
        "latest_audit_events": [_audit_payload(item) for item in audit_items],
        "latest_idempotency_keys": [_idempotency_payload(item) for item in idempotency_items],
        "reference_sequences": [_reference_payload(item) for item in reference_items],
        "choices": _choices_payload(),
    }
    return _json_response(
        {
            "success": True,
            "message": "System business controls overview loaded.",
            "data": data,
            "results": data["latest_audit_events"],
            "count": len(data["latest_audit_events"]),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_business_audit_events(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    Audit = _audit_model()
    queryset = _apply_common_filters(_base_queryset(Audit, "company", "actor"), request)
    severity = _query(request, "severity").lower()
    event_type = _query(request, "event_type")
    source_app = _query(request, "source_app")
    if queryset is not None:
        if severity:
            queryset = queryset.filter(severity__iexact=severity)
        if event_type:
            queryset = queryset.filter(event_type__iexact=event_type)
        if source_app:
            queryset = queryset.filter(source_app__iexact=source_app)
    page_items, total, limit, offset = _paginate(queryset, request)
    results = [_audit_payload(item) for item in page_items]
    return _json_response(
        {
            "success": True,
            "message": "System business audit events loaded.",
            "data": {
                "summary": _summary_payload(),
                "results": results,
                "choices": _choices_payload(),
            },
            "results": results,
            "count": total,
            "meta": {"limit": limit, "offset": offset, "safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_business_idempotency_keys(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    Idempotency = _idempotency_model()
    queryset = _apply_common_filters(_base_queryset(Idempotency, "company"), request)
    status_filter = _query(request, "status").lower()
    scope = _query(request, "scope")
    operation = _query(request, "operation")
    if queryset is not None:
        if status_filter:
            queryset = queryset.filter(status__iexact=status_filter)
        if scope:
            queryset = queryset.filter(scope__iexact=scope)
        if operation:
            queryset = queryset.filter(operation__iexact=operation)
    page_items, total, limit, offset = _paginate(queryset, request)
    results = [_idempotency_payload(item) for item in page_items]
    return _json_response(
        {
            "success": True,
            "message": "System business idempotency keys loaded.",
            "data": {
                "summary": _summary_payload(),
                "results": results,
                "choices": _choices_payload(),
            },
            "results": results,
            "count": total,
            "meta": {"limit": limit, "offset": offset, "safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_business_reference_sequences(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    Reference = _reference_model()
    queryset = _apply_common_filters(_base_queryset(Reference, "company"), request)
    scope = _query(request, "scope")
    active = _query(request, "active").lower()
    if queryset is not None:
        if scope:
            queryset = queryset.filter(scope__iexact=scope)
        if active in {"1", "true", "yes", "active"}:
            queryset = queryset.filter(is_active=True)
        if active in {"0", "false", "no", "inactive"}:
            queryset = queryset.filter(is_active=False)
    page_items, total, limit, offset = _paginate(queryset, request)
    results = [_reference_payload(item) for item in page_items]
    return _json_response(
        {
            "success": True,
            "message": "System business reference sequences loaded.",
            "data": {
                "summary": _summary_payload(),
                "results": results,
                "choices": _choices_payload(),
            },
            "results": results,
            "count": total,
            "meta": {"limit": limit, "offset": offset, "safe_mode": True, "read_only": True},
        }
    )
