# ============================================================
# 📂 api/company/inventory/stock/detail.py
# 🧠 Mhamcloud | Company Stock Item Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve one stock balance for current company only
# ✅ Include inventory location details
# ✅ Tenant isolation through request.company
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe 404 for cross-company access
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي رصيد خارج شركة العضوية الحالية يرجع 404
# - صلاحية العرض المطلوبة: company.inventory.stock.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.stock.serializers import serialize_stock_item
from api.permissions import HasAnyCompanyPermission
from inventory.models import StockItem


class StockItemDetailAPIError(Exception):
    """
    Small API-level error for stock item detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockItemDetailAPIError("Current company context was not resolved.")

    return company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_item_detail(request: Request, stock_item_id) -> Response:
    """
    Return one stock balance for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)

        try:
            stock_item = (
                StockItem.objects.select_related(
                    "company",
                    "warehouse",
                    "warehouse__branch",
                    "location",
                    "item",
                    "item__unit",
                    "item__category",
                )
                .get(
                    id=stock_item_id,
                    company=company,
                )
            )
        except StockItem.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Stock item was not found.",
                },
                status=404,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "stock_item": serialize_stock_item(stock_item),
            },
            status=200,
        )

    except StockItemDetailAPIError as exc:
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


stock_item_detail.required_company_permissions = [
    "company.inventory.stock.view",
]