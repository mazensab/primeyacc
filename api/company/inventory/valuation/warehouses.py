# ============================================================
# ?? api/company/inventory/valuation/warehouses.py
# ?? PrimeyAcc | Inventory Valuation Warehouses API V1.0
# ------------------------------------------------------------
# ? Warehouse-level inventory valuation
# ? Tenant isolation through request.company
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.services import build_inventory_valuation_summary

from ._shared import (
    InventoryValuationAPIError,
    company_payload,
    get_request_company,
    valuation_filters_from_request,
)
from .serializers import serialize_inventory_valuation_payload


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def inventory_valuation_warehouses(request: Request) -> Response:
    """
    Return warehouse-level inventory valuation.
    """
    try:
        company = get_request_company(request)
        filters = valuation_filters_from_request(request)

        payload = build_inventory_valuation_summary(
            company=company,
            include_rows=False,
            include_groups=True,
            **filters,
        )
        data = serialize_inventory_valuation_payload(payload)

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "count": data["warehouses_count"],
                "results": data["warehouses"],
                "warehouses": data["warehouses"],
                "summary": data["summary"],
                "filters": data["filters"],
                "data": data,
            },
            status=200,
        )

    except InventoryValuationAPIError as exc:
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


inventory_valuation_warehouses.required_company_permissions = [
    "company.inventory.stock.view",
]
