# 📂 api/system/activity_backends/views.py
# 🧠 Mhamcloud | System Activity Backends API Views v1
# ============================================================
# ✅ Read-only system activity backends overview
# ✅ Uses activity_backends app models/services when installed
# ✅ No tenant leakage from frontend input
# ✅ System scoped access only
# ============================================================
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from django.apps import apps
from django.http import JsonResponse
from django.views.decorators.http import require_GET
try:
    from api.permissions import user_has_system_permission
except Exception:  # pragma: no cover
    user_has_system_permission = None
try:
    from activity_backends.services import activity_backends_summary
except Exception:  # pragma: no cover
    activity_backends_summary = None
SYSTEM_VIEW_PERMISSIONS = (
    "system.activity_backends.view",
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
                "message": "Authentication is required to access activity backends.",
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
                "message": "You do not have permission to access activity backends.",
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
def _display_name(obj) -> str:
    for field_name in ("display_name", "name_ar", "name_en", "name", "company_name", "code"):
        if hasattr(obj, field_name):
            value = getattr(obj, field_name)
            if value:
                return _text(value)
    return str(obj)
def _company_payload(company) -> dict[str, Any]:
    return {
        "id": company.pk,
        "name": _display_name(company),
        "display_name": _display_name(company),
        "company_code": _text(getattr(company, "company_code", getattr(company, "code", ""))),
        "status": _text(getattr(company, "status", "ACTIVE"), "ACTIVE"),
        "is_active": bool(getattr(company, "is_active", True)),
        "created_at": getattr(company, "created_at", None),
        "updated_at": getattr(company, "updated_at", None),
    }
def _activity_backend_models():
    try:
        app_config = apps.get_app_config("activity_backends")
    except LookupError:
        return []
    return list(app_config.get_models())
def _model_has_company(model) -> bool:
    return any(field.name == "company" for field in model._meta.fields)
def _model_count_payload(model) -> dict[str, Any]:
    queryset = model.objects.all()
    count = queryset.count()
    return {
        "model": model.__name__,
        "app_label": model._meta.app_label,
        "db_table": model._meta.db_table,
        "count": count,
        "company_scoped": _model_has_company(model),
    }
def _summary_counts() -> dict[str, Any]:
    models = _activity_backend_models()
    model_counts = [_model_count_payload(model) for model in models]
    total_records = sum(item["count"] for item in model_counts)
    company_ids: set[int] = set()
    for model in models:
        if _model_has_company(model):
            company_ids.update(
                model.objects.exclude(company_id__isnull=True)
                .values_list("company_id", flat=True)
                .distinct()
            )
    return {
        "models_count": len(models),
        "records_count": total_records,
        "companies_with_activity_records": len(company_ids),
        "model_counts": model_counts,
    }
def _company_activity_summary(company) -> dict[str, Any]:
    if activity_backends_summary is None:
        return {}
    try:
        return activity_backends_summary(company)
    except Exception as exc:
        return {
            "error": exc.__class__.__name__,
            "message": str(exc),
        }
@require_GET
def system_activity_backends_overview(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    Company = _company_model()
    limit = _int_query(request, "limit", 50, 200)
    offset = _int_query(request, "offset", 0)
    counts = _summary_counts()
    companies_payload = []
    if Company:
        queryset = Company.objects.all().order_by("-id")
        companies = queryset[offset : offset + (limit or 50)]
        for company in companies:
            companies_payload.append(
                {
                    "company": _company_payload(company),
                    "summary": _company_activity_summary(company),
                }
            )
    data = {
        "summary": counts,
        "companies": companies_payload,
        "models": counts["model_counts"],
    }
    return JsonResponse(
        _json_safe(
            {
                "success": True,
                "message": "System activity backends overview loaded.",
                "data": data,
                "results": companies_payload,
                "count": len(companies_payload),
                "meta": {
                    "limit": limit or 50,
                    "offset": offset,
                    "safe_mode": True,
                    "read_only": True,
                    "service_available": activity_backends_summary is not None,
                },
            }
        ),
        status=200,
    )
