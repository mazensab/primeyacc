# ============================================================
# 📂 api/company/purchases/bills/create.py
# 🧠 Mhamcloud | Company Purchase Bill Create API V1.1
# ------------------------------------------------------------
# ✅ Create purchase bill for current company only
# ✅ Tenant isolation through request.company
# ✅ Uses purchases/services.py as source of truth
# ✅ Optional post_now support
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe validation errors
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إنشاء الفاتورة يتم عبر service layer وليس داخل view مباشرة
# - صلاحية الإنشاء المطلوبة: company.purchases.bills.create
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.purchases.bills.serializers import serialize_purchase_bill
from api.permissions import HasAnyCompanyPermission
from purchases.services import create_purchase_bill, post_purchase_bill


class PurchaseBillCreateAPIError(Exception):
    """
    Small API-level error for purchase bill create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PurchaseBillCreateAPIError("Current company context was not resolved.")

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
def purchase_bill_create(request: Request) -> Response:
    """
    Create a purchase bill for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)
        payload = request.data if isinstance(request.data, dict) else {}

        bill = create_purchase_bill(
            company=company,
            payload=payload,
            user=request.user,
        )

        if bool(payload.get("post_now")):
            bill = post_purchase_bill(
                bill=bill,
                user=request.user,
            )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Purchase bill created successfully.",
                "bill": serialize_purchase_bill(
                    bill,
                    include_items=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Purchase bill could not be created.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )

    except PurchaseBillCreateAPIError as exc:
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


purchase_bill_create.required_company_permissions = [
    "company.purchases.bills.create",
]