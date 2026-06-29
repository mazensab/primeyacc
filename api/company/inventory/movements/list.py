# ============================================================
# 📂 api/company/inventory/movements/list.py
# 🧠 Mhamcloud | Company Stock Movements List API V1.0
# ------------------------------------------------------------
# ✅ List stock movements for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, warehouse, item, type, status, direction and date filters
# ✅ Sorting and pagination
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - صلاحية العرض المطلوبة: company.inventory.movements.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.movements.serializers import serialize_stock_movement
from api.permissions import HasAnyCompanyPermission
from inventory.models import (
    StockMovement,
    StockMovementDirection,
    StockMovementStatus,
    StockMovementType,
)


class StockMovementsListAPIError(Exception):
    """
    Small API-level error for stock movements list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockMovementsListAPIError("Current company context was not resolved.")

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


def _apply_stock_movement_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to stock movement queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_text(request.query_params.get("status") or "").upper()
    movement_type = _clean_text(request.query_params.get("movement_type") or "").upper()
    direction = _clean_text(request.query_params.get("direction") or "").upper()
    warehouse_id = _clean_text(request.query_params.get("warehouse_id") or "")
    item_id = _clean_text(request.query_params.get("item_id") or "")
    reference_type = _clean_text(request.query_params.get("reference_type") or "")
    reference_id = _clean_text(request.query_params.get("reference_id") or "")
    date_from = _clean_text(request.query_params.get("date_from") or "")
    date_to = _clean_text(request.query_params.get("date_to") or "")

    if search:
        queryset = queryset.filter(
            Q(movement_number__icontains=search)
            | Q(item_code_snapshot__icontains=search)
            | Q(item_name_snapshot__icontains=search)
            | Q(item_name_ar_snapshot__icontains=search)
            | Q(item_name_en_snapshot__icontains=search)
            | Q(warehouse__code__icontains=search)
            | Q(warehouse__name__icontains=search)
            | Q(warehouse__name_ar__icontains=search)
            | Q(warehouse__name_en__icontains=search)
            | Q(reference_type__icontains=search)
            | Q(reference_number__icontains=search)
            | Q(notes__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if movement_type:
        queryset = queryset.filter(movement_type=movement_type)

    if direction:
        queryset = queryset.filter(direction=direction)

    if warehouse_id:
        queryset = queryset.filter(warehouse_id=warehouse_id)

    if item_id:
        queryset = queryset.filter(item_id=item_id)

    if reference_type:
        queryset = queryset.filter(reference_type=reference_type)

    if reference_id:
        queryset = queryset.filter(reference_id=reference_id)

    if date_from:
        queryset = queryset.filter(movement_date__gte=date_from)

    if date_to:
        queryset = queryset.filter(movement_date__lte=date_to)

    return queryset


def _apply_stock_movement_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "movement_date": "movement_date",
        "-movement_date": "-movement_date",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "movement_number": "movement_number",
        "-movement_number": "-movement_number",
        "quantity": "quantity",
        "-quantity": "-quantity",
        "total_cost": "total_cost",
        "-total_cost": "-total_cost",
        "status": "status",
        "-status": "-status",
        "movement_type": "movement_type",
        "-movement_type": "-movement_type",
    }

    selected_ordering = allowed_ordering.get(ordering, "-movement_date")

    if selected_ordering == "-movement_date":
        return queryset.order_by("-movement_date", "-id")

    return queryset.order_by(selected_ordering, "-id")


def serialize_stock_movement_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in StockMovementStatus.choices
        ],
        "movement_types": [
            {"value": value, "label": label}
            for value, label in StockMovementType.choices
        ],
        "directions": [
            {"value": value, "label": label}
            for value, label in StockMovementDirection.choices
        ],
        "ordering": [
            {"value": "-movement_date", "label": "Newest movement date"},
            {"value": "movement_date", "label": "Oldest movement date"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "-quantity", "label": "Highest quantity"},
            {"value": "quantity", "label": "Lowest quantity"},
            {"value": "-total_cost", "label": "Highest total cost"},
            {"value": "total_cost", "label": "Lowest total cost"},
        ],
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_movements_list(request: Request) -> Response:
    """
    List stock movements for the current company only.
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
            or "-movement_date"
        )

        queryset = (
            StockMovement.objects.select_related(
                "company",
                "warehouse",
                "warehouse__branch",
                "stock_item",
                "item",
                "created_by",
                "updated_by",
                "posted_by",
                "cancelled_by",
            )
            .filter(company=company)
        )

        queryset = _apply_stock_movement_filters(queryset, request)
        queryset = _apply_stock_movement_ordering(queryset, ordering)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        movements = [
            serialize_stock_movement(movement)
            for movement in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Stock movements loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "movement_type": request.query_params.get("movement_type") or "",
                    "direction": request.query_params.get("direction") or "",
                    "warehouse_id": request.query_params.get("warehouse_id") or "",
                    "item_id": request.query_params.get("item_id") or "",
                    "reference_type": request.query_params.get("reference_type") or "",
                    "reference_id": request.query_params.get("reference_id") or "",
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "ordering": ordering,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": movements,
                "results": movements,
                "choices": serialize_stock_movement_choices(),
            },
            status=200,
        )

    except StockMovementsListAPIError as exc:
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


stock_movements_list.required_company_permissions = [
    "company.inventory.movements.view",
]