from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import (
    PhysicalInventoryCountScope,
    PhysicalInventoryCountStatus,
)
from inventory.services import get_company_physical_inventory_counts

from ._shared import (
    PhysicalInventoryCountAPIError,
    company_payload,
    get_request_company,
)
from .serializers import serialize_physical_inventory_count


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_physical_inventory_counts_list(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)

        queryset = get_company_physical_inventory_counts(company)

        search = str(
            request.query_params.get("q")
            or request.query_params.get("search")
            or ""
        ).strip()

        status_value = str(
            request.query_params.get("status")
            or ""
        ).strip().upper()

        scope = str(
            request.query_params.get("scope")
            or ""
        ).strip().upper()

        warehouse_id = request.query_params.get("warehouse_id")
        location_id = request.query_params.get("location_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if search:
            queryset = queryset.filter(
                Q(count_number__icontains=search)
                | Q(warehouse__code__icontains=search)
                | Q(warehouse__name__icontains=search)
                | Q(location__code__icontains=search)
                | Q(location__name__icontains=search)
                | Q(notes__icontains=search)
            )

        if status_value:
            queryset = queryset.filter(status=status_value)

        if scope:
            queryset = queryset.filter(scope=scope)

        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)

        if location_id:
            queryset = queryset.filter(location_id=location_id)

        if date_from:
            queryset = queryset.filter(count_date__gte=date_from)

        if date_to:
            queryset = queryset.filter(count_date__lte=date_to)

        results = [
            serialize_physical_inventory_count(
                count,
                include_items=False,
            )
            for count in queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "count": len(results),
                "results": results,
                "items": results,
                "choices": {
                    "statuses": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in PhysicalInventoryCountStatus.choices
                    ],
                    "scopes": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in PhysicalInventoryCountScope.choices
                    ],
                },
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


company_physical_inventory_counts_list.required_company_permissions = [
    "company.inventory.movements.view",
]
