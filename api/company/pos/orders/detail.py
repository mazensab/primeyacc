# ============================================================
# 📂 api/company/pos/orders/detail.py
# 🧠 PrimeyAcc | Company POS Orders Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve POS order details for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe order lookup inside current company
# ✅ Includes serialized order payload with lines
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم عرض أي Order خارج شركة المستخدم الحالية
# - لا يتم إضافة بنود أو دفع أو إلغاء من detail API
# - صلاحية العرض المطلوبة: company.pos.orders.view
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSOrder

from .list import serialize_pos_order


class POSOrderDetailAPIError(Exception):
    """
    Small API-level error for POS order detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderDetailAPIError("Current company context was not resolved.")

    return company


def _clean_positive_int(value: Any, field_name: str = "id") -> int:
    """
    Safely parse positive integer path params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise POSOrderDetailAPIError(f"Invalid {field_name}.")

    if number < 1:
        raise POSOrderDetailAPIError(f"Invalid {field_name}.")

    return number


def get_pos_order_for_company(company, order_id: Any) -> POSOrder:
    """
    Return POS order scoped to the current company only.
    """
    parsed_id = _clean_positive_int(order_id, "order id")

    order = (
        POSOrder.objects.select_related(
            "company",
            "session",
            "register",
        )
        .filter(
            company=company,
            id=parsed_id,
        )
        .first()
    )

    if not order:
        raise POSOrderDetailAPIError("POS order was not found.")

    return order


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_detail(request: Request, order_id: int) -> Response:
    """
    GET /api/company/pos/orders/<order_id>/
    """
    try:
        company = _get_request_company(request)
        order = get_pos_order_for_company(company, order_id)
        serialized_order = serialize_pos_order(order, include_lines=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_order,
                "result": serialized_order,
            },
            status=200,
        )

    except POSOrderDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )


pos_order_detail.required_company_permissions = [
    "company.pos.orders.view",
]