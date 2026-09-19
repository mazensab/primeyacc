# ============================================================
# ًں“‚ api/company/activity_backends/views.py
# ًں§  Mhamcloud | Company Activity Backends APIs â€” Phase 25.3
# ============================================================
# âœ… Company-scoped APIs for restaurant, clinic and project foundations
# âœ… Lightweight JsonResponse views
# âœ… No dashboard duplication
# ============================================================
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - company scope ظ…ط·ظ„ظˆط¨ ط¯ط§ط¦ظ…ط§.
# - ظ‡ط°ظ‡ endpoints ظ„ظ„ظ†ط´ط§ط·ط§طھ ط§ظ„ظ…طھط®طµطµط© ظپظ‚ط·.
# - ظ„ط§ ظ†ظƒط±ط± ظ…ظ†ط·ظ‚ core apps ظ‡ظ†ط§.
# ============================================================

from __future__ import annotations

import json

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from api.permissions import attach_company_context, request_has_workspace_module

from activity_backends.models import (
    Project,
    ProjectCostLine,
    ProjectWorkOrder,
    RestaurantKitchenOrder,
    RestaurantMenuCategory,
    RestaurantMenuItem,
    RestaurantTable,
)
from activity_backends.services import (
    activity_backends_summary,
    create_project,
    create_project_cost_line,
    create_project_work_order,
    create_restaurant_category,
    create_restaurant_kitchen_order,
    create_restaurant_menu_item,
    create_restaurant_table,
    project_cost_line_payload,
    project_payload,
    project_work_order_payload,
    restaurant_category_payload,
    restaurant_kitchen_order_payload,
    restaurant_menu_item_payload,
    restaurant_table_payload,
    seed_activity_backends_foundation,
)


def _json_error(message, status=400, details=None):
    payload = {"ok": False, "error": message}
    if details is not None:
        payload["details"] = details
    return JsonResponse(payload, status=status)


def _request_data(request):
    if request.body:
        try:
            return json.loads(request.body.decode("utf-8"))
        except json.JSONDecodeError:
            return {}
    return request.POST.dict()


def _require_company(request):
    membership=attach_company_context(request)
    if membership is None or not membership.is_active_membership:
        return None,_json_error("Active company membership is required.",status=403)
    return membership.company,None

def _require_activity_module(request,module):
    if not request_has_workspace_module(request,module):
        return _json_error("Workspace module is not entitled for the current activity and subscription.",status=403,details={"code":"WORKSPACE_MODULE_NOT_ENTITLED","module":module})
    return None


@require_http_methods(["GET"])
def summary_view(request):
    company, error = _require_company(request)
    if error:
        return error
    return JsonResponse({"ok": True, "summary": activity_backends_summary(company)})


@require_http_methods(["POST"])
def seed_view(request):
    company, error = _require_company(request)
    if error:
        return error
    try:
        result = seed_activity_backends_foundation(company)
    except Exception as exc:
        return _json_error("Unable to seed activity backends.", details=str(exc))
    return JsonResponse({"ok": True, "result": result})


@require_http_methods(["GET", "POST"])
def restaurant_categories_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "restaurant")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_restaurant_category(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create restaurant category.", details=str(exc))
        return JsonResponse({"ok": True, "category": restaurant_category_payload(obj)}, status=201)
    qs = RestaurantMenuCategory.objects.filter(company=company).order_by("sort_order", "name", "id")
    return JsonResponse({"ok": True, "results": [restaurant_category_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def restaurant_menu_items_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "restaurant")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_restaurant_menu_item(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create restaurant menu item.", details=str(exc))
        return JsonResponse({"ok": True, "menu_item": restaurant_menu_item_payload(obj)}, status=201)
    qs = RestaurantMenuItem.objects.filter(company=company).select_related("category").order_by("sort_order", "name", "id")
    return JsonResponse({"ok": True, "results": [restaurant_menu_item_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def restaurant_tables_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "restaurant")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_restaurant_table(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create restaurant table.", details=str(exc))
        return JsonResponse({"ok": True, "table": restaurant_table_payload(obj)}, status=201)
    qs = RestaurantTable.objects.filter(company=company).order_by("area", "code", "id")
    return JsonResponse({"ok": True, "results": [restaurant_table_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def restaurant_kitchen_orders_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "restaurant")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_restaurant_kitchen_order(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create kitchen order.", details=str(exc))
        return JsonResponse({"ok": True, "kitchen_order": restaurant_kitchen_order_payload(obj, include_items=True)}, status=201)
    qs = RestaurantKitchenOrder.objects.filter(company=company).select_related("table").order_by("-order_date", "-id")[:200]
    return JsonResponse({"ok": True, "results": [restaurant_kitchen_order_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def projects_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "contracting")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_project(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create project.", details=str(exc))
        return JsonResponse({"ok": True, "project": project_payload(obj)}, status=201)
    qs = Project.objects.filter(company=company).order_by("-start_date", "-id")
    return JsonResponse({"ok": True, "results": [project_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def project_work_orders_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "contracting")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_project_work_order(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create project work order.", details=str(exc))
        return JsonResponse({"ok": True, "work_order": project_work_order_payload(obj)}, status=201)
    qs = ProjectWorkOrder.objects.filter(company=company).select_related("project").order_by("-id")[:200]
    return JsonResponse({"ok": True, "results": [project_work_order_payload(obj) for obj in qs]})


@require_http_methods(["GET", "POST"])
def project_cost_lines_view(request):
    company, error = _require_company(request)
    if error:
        return error
    entitlement_error = _require_activity_module(request, "contracting")
    if entitlement_error:
        return entitlement_error
    if request.method == "POST":
        try:
            obj = create_project_cost_line(company=company, data=_request_data(request))
        except Exception as exc:
            return _json_error("Unable to create project cost line.", details=str(exc))
        return JsonResponse({"ok": True, "cost_line": project_cost_line_payload(obj)}, status=201)
    qs = ProjectCostLine.objects.filter(company=company).select_related("project", "work_order").order_by("-cost_date", "-id")[:200]
    return JsonResponse({"ok": True, "results": [project_cost_line_payload(obj) for obj in qs]})
