# ============================================================
# 📂 api/company/pos/orders/preview.py
# 🧠 Mhamcloud | Company POS Order Preview API V1.0
# ------------------------------------------------------------
# ✅ Preview POS order totals before creating/updating order
# ✅ Tenant isolation through request.company
# ✅ Safe catalog item lookup inside current company
# ✅ Calculates subtotal, discount, taxable amount, VAT and total
# ✅ Does not create database records
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم استخدام منتجات خارج شركة المستخدم الحالية
# - هذا الملف للمعاينة فقط ولا ينشئ Order أو Items
# - الحساب هنا مبدئي للواجهة، والحساب النهائي يبقى داخل pos/services.py
# - صلاحية المعاينة المطلوبة: company.pos.orders.view
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from catalog.models import CatalogItem
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission


class POSOrderPreviewAPIError(Exception):
    """
    Small API-level error for POS order preview endpoint.
    """


VAT_RATE = Decimal("0.15")
MONEY_QUANT = Decimal("0.01")


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderPreviewAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _money(value: Decimal) -> Decimal:
    """
    Normalize decimal money value to 2 digits.
    """
    return Decimal(value or Decimal("0.00")).quantize(
        MONEY_QUANT,
        rounding=ROUND_HALF_UP,
    )


def _decimal_to_string(value: Any) -> str:
    """
    Serialize decimal-like values safely.
    """
    if value is None:
        value = Decimal("0.00")

    return str(_money(Decimal(value)))


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
            raise ValidationError(
                {field_name: f"{field_name} must be greater than zero."}
            )

    return number


def _safe_display_name(obj) -> str:
    """
    Return a safe display name for related models.
    """
    if not obj:
        return ""

    return (
        getattr(obj, "display_name", None)
        or getattr(obj, "name_ar", "")
        or getattr(obj, "name_en", "")
        or getattr(obj, "name", "")
        or str(obj)
    )


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
        raise POSOrderPreviewAPIError("Catalog item was not found.")

    return catalog_item


def _get_catalog_price(catalog_item) -> Decimal:
    """
    Resolve catalog item selling price safely from known possible fields.
    """
    for field_name in [
        "selling_price",
        "sale_price",
        "price",
        "unit_price",
        "retail_price",
    ]:
        value = getattr(catalog_item, field_name, None)

        if value not in [None, ""]:
            try:
                return _money(Decimal(str(value)))
            except (InvalidOperation, TypeError, ValueError):
                continue

    return Decimal("0.00")


def _catalog_item_snapshot(catalog_item) -> dict[str, Any]:
    """
    Return safe catalog item snapshot for preview payload.
    """
    return {
        "id": catalog_item.id,
        "name": _safe_display_name(catalog_item),
        "code": getattr(catalog_item, "code", ""),
        "sku": getattr(catalog_item, "sku", ""),
        "barcode": getattr(catalog_item, "barcode", ""),
    }


