# ============================================================
# 📂 api/company/inventory/warehouses/list.py
# 🧠 PrimeyAcc | Company Warehouses List API V1.0
# ------------------------------------------------------------
# ✅ List warehouses for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, status, type, branch and city filters
# ✅ Sorting and pagination
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - صلاحية العرض المطلوبة: company.inventory.warehouses.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.warehouses.serializers import serialize_warehouse
from api.permissions import HasAnyCompanyPermission
from inventory.models import Warehouse, WarehouseStatus, WarehouseType


class WarehouseListAPIError(Exception):
    """
    Small API-level error for warehouse list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise WarehouseListAPIError("Current company context was not resolved.")

    return company


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _clean_text(value: Any) -> str:
    """
    Normalize query text.
    """
    return str(value or "").strip()


def _apply_warehouse_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to warehouse queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_text(request.query_params.get("status") or "").upper()
    warehouse_type = _clean_text(
        request.query_params.get("warehouse_type")
        or request.query_params.get("type")
        or ""
    ).upper()
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    city = _clean_text(request.query_params.get("city") or "")
    is_default = _clean_text(request.query_params.get("is_default") or "")
    is_active = _clean_text(request.query_params.get("is_active") or "")

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__name_ar__icontains=search)
            | Q(branch__name_en__icontains=search)
            | Q(branch__branch_code__icontains=search)
            | Q(manager_name__icontains=search)
            | Q(phone__icontains=search)
            | Q(email__icontains=search)
            | Q(city__icontains=search)
            | Q(district__icontains=search)
            | Q(notes__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if warehouse_type:
        queryset = queryset.filter(warehouse_type=warehouse_type)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    if city:
        queryset = queryset.filter(city__icontains=city)

    if is_default in ["1", "true", "True", "yes", "YES"]:
        queryset = queryset.filter(is_default=True)

    if is_default in ["0", "false", "False", "no", "NO"]:
        queryset = queryset.filter(is_default=False)

    if is_active in ["1", "true", "True", "yes", "YES"]:
        queryset = queryset.filter(is_active=True)

    if is_active in ["0", "false", "False", "no", "NO"]:
        queryset = queryset.filter(is_active=False)

    return queryset


def _apply_warehouse_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "name": "name",
        "-name": "-name",
        "code": "code",
        "-code": "-code",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "status": "status",
        "-status": "-status",
        "warehouse_type": "warehouse_type",
        "-warehouse_type": "-warehouse_type",
        "city": "city",
        "-city": "-city",
    }

    selected_ordering = allowed_ordering.get(ordering, "name")

    if selected_ordering == "name":
        return queryset.order_by("-is_default", "name", "id")

    return queryset.order_by(selected_ordering, "-id")


def serialize_warehouse_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in WarehouseStatus.choices
        ],
        "types": [
            {"value": value, "label": label}
            for value, label in WarehouseType.choices
        ],
        "ordering": [
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "code", "label": "Code A-Z"},
            {"value": "-code", "label": "Code Z-A"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
            {"value": "warehouse_type", "label": "Type A-Z"},
            {"value": "-warehouse_type", "label": "Type Z-A"},
        ],
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def warehouses_list(request: Request) -> Response:
    """
    List warehouses for the current company only.
    """
    try:
        company = _get_request_company(request)

        page = _clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = _clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get("per_page"),
            default=25,
            maximum=100,
        )

        ordering = _clean_text(
            request.query_params.get("ordering")
            or request.query_params.get("order_by")
            or "name"
        )

        include_summary = _clean_text(
            request.query_params.get("include_summary")
            or ""
        ) in ["1", "true", "True", "yes", "YES"]

        queryset = (
            Warehouse.objects.select_related(
                "company",
                "branch",
                "created_by",
                "updated_by",
            )
            .filter(company=company)
        )

        queryset = _apply_warehouse_filters(queryset, request)
        queryset = _apply_warehouse_ordering(queryset, ordering)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        warehouses = [
            serialize_warehouse(
                warehouse,
                include_summary=include_summary,
            )
            for warehouse in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Warehouses loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "warehouse_type": request.query_params.get("warehouse_type")
                    or request.query_params.get("type")
                    or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "city": request.query_params.get("city") or "",
                    "is_default": request.query_params.get("is_default") or "",
                    "is_active": request.query_params.get("is_active") or "",
                    "ordering": ordering,
                    "include_summary": include_summary,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": warehouses,
                "results": warehouses,
                "choices": serialize_warehouse_choices(),
            },
            status=200,
        )

    except WarehouseListAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )


warehouses_list.required_company_permissions = [
    "company.inventory.warehouses.view",
]