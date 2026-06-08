# ============================================================
# 📂 api/company/inventory/movements/detail.py
# 🧠 PrimeyAcc | Company Stock Movement Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one stock movement for current company only
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe 404 for cross-company access
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي حركة خارج شركة العضوية الحالية يرجع 404
# - صلاحية العرض المطلوبة: company.inventory.movements.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.movements.serializers import serialize_stock_movement
from api.permissions import HasAnyCompanyPermission
from inventory.models import StockMovement


class StockMovementDetailAPIError(Exception):
    """
    Small API-level error for stock movement detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockMovementDetailAPIError("Current company context was not resolved.")

    return company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_movement_detail(request: Request, movement_id) -> Response:
    """
    Return one stock movement for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)

        try:
            movement = (
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
                .get(
                    id=movement_id,
                    company=company,
                )
            )
        except StockMovement.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Stock movement was not found.",
                },
                status=404,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "movement": serialize_stock_movement(movement),
            },
            status=200,
        )

    except StockMovementDetailAPIError as exc:
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


stock_movement_detail.required_company_permissions = [
    "company.inventory.movements.view",
]