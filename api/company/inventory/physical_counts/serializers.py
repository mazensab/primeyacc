# ============================================================
# ?? api/company/inventory/physical_counts/serializers.py
# ?? PrimeyAcc | Physical Inventory Count API Serializers V1.0
# ------------------------------------------------------------
# ? Count serialization
# ? Count item serialization
# ? Allowed lifecycle actions
# ============================================================

from __future__ import annotations

from inventory.models import (
    PhysicalInventoryCount,
    PhysicalInventoryCountItem,
)
from inventory.services import (
    build_physical_inventory_count_item_payload,
    build_physical_inventory_count_payload,
)


def serialize_physical_inventory_count_item(
    item: PhysicalInventoryCountItem,
) -> dict:
    """
    Serialize one physical inventory count item.
    """
    payload = build_physical_inventory_count_item_payload(item)

    payload["allowed_actions"] = {
        "view": True,
        "update_quantity": (
            item.count.status in {"DRAFT", "IN_PROGRESS"}
        ),
    }

    return payload


def serialize_physical_inventory_count(
    count: PhysicalInventoryCount,
    *,
    include_items: bool = False,
) -> dict:
    """
    Serialize one physical inventory count.
    """
    payload = build_physical_inventory_count_payload(
        count,
        include_items=False,
    )

    payload["allowed_actions"] = {
        **payload.get("allowed_actions", {}),
        "view": True,
    }

    if include_items:
        items = list(
            count.items.all()
        )

        payload["items"] = [
            serialize_physical_inventory_count_item(item)
            for item in items
        ]
        payload["items_count"] = len(items)

    return payload
