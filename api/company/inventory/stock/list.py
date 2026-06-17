# ============================================================
# 📂 api/company/inventory/stock/list.py
# 🧠 PrimeyAcc | Company Stock Items List API V1.1
# ------------------------------------------------------------
# ✅ List stock balances for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, warehouse, location, item, category, below-minimum filters
# ✅ Location-aware ordering and response filters
# ✅ Sorting and pagination
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - صلاحية العرض المطلوبة: company.inventory.stock.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import models
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.stock.serializers import serialize_stock_item
from api.permissions import HasAnyCompanyPermission
from inventory.models import StockItem


class StockItemsListAPIError(Exception):
    """
    Small API-level error for stock items list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockItemsListAPIError("Current company context was not resolved.")

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


def _is_truthy(value: str) -> bool:
    return value in ["1", "true", "True", "yes", "YES"]


def _is_falsey(value: str) -> bool:
    return value in ["0", "false", "False", "no", "NO"]


def _apply_stock_item_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to stock item queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    warehouse_id = _clean_text(request.query_params.get("warehouse_id") or "")
    location_id = _clean_text(request.query_params.get("location_id") or "")
    item_id = _clean_text(request.query_params.get("item_id") or "")
    category_id = _clean_text(request.query_params.get("category_id") or "")
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    below_minimum = _clean_text(request.query_params.get("below_minimum") or "")
    has_quantity = _clean_text(request.query_params.get("has_quantity") or "")

    if search:
        queryset = queryset.filter(
            Q(item__code__icontains=search)
            | Q(item__sku__icontains=search)
            | Q(item__barcode__icontains=search)
            | Q(item__name__icontains=search)
            | Q(item__name_ar__icontains=search)
            | Q(item__name_en__icontains=search)
            | Q(warehouse__code__icontains=search)
            | Q(warehouse__name__icontains=search)
            | Q(warehouse__name_ar__icontains=search)
            | Q(warehouse__name_en__icontains=search)
            | Q(warehouse__branch__name__icontains=search)
            | Q(warehouse__branch__branch_code__icontains=search)
            | Q(location__code__icontains=search)
            | Q(location__name__icontains=search)
            | Q(location__name_ar__icontains=search)
            | Q(location__name_en__icontains=search)
            | Q(location__barcode__icontains=search)
            | Q(notes__icontains=search)
        )

    if warehouse_id:
        queryset = queryset.filter(warehouse_id=warehouse_id)

    if location_id:
        queryset = queryset.filter(location_id=location_id)

    if item_id:
        queryset = queryset.filter(item_id=item_id)

    if category_id:
        queryset = queryset.filter(item__category_id=category_id)

    if branch_id:
        queryset = queryset.filter(warehouse__branch_id=branch_id)

    if _is_truthy(has_quantity):
        queryset = queryset.filter(quantity_on_hand__gt=0)

    if _is_falsey(has_quantity):
        queryset = queryset.filter(quantity_on_hand=0)

    if _is_truthy(below_minimum):
        queryset = queryset.filter(
            minimum_quantity__gt=0,
            quantity_on_hand__lt=models.F("minimum_quantity"),
        )

    return queryset


def _apply_stock_item_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "item": "item__name",
        "-item": "-item__name",
        "warehouse": "warehouse__name",
        "-warehouse": "-warehouse__name",
        "location": "location__name",
        "-location": "-location__name",
        "quantity_on_hand": "quantity_on_hand",
        "-quantity_on_hand": "-quantity_on_hand",
        "available_quantity": "quantity_on_hand",
        "-available_quantity": "-quantity_on_hand",
        "average_cost": "average_cost",
        "-average_cost": "-average_cost",
        "last_movement_at": "last_movement_at",
        "-last_movement_at": "-last_movement_at",
        "created_at": "created_at",
        "-created_at": "-created_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "item__name")

    if selected_ordering == "item__name":
        return queryset.order_by(
            "item__name",
            "warehouse__name",
            "location__name",
            "id",
        )

    return queryset.order_by(selected_ordering, "-id")


def serialize_stock_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "ordering": [
            {"value": "item", "label": "Item A-Z"},
            {"value": "-item", "label": "Item Z-A"},
            {"value": "warehouse", "label": "Warehouse A-Z"},
            {"value": "-warehouse", "label": "Warehouse Z-A"},
            {"value": "location", "label": "Location A-Z"},
            {"value": "-location", "label": "Location Z-A"},
            {"value": "-quantity_on_hand", "label": "Highest quantity"},
            {"value": "quantity_on_hand", "label": "Lowest quantity"},
            {"value": "-average_cost", "label": "Highest average cost"},
            {"value": "average_cost", "label": "Lowest average cost"},
            {"value": "-last_movement_at", "label": "Latest movement"},
            {"value": "last_movement_at", "label": "Oldest movement"},
        ],
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_items_list(request: Request) -> Response:
    """
    List stock balances for the current company only.
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
            or "item"
        )

        queryset = (
            StockItem.objects.select_related(
                "company",
                "warehouse",
                "warehouse__branch",
                "location",
                "item",
                "item__unit",
                "item__category",
            )
            .filter(company=company)
        )

        queryset = _apply_stock_item_filters(queryset, request)
        queryset = _apply_stock_item_ordering(queryset, ordering)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        stock_items = [
            serialize_stock_item(stock_item)
            for stock_item in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Stock items loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "warehouse_id": request.query_params.get("warehouse_id") or "",
                    "location_id": request.query_params.get("location_id") or "",
                    "item_id": request.query_params.get("item_id") or "",
                    "category_id": request.query_params.get("category_id") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "below_minimum": request.query_params.get("below_minimum") or "",
                    "has_quantity": request.query_params.get("has_quantity") or "",
                    "ordering": ordering,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": stock_items,
                "results": stock_items,
                "choices": serialize_stock_choices(),
            },
            status=200,
        )

    except StockItemsListAPIError as exc:
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


stock_items_list.required_company_permissions = [
    "company.inventory.stock.view",
]