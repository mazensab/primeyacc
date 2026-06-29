# ============================================================
# 📂 api/company/inventory/locations/serializers.py
# 🧠 Mhamcloud | Company Inventory Locations API Serializers V1.0
# ------------------------------------------------------------
# ✅ Inventory location serialization
# ✅ Warehouse and parent snapshots
# ✅ Hierarchy path serialization
# ✅ Operational purpose flags
# ✅ Allowed actions payload
# ✅ Safe date and audit serialization
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - APIs داخل /company تعتمد على request.company فقط
# - serializer للعرض فقط وليس مصدر قرار العزل
# - الخدمات في inventory/services.py هي مصدر الإنشاء والتحديث
# - الموقع والمستودع يجب أن يتبعا الشركة الحالية
# ============================================================

from __future__ import annotations

from typing import Any

from inventory.models import InventoryLocation


def serialize_location_parent(
    parent: InventoryLocation | None,
) -> dict[str, Any] | None:
    """
    Serialize the direct parent location.
    """
    if parent is None:
        return None

    return {
        "id": parent.id,
        "code": parent.code,
        "name": parent.name,
        "name_ar": parent.name_ar,
        "name_en": parent.name_en,
        "display_name": parent.display_name,
        "location_type": parent.location_type,
        "status": parent.status,
        "is_active": parent.is_active,
    }


def serialize_location_warehouse(location: InventoryLocation) -> dict[str, Any]:
    """
    Serialize the warehouse owning the location.
    """
    warehouse = location.warehouse
    branch = warehouse.branch if warehouse.branch_id else None

    return {
        "id": warehouse.id,
        "code": warehouse.code,
        "name": warehouse.name,
        "name_ar": warehouse.name_ar,
        "name_en": warehouse.name_en,
        "display_name": warehouse.display_name,
        "status": warehouse.status,
        "warehouse_type": warehouse.warehouse_type,
        "is_default": warehouse.is_default,
        "is_active": warehouse.is_active,
        "branch": {
            "id": branch.id,
            "branch_code": branch.branch_code,
            "name": branch.display_name,
            "status": branch.status,
            "city": branch.city,
        }
        if branch
        else None,
    }


def serialize_inventory_location(
    location: InventoryLocation,
    *,
    include_children_count: bool = False,
) -> dict[str, Any]:
    """
    Serialize one inventory location.
    """
    data: dict[str, Any] = {
        "id": location.id,
        "company_id": location.company_id,
        "warehouse_id": location.warehouse_id,
        "parent_id": location.parent_id,
        "status": location.status,
        "location_type": location.location_type,
        "code": location.code,
        "name": location.name,
        "name_ar": location.name_ar,
        "name_en": location.name_en,
        "display_name": location.display_name,
        "full_path": location.full_path,
        "barcode": location.barcode,
        "is_default": location.is_default,
        "is_receiving": location.is_receiving,
        "is_shipping": location.is_shipping,
        "is_adjustment": location.is_adjustment,
        "is_pickable": location.is_pickable,
        "is_active": location.is_active,
        "is_active_location": location.is_active_location,
        "sequence": location.sequence,
        "warehouse": serialize_location_warehouse(location),
        "parent": serialize_location_parent(location.parent),
        "notes": location.notes,
        "extra_data": location.extra_data or {},
        "created_by_id": location.created_by_id,
        "updated_by_id": location.updated_by_id,
        "created_at": (
            location.created_at.isoformat()
            if location.created_at
            else None
        ),
        "updated_at": (
            location.updated_at.isoformat()
            if location.updated_at
            else None
        ),
        "allowed_actions": {
            "view": True,
            "update": location.status != "ARCHIVED",
            "change_status": True,
            "activate": location.status != "ACTIVE",
            "deactivate": location.status == "ACTIVE",
            "archive": location.status != "ARCHIVED",
            "create_child": (
                location.status == "ACTIVE"
                and location.is_active
                and location.warehouse.is_active_warehouse
            ),
        },
    }

    if include_children_count:
        annotated_count = getattr(location, "children_count", None)

        if annotated_count is None:
            annotated_count = location.children.count()

        data["children_count"] = annotated_count
        data["has_children"] = annotated_count > 0

    return data
