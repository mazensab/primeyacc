from __future__ import annotations

import json
from typing import Any

from django.contrib.auth.decorators import login_required
from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from api.permissions import user_has_system_permission
from integrations.mham_legacy.management import (
    companies_payload,
    integration_status as status_payload,
    public_settings,
    read_runs,
    record_connection_failure,
    safe_error,
    save_credentials,
    start_background_sync,
    test_connection as test_connection_service,
    update_settings,
)

READ_PERMISSIONS = ("system.integrations.view", "system.dashboard.view")
WRITE_PERMISSIONS = ("system.settings",)


def allowed(user, permissions):
    return bool(user and getattr(user, "is_authenticated", False) and any(user_has_system_permission(user, p) for p in permissions))


def forbidden(write=False):
    return JsonResponse(
        {
            "ok": False,
            "message": "You do not have permission to manage MhamCloud integration." if write else "You do not have permission to view MhamCloud integration.",
            "code": "SYSTEM_MHAMCLOUD_PERMISSION_REQUIRED",
        },
        status=403,
    )


def body(request: HttpRequest) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        value = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


@login_required
@require_GET
def integration_status(request):
    if not allowed(request.user, READ_PERMISSIONS):
        return forbidden()
    return JsonResponse({"ok": True, "data": status_payload()})


@login_required
@csrf_protect
@require_http_methods(["GET", "PATCH", "POST"])
def integration_settings(request):
    if request.method == "GET":
        if not allowed(request.user, READ_PERMISSIONS):
            return forbidden()
        return JsonResponse({"ok": True, "data": public_settings()})

    if not allowed(request.user, WRITE_PERMISSIONS):
        return forbidden(True)

    data = body(request)
    try:
        update_settings(data)
        if any(key in data for key in ("client_id", "client_secret", "username", "password")):
            save_credentials(data)
    except Exception as exc:
        return JsonResponse({"ok": False, "message": safe_error(f"{type(exc).__name__}: {exc}"), "code": type(exc).__name__}, status=400)
    return JsonResponse({"ok": True, "data": public_settings()})


@login_required
@csrf_protect
@require_POST
def test_connection(request):
    if not allowed(request.user, WRITE_PERMISSIONS):
        return forbidden(True)
    try:
        data = test_connection_service()
        return JsonResponse({"ok": True, "data": data})
    except Exception as exc:
        data = record_connection_failure(exc)
        return JsonResponse({"ok": False, "data": data, "message": data["message"]}, status=400)


def filtered_company_data(request):
    rows = companies_payload()
    q = str(request.GET.get("search", "") or "").strip().lower()
    status = str(request.GET.get("status", "") or "").strip().upper()
    if q:
        rows = [
            x for x in rows
            if q in " ".join(
                [
                    str(x.get("company_name", "")),
                    str(x.get("business_id", "")),
                    str(x.get("company_id", "")),
                    str(x.get("company_code", "")),
                    str(x.get("safe_error_message", "")),
                ]
            ).lower()
        ]
    if status:
        rows = [x for x in rows if x.get("status") == status]
    sort = str(request.GET.get("sort", "name") or "name")
    if sort == "business_id":
        rows.sort(key=lambda x: int(x["business_id"]) if str(x["business_id"]).isdigit() else 10**18)
    elif sort == "status":
        rows.sort(key=lambda x: (x.get("status", ""), x.get("company_name", "")))
    else:
        rows.sort(key=lambda x: (x.get("company_name", ""), x.get("business_id", "")))
    try:
        page = max(int(request.GET.get("page", 1)), 1)
        page_size = min(max(int(request.GET.get("page_size", 50)), 1), 200)
    except (TypeError, ValueError):
        page, page_size = 1, 50
    total = len(rows)
    start = (page - 1) * page_size
    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "pages": max((total + page_size - 1) // page_size, 1),
        "results": rows[start : start + page_size],
    }


@login_required
@require_GET
def companies_list(request):
    if not allowed(request.user, READ_PERMISSIONS):
        return forbidden()
    return JsonResponse({"ok": True, "data": filtered_company_data(request)})


@login_required
@require_GET
def company_detail(request, business_id):
    if not allowed(request.user, READ_PERMISSIONS):
        return forbidden()
    row = next((x for x in companies_payload() if x["business_id"] == str(business_id)), None)
    if row is None:
        return JsonResponse({"ok": False, "message": "MhamCloud company was not found."}, status=404)
    return JsonResponse({"ok": True, "data": row})


@login_required
@csrf_protect
@require_POST
def company_retry(request, business_id):
    if not allowed(request.user, WRITE_PERMISSIONS):
        return forbidden(True)
    if not any(x["business_id"] == str(business_id) for x in companies_payload()):
        return JsonResponse({"ok": False, "message": "MhamCloud company was not found."}, status=404)
    try:
        run = start_background_sync(trigger="RETRY", business_ids=[str(business_id)])
    except Exception as exc:
        return JsonResponse({"ok": False, "message": safe_error(exc)}, status=409)
    return JsonResponse({"ok": True, "data": {"run": run}}, status=202)


@login_required
@require_GET
def runs_list(request):
    if not allowed(request.user, READ_PERMISSIONS):
        return forbidden()
    rows = list(reversed(read_runs()))
    status = str(request.GET.get("status", "") or "").strip().upper()
    if status:
        rows = [x for x in rows if str(x.get("status", "")).upper() == status]
    try:
        page = max(int(request.GET.get("page", 1)), 1)
        page_size = min(max(int(request.GET.get("page_size", 50)), 1), 200)
    except (TypeError, ValueError):
        page, page_size = 1, 50
    total = len(rows)
    start = (page - 1) * page_size
    return JsonResponse(
        {
            "ok": True,
            "data": {
                "count": total,
                "page": page,
                "page_size": page_size,
                "pages": max((total + page_size - 1) // page_size, 1),
                "results": rows[start : start + page_size],
            },
        }
    )


@login_required
@csrf_protect
@require_POST
def run_sync_now(request):
    if not allowed(request.user, WRITE_PERMISSIONS):
        return forbidden(True)
    try:
        run = start_background_sync(trigger="MANUAL", all_eligible=True)
    except Exception as exc:
        return JsonResponse({"ok": False, "message": safe_error(exc)}, status=409)
    return JsonResponse({"ok": True, "data": {"run": run}}, status=202)
