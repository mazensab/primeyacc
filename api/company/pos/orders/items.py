# ============================================================
# 📂 api/company/pos/orders/items.py
# 🧠 PrimeyAcc | Company POS Order Items API V1.0
# ------------------------------------------------------------
# ✅ List POS order items for current company only
# ✅ Add POS order item for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe POS order lookup inside current company
# ✅ Safe catalog item lookup inside current company
# ✅ Uses pos.services.add_pos_order_item
# ✅ Recalculates order totals through service layer
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إضافة منتج إلا إذا كان داخل نفس شركة الطلب
# - لا يتم تعديل الإجماليات يدويًا داخل API
# - منطق حساب الضريبة والإجماليات يبقى داخل pos/services.py
# - صلاحية الإضافة المطلوبة: company.pos.orders.update
# ============================================================

from __future__ import annotations

import inspect
from decimal import Decimal, InvalidOperation
from typing import Any

from catalog.models import CatalogItem
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSOrderStatus
from pos.services import add_pos_order_item

from .detail import get_pos_order_for_company
from .list import serialize_pos_order, serialize_pos_order_item


class POSOrderItemsAPIError(Exception):
    """
    Small API-level error for POS order items endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderItemsAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _clean_decimal(
    value: Any,
    field_name: str,
    *,
    required: bool = True,
    default: Decimal | None = None,
    allow_zero: bool = False,
) -> Decimal:
    """
    Safely parse decimal request values.
    """
    if value in [None, ""]:
        if required:
            raise ValidationError({field_name: f"{field_name} is required."})

        return default if default is not None else Decimal("0.00")

    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if allow_zero:
        if number < Decimal("0.00"):
            raise ValidationError({field_name: f"{field_name} cannot be negative."})
    else:
        if number <= Decimal("0.00"):
            raise ValidationError({field_name: f"{field_name} must be greater than zero."})

    return number


def _clean_id(value: Any, field_name: str) -> int:
    """
    Safely parse required integer ids.
    """
    if value in [None, ""]:
        raise ValidationError({field_name: f"{field_name} is required."})

    try:
        parsed_id = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if parsed_id < 1:
        raise ValidationError({field_name: f"Invalid {field_name}."})

    return parsed_id


def _service_accepts_parameter(function, parameter_name: str) -> bool:
    """
    Check whether a service function accepts a given keyword parameter.
    """
    try:
        signature = inspect.signature(function)
    except (TypeError, ValueError):
        return False

    return parameter_name in signature.parameters


def _get_catalog_item_for_company(company, catalog_item_id: Any) -> CatalogItem:
    """
    Return catalog item scoped to current company only.
    """
    parsed_id = _clean_id(catalog_item_id, "catalog_item_id")

    catalog_item = (
        CatalogItem.objects.filter(
            company=company,
            id=parsed_id,
        )
        .first()
    )

    if not catalog_item:
        raise POSOrderItemsAPIError("Catalog item was not found.")

    return catalog_item


def _get_order_items_manager(order):
    """
    Return order items manager safely.
    """
    manager = getattr(order, "items", None) or getattr(order, "lines", None)

    if manager is None:
        raise POSOrderItemsAPIError("POS order items relation was not found.")

    return manager


def _validate_order_allows_item_addition(order) -> None:
    """
    Validate whether order allows adding items.
    """
    if getattr(order, "status", "") != POSOrderStatus.DRAFT:
        raise ValidationError(
            {
                "status": "POS order items can only be added to draft orders.",
            }
        )


def _call_add_pos_order_item_service(
    *,
    company,
    order,
    catalog_item,
    quantity: Decimal,
    unit_price: Decimal | None,
    discount_amount: Decimal,
    user,
):
    """
    Call add_pos_order_item safely based on its actual service signature.
    """
    kwargs = {
        "company": company,
        "order": order,
        "catalog_item": catalog_item,
        "quantity": quantity,
    }

    if unit_price is not None and _service_accepts_parameter(add_pos_order_item, "unit_price"):
        kwargs["unit_price"] = unit_price

    if _service_accepts_parameter(add_pos_order_item, "discount_amount"):
        kwargs["discount_amount"] = discount_amount

    if _service_accepts_parameter(add_pos_order_item, "user"):
        kwargs["user"] = user

    if _service_accepts_parameter(add_pos_order_item, "created_by"):
        kwargs["created_by"] = user

    return add_pos_order_item(**kwargs)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_items_list(request: Request, order_id: int) -> Response:
    """
    GET /api/company/pos/orders/<order_id>/items/
    """
    try:
        company = _get_request_company(request)
        order = get_pos_order_for_company(company, order_id)

        items_manager = _get_order_items_manager(order)
        items = [
            serialize_pos_order_item(item)
            for item in items_manager.all().order_by("id")
        ]

        serialized_order = serialize_pos_order(order, include_lines=False)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order items loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "order": serialized_order,
                "items": items,
                "results": items,
                "count": len(items),
            },
            status=200,
        )

    except POSOrderItemsAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_item_add(request: Request, order_id: int) -> Response:
    """
    POST /api/company/pos/orders/<order_id>/items/add/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        order = get_pos_order_for_company(company, order_id)
        _validate_order_allows_item_addition(order)

        catalog_item = _get_catalog_item_for_company(
            company=company,
            catalog_item_id=data.get("catalog_item_id") or data.get("catalog_item"),
        )

        quantity = _clean_decimal(
            data.get("quantity"),
            "quantity",
            required=True,
        )
        unit_price = None

        if data.get("unit_price") not in [None, ""]:
            unit_price = _clean_decimal(
                data.get("unit_price"),
                "unit_price",
                required=False,
                default=None,
            )

        discount_amount = _clean_decimal(
            data.get("discount_amount"),
            "discount_amount",
            required=False,
            default=Decimal("0.00"),
            allow_zero=True,
        )

        item = _call_add_pos_order_item_service(
            company=company,
            order=order,
            catalog_item=catalog_item,
            quantity=quantity,
            unit_price=unit_price,
            discount_amount=discount_amount,
            user=request.user,
        )

        order.refresh_from_db()

        serialized_item = serialize_pos_order_item(item)
        serialized_order = serialize_pos_order(order, include_lines=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order item added successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_item,
                "order": serialized_order,
                "result": {
                    "item": serialized_item,
                    "order": serialized_order,
                },
            },
            status=201,
        )

    except POSOrderItemsAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS order item could not be added.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS order item could not be added.",
                "errors": {
                    "detail": "POS order item could not be added because of a duplicate value.",
                },
            },
            status=400,
        )


pos_order_items_list.required_company_permissions = [
    "company.pos.orders.view",
]

pos_order_item_add.required_company_permissions = [
    "company.pos.orders.update",
    "company.pos.orders.create",
]