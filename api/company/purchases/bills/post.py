# ============================================================
# 📂 api/company/purchases/bills/post.py
# 🧠 PrimeyAcc | Company Purchase Bill Post API V1.1
# ------------------------------------------------------------
# ✅ Post draft purchase bill for current company only
# ✅ Tenant isolation through request.company
# ✅ Uses purchases/services.py as source of truth
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe validation errors
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي فاتورة خارج شركة العضوية الحالية ترجع 404
# - الاعتماد يتم عبر service layer
# - صلاحية الاعتماد المطلوبة: company.purchases.bills.post
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.purchases.bills.serializers import serialize_purchase_bill
from api.permissions import HasAnyCompanyPermission
from purchases.models import PurchaseBill
from purchases.services import post_purchase_bill


class PurchaseBillPostAPIError(Exception):
    """
    Small API-level error for purchase bill post endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseBillPostAPIError("Current company context was not resolved.")

    return company


def _validation_error_payload(exc: ValidationError):
    """
    Convert Django ValidationError to a stable API response.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def purchase_bill_post(request: Request, bill_id) -> Response:
    """
    Post a draft purchase bill for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)

        try:
            bill = PurchaseBill.objects.get(
                id=bill_id,
                company=company,
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

        bill = post_purchase_bill(
            bill=bill,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Purchase bill posted successfully.",
                "bill": serialize_purchase_bill(
                    bill,
                    include_items=True,
                ),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Purchase bill could not be posted.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )

    except PurchaseBillPostAPIError as exc:
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


purchase_bill_post.required_company_permissions = [
    "company.purchases.bills.post",
]