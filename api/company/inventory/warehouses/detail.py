# ============================================================
# 📂 api/company/inventory/warehouses/detail.py
# 🧠 PrimeyAcc | Company Warehouse Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one warehouse for current company only
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe 404 for cross-company access
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي مستودع خارج شركة العضوية الحالية يرجع 404
# - صلاحية العرض المطلوبة: company.inventory.warehouses.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.warehouses.serializers import serialize_warehouse
from api.permissions import HasAnyCompanyPermission
from inventory.models import Warehouse


class WarehouseDetailAPIError(Exception):
    """
    Small API-level error for warehouse detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise WarehouseDetailAPIError("Current company context was not resolved.")

    return company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def warehouse_detail(request: Request, warehouse_id) -> Response:
    """
    Return one warehouse for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)

        try:
            warehouse = (
                Warehouse.objects.select_related(
                    "company",
                    "branch",
                    "created_by",
                    "updated_by",
                )
                .get(
                    id=warehouse_id,
                    company=company,
                )
            )
        except Warehouse.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Warehouse was not found.",
                },
                status=404,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "warehouse": serialize_warehouse(
                    warehouse,
                    include_summary=True,
                ),
            },
            status=200,
        )

    except WarehouseDetailAPIError as exc:
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


warehouse_detail.required_company_permissions = [
    "company.inventory.warehouses.view",
]