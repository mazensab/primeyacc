from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    create_purchase_bill_from_order,
    serialize_purchase_order,
)

from ._shared import (
    PurchaseOrderAPIError,
    get_company_purchase_order,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


def serialize_bill(bill) -> dict:
    return {
        "id": bill.id,
        "bill_number": bill.bill_number,
        "supplier_bill_number": (
            bill.supplier_bill_number
        ),
        "status": bill.status,
        "bill_date": (
            bill.bill_date.isoformat()
            if bill.bill_date
            else None
        ),
        "due_date": (
            bill.due_date.isoformat()
            if bill.due_date
            else None
        ),
        "currency_code": bill.currency_code,
        "subtotal_amount": str(
            bill.subtotal_amount
        ),
        "discount_amount": str(
            bill.discount_amount
        ),
        "taxable_amount": str(
            bill.taxable_amount
        ),
        "tax_amount": str(
            bill.tax_amount
        ),
        "total_amount": str(
            bill.total_amount
        ),
        "purchase_order_id": (
            bill.purchase_order_id
        ),
        "items": [
            {
                "id": item.id,
                "purchase_order_item_id": (
                    item.purchase_order_item_id
                ),
                "catalog_item_id": item.item_id,
                "item_name": (
                    item.item_name_snapshot
                ),
                "quantity": str(item.quantity),
                "unit_price": str(
                    item.unit_price
                ),
                "total_amount": str(
                    item.total_amount
                ),
            }
            for item in bill.items.order_by(
                "line_number",
                "id",
            )
        ],
    }


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_order_create_bill(
    request: Request,
    order_id: int,
) -> Response:
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        order = get_company_purchase_order(
            company=company,
            order_id=order_id,
        )

        if not order:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Purchase order was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Purchase order was not found."
                        ),
                    },
                },
                status=404,
            )

        bill = create_purchase_bill_from_order(
            company=company,
            order=order,
            payload=payload,
            user=user,
        )

        order.refresh_from_db()

        order_data = serialize_purchase_order(
            order,
            include_items=True,
        )
        bill_data = serialize_bill(bill)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Purchase bill created from order "
                    "successfully."
                ),
                "purchase_order": order_data,
                "bill": bill_data,
                "data": {
                    "purchase_order": order_data,
                    "bill": bill_data,
                },
            },
            status=201,
        )

    except PurchaseOrderAPIError as exc:
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Purchase bill could not be created "
                    "from order."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_purchase_order_create_bill.required_company_permissions = [
    "company.purchases.orders.create_bill",
]
