from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission

from ._shared import (
    PhysicalInventoryCountAPIError,
    company_payload,
    get_company_physical_inventory_count,
    get_request_company,
)
from .serializers import serialize_physical_inventory_count


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_physical_inventory_count_detail(
    request: Request,
    count_id: int,
) -> Response:
    try:
        company = get_request_company(request)

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

        data = serialize_physical_inventory_count(
            count,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "physical_count": data,
                "count_item": data,
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


company_physical_inventory_count_detail.required_company_permissions = [
    "company.inventory.movements.view",
]
