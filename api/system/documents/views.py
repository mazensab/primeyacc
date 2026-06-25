# 📂 api/system/documents/views.py
# 🧠 PrimeyAcc | System Documents API Views v1
# ============================================================
# ✅ Read-only system overview for document templates/rendering/thermal/print jobs
# ✅ Uses live Django models through apps registry
# ✅ Mirrors company document capabilities without accepting company_id from frontend
# ✅ System scoped access only
# ✅ No migrations
# ============================================================
from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from django.apps import apps
from django.db.models import Count, Q
from django.http import JsonResponse
from django.urls import resolve
from django.views.decorators.http import require_GET
try:
    from api.permissions import user_has_system_permission
except Exception:  # pragma: no cover
    user_has_system_permission = None
SYSTEM_VIEW_PERMISSIONS = (
    "system.documents.view",
    "system.companies.view",
    "system.release_readiness.view",
    "system.view",
)
COMPANY_DOCUMENT_ROUTES = (
    "/api/company/documents/templates/",
    "/api/company/documents/render/",
    "/api/company/documents/web-print/",
    "/api/company/documents/thermal/",
    "/api/company/documents/pdf/",
    "/api/company/documents/print-jobs/",
)
SYSTEM_DOCUMENT_ROUTES = (
    "/api/system/documents/",
    "/api/system/documents/templates/",
    "/api/system/documents/rendering/",
    "/api/system/documents/thermal/",
    "/api/system/documents/settings/",
    "/api/system/documents/print-jobs/",
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
def _json_response(data: dict[str, Any], status: int = 200):
    return JsonResponse(_json_safe(data), status=status)
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
        return _json_response(
            {
                "success": False,
                "message": "Authentication is required to access system documents.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=401,
        )
    if not _can_view(user):
        return _json_response(
            {
                "success": False,
                "message": "You do not have permission to access system documents.",
                "data": {},
                "errors": [],
                "meta": {"safe_mode": True, "read_only": True},
            },
            status=403,
        )
    return None
def _has_field(model, field_name: str) -> bool:
    return field_name in {field.name for field in model._meta.fields}
def _model_keywords(model) -> str:
    return " ".join(
        [
            _text(model._meta.app_label),
            _text(model.__name__),
            _text(model._meta.model_name),
            _text(model._meta.db_table),
        ]
    ).lower()
def _document_models():
    keywords = ("document", "template", "thermal", "print", "pdf", "render")
    return [
        model
        for model in apps.get_models()
        if any(keyword in _model_keywords(model) for keyword in keywords)
    ]
def _template_models():
    models = []
    for model in _document_models():
        fields = {field.name.lower() for field in model._meta.fields}
        keywords = _model_keywords(model)
        if "template" in keywords or "template_type" in fields or "document_type" in fields:
            models.append(model)
    return models
def _print_job_models():
    models = []
    for model in _document_models():
        fields = {field.name.lower() for field in model._meta.fields}
        keywords = _model_keywords(model)
        if "print" in keywords or "thermal" in keywords or "printer" in fields or "print_status" in fields:
            models.append(model)
    return models
def _rendering_models():
    models = []
    for model in _document_models():
        keywords = _model_keywords(model)
        if "render" in keywords or "pdf" in keywords or "snapshot" in keywords:
            models.append(model)
    return models
def _display_name(obj) -> str:
    if not obj:
        return ""
    for field_name in ("display_name", "name_ar", "name_en", "name", "company_name", "title", "code"):
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
def _safe_get(obj, *field_names: str, default: Any = "") -> Any:
    for field_name in field_names:
        if hasattr(obj, field_name):
            value = getattr(obj, field_name)
            if value not in (None, ""):
                return value
    return default
def _queryset_for_model(model):
    queryset = model.objects.all()
    if _has_field(model, "company"):
        try:
            queryset = queryset.select_related("company")
        except Exception:
            pass
    if _has_field(model, "created_at"):
        return queryset.order_by("-created_at", "-id")
    if _has_field(model, "updated_at"):
        return queryset.order_by("-updated_at", "-id")
    return queryset.order_by("-id")
def _apply_search(queryset, request):
    search = _query(request, "search") or _query(request, "q")
    if not search:
        return queryset
    model = queryset.model
    fields = {field.name for field in model._meta.fields}
    search_query = Q()
    for field_name in (
        "code",
        "name",
        "name_ar",
        "name_en",
        "title",
        "document_type",
        "template_type",
        "status",
        "paper_size",
        "printer_name",
        "description",
        "notes",
    ):
        if field_name in fields:
            search_query |= Q(**{f"{field_name}__icontains": search})
    if "company" in fields:
        search_query |= Q(company__name__icontains=search)
        search_query |= Q(company__company_code__icontains=search)
    return queryset.filter(search_query)
def _paginate(queryset, request):
    limit, offset = _limit_offset(request)
    total = queryset.count()
    return list(queryset[offset : offset + limit]), total, limit, offset
def _model_payload(model) -> dict[str, Any]:
    return {
        "app_label": model._meta.app_label,
        "model": model.__name__,
        "model_name": model._meta.model_name,
        "db_table": model._meta.db_table,
        "count": model.objects.count(),
        "company_scoped": _has_field(model, "company"),
        "has_status": _has_field(model, "status"),
        "has_created_at": _has_field(model, "created_at"),
    }
def _template_payload(obj) -> dict[str, Any]:
    company = getattr(obj, "company", None)
    return {
        "id": getattr(obj, "pk", None),
        "model": obj.__class__.__name__,
        "app_label": obj._meta.app_label,
        "company": _company_payload(company),
        "code": _text(_safe_get(obj, "code", "template_code", "slug")),
        "name": _text(_safe_get(obj, "name", "name_ar", "name_en", "title", "display_name")),
        "name_ar": _text(_safe_get(obj, "name_ar")),
        "name_en": _text(_safe_get(obj, "name_en")),
        "document_type": _text(_safe_get(obj, "document_type", "type", "module", "scope")),
        "template_type": _text(_safe_get(obj, "template_type", "layout_type", "format")),
        "status": _text(_safe_get(obj, "status", default="ACTIVE"), "ACTIVE"),
        "is_active": bool(_safe_get(obj, "is_active", "active", default=True)),
        "paper_size": _text(_safe_get(obj, "paper_size", "page_size")),
        "orientation": _text(_safe_get(obj, "orientation")),
        "description": _text(_safe_get(obj, "description", "notes")),
        "created_at": _safe_get(obj, "created_at", default=None),
        "updated_at": _safe_get(obj, "updated_at", default=None),
    }
def _print_job_payload(obj) -> dict[str, Any]:
    company = getattr(obj, "company", None)
    return {
        "id": getattr(obj, "pk", None),
        "model": obj.__class__.__name__,
        "app_label": obj._meta.app_label,
        "company": _company_payload(company),
        "code": _text(_safe_get(obj, "code", "job_code", "reference")),
        "name": _text(_safe_get(obj, "name", "title", "document_type", "template_type")),
        "document_type": _text(_safe_get(obj, "document_type", "type", "module", "scope")),
        "status": _text(_safe_get(obj, "status", "print_status", default="pending"), "pending"),
        "printer_name": _text(_safe_get(obj, "printer_name", "printer", "device_name")),
        "copies": _safe_get(obj, "copies", default=1),
        "payload": _safe_get(obj, "payload", "metadata", "snapshot", default={}) or {},
        "created_at": _safe_get(obj, "created_at", default=None),
        "updated_at": _safe_get(obj, "updated_at", default=None),
    }
def _route_payload(path: str) -> dict[str, Any]:
    try:
        match = resolve(path)
        return {
            "path": path,
            "available": True,
            "url_name": _text(match.url_name),
            "view": _text(getattr(match.func, "__name__", str(match.func))),
        }
    except Exception as exc:
        return {
            "path": path,
            "available": False,
            "url_name": "",
            "view": "",
            "error": exc.__class__.__name__,
        }
def _routes_payload() -> dict[str, Any]:
    company_routes = [_route_payload(path) for path in COMPANY_DOCUMENT_ROUTES]
    system_routes = [_route_payload(path) for path in SYSTEM_DOCUMENT_ROUTES]
    return {
        "company_routes": company_routes,
        "system_routes": system_routes,
        "company_available_count": sum(1 for route in company_routes if route["available"]),
        "system_available_count": sum(1 for route in system_routes if route["available"]),
    }
def _count_models(models) -> int:
    return sum(model.objects.count() for model in models)
def _distinct_companies(models) -> int:
    company_ids = set()
    for model in models:
        if not _has_field(model, "company"):
            continue
        company_ids.update(
            model.objects.exclude(company_id__isnull=True).values_list("company_id", flat=True).distinct()
        )
    return len(company_ids)
def _status_distribution(models) -> list[dict[str, Any]]:
    distribution: dict[str, int] = {}
    for model in models:
        if not _has_field(model, "status"):
            continue
        for row in model.objects.values("status").annotate(count=Count("id")):
            key = _text(row.get("status"), "unknown")
            distribution[key] = distribution.get(key, 0) + int(row.get("count") or 0)
    return [
        {"value": value, "count": count}
        for value, count in sorted(distribution.items(), key=lambda item: (-item[1], item[0]))
    ]
def _summary_payload() -> dict[str, Any]:
    document_models = _document_models()
    template_models = _template_models()
    print_job_models = _print_job_models()
    rendering_models = _rendering_models()
    routes = _routes_payload()
    return {
        "document_models_count": len(document_models),
        "document_records_count": _count_models(document_models),
        "template_models_count": len(template_models),
        "template_records_count": _count_models(template_models),
        "rendering_models_count": len(rendering_models),
        "rendering_records_count": _count_models(rendering_models),
        "print_job_models_count": len(print_job_models),
        "print_jobs_count": _count_models(print_job_models),
        "companies_with_templates": _distinct_companies(template_models),
        "companies_with_print_jobs": _distinct_companies(print_job_models),
        "company_routes_available_count": routes["company_available_count"],
        "system_routes_available_count": routes["system_available_count"],
        "template_status_distribution": _status_distribution(template_models),
        "print_job_status_distribution": _status_distribution(print_job_models),
    }
def _latest_templates(request, maximum: int = 15) -> list[dict[str, Any]]:
    results = []
    for model in _template_models():
        queryset = _apply_search(_queryset_for_model(model), request)
        for item in queryset[:maximum]:
            results.append(_template_payload(item))
    return sorted(
        results,
        key=lambda item: _text(item.get("updated_at") or item.get("created_at")),
        reverse=True,
    )[:maximum]
def _latest_print_jobs(request, maximum: int = 15) -> list[dict[str, Any]]:
    results = []
    for model in _print_job_models():
        queryset = _apply_search(_queryset_for_model(model), request)
        for item in queryset[:maximum]:
            results.append(_print_job_payload(item))
    return sorted(
        results,
        key=lambda item: _text(item.get("updated_at") or item.get("created_at")),
        reverse=True,
    )[:maximum]
def _all_templates(request):
    results = []
    for model in _template_models():
        queryset = _apply_search(_queryset_for_model(model), request)
        page_items, total, limit, offset = _paginate(queryset, request)
        results.extend(_template_payload(item) for item in page_items)
    return results
def _all_print_jobs(request):
    results = []
    for model in _print_job_models():
        queryset = _apply_search(_queryset_for_model(model), request)
        page_items, total, limit, offset = _paginate(queryset, request)
        results.extend(_print_job_payload(item) for item in page_items)
    return results
def _capabilities_payload() -> list[dict[str, Any]]:
    return [
        {
            "key": "templates",
            "title": "Document templates",
            "description": "Company document template registry used by invoices, orders, receipts, and reports.",
            "system_path": "/api/system/documents/templates/",
            "company_path": "/api/company/documents/templates/",
            "category": "configuration",
        },
        {
            "key": "rendering",
            "title": "Document rendering",
            "description": "HTML/render payload foundation for business documents.",
            "system_path": "/api/system/documents/rendering/",
            "company_path": "/api/company/documents/render/",
            "category": "rendering",
        },
        {
            "key": "web_print",
            "title": "Web print",
            "description": "Browser based printable documents.",
            "system_path": "/api/system/documents/rendering/",
            "company_path": "/api/company/documents/web-print/",
            "category": "print",
        },
        {
            "key": "pdf",
            "title": "PDF export",
            "description": "PDF document output endpoint.",
            "system_path": "/api/system/documents/rendering/",
            "company_path": "/api/company/documents/pdf/",
            "category": "pdf",
        },
        {
            "key": "thermal",
            "title": "Thermal print",
            "description": "Thermal receipt payloads and printer options.",
            "system_path": "/api/system/documents/thermal/",
            "company_path": "/api/company/documents/thermal/",
            "category": "thermal",
        },
        {
            "key": "print_jobs",
            "title": "Print jobs",
            "description": "Print jobs and print options foundation.",
            "system_path": "/api/system/documents/print-jobs/",
            "company_path": "/api/company/documents/print-jobs/",
            "category": "queue",
        },
    ]
@require_GET
def system_documents_overview(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    templates = _latest_templates(request)
    print_jobs = _latest_print_jobs(request)
    models = [_model_payload(model) for model in _document_models()]
    routes = _routes_payload()
    data = {
        "summary": _summary_payload(),
        "models": models,
        "latest_templates": templates,
        "latest_print_jobs": print_jobs,
        "routes": routes,
        "capabilities": _capabilities_payload(),
    }
    return _json_response(
        {
            "success": True,
            "message": "System documents overview loaded.",
            "data": data,
            "results": templates,
            "count": len(templates),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_document_templates(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    results = _all_templates(request)
    data = {
        "summary": _summary_payload(),
        "results": results,
        "models": [_model_payload(model) for model in _template_models()],
        "routes": _routes_payload(),
    }
    return _json_response(
        {
            "success": True,
            "message": "System document templates loaded.",
            "data": data,
            "results": results,
            "count": len(results),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_document_rendering(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    routes = _routes_payload()
    rendering_routes = [
        route
        for route in routes["company_routes"]
        if route["path"].endswith("/render/")
        or route["path"].endswith("/web-print/")
        or route["path"].endswith("/pdf/")
    ]
    capabilities = [
        item
        for item in _capabilities_payload()
        if item["key"] in {"rendering", "web_print", "pdf"}
    ]
    data = {
        "summary": _summary_payload(),
        "models": [_model_payload(model) for model in _rendering_models()],
        "routes": rendering_routes,
        "capabilities": capabilities,
    }
    return _json_response(
        {
            "success": True,
            "message": "System document rendering capabilities loaded.",
            "data": data,
            "results": capabilities,
            "count": len(capabilities),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_document_thermal(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    routes = _routes_payload()
    thermal_routes = [
        route
        for route in routes["company_routes"]
        if route["path"].endswith("/thermal/") or route["path"].endswith("/print-jobs/")
    ]
    print_jobs = _latest_print_jobs(request)
    capabilities = [
        item
        for item in _capabilities_payload()
        if item["key"] in {"thermal", "print_jobs"}
    ]
    data = {
        "summary": _summary_payload(),
        "models": [_model_payload(model) for model in _print_job_models()],
        "routes": thermal_routes,
        "latest_print_jobs": print_jobs,
        "capabilities": capabilities,
    }
    return _json_response(
        {
            "success": True,
            "message": "System document thermal capabilities loaded.",
            "data": data,
            "results": print_jobs or capabilities,
            "count": len(print_jobs or capabilities),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_document_settings(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    settings = {
        "read_only": True,
        "company_scoped_runtime": True,
        "system_monitoring": True,
        "supported_outputs": ["render", "web_print", "pdf", "thermal", "print_jobs"],
        "frontend_pages": [
            "/system/documents",
            "/system/documents/templates",
            "/system/documents/rendering",
            "/system/documents/thermal",
            "/system/documents/settings",
        ],
        "tenant_isolation": "Company document rendering remains company-scoped. System API exposes read-only monitoring metadata.",
    }
    data = {
        "summary": _summary_payload(),
        "settings": settings,
        "routes": _routes_payload(),
        "capabilities": _capabilities_payload(),
    }
    return _json_response(
        {
            "success": True,
            "message": "System document settings loaded.",
            "data": data,
            "results": _capabilities_payload(),
            "count": len(_capabilities_payload()),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )
@require_GET
def system_document_print_jobs(request):
    permission_error = _permission_response(request)
    if permission_error:
        return permission_error
    results = _all_print_jobs(request)
    data = {
        "summary": _summary_payload(),
        "results": results,
        "models": [_model_payload(model) for model in _print_job_models()],
        "routes": _routes_payload(),
    }
    return _json_response(
        {
            "success": True,
            "message": "System document print jobs loaded.",
            "data": data,
            "results": results,
            "count": len(results),
            "meta": {"safe_mode": True, "read_only": True},
        }
    )