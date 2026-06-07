# ============================================================
# 📂 api/company/purchases/bills/detail.py
# 🧠 PrimeyAcc | Company Purchase Bill Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve one purchase bill for current company only
# ✅ Tenant isolation through request.company
# ✅ Includes bill items
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe 404 for cross-company access
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي فاتورة خارج شركة العضوية الحالية ترجع 404
# - صلاحية العرض المطلوبة: company.purchases.bills.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.purchases.bills.serializers import serialize_purchase_bill
from api.permissions import HasAnyCompanyPermission
from purchases.models import PurchaseBill


class PurchaseBillDetailAPIError(Exception):
    """
    Small API-level error for purchase bill detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseBillDetailAPIError("Current company context was not resolved.")

    return company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def purchase_bill_detail(request: Request, bill_id) -> Response:
    """
    Return one purchase bill for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)

        try:
            bill = (
                PurchaseBill.objects.select_related(
                    "company",
                    "branch",
                    "supplier",
                    "created_by",
                    "updated_by",
                    "posted_by",
                    "cancelled_by",
                )
                .prefetch_related(
                    "items",
                    "items__item",
                )
                .get(
                    id=bill_id,
                    company=company,
                )
            )
        except PurchaseBill.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Purchase bill was not found.",
                },
                status=404,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "bill": serialize_purchase_bill(
                    bill,
                    include_items=True,
                ),
            },
            status=200,
        )

    except PurchaseBillDetailAPIError as exc:
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


purchase_bill_detail.required_company_permissions = [
    "company.purchases.bills.view",
]