# ============================================================
# 📂 api/company/pos/returns/list.py
# 🧠 PrimeyAcc | Company POS Returns List API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped POS Returns List
# ✅ Search / Status / Order Filters
# ✅ Safe Serialization
# ✅ No company_id from frontend
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم تنفيذ أي منطق مالي أو مخزني هنا
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSReturn


def _money(value) -> str:
    """
    Serialize Decimal money values as strings.
    """

    if value is None:
        value = Decimal("0.00")

    return f"{Decimal(value):.2f}"


def serialize_pos_return_item(item) -> dict:
    """
    Serialize POSReturnItem for API responses.
    """

    return {
        "id": item.id,
        "original_order_item_id": item.original_order_item_id,
        "catalog_item_id": item.catalog_item_id,
        "item_code": item.item_code,
        "item_sku": item.item_sku,
        "item_barcode": item.item_barcode,
        "item_name": item.item_name,
        "unit_name": item.unit_name,
        "quantity": str(item.quantity),
        "unit_price": _money(item.unit_price),
        "discount_amount": _money(item.discount_amount),
        "taxable_amount": _money(item.taxable_amount),
        "tax_rate": str(item.tax_rate),
        "tax_amount": _money(item.tax_amount),
        "line_total": _money(item.line_total),
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def serialize_pos_return(pos_return, *, include_items: bool = False) -> dict:
    """
    Serialize POSReturn for API responses.
    """

    data = {
        "id": pos_return.id,
        "return_number": pos_return.return_number,
        "status": pos_return.status,
        "reason": pos_return.reason,
        "subtotal_amount": _money(pos_return.subtotal_amount),
        "discount_amount": _money(pos_return.discount_amount),
        "taxable_amount": _money(pos_return.taxable_amount),
        "tax_amount": _money(pos_return.tax_amount),
        "total_amount": _money(pos_return.total_amount),
        "refund_amount": _money(pos_return.refund_amount),
        "original_order": {
            "id": pos_return.original_order_id,
            "order_number": (
                pos_return.original_order.order_number
                if pos_return.original_order_id
                else ""
            ),
        },
        "session": {
            "id": pos_return.session_id,
            "session_number": (
                pos_return.session.session_number
                if pos_return.session_id
                else ""
            ),
        },
        "register": {
            "id": pos_return.register_id,
            "name": pos_return.register.name if pos_return.register_id else "",
            "code": pos_return.register.code if pos_return.register_id else "",
        },
        "branch": {
            "id": pos_return.branch_id,
            "name": pos_return.branch.name if pos_return.branch_id else "",
        },
        "warehouse": {
            "id": pos_return.warehouse_id,
            "name": pos_return.warehouse.name if pos_return.warehouse_id else "",
        },
        "customer": {
            "id": pos_return.customer_id,
            "name": pos_return.customer.name if pos_return.customer_id else "",
        },
        "created_by": {
            "id": pos_return.created_by_id,
            "username": pos_return.created_by.username if pos_return.created_by_id else "",
        },
        "completed_by": {
            "id": pos_return.completed_by_id,
            "username": (
                pos_return.completed_by.username
                if pos_return.completed_by_id
                else ""
            ),
        },
        "cancelled_by": {
            "id": pos_return.cancelled_by_id,
            "username": (
                pos_return.cancelled_by.username
                if pos_return.cancelled_by_id
                else ""
            ),
        },
        "completed_at": (
            pos_return.completed_at.isoformat() if pos_return.completed_at else None
        ),
        "cancelled_at": (
            pos_return.cancelled_at.isoformat() if pos_return.cancelled_at else None
        ),
        "cancellation_reason": pos_return.cancellation_reason,
        "notes": pos_return.notes,
        "created_at": pos_return.created_at.isoformat() if pos_return.created_at else None,
        "updated_at": pos_return.updated_at.isoformat() if pos_return.updated_at else None,
    }

    if include_items:
        data["items"] = [
            serialize_pos_return_item(item)
            for item in pos_return.items.select_related(
                "original_order_item",
                "catalog_item",
            ).all()
        ]

    return data


@api_view(["GET"])
@permission_classes([IsAuthenticated, HasAnyCompanyPermission])
def pos_returns_list(request):
    """
    List POS returns for the current company.
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

    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    status_filter = (request.GET.get("status") or "").strip().upper()
    original_order_id = (request.GET.get("original_order_id") or "").strip()
    register_id = (request.GET.get("register_id") or "").strip()
    branch_id = (request.GET.get("branch_id") or "").strip()

    queryset = (
        POSReturn.objects.filter(company=company)
        .select_related(
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
        .order_by("-created_at", "-id")
    )

    if search:
        queryset = queryset.filter(
            Q(return_number__icontains=search)
            | Q(original_order__order_number__icontains=search)
            | Q(register__name__icontains=search)
            | Q(register__code__icontains=search)
            | Q(customer__name__icontains=search)
        )

    if status_filter:
        queryset = queryset.filter(status=status_filter)

    if original_order_id:
        queryset = queryset.filter(original_order_id=original_order_id)

    if register_id:
        queryset = queryset.filter(register_id=register_id)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    items = [serialize_pos_return(pos_return) for pos_return in queryset]

    return Response(
        {
            "ok": True,
            "count": len(items),
            "items": items,
        },
        status=200,
    )