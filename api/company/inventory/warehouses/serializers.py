# ============================================================
# 📂 api/company/inventory/warehouses/serializers.py
# 🧠 Mhamcloud | Company Inventory Warehouses API Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize warehouses for /company APIs
# ✅ Serialize stock summary per warehouse
# ✅ Safe decimal/date serialization
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - APIs داخل /company تعتمد على request.company وليس company_id من الواجهة
# - serializer هنا للعرض فقط وليس مصدر قرار للعزل
# - الخدمات في inventory/services.py هي مصدر إنشاء وتحديث المستودعات
# ============================================================

from __future__ import annotations

from typing import Any

from django.db.models import (
    Count,
    DecimalField,
    ExpressionWrapper,
    F,
    Sum,
)

from inventory.models import Warehouse


def decimal_to_string(value) -> str:
    """
    Serialize Decimal safely as string for frontend consistency.
    """
    if value is None:
        return "0.0000"

    return str(value)


def serialize_branch(branch) -> dict[str, Any] | None:
    """
    Serialize branch basic data.
    """
    if not branch:
        return None

    return {
        "id": branch.id,
        "name": branch.display_name,
        "branch_code": branch.branch_code,
        "branch_type": branch.branch_type,
        "status": branch.status,
        "is_active": branch.is_active,
        "city": branch.city,
    }


def serialize_warehouse(
    warehouse: Warehouse,
    *,
    include_summary: bool = False,
) -> dict[str, Any]:
    """
    Serialize one warehouse.
    """
    data = {
        "id": warehouse.id,
        "company_id": warehouse.company_id,
        "branch_id": warehouse.branch_id,
        "status": warehouse.status,
        "warehouse_type": warehouse.warehouse_type,
        "code": warehouse.code,
        "name": warehouse.name,
        "name_ar": warehouse.name_ar,
        "name_en": warehouse.name_en,
        "display_name": warehouse.display_name,
        "is_default": warehouse.is_default,
        "is_active": warehouse.is_active,
        "is_active_warehouse": warehouse.is_active_warehouse,
        "manager_name": warehouse.manager_name,
        "phone": warehouse.phone,
        "email": warehouse.email,
        "country": warehouse.country,
        "city": warehouse.city,
        "district": warehouse.district,
        "address": warehouse.address,
        "notes": warehouse.notes,
        "extra_data": warehouse.extra_data or {},
        "branch": serialize_branch(warehouse.branch),
        "created_by_id": warehouse.created_by_id,
        "updated_by_id": warehouse.updated_by_id,
        "created_at": warehouse.created_at.isoformat() if warehouse.created_at else None,
        "updated_at": warehouse.updated_at.isoformat() if warehouse.updated_at else None,
    }

    if include_summary:
        available_quantity_expression = ExpressionWrapper(
            F("quantity_on_hand") - F("reserved_quantity"),
            output_field=DecimalField(
                max_digits=16,
                decimal_places=4,
            ),
        )

        stock_summary = warehouse.stock_items.aggregate(
            location_balances_count=Count("id"),
            distinct_items_count=Count(
                "item_id",
                distinct=True,
            ),
            locations_count=Count(
                "location_id",
                distinct=True,
            ),
            total_quantity_on_hand=Sum(
                "quantity_on_hand"
            ),
            total_reserved_quantity=Sum(
                "reserved_quantity"
            ),
            total_available_quantity=Sum(
                available_quantity_expression
            ),
        )

        location_balances_count = (
            stock_summary.get("location_balances_count")
            or 0
        )

        data["summary"] = {
            # Backward-compatible alias:
            # one StockItem row is one location balance.
            "stock_items_count": location_balances_count,
            "location_balances_count": (
                location_balances_count
            ),
            "distinct_items_count": (
                stock_summary.get("distinct_items_count")
                or 0
            ),
            "locations_count": (
                stock_summary.get("locations_count")
                or 0
            ),
            "total_quantity_on_hand": decimal_to_string(
                stock_summary.get("total_quantity_on_hand")
            ),
            "total_reserved_quantity": decimal_to_string(
                stock_summary.get("total_reserved_quantity")
            ),
            "total_available_quantity": decimal_to_string(
                stock_summary.get("total_available_quantity")
            ),
        }

    return data