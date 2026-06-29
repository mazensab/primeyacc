from __future__ import annotations
"""Mhamcloud System Permissions API."""
import re
from pathlib import Path
from typing import Any
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from api.permissions import COMPANY_PERMISSION_ALL, SYSTEM_PERMISSION_ALL, IsSystemUser
PERMISSION_PATTERN = re.compile(
    r"(?P<quote>[\"'])(?P<code>(?:system|company)\.[a-zA-Z0-9_.:-]+)(?P=quote)"
)
SCAN_FOLDERS = ("api", "users", "companies")
def _base_dir() -> Path:
    return Path(settings.BASE_DIR)
def _humanize_code(code: str) -> str:
    tail = code.split(".")[-1] if code else "permission"
    return tail.replace("_", " ").replace("-", " ").title()
def _group_from_code(code: str) -> str:
    parts = code.split(".")
    if len(parts) >= 2:
        return parts[1]
    return "general"
def _scope_all_code(scope: str) -> str:
    return SYSTEM_PERMISSION_ALL if scope == "system" else COMPANY_PERMISSION_ALL
def _read_text(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1256", "latin-1"):
        try:
            return path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
        except OSError:
            return ""
    return ""
def _collect_permission_codes(scope: str) -> list[str]:
    prefix = f"{scope}."
    codes: set[str] = {_scope_all_code(scope)}
    root = _base_dir()
    for folder in SCAN_FOLDERS:
        base = root / folder
        if not base.exists():
            continue
        for path in base.rglob("*.py"):
            if "__pycache__" in path.parts or "migrations" in path.parts:
                continue
            text = _read_text(path)
            if not text:
                continue
            for match in PERMISSION_PATTERN.finditer(text):
                code = match.group("code").strip()
                if code.startswith(prefix):
                    codes.add(code)
    return sorted(codes)
def _permission_payload(scope: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for code in _collect_permission_codes(scope):
        group = _group_from_code(code)
        is_all = code == _scope_all_code(scope)
        label = "All Permissions" if is_all else _humanize_code(code)
        rows.append(
            {
                "code": code,
                "scope": scope,
                "group": "all" if is_all else group,
                "name": label,
                "name_ar": label,
                "description": f"{scope.title()} permission: {code}",
                "is_all": is_all,
            }
        )
    return rows
def _group_payload(scope: str) -> list[dict[str, Any]]:
    permissions = _permission_payload(scope)
    groups: dict[str, dict[str, Any]] = {}
    for permission in permissions:
        group = str(permission["group"])
        if group not in groups:
            groups[group] = {
                "scope": scope,
                "group": group,
                "name": _humanize_code(group),
                "name_ar": _humanize_code(group),
                "permission_count": 0,
                "permissions": [],
            }
        groups[group]["permission_count"] += 1
        groups[group]["permissions"].append(permission)
    return sorted(groups.values(), key=lambda item: str(item["group"]))
def _catalog_response() -> dict[str, Any]:
    system_permissions = _permission_payload("system")
    company_permissions = _permission_payload("company")
    system_groups = _group_payload("system")
    company_groups = _group_payload("company")
    return {
        "system_permissions": system_permissions,
        "company_permissions": company_permissions,
        "system_groups": system_groups,
        "company_groups": company_groups,
        "counts": {
            "system_permissions": len(system_permissions),
            "company_permissions": len(company_permissions),
            "system_groups": len(system_groups),
            "company_groups": len(company_groups),
            "total_permissions": len(system_permissions) + len(company_permissions),
        },
    }
@api_view(["GET"])
@permission_classes([IsSystemUser])
def system_permissions_overview(request):
    return Response({"success": True, "data": _catalog_response()})
@api_view(["GET"])
@permission_classes([IsSystemUser])
def system_permissions_list(request):
    scope = request.query_params.get("scope", "system").strip().lower()
    if scope not in {"system", "company"}:
        scope = "system"
    permissions = _permission_payload(scope)
    return Response(
        {
            "success": True,
            "data": permissions,
            "count": len(permissions),
            "scope": scope,
        }
    )
@api_view(["GET"])
@permission_classes([IsSystemUser])
def system_permissions_groups(request):
    scope = request.query_params.get("scope", "system").strip().lower()
    if scope not in {"system", "company"}:
        scope = "system"
    groups = _group_payload(scope)
    return Response(
        {
            "success": True,
            "data": groups,
            "count": len(groups),
            "scope": scope,
        }
    )
