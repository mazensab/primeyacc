from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import PhysicalInventoryCountItem
from inventory.services import set_physical_inventory_count_item_quantity

from ._shared import (
    PhysicalInventoryCountAPIError,
    get_company_physical_inventory_count,
    get_request_company,
    validation_error_payload,
)
from .serializers import (
    serialize_physical_inventory_count,
    serialize_physical_inventory_count_item,
)


@api_view(["PATCH", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_physical_inventory_count_item_update(
    request: Request,
    count_id: int,
    item_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        payload = request.data or {}

        count = get_company_physical_inventory_count(
            company=company,
            count_id=count_id,
        )

        if not count:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Physical inventory count was not found.",
                    "errors": {
                        "detail": "Physical inventory count was not found.",
                    },
                },
                status=404,
            )

        count_item = PhysicalInventoryCountItem.objects.filter(
            id=item_id,
            count=count,
            company=company,
        ).select_related(
            "count",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "item__unit",
            "stock_movement",
        ).first()

        if not count_item:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Physical inventory count item was not found.",
                    "errors": {
                        "detail": (
                            "Physical inventory count item was not found."
                        ),
                    },
                },
                status=404,
            )

        if "counted_quantity" not in payload:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Counted quantity is required.",
                    "errors": {
                        "counted_quantity": "Counted quantity is required.",
                    },
                },
                status=400,
            )

        count_item = set_physical_inventory_count_item_quantity(
            company=company,
            count_item=count_item,
            counted_quantity=payload.get("counted_quantity"),
            notes=payload.get("notes"),
        )

        count.refresh_from_db()

        item_data = serialize_physical_inventory_count_item(count_item)
        count_data = serialize_physical_inventory_count(
            count,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Physical inventory count item updated successfully.",
                "count_item": item_data,
                "physical_count": count_data,
                "data": item_data,
            },
            status=200,
        )

    except PhysicalInventoryCountAPIError as exc:
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Physical inventory count item could not be updated.",
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_physical_inventory_count_item_update.required_company_permissions = [
    "company.inventory.movements.create",
]
