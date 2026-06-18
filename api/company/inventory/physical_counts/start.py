from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import start_physical_inventory_count

from ._shared import (
    PhysicalInventoryCountAPIError,
    get_company_physical_inventory_count,
    get_request_company,
    get_request_user,
    validation_error_payload,
)
from .serializers import serialize_physical_inventory_count


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_physical_inventory_count_start(
    request: Request,
    count_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)

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

        count = start_physical_inventory_count(
            company=company,
            count=count,
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
                "message": "Physical inventory count started successfully.",
                "physical_count": data,
                "data": data,
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
                "message": "Physical inventory count could not be started.",
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_physical_inventory_count_start.required_company_permissions = [
    "company.inventory.movements.create",
]
