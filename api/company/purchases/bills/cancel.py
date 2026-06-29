# ============================================================
# 📂 api/company/purchases/bills/cancel.py
# 🧠 Mhamcloud | Company Purchase Bill Cancel API V1.1
# ------------------------------------------------------------
# ✅ Cancel purchase bill for current company only
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
# - الإلغاء يتم عبر service layer
# - صلاحية الإلغاء المطلوبة: company.purchases.bills.cancel
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.purchases.bills.serializers import serialize_purchase_bill
from api.permissions import HasAnyCompanyPermission
from purchases.models import PurchaseBill
from purchases.services import cancel_purchase_bill


class PurchaseBillCancelAPIError(Exception):
    """
    Small API-level error for purchase bill cancel endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseBillCancelAPIError("Current company context was not resolved.")

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
def purchase_bill_cancel(request: Request, bill_id) -> Response:
    """
    Cancel a purchase bill for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)
        payload = request.data if isinstance(request.data, dict) else {}
        reason = str(payload.get("reason") or payload.get("cancellation_reason") or "")

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

        bill = cancel_purchase_bill(
            bill=bill,
            reason=reason,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Purchase bill cancelled successfully.",
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
                "message": "Purchase bill could not be cancelled.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )

    except PurchaseBillCancelAPIError as exc:
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


purchase_bill_cancel.required_company_permissions = [
    "company.purchases.bills.cancel",
]