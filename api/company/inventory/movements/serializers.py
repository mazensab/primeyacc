# ============================================================
# 📂 api/company/inventory/movements/serializers.py
# 🧠 PrimeyAcc | Company Inventory Movements API Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize stock movements for /company APIs
# ✅ Warehouse / item / reference snapshots
# ✅ Safe decimal/date serialization
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - APIs داخل /company تعتمد على request.company وليس company_id من الواجهة
# - serializer هنا للعرض فقط وليس مصدر قرار للعزل
# - الخدمات في inventory/services.py هي مصدر إنشاء وترحيل الحركة
# - StockMovement هو دفتر المخزون
# ============================================================

from __future__ import annotations

from typing import Any

from inventory.models import StockMovement


def decimal_to_string(value) -> str:
    """
    Serialize Decimal safely as string for frontend consistency.
    """
    if value is None:
        return "0.0000"

    return str(value)


def serialize_stock_movement(movement: StockMovement) -> dict[str, Any]:
    """
    Serialize one stock movement.
    """
    warehouse = movement.warehouse
    branch = warehouse.branch if warehouse and warehouse.branch_id else None

    return {
        "id": movement.id,
        "company_id": movement.company_id,
        "warehouse_id": movement.warehouse_id,
        "warehouse": {
            "id": warehouse.id,
            "code": warehouse.code,
            "name": warehouse.display_name,
            "status": warehouse.status,
            "warehouse_type": warehouse.warehouse_type,
        },
        "branch": {
            "id": branch.id,
            "name": branch.display_name,
            "branch_code": branch.branch_code,
            "status": branch.status,
            "city": branch.city,
        }
        if branch
        else None,
        "stock_item_id": movement.stock_item_id,
        "item_id": movement.item_id,
        "movement_number": movement.movement_number,
        "movement_date": movement.movement_date.isoformat()
        if movement.movement_date
        else None,
        "movement_type": movement.movement_type,
        "direction": movement.direction,
        "status": movement.status,
        "quantity": decimal_to_string(movement.quantity),
        "unit_cost": decimal_to_string(movement.unit_cost),
        "total_cost": decimal_to_string(movement.total_cost),
        "quantity_before": decimal_to_string(movement.quantity_before),
        "quantity_after": decimal_to_string(movement.quantity_after),
        "item_code": movement.item_code_snapshot,
        "item_name": movement.item_name_snapshot,
        "item_name_ar": movement.item_name_ar_snapshot,
        "item_name_en": movement.item_name_en_snapshot,
        "unit_name": movement.unit_name_snapshot,
        "reference_type": movement.reference_type,
        "reference_id": movement.reference_id,
        "reference_number": movement.reference_number,
        "posted_at": movement.posted_at.isoformat() if movement.posted_at else None,
        "posted_by_id": movement.posted_by_id,
        "cancelled_at": movement.cancelled_at.isoformat()
        if movement.cancelled_at
        else None,
        "cancelled_by_id": movement.cancelled_by_id,
        "cancellation_reason": movement.cancellation_reason,
        "can_post": movement.can_post,
        "can_cancel": movement.can_cancel,
        "notes": movement.notes,
        "extra_data": movement.extra_data or {},
        "created_by_id": movement.created_by_id,
        "updated_by_id": movement.updated_by_id,
        "created_at": movement.created_at.isoformat() if movement.created_at else None,
        "updated_at": movement.updated_at.isoformat() if movement.updated_at else None,
    }