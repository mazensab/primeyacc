# ============================================================
# 📂 api/company/inventory/stock/summary.py
# 🧠 Mhamcloud | Company Inventory Stock Summary API V1.0
# ------------------------------------------------------------
# ✅ Company-wide stock summary
# ✅ Item-level aggregation across warehouses and locations
# ✅ Multi-location quantity and reservation totals
# ✅ Weighted average cost and inventory value
# ✅ Warehouse, location, item, category, and search filters
# ✅ Tenant isolation through request.company
# ✅ Protected by company.inventory.stock.view
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة تؤخذ من request.company فقط
# - كل StockItem يمثل رصيد موقع مستقل
# - تجميع الصنف يشمل جميع المواقع والمستودعات المطابقة للفلاتر
# - متوسط التكلفة الموزون يعتمد على قيمة المخزون والكمية الفعلية
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.db.models import (
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Q,
    Sum,
)
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import StockItem


QUANTITY_ZERO = Decimal("0.0000")
MONEY_ZERO = Decimal("0.00")


class StockSummaryAPIError(Exception):
    """
    Small API-level error for stock summary endpoint.
    """


def _get_request_company(request: Request):
    """
    Return the active company resolved by the workspace layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockSummaryAPIError(
            "Current company context was not resolved."
        )

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize optional query parameter text.
    """
    return str(value or "").strip()


def _decimal_string(
    value,
    *,
    places: str = "0.0000",
) -> str:
    """
    Serialize decimal aggregates consistently.
    """
    decimal_value = Decimal(str(value or "0"))
    return str(decimal_value.quantize(Decimal(places)))


