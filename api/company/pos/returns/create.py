# ============================================================
# 📂 api/company/pos/returns/create.py
# 🧠 PrimeyAcc | Company POS Return Create API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped POS Return Create
# ✅ Creates POSReturn Header
# ✅ Adds Return Items
# ✅ Uses pos.services only
# ✅ No company_id from frontend
# ✅ Returned Quantity Protection via Service Layer
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إنشاء رد مبلغ أو حركة خزينة هنا
# - لا يتم إرجاع مخزون أو ترحيل محاسبي هنا
# - كل منطق التشغيل داخل pos/services.py
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSOrder, POSOrderItem
from pos.services import (
    add_pos_return_item,
    create_pos_return,
)

from .list import serialize_pos_return


def _validation_error_response(exc: ValidationError) -> Response:
    """
    Convert Django ValidationError to a safe API response.
    """

    if hasattr(exc, "message_dict"):
        detail = exc.message_dict
    elif hasattr(exc, "messages"):
        detail = exc.messages
    else:
        detail = str(exc)

    return Response(
        {
            "ok": False,
            "detail": detail,
        },
        status=400,
    )


def _to_decimal(value, field_name: str) -> Decimal:
    """
    Convert request value to Decimal.
    """

    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_name: "Invalid decimal value."})


@api_view(["POST"])
@permission_classes([IsAuthenticated, HasAnyCompanyPermission])
def pos_return_create(request):
    """
    Create a POS return for the current company.

    Expected payload:
        {
            "original_order_id": 1,
            "reason": "Customer returned item",
            "notes": "",
            "items": [
                {
                    "original_order_item_id": 1,
                    "quantity": "1"
                }
            ]
        }
    """

    company = getattr(request, "company", None)

    if not company:
        return Response(
            {
                "ok": False,
                "detail": "Company context is required.",
            },
            status=400,
        )

    data = request.data or {}

    original_order_id = data.get("original_order_id")
    reason = data.get("reason") or ""
    notes = data.get("notes") or ""
    items = data.get("items") or []

    if not original_order_id:
        return Response(
            {
                "ok": False,
                "detail": {
                    "original_order_id": "Original POS order is required.",
                },
            },
            status=400,
        )

    if not isinstance(items, list) or not items:
        return Response(
            {
                "ok": False,
                "detail": {
                    "items": "At least one return item is required.",
                },
            },
            status=400,
        )

    try:
        original_order = POSOrder.objects.get(
            company=company,
            id=original_order_id,
        )
    except POSOrder.DoesNotExist:
        return Response(
            {
                "ok": False,
                "detail": "Original POS order was not found.",
            },
            status=404,
        )

    try:
        pos_return = create_pos_return(
            company=company,
            original_order=original_order,
            reason=reason,
            notes=notes,
            user=request.user,
        )

        for line in items:
            if not isinstance(line, dict):
                raise ValidationError({"items": "Each return item must be an object."})

            original_order_item_id = line.get("original_order_item_id")
            quantity = line.get("quantity")

            if not original_order_item_id:
                raise ValidationError(
                    {
                        "original_order_item_id": "Original POS order item is required.",
                    }
                )

            if quantity in [None, ""]:
                raise ValidationError(
                    {
                        "quantity": "Returned quantity is required.",
                    }
                )

            try:
                original_order_item = POSOrderItem.objects.get(
                    company=company,
                    order=original_order,
                    id=original_order_item_id,
                )
            except POSOrderItem.DoesNotExist:
                raise ValidationError(
                    {
                        "original_order_item_id": (
                            "Original POS order item was not found."
                        ),
                    }
                )

            add_pos_return_item(
                company=company,
                pos_return=pos_return,
                original_order_item=original_order_item,
                quantity=_to_decimal(quantity, "quantity"),
            )

        pos_return.refresh_from_db()

    except ValidationError as exc:
        return _validation_error_response(exc)

    return Response(
        {
            "ok": True,
            "item": serialize_pos_return(pos_return, include_items=True),
        },
        status=201,
    )