# ============================================================
# 📂 api/company/inventory/locations/detail.py
# 🧠 PrimeyAcc | Company Inventory Location Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one inventory location for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe 404 for cross-company access
# ✅ Direct children serialization
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي موقع خارج الشركة الحالية يرجع 404
# - صلاحية العرض: company.inventory.locations.view
# ============================================================

from __future__ import annotations

from django.db.models import Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.locations.serializers import (
    serialize_inventory_location,
)
from api.permissions import HasAnyCompanyPermission
from inventory.models import InventoryLocation


class InventoryLocationDetailAPIError(Exception):
    """
    Small API-level error for inventory location detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise InventoryLocationDetailAPIError(
            "Current company context was not resolved."
        )

    return company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def inventory_location_detail(
    request: Request,
    location_id,
) -> Response:
    """
    Return one inventory location for the current company.
    """
    try:
        company = _get_request_company(request)

        try:
            location = (
                InventoryLocation.objects.filter(
                    id=location_id,
                    company=company,
                )
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
                .get()
            )
        except InventoryLocation.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Inventory location was not found.",
                },
                status=404,
            )

        children_queryset = (
            InventoryLocation.objects.filter(
                company=company,
                warehouse=location.warehouse,
                parent=location,
            )
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
            .order_by(
                "sequence",
                "code",
                "id",
            )
        )

        children = [
            serialize_inventory_location(
                child,
                include_children_count=True,
            )
            for child in children_queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Inventory location loaded successfully.",
                "location": serialize_inventory_location(
                    location,
                    include_children_count=True,
                ),
                "children": children,
                "children_count": len(children),
            },
            status=200,
        )

    except InventoryLocationDetailAPIError as exc:
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


inventory_location_detail.required_company_permissions = [
    "company.inventory.locations.view",
]
