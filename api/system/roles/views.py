from __future__ import annotations
"""Mhamcloud System Roles API."""
from typing import Any
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from api.permissions import CompanyMembership, IsSystemUser, UserProfile
from api.system.permissions.views import _permission_payload, _scope_all_code
SYSTEM_ROLE_FALLBACKS = (
    ("SUPER_ADMIN", "Super Admin"),
    ("SYSTEM_ADMIN", "System Admin"),
    ("SUPPORT", "Support"),
    ("BILLING_MANAGER", "Billing Manager"),
)
COMPANY_ROLE_FALLBACKS = (
    ("OWNER", "Owner"),
    ("ADMIN", "Admin"),
    ("MANAGER", "Manager"),
    ("ACCOUNTANT", "Accountant"),
    ("CASHIER", "Cashier"),
    ("SALES", "Sales"),
    ("INVENTORY", "Inventory"),
    ("HR", "HR"),
    ("EMPLOYEE", "Employee"),
    ("VIEWER", "Viewer"),
)
def _field_choices(
    model: Any,
    field_name: str,
    fallback: tuple[tuple[str, str], ...],
) -> list[tuple[str, str]]:
    try:
        field = model._meta.get_field(field_name)
        choices = list(getattr(field, "choices", []) or [])
    except Exception:
        choices = []
    normalized: list[tuple[str, str]] = []
    for value, label in choices:
        normalized.append((str(value), str(label)))
    return normalized or list(fallback)
def _safe_count(model: Any, **filters: Any) -> int:
    try:
        return int(model.objects.filter(**filters).count())
    except Exception:
        return 0
def _humanize(value: str) -> str:
    return value.replace("_", " ").replace("-", " ").title()
def _role_permission_codes(role: str, scope: str) -> list[str]:
    role_upper = role.upper()
    catalog = [str(item["code"]) for item in _permission_payload(scope)]
    all_code = _scope_all_code(scope)
    if "SUPER" in role_upper or role_upper in {"OWNER", "ADMIN", "SYSTEM_ADMIN"}:
        return [all_code]
    if "BILLING" in role_upper:
        keywords = ("billing", "subscription", "payment", "plan", "invoice")
    elif "SUPPORT" in role_upper:
        keywords = ("view", "list", "read", "detail", "support")
    elif "ACCOUNTANT" in role_upper:
        keywords = ("accounting", "treasury", "payment", "invoice", "report")
    elif "SALES" in role_upper or "CASHIER" in role_upper:
        keywords = ("sales", "pos", "customer", "payment")
    elif "INVENTORY" in role_upper:
        keywords = ("inventory", "product", "stock", "warehouse")
    elif "HR" in role_upper:
        keywords = ("hr", "employee", "payroll", "attendance")
    elif "MANAGER" in role_upper:
        keywords = ("view", "list", "read", "report", "approve")
    else:
        keywords = ("view", "list", "read")
    selected = [
        code
        for code in catalog
        if any(keyword in code.lower() for keyword in keywords)
    ]
    return selected or [code for code in catalog if code != all_code][:10]
def _system_roles_payload() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for code, label in _field_choices(
        UserProfile,
        "system_role",
        SYSTEM_ROLE_FALLBACKS,
    ):
        permissions = _role_permission_codes(code, "system")
        rows.append(
            {
                "code": code,
                "scope": "system",
                "name": label or _humanize(code),
                "name_ar": label or _humanize(code),
                "user_count": _safe_count(UserProfile, system_role=code),
                "permission_count": len(permissions),
                "permissions": permissions,
                "is_system_role": True,
            }
        )
    return rows
def _company_roles_payload() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for code, label in _field_choices(
        CompanyMembership,
        "role",
        COMPANY_ROLE_FALLBACKS,
    ):
        permissions = _role_permission_codes(code, "company")
        rows.append(
            {
                "code": code,
                "scope": "company",
                "name": label or _humanize(code),
                "name_ar": label or _humanize(code),
                "membership_count": _safe_count(CompanyMembership, role=code),
                "permission_count": len(permissions),
                "permissions": permissions,
                "is_company_role": True,
            }
        )
    return rows
def _roles_response() -> dict[str, Any]:
    system_roles = _system_roles_payload()
    company_roles = _company_roles_payload()
    return {
        "system_roles": system_roles,
        "company_roles": company_roles,
        "counts": {
            "system_roles": len(system_roles),
            "company_roles": len(company_roles),
            "total_roles": len(system_roles) + len(company_roles),
            "system_role_users": sum(
                int(row.get("user_count", 0)) for row in system_roles
            ),
            "company_role_memberships": sum(
                int(row.get("membership_count", 0)) for row in company_roles
            ),
        },
    }
@api_view(["GET"])
@permission_classes([IsSystemUser])
def system_roles_overview(request):
    return Response({"success": True, "data": _roles_response()})
@api_view(["GET"])
@permission_classes([IsSystemUser])
def system_roles_list(request):
    scope = request.query_params.get("scope", "system").strip().lower()
    if scope == "company":
        rows = _company_roles_payload()
    elif scope == "all":
        rows = _system_roles_payload() + _company_roles_payload()
    else:
        scope = "system"
        rows = _system_roles_payload()
    return Response(
        {
            "success": True,
            "data": rows,
            "count": len(rows),
            "scope": scope,
        }
    )
@api_view(["GET"])
@permission_classes([IsSystemUser])
def system_roles_permissions(request):
    system_roles = _system_roles_payload()
    company_roles = _company_roles_payload()
    return Response(
        {
            "success": True,
            "data": {
                "system": system_roles,
                "company": company_roles,
                "matrix": system_roles + company_roles,
            },
            "count": len(system_roles) + len(company_roles),
        }
    )
