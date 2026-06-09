# ============================================================
# 📂 api/company/pos/orders/receipt.py
# 🧠 PrimeyAcc | Company POS Order Receipt API V1.0
# ------------------------------------------------------------
# ✅ Build POS receipt payload for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe order lookup inside current company
# ✅ Includes company, branch, register, session and cashier data
# ✅ Includes order lines and payment lines
# ✅ Includes receipt totals and VAT summary
# ✅ Ready for frontend print view later
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - هذا الملف لا ينشئ PDF ولا يطبع فعليًا
# - هذا الملف يرجع بيانات إيصال جاهزة للواجهة
# - لا يتم ترحيل محاسبي أو خصم مخزون من هذا الملف
# - صلاحية العرض المطلوبة: company.pos.orders.view
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission

from .detail import POSOrderDetailAPIError, get_pos_order_for_company
from .list import serialize_pos_order


class POSOrderReceiptAPIError(Exception):
    """
    Small API-level error for POS order receipt endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderReceiptAPIError("Current company context was not resolved.")

    return company


def _decimal_to_string(value: Any) -> str:
    """
    Serialize decimal-like values safely.
    """
    if value is None:
        value = Decimal("0.00")

    return str(value)


def _safe_iso(value: Any):
    """
    Return ISO formatted date/datetime safely.
    """
    if not value:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


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


def _serialize_company(company) -> dict[str, Any]:
    """
    Serialize company data for receipt header.
    """
    return {
        "id": company.id,
        "name": _safe_display_name(company),
        "company_code": getattr(company, "company_code", ""),
        "email": getattr(company, "email", ""),
        "phone": getattr(company, "phone", ""),
        "tax_number": getattr(company, "tax_number", "")
        or getattr(company, "vat_number", ""),
        "commercial_registration": getattr(company, "commercial_registration", "")
        or getattr(company, "cr_number", ""),
        "address": getattr(company, "address", ""),
    }


def _serialize_branch(branch) -> dict[str, Any] | None:
    """
    Serialize branch data safely.
    """
    if not branch:
        return None

    return {
        "id": branch.id,
        "name": _safe_display_name(branch),
        "branch_code": getattr(branch, "branch_code", ""),
        "email": getattr(branch, "email", ""),
        "phone": getattr(branch, "phone", ""),
        "address": getattr(branch, "address", ""),
        "city": getattr(branch, "city", ""),
    }


def _serialize_register(register) -> dict[str, Any] | None:
    """
    Serialize POS register data safely.
    """
    if not register:
        return None

    return {
        "id": register.id,
        "name": _safe_display_name(register),
        "code": getattr(register, "code", ""),
        "receipt_header": getattr(register, "receipt_header", ""),
        "receipt_footer": getattr(register, "receipt_footer", ""),
    }


def _serialize_session(session) -> dict[str, Any] | None:
    """
    Serialize POS session data safely.
    """
    if not session:
        return None

    return {
        "id": session.id,
        "session_number": getattr(session, "session_number", ""),
        "status": getattr(session, "status", ""),
        "opened_at": _safe_iso(getattr(session, "opened_at", None)),
        "closed_at": _safe_iso(getattr(session, "closed_at", None)),
    }


def _serialize_user(user) -> dict[str, Any] | None:
    """
    Serialize cashier/user safely.
    """
    if not user:
        return None

    full_name = ""

    if hasattr(user, "get_full_name"):
        full_name = user.get_full_name()

    return {
        "id": user.id,
        "username": getattr(user, "username", ""),
        "email": getattr(user, "email", ""),
        "full_name": full_name,
    }


def _serialize_order_line(line) -> dict[str, Any]:
    """
    Serialize receipt order line.
    """
    catalog_item = getattr(line, "catalog_item", None)

    return {
        "id": line.id,
        "catalog_item_id": catalog_item.id if catalog_item else None,
        "item_code": getattr(line, "item_code", ""),
        "item_sku": getattr(line, "item_sku", ""),
        "item_barcode": getattr(line, "item_barcode", ""),
        "item_name": getattr(line, "item_name", ""),
        "quantity": _decimal_to_string(getattr(line, "quantity", Decimal("0.00"))),
        "unit_price": _decimal_to_string(getattr(line, "unit_price", Decimal("0.00"))),
        "discount_amount": _decimal_to_string(
            getattr(line, "discount_amount", Decimal("0.00"))
        ),
        "taxable_amount": _decimal_to_string(
            getattr(line, "taxable_amount", Decimal("0.00"))
        ),
        "tax_amount": _decimal_to_string(getattr(line, "tax_amount", Decimal("0.00"))),
        "line_total": _decimal_to_string(getattr(line, "line_total", Decimal("0.00"))),
    }


def _get_order_lines(order) -> list[dict[str, Any]]:
    """
    Return receipt order lines safely.
    """
    manager = getattr(order, "items", None) or getattr(order, "lines", None)

    if manager is None:
        return []

    try:
        lines = manager.all().order_by("id")
    except Exception:
        return []

    return [_serialize_order_line(line) for line in lines]


def _serialize_payment_line(payment) -> dict[str, Any]:
    """
    Serialize receipt payment line.
    """
    payment_method = getattr(payment, "payment_method", None)
    treasury_account = getattr(payment, "treasury_account", None)

    return {
        "id": payment.id,
        "payment_method": {
            "id": payment_method.id if payment_method else None,
            "name": _safe_display_name(payment_method),
            "code": getattr(payment_method, "code", "") if payment_method else "",
        }
        if payment_method
        else None,
        "treasury_account": {
            "id": treasury_account.id if treasury_account else None,
            "name": _safe_display_name(treasury_account),
            "code": getattr(treasury_account, "code", "") if treasury_account else "",
        }
        if treasury_account
        else None,
        "payment_type": getattr(payment, "payment_type", ""),
        "status": getattr(payment, "status", ""),
        "amount": _decimal_to_string(getattr(payment, "amount", Decimal("0.00"))),
        "reference": getattr(payment, "reference", ""),
        "paid_at": _safe_iso(getattr(payment, "paid_at", None)),
        "confirmed_at": _safe_iso(getattr(payment, "confirmed_at", None)),
    }


def _get_payment_lines(order) -> list[dict[str, Any]]:
    """
    Return receipt payment lines safely.
    """
    manager = getattr(order, "payments", None) or getattr(order, "payment_lines", None)

    if manager is None:
        return []

    try:
        payments = manager.all().order_by("id")
    except Exception:
        return []

    return [_serialize_payment_line(payment) for payment in payments]


def _build_receipt_number(order) -> str:
    """
    Build stable receipt number from order number.
    """
    order_number = getattr(order, "order_number", "") or f"POS-O-{order.id}"
    return f"R-{order_number}"


def _build_receipt_totals(order) -> dict[str, Any]:
    """
    Build receipt totals block.
    """
    total_amount = Decimal(str(getattr(order, "total_amount", Decimal("0.00")) or "0.00"))
    paid_amount = Decimal(str(getattr(order, "paid_amount", Decimal("0.00")) or "0.00"))
    remaining_amount = total_amount - paid_amount

    if remaining_amount < Decimal("0.00"):
        remaining_amount = Decimal("0.00")

    return {
        "subtotal_amount": _decimal_to_string(
            getattr(order, "subtotal_amount", Decimal("0.00"))
        ),
        "discount_amount": _decimal_to_string(
            getattr(order, "discount_amount", Decimal("0.00"))
        ),
        "taxable_amount": _decimal_to_string(
            getattr(order, "taxable_amount", Decimal("0.00"))
        ),
        "tax_amount": _decimal_to_string(
            getattr(order, "tax_amount", Decimal("0.00"))
        ),
        "total_amount": _decimal_to_string(total_amount),
        "paid_amount": _decimal_to_string(paid_amount),
        "remaining_amount": _decimal_to_string(remaining_amount),
        "change_amount": _decimal_to_string(
            getattr(order, "change_amount", Decimal("0.00"))
        ),
        "currency": getattr(order, "currency_code", "") or "SAR",
    }


def build_pos_order_receipt(order) -> dict[str, Any]:
    """
    Build full POS receipt payload.
    """
    company = getattr(order, "company", None)
    session = getattr(order, "session", None)
    register = getattr(order, "register", None) or getattr(session, "register", None)
    branch = getattr(order, "branch", None) or getattr(register, "branch", None)
    cashier = (
        getattr(order, "cashier", None)
        or getattr(order, "created_by", None)
        or getattr(session, "opened_by", None)
    )

    order_payload = serialize_pos_order(order, include_lines=True)

    return {
        "receipt_number": _build_receipt_number(order),
        "issued_at": timezone.now().isoformat(),
        "company": _serialize_company(company) if company else None,
        "branch": _serialize_branch(branch),
        "register": _serialize_register(register),
        "session": _serialize_session(session),
        "cashier": _serialize_user(cashier),
        "order": {
            "id": order.id,
            "order_number": getattr(order, "order_number", ""),
            "status": getattr(order, "status", ""),
            "status_label": order.get_status_display()
            if hasattr(order, "get_status_display")
            else getattr(order, "status", ""),
            "payment_status": getattr(order, "payment_status", ""),
            "payment_status_label": order.get_payment_status_display()
            if hasattr(order, "get_payment_status_display")
            else getattr(order, "payment_status", ""),
            "created_at": _safe_iso(getattr(order, "created_at", None)),
            "updated_at": _safe_iso(getattr(order, "updated_at", None)),
            "notes": getattr(order, "notes", ""),
        },
        "lines": _get_order_lines(order),
        "payments": _get_payment_lines(order),
        "totals": _build_receipt_totals(order),
        "raw_order": order_payload,
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_receipt(request: Request, order_id: int) -> Response:
    """
    GET /api/company/pos/orders/<order_id>/receipt/
    """
    try:
        company = _get_request_company(request)
        order = get_pos_order_for_company(company, order_id)

        receipt = build_pos_order_receipt(order)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order receipt loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "receipt": receipt,
                "item": receipt,
                "result": receipt,
            },
            status=200,
        )

    except POSOrderReceiptAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except POSOrderDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404,
        )


pos_order_receipt.required_company_permissions = [
    "company.pos.orders.view",
]