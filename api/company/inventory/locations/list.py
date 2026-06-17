# ============================================================
# 📂 api/company/inventory/locations/list.py
# 🧠 PrimeyAcc | Company Inventory Locations List API V1.0
# ------------------------------------------------------------
# ✅ List inventory locations for current company only
# ✅ Tenant isolation through request.company
# ✅ Search and advanced location filters
# ✅ Warehouse / parent / type / status filters
# ✅ Operational-purpose filters
# ✅ Safe sorting and pagination
# ✅ Annotated children count
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - جميع النتائج يجب أن تتبع الشركة الحالية
# - صلاحية العرض: company.inventory.locations.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.locations.serializers import (
    serialize_inventory_location,
)
from api.permissions import HasAnyCompanyPermission
from inventory.models import (
    InventoryLocation,
    InventoryLocationStatus,
    InventoryLocationType,
)


class InventoryLocationsListAPIError(Exception):
    """
    Small API-level error for the inventory locations list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise InventoryLocationsListAPIError(
            "Current company context was not resolved."
        )

    return company


def _clean_positive_int(
    value: Any,
    default: int,
    maximum: int | None = None,
) -> int:
    """
    Safely parse positive integer query parameters.
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
    Normalize optional query text.
    """
    return str(value or "").strip()


def _boolean_filter_value(value: Any) -> bool | None:
    """
    Resolve common query boolean representations.

    Returns:
        True, False, or None when no valid boolean was provided.
    """
    normalized = _clean_text(value).lower()

    if normalized in {"1", "true", "yes", "y", "on"}:
        return True

    if normalized in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _apply_inventory_location_filters(queryset, request: Request):
    """
    Apply safe company-scoped inventory location filters.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
    )
    warehouse_id = _clean_text(
        request.query_params.get("warehouse_id")
        or request.query_params.get("warehouse")
    )
    parent_id = _clean_text(
        request.query_params.get("parent_id")
        or request.query_params.get("parent")
    )
    status = _clean_text(
        request.query_params.get("status")
    ).upper()
    location_type = _clean_text(
        request.query_params.get("location_type")
        or request.query_params.get("type")
    ).upper()

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(barcode__icontains=search)
            | Q(notes__icontains=search)
            | Q(warehouse__code__icontains=search)
            | Q(warehouse__name__icontains=search)
            | Q(warehouse__name_ar__icontains=search)
            | Q(warehouse__name_en__icontains=search)
            | Q(parent__code__icontains=search)
            | Q(parent__name__icontains=search)
            | Q(parent__name_ar__icontains=search)
            | Q(parent__name_en__icontains=search)
        )

    if warehouse_id:
        queryset = queryset.filter(warehouse_id=warehouse_id)

    if parent_id:
        if parent_id.lower() in {"none", "null", "root"}:
            queryset = queryset.filter(parent__isnull=True)
        else:
            queryset = queryset.filter(parent_id=parent_id)

    if status:
        queryset = queryset.filter(status=status)

    if location_type:
        queryset = queryset.filter(location_type=location_type)

    boolean_filters = {
        "is_default": "is_default",
        "is_receiving": "is_receiving",
        "is_shipping": "is_shipping",
        "is_adjustment": "is_adjustment",
        "is_pickable": "is_pickable",
        "is_active": "is_active",
    }

    for query_key, model_field in boolean_filters.items():
        resolved_value = _boolean_filter_value(
            request.query_params.get(query_key)
        )

        if resolved_value is not None:
            queryset = queryset.filter(
                **{model_field: resolved_value}
            )

    root_only = _boolean_filter_value(
        request.query_params.get("root_only")
    )

    if root_only is True:
        queryset = queryset.filter(parent__isnull=True)

    has_children = _boolean_filter_value(
        request.query_params.get("has_children")
    )

    if has_children is True:
        queryset = queryset.filter(children_count__gt=0)

    if has_children is False:
        queryset = queryset.filter(children_count=0)

    return queryset


