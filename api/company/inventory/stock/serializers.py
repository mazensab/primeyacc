# ============================================================
# 📂 api/company/inventory/stock/serializers.py
# 🧠 Mhamcloud | Company Inventory Stock API Serializers V1.1
# ------------------------------------------------------------
# ✅ Serialize stock balances for /company APIs
# ✅ Warehouse / item / unit snapshots for UI
# ✅ Inventory location payload for each balance
# ✅ Safe decimal/date serialization
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - APIs داخل /company تعتمد على request.company وليس company_id من الواجهة
# - serializer هنا للعرض فقط وليس مصدر قرار للعزل
# - StockItem هو الرصيد الحالي
# - StockMovement هو الدفتر
# ============================================================

from __future__ import annotations

from typing import Any

from inventory.models import StockItem


def decimal_to_string(value) -> str:
    """
    Serialize Decimal safely as string for frontend consistency.
    """
    if value is None:
        return "0.0000"

    return str(value)


def serialize_stock_item(stock_item: StockItem) -> dict[str, Any]:
    """
    Serialize one stock balance row.
    """
    item = stock_item.item
    warehouse = stock_item.warehouse
    location = stock_item.location
    branch = warehouse.branch if warehouse and warehouse.branch_id else None
    unit = item.unit if item and item.unit_id else None
    category = item.category if item and item.category_id else None

    return {
        "id": stock_item.id,
        "company_id": stock_item.company_id,
        "warehouse_id": stock_item.warehouse_id,
        "warehouse": {
            "id": warehouse.id,
            "code": warehouse.code,
            "name": warehouse.display_name,
            "status": warehouse.status,
            "warehouse_type": warehouse.warehouse_type,
            "is_active": warehouse.is_active,
        },
        "location_id": stock_item.location_id,
        "location": {
            "id": location.id,
            "code": location.code,
            "name": location.display_name,
            "name_ar": location.name_ar,
            "name_en": location.name_en,
            "location_type": location.location_type,
            "status": location.status,
            "is_active": location.is_active,
            "is_default": location.is_default,
            "is_pickable": location.is_pickable,
            "full_path": location.full_path,
        }
        if location
        else None,
        "branch": {
            "id": branch.id,
            "name": branch.display_name,
            "branch_code": branch.branch_code,
            "status": branch.status,
            "city": branch.city,
        }
        if branch
        else None,
        "item_id": stock_item.item_id,
        "item": {
            "id": item.id,
            "code": item.code,
            "sku": item.sku,
            "barcode": item.barcode,
            "name": item.name,
            "name_ar": item.name_ar,
            "name_en": item.name_en,
            "item_type": item.item_type,
            "status": item.status,
            "track_inventory": item.track_inventory,
            "sale_price": decimal_to_string(item.sale_price),
            "purchase_price": decimal_to_string(item.purchase_price),
            "cost_price": decimal_to_string(item.cost_price),
        },
        "unit": {
            "id": unit.id,
            "name": unit.name,
            "symbol": unit.symbol,
            "decimal_places": unit.decimal_places,
        }
        if unit
        else None,
        "category": {
            "id": category.id,
            "name": category.name,
            "code": category.code,
            "status": category.status,
        }
        if category
        else None,
        "quantity_on_hand": decimal_to_string(stock_item.quantity_on_hand),
        "reserved_quantity": decimal_to_string(stock_item.reserved_quantity),
        "available_quantity": decimal_to_string(stock_item.available_quantity),
        "minimum_quantity": decimal_to_string(stock_item.minimum_quantity),
        "maximum_quantity": decimal_to_string(stock_item.maximum_quantity),
        "average_cost": decimal_to_string(stock_item.average_cost),
        "is_below_minimum": stock_item.is_below_minimum,
        "last_movement_at": stock_item.last_movement_at.isoformat()
        if stock_item.last_movement_at
        else None,
        "notes": stock_item.notes,
        "extra_data": stock_item.extra_data or {},
        "created_at": stock_item.created_at.isoformat() if stock_item.created_at else None,
        "updated_at": stock_item.updated_at.isoformat() if stock_item.updated_at else None,
    }