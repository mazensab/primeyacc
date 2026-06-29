# 📂 api/system/activity_profiles/views.py
# 🧠 Mhamcloud | System Activity Profiles API Views v1
# ============================================================
# ✅ Read-only system overview for company activity profiles
# ✅ Dynamic model-safe serializers
# ✅ No migrations / no frontend company_id trust
# ✅ System scoped access only
# ============================================================
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from django.apps import apps
from django.db.models import Count, Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET
try:
    from api.permissions import user_has_system_permission
except Exception:  # pragma: no cover
    user_has_system_permission = None
SYSTEM_VIEW_PERMISSIONS = (
    "system.activity_profiles.view",
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
def _int_query(request, key: str, default: int = 0, maximum: int | None = None) -> int:
    try:
        value = int(str(request.GET.get(key, default) or default))
    except (TypeError, ValueError):
        value = default
    if value < 0:
        value = default
    if maximum is not None:
        value = min(value, maximum)
    return value
def _query(request, key: str, default: str = "") -> str:
    return _text(request.GET.get(key), default)
def _limit_offset(request) -> tuple[int, int]:
    limit = _int_query(request, "limit", 50, 200)
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
    profile = getattr(user, "Mhamcloud_profile", None)
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
                "message": "Authentication is required to access activity profiles.",
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
                "message": "You do not have permission to access activity profiles.",
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
def _activity_profile_model():
    candidates = (
        ("companies", "ActivityProfile"),
        ("companies", "CompanyActivityProfile"),
    )
    for app_label, model_name in candidates:
        model = _get_model(app_label, model_name)
        if model:
            return model
    for model in apps.get_models():
        name = model.__name__.lower()
        label = model._meta.app_label.lower()
        if "activityprofile" in name or ("activity" in name and "profile" in name):
            if label == "companies":
                return model
    return None
def _field_names(model) -> set[str]:
    if not model:
        return set()
    return {field.name for field in model._meta.fields}
def _has_field(model, field_name: str) -> bool:
    return field_name in _field_names(model)
def _get(obj, *field_names: str, default: Any = None) -> Any:
    fields = _field_names(obj.__class__)
    for field_name in field_names:
        if field_name in fields:
            return getattr(obj, field_name, default)
    return default
def _choice_label(obj, field_name: str, fallback: Any = "") -> str:
    method = getattr(obj, f"get_{field_name}_display", None)
    if callable(method):
        try:
            return _text(method(), _text(fallback))
        except Exception:
            return _text(fallback)
    return _text(fallback)
def _display_name(obj) -> str:
    for field_name in ("display_name", "name_ar", "name_en", "name", "title", "label", "code", "key"):
        value = _get(obj, field_name)
        if value:
            return _text(value)
    return str(obj)
def _profile_code(profile) -> str:
    return _text(_get(profile, "code", "key", "slug", default=f"profile-{profile.pk}"))
def _profile_status(profile) -> str:
    status = _get(profile, "status")
    if status:
        return _text(status).upper()
    is_active = _get(profile, "is_active", "enabled", "is_enabled")
    if is_active is False:
        return "INACTIVE"
    return "ACTIVE"
def _profile_type(profile) -> str:
    return _text(
        _get(
            profile,
            "activity_type",
            "business_activity",
            "business_type",
            "sector",
            "category",
            default="",
        )
    )
def _companies_queryset_for_profile(profile):
    Company = _company_model()
    if not Company:
        return None
    profile_model = profile.__class__
    conditions = Q(pk__in=[])
    for field in Company._meta.fields:
        remote_model = getattr(getattr(field, "remote_field", None), "model", None)
        if remote_model == profile_model:
            conditions |= Q(**{field.name: profile})
    profile_identifiers = [
        _profile_code(profile),
        _text(_get(profile, "name")),
        _text(_get(profile, "name_ar")),
        _text(_get(profile, "name_en")),
        _text(_get(profile, "slug")),
    ]
    profile_identifiers = [item for item in profile_identifiers if item]
    string_fields = (
        "activity_profile",
        "activity_profile_code",
        "activity_profile_ref",
        "business_activity",
        "activity_type",
    )
    for field_name in string_fields:
        if _has_field(Company, field_name):
            for identifier in profile_identifiers:
                conditions |= Q(**{f"{field_name}__iexact": identifier})
    return Company.objects.filter(conditions).distinct()
def _profile_companies_count(profile) -> int:
    queryset = _companies_queryset_for_profile(profile)
    if queryset is None:
        return 0
    try:
        return queryset.count()
    except Exception:
        return 0
def _company_payload(company) -> dict[str, Any]:
    profile_id = None
    for field in company.__class__._meta.fields:
        remote_model = getattr(getattr(field, "remote_field", None), "model", None)
        if remote_model == _activity_profile_model():
            profile_id = getattr(company, f"{field.name}_id", None)
            break
    return {
        "id": company.pk,
        "name": _display_name(company),
        "display_name": _display_name(company),
        "company_code": _text(_get(company, "company_code", "code", "slug")),
        "email": _text(_get(company, "email")),
        "phone": _text(_get(company, "phone", "mobile")),
        "city": _text(_get(company, "city")),
        "country": _text(_get(company, "country")),
        "status": _text(_get(company, "status"), "ACTIVE"),
        "is_active": bool(_get(company, "is_active", default=True)),
        "activity_profile_id": profile_id,
        "created_at": _get(company, "created_at"),
        "updated_at": _get(company, "updated_at"),
    }
def _profile_payload(profile, *, include_companies: bool = False) -> dict[str, Any]:
    status = _profile_status(profile)
    type_value = _profile_type(profile)
    payload = {
        "id": profile.pk,
        "code": _profile_code(profile),
        "key": _profile_code(profile),
        "name": _display_name(profile),
        "display_name": _display_name(profile),
        "name_ar": _text(_get(profile, "name_ar")),
        "name_en": _text(_get(profile, "name_en")),
        "title": _text(_get(profile, "title", "label"), _display_name(profile)),
        "description": _text(_get(profile, "description", "notes")),
        "activity_type": type_value,
        "business_type": _text(_get(profile, "business_type"), type_value),
        "sector": _text(_get(profile, "sector", "category")),
        "status": status,
        "status_label": _choice_label(profile, "status", status),
        "is_active": status == "ACTIVE" and _get(profile, "is_active", default=True) is not False,
        "is_enabled": _get(profile, "is_enabled", "enabled", default=True),
        "icon": _text(_get(profile, "icon")),
        "color": _text(_get(profile, "color")),
        "sort_order": _get(profile, "sort_order", default=0),
        "modules": _get(profile, "modules", "enabled_modules", default=[]),
        "features": _get(profile, "features", "enabled_features", default=[]),
        "settings": _get(profile, "settings", "configuration", default={}),
        "metadata": _get(profile, "metadata", default={}),
        "companies_count": _profile_companies_count(profile),
        "created_at": _get(profile, "created_at"),
        "updated_at": _get(profile, "updated_at"),
    }
    if include_companies:
        queryset = _companies_queryset_for_profile(profile)
        payload["companies"] = (
            [_company_payload(company) for company in queryset[:100]]
            if queryset is not None
            else []
        )
    return payload
def _base_profiles_queryset():
    model = _activity_profile_model()
    if not model:
        return None
    queryset = model.objects.all()
    fields = _field_names(model)
    ordering: list[str] = []
    for field_name in ("sort_order", "name_ar", "name_en", "name", "code", "id"):
        if field_name in fields:
            ordering.append(field_name)
    if ordering:
        queryset = queryset.order_by(*ordering)
    return queryset
def _apply_filters(queryset, request):
    model = queryset.model
    fields = _field_names(model)
    search = _query(request, "search") or _query(request, "q")
    status = _query(request, "status").upper()
    activity_type = _query(request, "activity_type") or _query(request, "type")
    active = _query(request, "active").lower()
    if search:
        search_query = Q()
        for field_name in (
            "code",
            "key",
            "slug",
            "name",
            "name_ar",
            "name_en",
            "title",
            "label",
            "description",
            "activity_type",
            "business_type",
            "sector",
            "category",
        ):
            if field_name in fields:
                search_query |= Q(**{f"{field_name}__icontains": search})
        queryset = queryset.filter(search_query)
    if status:
        if "status" in fields:
            queryset = queryset.filter(status__iexact=status)
        elif "is_active" in fields:
            queryset = queryset.filter(is_active=status == "ACTIVE")
    if activity_type:
        type_query = Q()
        for field_name in ("activity_type", "business_type", "sector", "category"):
            if field_name in fields:
                type_query |= Q(**{f"{field_name}__iexact": activity_type})
        queryset = queryset.filter(type_query)
    if active in {"1", "true", "yes", "active"} and "is_active" in fields:
        queryset = queryset.filter(is_active=True)
    if active in {"0", "false", "no", "inactive"} and "is_active" in fields:
        queryset = queryset.filter(is_active=False)
    return queryset
def _summary_payload(queryset) -> dict[str, Any]:
    if queryset is None:
        return {
            "total": 0,
            "active": 0,
            "inactive": 0,
            "companies_count": 0,
            "types_count": 0,
        }
    model = queryset.model
    fields = _field_names(model)
    total = queryset.count()
    if "is_active" in fields:
        active = queryset.filter(is_active=True).count()
        inactive = queryset.filter(is_active=False).count()
    elif "status" in fields:
        active = queryset.filter(status__iexact="ACTIVE").count()
        inactive = queryset.exclude(status__iexact="ACTIVE").count()
    else:
        active = total
        inactive = 0
    types = set()
    for field_name in ("activity_type", "business_type", "sector", "category"):
        if field_name in fields:
            types.update(
                _text(value)
                for value in queryset.values_list(field_name, flat=True).distinct()
                if _text(value)
            )
    companies_count = 0
    for profile in queryset[:200]:
        companies_count += _profile_companies_count(profile)
    return {
        "total": total,
        "active": active,
        "inactive": inactive,
        "companies_count": companies_count,
        "types_count": len(types),
    }
def _choices_payload(queryset) -> dict[str, Any]:
    if queryset is None:
        return {"statuses": [], "activity_types": []}
    model = queryset.model
    fields = _field_names(model)
    statuses = []
    activity_types = []
    if "status" in fields:
        field = model._meta.get_field("status")
        if getattr(field, "choices", None):
            statuses = [
                {"value": value, "label": label}
                for value, label in field.choices
            ]
    for field_name in ("activity_type", "business_type", "sector", "category"):
        if field_name in fields:
            values = [
                _text(value)
                for value in queryset.values_list(field_name, flat=True).distinct()
                if _text(value)
            ]
            activity_types.extend(
                {"value": value, "label": value}
                for value in sorted(set(values))
            )
    return {
        "statuses": statuses,
        "activity_types": activity_types,
    }
def _list_response(request, *, overview: bool = False):
    queryset = _base_profiles_queryset()
    if queryset is None:
        data = {
            "summary": _summary_payload(None),
            "results": [],
            "choices": _choices_payload(None),
        }
        return JsonResponse(
            _json_safe(
                {
                    "success": True,
                    "message": "Activity profile model is not installed.",
                    "data": data,
                    "count": 0,
                    "results": [],
                    "meta": {"safe_mode": True, "read_only": True, "model_available": False},
                }
            ),
            status=200,
        )
    filtered = _apply_filters(queryset, request)
    total = filtered.count()
    limit, offset = _limit_offset(request)
    page_items = list(filtered[offset : offset + limit])
    results = [_profile_payload(profile) for profile in page_items]
    data = {
        "summary": _summary_payload(queryset),
        "filtered_count": total,
        "results": results,
        "choices": _choices_payload(queryset),
    }
    if overview:
        data["latest"] = [_profile_payload(profile) for profile in queryset[:10]]
    return JsonResponse(
        _json_safe(
            {
                "success": True,
                "message": "System activity profiles loaded.",
                "data": data,
                "count": total,
                "results": results,
                "meta": {
                    "limit": limit,
                    "offset": offset,
                    "safe_mode": True,
                    "read_only": True,
                    "model_available": True,
                },
            }
        ),
        status=200,
    )
@require_GET
def system_activity_profiles_overview(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    return _list_response(request, overview=True)
@require_GET
def system_activity_profiles_list(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    return _list_response(request, overview=False)
@require_GET
def system_activity_profile_detail(request, profile_id: int):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    queryset = _base_profiles_queryset()
    if queryset is None:
        return JsonResponse(
            {
                "success": False,
                "message": "Activity profile model is not installed.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=404,
        )
    profile = queryset.filter(pk=profile_id).first()
    if not profile:
        return JsonResponse(
            {
                "success": False,
                "message": "Activity profile was not found.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=404,
        )
    payload = _profile_payload(profile, include_companies=True)
    return JsonResponse(
        _json_safe(
            {
                "success": True,
                "message": "System activity profile detail loaded.",
                "data": {"profile": payload},
                "profile": payload,
                "meta": {"safe_mode": True, "read_only": True},
            }
        ),
        status=200,
    )
@require_GET
def system_activity_profile_companies(request, profile_id: int):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    queryset = _base_profiles_queryset()
    if queryset is None:
        return JsonResponse(
            {
                "success": False,
                "message": "Activity profile model is not installed.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=404,
        )
    profile = queryset.filter(pk=profile_id).first()
    if not profile:
        return JsonResponse(
            {
                "success": False,
                "message": "Activity profile was not found.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=404,
        )
    companies_queryset = _companies_queryset_for_profile(profile)
    companies = []
    if companies_queryset is not None:
        limit, offset = _limit_offset(request)
        companies = [
            _company_payload(company)
            for company in companies_queryset[offset : offset + limit]
        ]
    return JsonResponse(
        _json_safe(
            {
                "success": True,
                "message": "Companies assigned to activity profile loaded.",
                "data": {
                    "profile": _profile_payload(profile),
                    "companies": companies,
                },
                "results": companies,
                "count": companies_queryset.count() if companies_queryset is not None else 0,
                "meta": {"safe_mode": True, "read_only": True},
            }
        ),
        status=200,
    )
