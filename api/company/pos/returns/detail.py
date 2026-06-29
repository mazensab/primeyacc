# ============================================================
# 📂 api/company/pos/returns/detail.py
# 🧠 Mhamcloud | Company POS Return Detail API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped POS Return Detail
# ✅ Safe Tenant Isolation
# ✅ Includes Return Items
# ✅ No company_id from frontend
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم تنفيذ أي منطق مالي أو مخزني هنا
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSReturn

from .list import serialize_pos_return


class POSReturnDetailAPIError(Exception):
    """
    Local exception used to keep POS return detail lookup explicit.
    """


def get_pos_return_for_company(*, company, return_id: int) -> POSReturn:
    """
    Get a POS return scoped to the current company.
    """

    if not company:
        raise POSReturnDetailAPIError("Company context is required.")

    try:
        return (
            POSReturn.objects.select_related(
                "company",
                "original_order",
                "session",
                "register",
                "branch",
                "warehouse",
                "customer",
                "created_by",
                "completed_by",
                "cancelled_by",
            )
            .prefetch_related(
                "items",
                "items__original_order_item",
                "items__catalog_item",
            )
            .get(
                company=company,
                id=return_id,
            )
        )
    except POSReturn.DoesNotExist as exc:
        raise POSReturnDetailAPIError("POS return was not found.") from exc


@api_view(["GET"])
@permission_classes([IsAuthenticated, HasAnyCompanyPermission])
def pos_return_detail(request, return_id: int):
    """
    Return POS return detail for the current company.
    """

    company = getattr(request, "company", None)

    try:
        pos_return = get_pos_return_for_company(
            company=company,
            return_id=return_id,
        )
    except POSReturnDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "detail": str(exc),
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )

    return Response(
        {
            "ok": True,
            "item": serialize_pos_return(pos_return, include_items=True),
        },
        status=200,
    )