def _normalize_items_payload(data: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Normalize incoming items payload.
    """
    raw_items = data.get("items") or data.get("lines") or []

    if not isinstance(raw_items, list):
        raise ValidationError({"items": "items must be a list."})

    if not raw_items:
        raise ValidationError({"items": "At least one item is required."})

    normalized_items: list[dict[str, Any]] = []

    for index, item in enumerate(raw_items, start=1):
        if not isinstance(item, dict):
            raise ValidationError({"items": f"Item #{index} must be an object."})

        normalized_items.append(item)

    return normalized_items


def _calculate_preview_line(company, raw_item: dict[str, Any], index: int) -> dict[str, Any]:
    """
    Calculate one preview line.
    """
    catalog_item = _get_catalog_item_for_company(
        company=company,
        catalog_item_id=raw_item.get("catalog_item_id") or raw_item.get("catalog_item"),
    )

    quantity = _clean_decimal(
        raw_item.get("quantity"),
        f"items[{index}].quantity",
        required=True,
    )

    catalog_price = _get_catalog_price(catalog_item)

    unit_price = (
        _clean_decimal(
            raw_item.get("unit_price"),
            f"items[{index}].unit_price",
            required=False,
            default=catalog_price,
        )
        if raw_item.get("unit_price") not in [None, ""]
        else catalog_price
    )

    if unit_price <= Decimal("0.00"):
        raise ValidationError(
            {
                f"items[{index}].unit_price": "unit_price must be greater than zero.",
            }
        )

    discount_amount = _clean_decimal(
        raw_item.get("discount_amount"),
        f"items[{index}].discount_amount",
        required=False,
        default=Decimal("0.00"),
        allow_zero=True,
    )

    line_subtotal = _money(quantity * unit_price)

    if discount_amount > line_subtotal:
        raise ValidationError(
            {
                f"items[{index}].discount_amount": "discount_amount cannot exceed line subtotal.",
            }
        )

    taxable_amount = _money(line_subtotal - discount_amount)
    tax_amount = _money(taxable_amount * VAT_RATE)
    line_total = _money(taxable_amount + tax_amount)

    return {
        "index": index,
        "catalog_item": _catalog_item_snapshot(catalog_item),
        "quantity": str(quantity),
        "unit_price": _decimal_to_string(unit_price),
        "subtotal_amount": _decimal_to_string(line_subtotal),
        "discount_amount": _decimal_to_string(discount_amount),
        "taxable_amount": _decimal_to_string(taxable_amount),
        "tax_rate": str(VAT_RATE),
        "tax_amount": _decimal_to_string(tax_amount),
        "line_total": _decimal_to_string(line_total),
    }


def _calculate_preview(company, data: dict[str, Any]) -> dict[str, Any]:
    """
    Calculate full POS order preview.
    """
    raw_items = _normalize_items_payload(data)

    lines = [
        _calculate_preview_line(company, raw_item, index)
        for index, raw_item in enumerate(raw_items, start=1)
    ]

    subtotal_amount = sum(
        Decimal(line["subtotal_amount"])
        for line in lines
    )
    discount_amount = sum(
        Decimal(line["discount_amount"])
        for line in lines
    )
    taxable_amount = sum(
        Decimal(line["taxable_amount"])
        for line in lines
    )
    tax_amount = sum(
        Decimal(line["tax_amount"])
        for line in lines
    )
    total_amount = sum(
        Decimal(line["line_total"])
        for line in lines
    )

    order_discount_amount = _clean_decimal(
        data.get("discount_amount") or data.get("order_discount_amount"),
        "discount_amount",
        required=False,
        default=Decimal("0.00"),
        allow_zero=True,
    )

    if order_discount_amount:
        if order_discount_amount > taxable_amount:
            raise ValidationError(
                {
                    "discount_amount": "discount_amount cannot exceed taxable amount.",
                }
            )

        taxable_amount = _money(taxable_amount - order_discount_amount)
        discount_amount = _money(discount_amount + order_discount_amount)
        tax_amount = _money(taxable_amount * VAT_RATE)
        total_amount = _money(taxable_amount + tax_amount)

    return {
        "lines": lines,
        "summary": {
            "items_count": len(lines),
            "subtotal_amount": _decimal_to_string(subtotal_amount),
            "discount_amount": _decimal_to_string(discount_amount),
            "taxable_amount": _decimal_to_string(taxable_amount),
            "tax_rate": str(VAT_RATE),
            "tax_amount": _decimal_to_string(tax_amount),
            "total_amount": _decimal_to_string(total_amount),
            "currency": _clean_text(data.get("currency")) or "SAR",
        },
    }


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_preview(request: Request) -> Response:
    """
    POST /api/company/pos/orders/preview/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        preview = _calculate_preview(company, data)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order preview calculated successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "preview": preview,
                "result": preview,
            },
            status=200,
        )

    except POSOrderPreviewAPIError as exc:
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
                "message": "POS order preview could not be calculated.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )


pos_order_preview.required_company_permissions = [
    "company.pos.orders.view",
]