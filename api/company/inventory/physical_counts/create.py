from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import InventoryLocation, Warehouse
from inventory.services import create_physical_inventory_count

from ._shared import (
    PhysicalInventoryCountAPIError,
    company_payload,
    get_request_company,
    get_request_user,
    validation_error_payload,
)
from .serializers import serialize_physical_inventory_count


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_physical_inventory_count_create(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        warehouse_id = payload.get("warehouse_id") or payload.get("warehouse")

        warehouse = Warehouse.objects.filter(
            id=warehouse_id,
            company=company,
        ).first()

        if not warehouse:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Warehouse was not found.",
                    "errors": {
                        "warehouse_id": "Warehouse was not found.",
                    },
                },
                status=404,
            )

        location = None
        location_id = payload.get("location_id") or payload.get("location")

        if location_id:
            location = InventoryLocation.objects.filter(
                id=location_id,
                company=company,
                warehouse=warehouse,
            ).first()

            if not location:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": "Inventory location was not found.",
                        "errors": {
                            "location_id": (
                                "Inventory location was not found."
                            ),
                        },
                    },
                    status=404,
                )

        count = create_physical_inventory_count(
            company=company,
            warehouse=warehouse,
            location=location,
            data=payload,
            user=user,
        )

        data = serialize_physical_inventory_count(
            count,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Physical inventory count created successfully.",
                "company": company_payload(company),
                "physical_count": data,
                "data": data,
            },
            status=201,
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
                "message": "Physical inventory count could not be created.",
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_physical_inventory_count_create.required_company_permissions = [
    "company.inventory.movements.create",
]