def _apply_inventory_location_ordering(queryset, ordering: str):
    """
    Apply safe ordering without exposing arbitrary model fields.
    """
    allowed_ordering = {
        "code": "code",
        "-code": "-code",
        "name": "name",
        "-name": "-name",
        "sequence": "sequence",
        "-sequence": "-sequence",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
        "location_type": "location_type",
        "-location_type": "-location_type",
        "status": "status",
        "-status": "-status",
        "warehouse": "warehouse__name",
        "-warehouse": "-warehouse__name",
        "children_count": "children_count",
        "-children_count": "-children_count",
    }

    selected_ordering = allowed_ordering.get(
        ordering,
        "sequence",
    )

    if selected_ordering == "sequence":
        return queryset.order_by(
            "warehouse__name",
            "sequence",
            "code",
            "id",
        )

    return queryset.order_by(
        selected_ordering,
        "warehouse_id",
        "sequence",
        "code",
        "id",
    )


def serialize_inventory_location_choices() -> dict[str, Any]:
    """
    Return choices used by filters and forms.
    """
    return {
        "statuses": [
            {
                "value": value,
                "label": label,
            }
            for value, label in InventoryLocationStatus.choices
        ],
        "location_types": [
            {
                "value": value,
                "label": label,
            }
            for value, label in InventoryLocationType.choices
        ],
        "ordering": [
            {"value": "sequence", "label": "Sequence ascending"},
            {"value": "-sequence", "label": "Sequence descending"},
            {"value": "code", "label": "Code A-Z"},
            {"value": "-code", "label": "Code Z-A"},
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "warehouse", "label": "Warehouse A-Z"},
            {"value": "-warehouse", "label": "Warehouse Z-A"},
            {"value": "location_type", "label": "Type A-Z"},
            {"value": "-location_type", "label": "Type Z-A"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
            {"value": "-children_count", "label": "Most children"},
            {"value": "children_count", "label": "Least children"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
        ],
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def inventory_locations_list(request: Request) -> Response:
    """
    List inventory locations for the current company only.
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
            or "sequence"
        )

        queryset = (
            InventoryLocation.objects.filter(company=company)
            .select_related(
                "company",
                "warehouse",
                "warehouse__branch",
                "parent",
                "created_by",
                "updated_by",
            )
            .annotate(
                children_count=Count(
                    "children",
                    distinct=True,
                )
            )
        )

        queryset = _apply_inventory_location_filters(
            queryset,
            request,
        )
        queryset = _apply_inventory_location_ordering(
            queryset,
            ordering,
        )

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(
                paginator.num_pages or 1
            )

        locations = [
            serialize_inventory_location(
                location,
                include_children_count=True,
            )
            for location in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Inventory locations loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "warehouse_id": request.query_params.get(
                        "warehouse_id"
                    )
                    or request.query_params.get("warehouse")
                    or "",
                    "parent_id": request.query_params.get("parent_id")
                    or request.query_params.get("parent")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "location_type": request.query_params.get(
                        "location_type"
                    )
                    or request.query_params.get("type")
                    or "",
                    "is_default": request.query_params.get(
                        "is_default"
                    )
                    or "",
                    "is_receiving": request.query_params.get(
                        "is_receiving"
                    )
                    or "",
                    "is_shipping": request.query_params.get(
                        "is_shipping"
                    )
                    or "",
                    "is_adjustment": request.query_params.get(
                        "is_adjustment"
                    )
                    or "",
                    "is_pickable": request.query_params.get(
                        "is_pickable"
                    )
                    or "",
                    "is_active": request.query_params.get("is_active")
                    or "",
                    "root_only": request.query_params.get("root_only")
                    or "",
                    "has_children": request.query_params.get(
                        "has_children"
                    )
                    or "",
                    "ordering": ordering,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": locations,
                "results": locations,
                "choices": serialize_inventory_location_choices(),
            },
            status=200,
        )

    except InventoryLocationsListAPIError as exc:
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


inventory_locations_list.required_company_permissions = [
    "company.inventory.locations.view",
]
