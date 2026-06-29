# ============================================================
# ?? api/company/inventory/valuation/serializers.py
# ?? Mhamcloud | Inventory Valuation API Serializers V1.0
# ------------------------------------------------------------
# ? Stable valuation payload shape
# ? Summary, rows, and grouped totals
# ============================================================

from __future__ import annotations

from typing import Any


def serialize_inventory_valuation_payload(
    payload: dict[str, Any],
) -> dict[str, Any]:
    """
    Return valuation payload with stable API keys.

    Services already build safe primitive values, so this serializer mainly
    guarantees key consistency for frontend consumers.
    """
    return {
        "summary": payload.get("summary") or {},
        "filters": payload.get("filters") or {},
        "rows": payload.get("rows") or [],
        "rows_count": payload.get("rows_count", 0),
        "items": payload.get("items") or [],
        "items_count": payload.get("items_count", 0),
        "warehouses": payload.get("warehouses") or [],
        "warehouses_count": payload.get("warehouses_count", 0),
        "locations": payload.get("locations") or [],
        "locations_count": payload.get("locations_count", 0),
    }