def _apply_summary_filters(queryset, request: Request):
    """
    Apply safe filters without accepting company_id.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
    )
    warehouse_id = _clean_text(
        request.query_params.get("warehouse_id")
    )
    location_id = _clean_text(
        request.query_params.get("location_id")
    )
    item_id = _clean_text(
        request.query_params.get("item_id")
    )
    category_id = _clean_text(
        request.query_params.get("category_id")
    )
    branch_id = _clean_text(
        request.query_params.get("branch_id")
    )

    if search:
        queryset = queryset.filter(
            Q(item__code__icontains=search)
            | Q(item__sku__icontains=search)
            | Q(item__barcode__icontains=search)
            | Q(item__name__icontains=search)
            | Q(item__name_ar__icontains=search)
            | Q(item__name_en__icontains=search)
        )

    if warehouse_id:
        queryset = queryset.filter(
            warehouse_id=warehouse_id
        )

    if location_id:
        queryset = queryset.filter(
            location_id=location_id
        )

    if item_id:
        queryset = queryset.filter(
            item_id=item_id
        )

    if category_id:
        queryset = queryset.filter(
            item__category_id=category_id
        )

    if branch_id:
        queryset = queryset.filter(
            warehouse__branch_id=branch_id
        )

    return queryset


def _build_filter_payload(request: Request) -> dict[str, str]:
    """
    Echo accepted filters for frontend state.
    """
    return {
        "search": (
            request.query_params.get("search")
            or request.query_params.get("q")
            or ""
        ),
        "warehouse_id": (
            request.query_params.get("warehouse_id")
            or ""
        ),
        "location_id": (
            request.query_params.get("location_id")
            or ""
        ),
        "item_id": (
            request.query_params.get("item_id")
            or ""
        ),
        "category_id": (
            request.query_params.get("category_id")
            or ""
        ),
        "branch_id": (
            request.query_params.get("branch_id")
            or ""
        ),
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_summary(request: Request) -> Response:
    """
    Return company and item-level multi-location stock summary.
    """
    try:
        company = _get_request_company(request)

        totals_available_expression = ExpressionWrapper(
            F("quantity_on_hand")
            - F("reserved_quantity"),
            output_field=DecimalField(
                max_digits=18,
                decimal_places=4,
            ),
        )
        totals_inventory_value_expression = ExpressionWrapper(
            F("quantity_on_hand")
            * F("average_cost"),
            output_field=DecimalField(
                max_digits=30,
                decimal_places=6,
            ),
        )

        queryset = (
            StockItem.objects.filter(company=company)
            .select_related(
                "item",
                "item__unit",
                "item__category",
                "warehouse",
                "location",
            )
        )
        queryset = _apply_summary_filters(
            queryset,
            request,
        )

        totals = queryset.aggregate(
            location_balances_count=Count("id"),
            distinct_items_count=Count(
                "item_id",
                distinct=True,
            ),
            warehouses_count=Count(
                "warehouse_id",
                distinct=True,
            ),
            locations_count=Count(
                "location_id",
                distinct=True,
            ),
            total_quantity_on_hand=Sum(
                "quantity_on_hand"
            ),
            total_reserved_quantity=Sum(
                "reserved_quantity"
            ),
            total_available_quantity=Sum(
                totals_available_expression
            ),
            total_inventory_value=Sum(
                totals_inventory_value_expression
            ),
        )

        item_available_expression = ExpressionWrapper(
            F("quantity_on_hand")
            - F("reserved_quantity"),
            output_field=DecimalField(
                max_digits=18,
                decimal_places=4,
            ),
        )
        item_inventory_value_expression = ExpressionWrapper(
            F("quantity_on_hand")
            * F("average_cost"),
            output_field=DecimalField(
                max_digits=30,
                decimal_places=6,
            ),
        )

        item_rows = (
            queryset.values(
                "item_id",
                "item__code",
                "item__sku",
                "item__barcode",
                "item__name",
                "item__name_ar",
                "item__name_en",
                "item__unit_id",
                "item__unit__name",
                "item__category_id",
                "item__category__name",
            )
            .annotate(
                location_balances_count=Count("id"),
                warehouses_count=Count(
                    "warehouse_id",
                    distinct=True,
                ),
                locations_count=Count(
                    "location_id",
                    distinct=True,
                ),
                aggregated_quantity_on_hand=Sum(
                    "quantity_on_hand"
                ),
                aggregated_reserved_quantity=Sum(
                    "reserved_quantity"
                ),
                aggregated_available_quantity=Sum(
                    item_available_expression
                ),
                aggregated_inventory_value=Sum(
                    item_inventory_value_expression
                ),
            )
            .order_by(
                "item__name",
                "item_id",
            )
        )

        items = []

        for row in item_rows:
            quantity_on_hand = Decimal(
                str(
                    row.get("aggregated_quantity_on_hand")
                    or QUANTITY_ZERO
                )
            )
            inventory_value = Decimal(
                str(
                    row.get("aggregated_inventory_value")
                    or MONEY_ZERO
                )
            )

            weighted_average_cost = MONEY_ZERO

            if quantity_on_hand > QUANTITY_ZERO:
                weighted_average_cost = (
                    inventory_value
                    / quantity_on_hand
                )

            items.append(
                {
                    "item_id": row["item_id"],
                    "code": row["item__code"],
                    "sku": row["item__sku"],
                    "barcode": row["item__barcode"],
                    "name": row["item__name"],
                    "name_ar": row["item__name_ar"],
                    "name_en": row["item__name_en"],
                    "unit": {
                        "id": row["item__unit_id"],
                        "name": row["item__unit__name"],
                    }
                    if row["item__unit_id"]
                    else None,
                    "category": {
                        "id": row["item__category_id"],
                        "name": row[
                            "item__category__name"
                        ],
                    }
                    if row["item__category_id"]
                    else None,
                    "location_balances_count": (
                        row["location_balances_count"]
                    ),
                    "warehouses_count": (
                        row["warehouses_count"]
                    ),
                    "locations_count": (
                        row["locations_count"]
                    ),
                    "quantity_on_hand": _decimal_string(
                        quantity_on_hand
                    ),
                    "reserved_quantity": _decimal_string(
                        row.get("aggregated_reserved_quantity")
                    ),
                    "available_quantity": _decimal_string(
                        row.get("aggregated_available_quantity")
                    ),
                    "weighted_average_cost": (
                        _decimal_string(
                            weighted_average_cost,
                            places="0.00",
                        )
                    ),
                    "inventory_value": _decimal_string(
                        inventory_value,
                        places="0.00",
                    ),
                }
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Stock summary loaded successfully."
                ),
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": _build_filter_payload(request),
                "summary": {
                    "location_balances_count": (
                        totals.get(
                            "location_balances_count"
                        )
                        or 0
                    ),
                    "distinct_items_count": (
                        totals.get(
                            "distinct_items_count"
                        )
                        or 0
                    ),
                    "warehouses_count": (
                        totals.get("warehouses_count")
                        or 0
                    ),
                    "locations_count": (
                        totals.get("locations_count")
                        or 0
                    ),
                    "total_quantity_on_hand": (
                        _decimal_string(
                            totals.get(
                                "total_quantity_on_hand"
                            )
                        )
                    ),
                    "total_reserved_quantity": (
                        _decimal_string(
                            totals.get(
                                "total_reserved_quantity"
                            )
                        )
                    ),
                    "total_available_quantity": (
                        _decimal_string(
                            totals.get(
                                "total_available_quantity"
                            )
                        )
                    ),
                    "total_inventory_value": (
                        _decimal_string(
                            totals.get(
                                "total_inventory_value"
                            ),
                            places="0.00",
                        )
                    ),
                },
                "count": len(items),
                "items": items,
                "results": items,
            },
            status=200,
        )

    except StockSummaryAPIError as exc:
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


stock_summary.required_company_permissions = [
    "company.inventory.stock.view",
]
