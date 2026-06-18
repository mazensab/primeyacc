# ============================================================
# 📂 inventory/services.py
# 🧠 PrimeyAcc | Company Inventory Services V2.3
# ------------------------------------------------------------
# ✅ Company-scoped warehouse services
# ✅ Company-scoped stock balance services
# ✅ Phase 22.1.6.5.1 location-aware read compatibility
# ✅ Stock balance location eager loading
# ✅ Location-aware stock services compatibility bridge
# ✅ Automatic default stock location resolution
# ✅ Stock balance and movement location consistency
# ✅ Inventory locations and bins services
# ✅ Location hierarchy and tenant validation
# ✅ Default operational warehouse locations
# ✅ Stock movement posting engine
# ✅ Tenant isolation validation
# ✅ No frontend company_id trust
# ✅ Prevent negative stock
# ✅ Catalog item snapshot through StockMovement model
# ✅ Phase 10.3 automatic accounting posting for stock movements
# ✅ Duplicate accounting entry prevention
# ✅ Ready for purchase receiving integration later
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل العمليات تستقبل company من request/company context
# - لا نقبل company_id من الواجهة
# - كل warehouse / branch / item يجب أن يتبع نفس الشركة
# - الخدمات هي المكان الوحيد لتطبيق أثر حركة المخزون على الرصيد
# - StockMovement هو الدفتر
# - StockItem هو الرصيد الحالي
# - عند ترحيل حركة مخزون مؤثرة ماليًا يتم إنشاء قيد محاسبي تلقائي مرة واحدة فقط
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max, Q, QuerySet, Sum
from django.utils import timezone

from accounting.models import (
    AccountingAccountPurpose,
    AccountingRoutingSource,
    JournalEntry,
    JournalEntryStatus,
    PostingSource,
)
from accounting.services import (
    AccountingPostingError,
    EntryLinePayload,
    create_journal_entry_header,
    generate_journal_entry_number,
    get_account_by_purpose,
    post_journal_entry,
    replace_journal_entry_lines,
    seed_company_chart_of_accounts,
)
from catalog.models import (
    CatalogItem,
    CatalogItemTrackingMethod,
    CatalogItemType,
)
from companies.models import Branch, Company

from sales.models import (
    SalesOrder,
    SalesOrderItem,
    SalesOrderStatus,
)

from .models import (
    MONEY_ZERO,
    QUANTITY_ZERO,
    InventoryBatch,
    InventoryBatchBalance,
    InventoryBatchStatus,
    InventorySerialNumber,
    InventorySerialStatus,
    InventoryTrackingEntry,
    InventoryTrackingEntryType,
    InventoryLocation,
    InventoryLocationStatus,
    InventoryLocationType,
    StockItem,
    StockMovement,
    StockMovementDirection,
    StockMovementStatus,
    StockMovementType,
    StockReservation,
    StockReservationAllocation,
    StockReservationAllocationStatus,
    StockReservationSource,
    StockReservationStatus,
    GoodsIssue,
    GoodsIssueItem,
    GoodsIssueStatus,
    PhysicalInventoryCount,
    PhysicalInventoryCountItem,
    PhysicalInventoryCountScope,
    PhysicalInventoryCountStatus,
    Warehouse,
    WarehouseStatus,
    WarehouseType,
    quantize_money,
    quantize_quantity,
)


AUTO_SOURCE_TYPE_STOCK_MOVEMENT = "stock_movement"

ACCOUNT_PURPOSE_COST_OF_SALES = getattr(
    AccountingAccountPurpose,
    "COST_OF_SALES",
    AccountingAccountPurpose.OTHER,
)

ACCOUNT_PURPOSE_INVENTORY_ADJUSTMENT = getattr(
    AccountingAccountPurpose,
    "INVENTORY_ADJUSTMENT",
    AccountingAccountPurpose.OTHER,
)

ACCOUNT_PURPOSE_OPENING_EQUITY = getattr(
    AccountingAccountPurpose,
    "OPENING_EQUITY",
    AccountingAccountPurpose.OTHER,
)

ACCOUNT_PURPOSE_SUSPENSE = getattr(
    AccountingAccountPurpose,
    "SUSPENSE",
    AccountingAccountPurpose.OTHER,
)

POSTING_SOURCE_INVENTORY_RECEIPT = getattr(
    PostingSource,
    "INVENTORY_RECEIPT",
    PostingSource.OTHER,
)

POSTING_SOURCE_INVENTORY_ISSUE = getattr(
    PostingSource,
    "INVENTORY_ISSUE",
    PostingSource.OTHER,
)

POSTING_SOURCE_INVENTORY_ADJUSTMENT = getattr(
    PostingSource,
    "INVENTORY_ADJUSTMENT",
    PostingSource.OTHER,
)

POSTING_SOURCE_INVENTORY_TRANSFER = getattr(
    PostingSource,
    "INVENTORY_TRANSFER",
    PostingSource.OTHER,
)


def normalize_text(value: Any) -> str:
    """
    Normalize optional text input.
    """
    if value is None:
        return ""
    return str(value).strip()


def normalize_code(value: Any) -> str:
    """
    Normalize code fields.
    """
    return normalize_text(value).upper()


def normalize_bool(value: Any, default: bool = False) -> bool:
    """
    Normalize common boolean values from API payloads.
    """
    if value is None:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, int):
        return bool(value)

    if isinstance(value, str):
        return value.strip().lower() in ["1", "true", "yes", "y", "on", "active"]

    return default


def get_company_warehouses(company: Company) -> QuerySet[Warehouse]:
    """
    Return all warehouses for one company.
    """
    return Warehouse.objects.filter(company=company).select_related(
        "company",
        "branch",
    )


def get_active_company_warehouses(company: Company) -> QuerySet[Warehouse]:
    """
    Return active warehouses for one company.
    """
    return get_company_warehouses(company).filter(
        status=WarehouseStatus.ACTIVE,
        is_active=True,
    )



def get_company_inventory_locations(
    company: Company,
) -> QuerySet[InventoryLocation]:
    """
    Return all inventory locations owned by one company.
    """
    return (
        InventoryLocation.objects.filter(company=company)
        .select_related(
            "company",
            "warehouse",
            "warehouse__branch",
            "parent",
            "created_by",
            "updated_by",
        )
        .order_by(
            "warehouse_id",
            "sequence",
            "code",
            "id",
        )
    )


def get_warehouse_inventory_locations(
    *,
    company: Company,
    warehouse: Warehouse,
) -> QuerySet[InventoryLocation]:
    """
    Return locations for one warehouse after tenant validation.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
    )

    return get_company_inventory_locations(company).filter(
        warehouse=warehouse,
    )


def get_active_warehouse_inventory_locations(
    *,
    company: Company,
    warehouse: Warehouse,
) -> QuerySet[InventoryLocation]:
    """
    Return active locations for one active company warehouse.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )

    return get_warehouse_inventory_locations(
        company=company,
        warehouse=warehouse,
    ).filter(
        status=InventoryLocationStatus.ACTIVE,
        is_active=True,
    )


def validate_inventory_location_for_company(
    *,
    company: Company,
    location: InventoryLocation,
    warehouse: Warehouse | None = None,
    require_active: bool = False,
) -> None:
    """
    Validate that an inventory location belongs to the current company.

    When warehouse is provided, the location must belong to that warehouse.
    """
    if location.company_id != company.id:
        raise ValidationError(
            "Selected inventory location does not belong to this company."
        )

    if location.warehouse.company_id != company.id:
        raise ValidationError(
            "Inventory location warehouse does not belong to this company."
        )

    if warehouse is not None:
        validate_warehouse_for_company(
            company=company,
            warehouse=warehouse,
        )

        if location.warehouse_id != warehouse.id:
            raise ValidationError(
                "Selected inventory location does not belong to this warehouse."
            )

    if require_active and not location.is_active_location:
        raise ValidationError(
            "Selected inventory location is not active."
        )


def validate_parent_inventory_location(
    *,
    company: Company,
    warehouse: Warehouse,
    parent: InventoryLocation | None,
    location: InventoryLocation | None = None,
) -> None:
    """
    Validate an optional parent location.

    Model validation remains the final protection against hierarchy cycles.
    """
    if parent is None:
        return

    validate_inventory_location_for_company(
        company=company,
        location=parent,
        warehouse=warehouse,
    )

    if location and location.pk and parent.pk == location.pk:
        raise ValidationError(
            "Inventory location cannot be its own parent."
        )


def build_inventory_location_payload(
    location: InventoryLocation,
) -> dict[str, Any]:
    """
    Serialize an inventory location for service consumers.
    """
    parent = location.parent
    warehouse = location.warehouse

    return {
        "id": location.id,
        "company_id": location.company_id,
        "warehouse_id": location.warehouse_id,
        "warehouse_code": warehouse.code,
        "warehouse_name": warehouse.display_name,
        "parent_id": location.parent_id,
        "parent_code": parent.code if parent else "",
        "parent_name": parent.display_name if parent else "",
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
    }


def _resolve_inventory_location_parent(
    *,
    company: Company,
    warehouse: Warehouse,
    data: dict[str, Any],
    location: InventoryLocation | None = None,
) -> InventoryLocation | None:
    """
    Resolve parent location from company-scoped input.
    """
    if "parent_id" not in data and "parent" not in data:
        return location.parent if location else None

    parent_id = data.get("parent_id") or data.get("parent")

    if not parent_id:
        return None

    parent = InventoryLocation.objects.filter(
        id=parent_id,
        company=company,
        warehouse=warehouse,
    ).first()

    if not parent:
        raise ValidationError(
            "Parent inventory location was not found for this warehouse."
        )

    validate_parent_inventory_location(
        company=company,
        warehouse=warehouse,
        parent=parent,
        location=location,
    )

    return parent


@transaction.atomic
def create_inventory_location(
    *,
    company: Company,
    warehouse: Warehouse,
    data: dict[str, Any],
    user=None,
) -> InventoryLocation:
    """
    Create an internal warehouse location.

    company and warehouse must come from trusted company context.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )

    parent = _resolve_inventory_location_parent(
        company=company,
        warehouse=warehouse,
        data=data,
    )

    code = normalize_code(data.get("code"))
    name = normalize_text(data.get("name"))
    name_ar = normalize_text(data.get("name_ar"))
    name_en = normalize_text(data.get("name_en"))

    if not code:
        raise ValidationError(
            "Inventory location code is required."
        )

    if not name:
        name = name_ar or name_en

    if not name:
        raise ValidationError(
            "Inventory location name is required."
        )

    try:
        sequence = int(data.get("sequence") or 0)
    except (TypeError, ValueError) as exc:
        raise ValidationError(
            "Inventory location sequence must be a valid integer."
        ) from exc

    if sequence < 0:
        raise ValidationError(
            "Inventory location sequence cannot be negative."
        )

    location = InventoryLocation(
        company=company,
        warehouse=warehouse,
        parent=parent,
        status=(
            normalize_code(data.get("status"))
            or InventoryLocationStatus.ACTIVE
        ),
        location_type=(
            normalize_code(data.get("location_type"))
            or InventoryLocationType.BIN
        ),
        code=code,
        name=name,
        name_ar=name_ar,
        name_en=name_en,
        barcode=normalize_text(data.get("barcode")),
        is_default=normalize_bool(
            data.get("is_default"),
            default=False,
        ),
        is_receiving=normalize_bool(
            data.get("is_receiving"),
            default=False,
        ),
        is_shipping=normalize_bool(
            data.get("is_shipping"),
            default=False,
        ),
        is_adjustment=normalize_bool(
            data.get("is_adjustment"),
            default=False,
        ),
        is_pickable=normalize_bool(
            data.get("is_pickable"),
            default=True,
        ),
        is_active=True,
        sequence=sequence,
        notes=normalize_text(data.get("notes")),
        extra_data=(
            data.get("extra_data")
            if isinstance(data.get("extra_data"), dict)
            else {}
        ),
        created_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
        updated_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
    )
    location.full_clean()
    location.save()

    return location


@transaction.atomic
def update_inventory_location(
    *,
    company: Company,
    location: InventoryLocation,
    data: dict[str, Any],
    user=None,
) -> InventoryLocation:
    """
    Update one company-scoped inventory location.
    """
    validate_inventory_location_for_company(
        company=company,
        location=location,
    )

    warehouse = location.warehouse

    if "warehouse_id" in data or "warehouse" in data:
        requested_warehouse_id = (
            data.get("warehouse_id")
            or data.get("warehouse")
        )

        if str(requested_warehouse_id or "") != str(warehouse.id):
            raise ValidationError(
                "Moving an existing inventory location to another warehouse "
                "is not supported."
            )

    location.parent = _resolve_inventory_location_parent(
        company=company,
        warehouse=warehouse,
        data=data,
        location=location,
    )

    text_fields = {
        "code": "code",
        "name": "name",
        "name_ar": "name_ar",
        "name_en": "name_en",
        "barcode": "barcode",
        "notes": "notes",
    }

    for source_key, model_field in text_fields.items():
        if source_key not in data:
            continue

        value = data.get(source_key)

        if source_key == "code":
            value = normalize_code(value)
        else:
            value = normalize_text(value)

        setattr(location, model_field, value)

    choice_fields = {
        "status": "status",
        "location_type": "location_type",
    }

    for source_key, model_field in choice_fields.items():
        if source_key in data:
            setattr(
                location,
                model_field,
                normalize_code(data.get(source_key)),
            )

    boolean_fields = {
        "is_default": "is_default",
        "is_receiving": "is_receiving",
        "is_shipping": "is_shipping",
        "is_adjustment": "is_adjustment",
        "is_pickable": "is_pickable",
    }

    for source_key, model_field in boolean_fields.items():
        if source_key in data:
            setattr(
                location,
                model_field,
                normalize_bool(
                    data.get(source_key),
                    default=getattr(location, model_field),
                ),
            )

    if "sequence" in data:
        try:
            sequence = int(data.get("sequence") or 0)
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                "Inventory location sequence must be a valid integer."
            ) from exc

        if sequence < 0:
            raise ValidationError(
                "Inventory location sequence cannot be negative."
            )

        location.sequence = sequence

    if (
        "extra_data" in data
        and isinstance(data.get("extra_data"), dict)
    ):
        location.extra_data = data.get("extra_data") or {}

    if user and getattr(user, "is_authenticated", False):
        location.updated_by = user

    location.full_clean()
    location.save()

    return location


@transaction.atomic
def set_inventory_location_status(
    *,
    company: Company,
    location: InventoryLocation,
    status: str,
    user=None,
) -> InventoryLocation:
    """
    Change inventory location lifecycle status.
    """
    validate_inventory_location_for_company(
        company=company,
        location=location,
    )

    normalized_status = normalize_code(status)

    if normalized_status == InventoryLocationStatus.ACTIVE:
        location.activate(user=user)
        return location

    if normalized_status == InventoryLocationStatus.INACTIVE:
        location.deactivate(user=user)
        return location

    if normalized_status == InventoryLocationStatus.ARCHIVED:
        location.archive(user=user)
        return location

    raise ValidationError(
        "Unsupported inventory location status."
    )


def get_default_inventory_location(
    *,
    company: Company,
    warehouse: Warehouse,
    require_active: bool = True,
) -> InventoryLocation | None:
    """
    Return the warehouse default location when configured.
    """
    queryset = get_warehouse_inventory_locations(
        company=company,
        warehouse=warehouse,
    ).filter(is_default=True)

    if require_active:
        queryset = queryset.filter(
            status=InventoryLocationStatus.ACTIVE,
            is_active=True,
        )

    return queryset.first()


def get_inventory_location_by_purpose(
    *,
    company: Company,
    warehouse: Warehouse,
    purpose: str,
    require_active: bool = True,
) -> InventoryLocation | None:
    """
    Resolve a special warehouse location by operational purpose.
    """
    field_map = {
        "default": "is_default",
        "receiving": "is_receiving",
        "shipping": "is_shipping",
        "adjustment": "is_adjustment",
    }

    field_name = field_map.get(
        normalize_text(purpose).lower()
    )

    if not field_name:
        raise ValidationError(
            "Unsupported inventory location purpose."
        )

    queryset = get_warehouse_inventory_locations(
        company=company,
        warehouse=warehouse,
    ).filter(**{field_name: True})

    if require_active:
        queryset = queryset.filter(
            status=InventoryLocationStatus.ACTIVE,
            is_active=True,
        )

    return queryset.first()


@transaction.atomic
def ensure_default_inventory_locations(
    *,
    company: Company,
    warehouse: Warehouse,
    user=None,
) -> dict[str, InventoryLocation]:
    """
    Ensure standard operational locations exist for a warehouse.

    This function is idempotent and does not delete or replace existing
    locations. Existing purpose locations are reused.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )

    definitions = [
        {
            "key": "default",
            "purpose_field": "is_default",
            "code": "STOCK",
            "name": "Main Stock",
            "name_ar": "المخزون الرئيسي",
            "location_type": InventoryLocationType.BIN,
            "is_default": True,
            "is_pickable": True,
            "sequence": 10,
        },
        {
            "key": "receiving",
            "purpose_field": "is_receiving",
            "code": "RECEIVING",
            "name": "Receiving",
            "name_ar": "الاستلام",
            "location_type": InventoryLocationType.RECEIVING,
            "is_receiving": True,
            "is_pickable": False,
            "sequence": 20,
        },
        {
            "key": "shipping",
            "purpose_field": "is_shipping",
            "code": "SHIPPING",
            "name": "Shipping",
            "name_ar": "الشحن والصرف",
            "location_type": InventoryLocationType.SHIPPING,
            "is_shipping": True,
            "is_pickable": False,
            "sequence": 30,
        },
        {
            "key": "adjustment",
            "purpose_field": "is_adjustment",
            "code": "ADJUSTMENT",
            "name": "Adjustment",
            "name_ar": "التسويات",
            "location_type": InventoryLocationType.ADJUSTMENT,
            "is_adjustment": True,
            "is_pickable": False,
            "sequence": 40,
        },
    ]

    result: dict[str, InventoryLocation] = {}

    for definition in definitions:
        purpose_filter = {
            definition["purpose_field"]: True,
        }

        location = (
            InventoryLocation.objects.filter(
                company=company,
                warehouse=warehouse,
                **purpose_filter,
            )
            .order_by("id")
            .first()
        )

        if location is None:
            location = InventoryLocation.objects.filter(
                company=company,
                warehouse=warehouse,
                code=definition["code"],
            ).first()

        if location is None:
            payload = {
                key: value
                for key, value in definition.items()
                if key not in ["key", "purpose_field"]
            }

            location = create_inventory_location(
                company=company,
                warehouse=warehouse,
                data=payload,
                user=user,
            )

        result[definition["key"]] = location

    return result


def get_company_stock_items(company: Company) -> QuerySet[StockItem]:
    """
    Return stock balances for one company.
    """
    return StockItem.objects.filter(company=company).select_related(
        "company",
        "warehouse",
        "location",
        "item",
        "item__unit",
        "item__category",
    )


def get_company_stock_movements(company: Company) -> QuerySet[StockMovement]:
    """
    Return stock movements for one company.
    """
    return StockMovement.objects.filter(company=company).select_related(
        "company",
        "warehouse",
        "stock_item",
        "item",
        "item__unit",
    )


def validate_branch_for_company(
    *,
    company: Company,
    branch: Branch | None,
) -> None:
    """
    Ensure branch belongs to company.
    """
    if branch and branch.company_id != company.id:
        raise ValidationError("Selected branch does not belong to this company.")


def validate_warehouse_for_company(
    *,
    company: Company,
    warehouse: Warehouse,
    require_active: bool = False,
) -> None:
    """
    Ensure warehouse belongs to company.
    """
    if warehouse.company_id != company.id:
        raise ValidationError("Selected warehouse does not belong to this company.")

    if require_active and not warehouse.is_active_warehouse:
        raise ValidationError("Selected warehouse is not active.")


def validate_item_for_inventory(
    *,
    company: Company,
    item: CatalogItem,
) -> None:
    """
    Ensure catalog item belongs to company and can be stock-tracked.
    """
    if item.company_id != company.id:
        raise ValidationError("Selected catalog item does not belong to this company.")

    if item.item_type != CatalogItemType.PRODUCT:
        raise ValidationError("Only product catalog items can be tracked in inventory.")


def build_warehouse_payload(warehouse: Warehouse) -> dict[str, Any]:
    """
    Serialize warehouse for APIs.
    """
    return {
        "id": warehouse.id,
        "company_id": warehouse.company_id,
        "branch_id": warehouse.branch_id,
        "branch_name": warehouse.branch.display_name if warehouse.branch_id else "",
        "status": warehouse.status,
        "warehouse_type": warehouse.warehouse_type,
        "code": warehouse.code,
        "name": warehouse.name,
        "name_ar": warehouse.name_ar,
        "name_en": warehouse.name_en,
        "display_name": warehouse.display_name,
        "is_default": warehouse.is_default,
        "is_active": warehouse.is_active,
        "manager_name": warehouse.manager_name,
        "phone": warehouse.phone,
        "email": warehouse.email,
        "country": warehouse.country,
        "city": warehouse.city,
        "district": warehouse.district,
        "address": warehouse.address,
        "notes": warehouse.notes,
        "extra_data": warehouse.extra_data or {},
        "created_at": warehouse.created_at.isoformat() if warehouse.created_at else None,
        "updated_at": warehouse.updated_at.isoformat() if warehouse.updated_at else None,
    }


def build_stock_item_payload(stock_item: StockItem) -> dict[str, Any]:
    """
    Serialize stock balance for APIs.
    """
    item = stock_item.item
    warehouse = stock_item.warehouse

    return {
        "id": stock_item.id,
        "company_id": stock_item.company_id,
        "warehouse_id": stock_item.warehouse_id,
        "warehouse_code": warehouse.code,
        "warehouse_name": warehouse.display_name,
        "item_id": stock_item.item_id,
        "item_code": item.code,
        "item_sku": item.sku,
        "item_barcode": item.barcode,
        "item_name": item.name,
        "item_name_ar": item.name_ar,
        "item_name_en": item.name_en,
        "unit_name": item.unit.name if item.unit_id else "",
        "quantity_on_hand": str(stock_item.quantity_on_hand),
        "reserved_quantity": str(stock_item.reserved_quantity),
        "available_quantity": str(stock_item.available_quantity),
        "minimum_quantity": str(stock_item.minimum_quantity),
        "maximum_quantity": str(stock_item.maximum_quantity),
        "average_cost": str(stock_item.average_cost),
        "is_below_minimum": stock_item.is_below_minimum,
        "last_movement_at": stock_item.last_movement_at.isoformat()
        if stock_item.last_movement_at
        else None,
        "notes": stock_item.notes,
        "extra_data": stock_item.extra_data or {},
        "created_at": stock_item.created_at.isoformat() if stock_item.created_at else None,
        "updated_at": stock_item.updated_at.isoformat() if stock_item.updated_at else None,
    }


def build_stock_movement_payload(movement: StockMovement) -> dict[str, Any]:
    """
    Serialize stock movement for APIs.
    """
    return {
        "id": movement.id,
        "company_id": movement.company_id,
        "warehouse_id": movement.warehouse_id,
        "warehouse_code": movement.warehouse.code,
        "warehouse_name": movement.warehouse.display_name,
        "stock_item_id": movement.stock_item_id,
        "item_id": movement.item_id,
        "movement_number": movement.movement_number,
        "movement_date": movement.movement_date.isoformat()
        if movement.movement_date
        else None,
        "movement_type": movement.movement_type,
        "direction": movement.direction,
        "status": movement.status,
        "quantity": str(movement.quantity),
        "unit_cost": str(movement.unit_cost),
        "total_cost": str(movement.total_cost),
        "quantity_before": str(movement.quantity_before),
        "quantity_after": str(movement.quantity_after),
        "item_code_snapshot": movement.item_code_snapshot,
        "item_name_snapshot": movement.item_name_snapshot,
        "item_name_ar_snapshot": movement.item_name_ar_snapshot,
        "item_name_en_snapshot": movement.item_name_en_snapshot,
        "unit_name_snapshot": movement.unit_name_snapshot,
        "reference_type": movement.reference_type,
        "reference_id": movement.reference_id,
        "reference_number": movement.reference_number,
        "posted_at": movement.posted_at.isoformat() if movement.posted_at else None,
        "cancelled_at": movement.cancelled_at.isoformat()
        if movement.cancelled_at
        else None,
        "cancellation_reason": movement.cancellation_reason,
        "notes": movement.notes,
        "extra_data": movement.extra_data or {},
        "created_at": movement.created_at.isoformat() if movement.created_at else None,
        "updated_at": movement.updated_at.isoformat() if movement.updated_at else None,
    }


@transaction.atomic
def create_warehouse(
    *,
    company: Company,
    data: dict[str, Any],
    user=None,
) -> Warehouse:
    """
    Create company warehouse.

    company must come from request/company context.
    """
    branch = None
    branch_id = data.get("branch_id") or data.get("branch")

    if branch_id:
        branch = Branch.objects.filter(
            id=branch_id,
            company=company,
        ).first()
        if not branch:
            raise ValidationError("Selected branch was not found for this company.")

    code = normalize_code(data.get("code"))
    name = normalize_text(data.get("name"))
    name_ar = normalize_text(data.get("name_ar"))
    name_en = normalize_text(data.get("name_en"))

    if not code:
        raise ValidationError("Warehouse code is required.")

    if not name:
        name = name_ar or name_en

    if not name:
        raise ValidationError("Warehouse name is required.")

    warehouse = Warehouse(
        company=company,
        branch=branch,
        status=data.get("status") or WarehouseStatus.ACTIVE,
        warehouse_type=data.get("warehouse_type") or WarehouseType.MAIN,
        code=code,
        name=name,
        name_ar=name_ar,
        name_en=name_en,
        is_default=normalize_bool(data.get("is_default"), default=False),
        is_active=True,
        manager_name=normalize_text(data.get("manager_name")),
        phone=normalize_text(data.get("phone")),
        email=normalize_text(data.get("email")),
        country=normalize_text(data.get("country")) or "Saudi Arabia",
        city=normalize_text(data.get("city")),
        district=normalize_text(data.get("district")),
        address=normalize_text(data.get("address")),
        notes=normalize_text(data.get("notes")),
        extra_data=data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )
    warehouse.full_clean()
    warehouse.save()

    return warehouse


@transaction.atomic
def update_warehouse(
    *,
    company: Company,
    warehouse: Warehouse,
    data: dict[str, Any],
    user=None,
) -> Warehouse:
    """
    Update company warehouse.
    """
    validate_warehouse_for_company(company=company, warehouse=warehouse)

    if "branch_id" in data or "branch" in data:
        branch_id = data.get("branch_id") or data.get("branch")
        branch = None

        if branch_id:
            branch = Branch.objects.filter(
                id=branch_id,
                company=company,
            ).first()
            if not branch:
                raise ValidationError("Selected branch was not found for this company.")

        warehouse.branch = branch

    field_map = {
        "status": "status",
        "warehouse_type": "warehouse_type",
        "code": "code",
        "name": "name",
        "name_ar": "name_ar",
        "name_en": "name_en",
        "manager_name": "manager_name",
        "phone": "phone",
        "email": "email",
        "country": "country",
        "city": "city",
        "district": "district",
        "address": "address",
        "notes": "notes",
    }

    for source_key, model_field in field_map.items():
        if source_key not in data:
            continue

        value = data.get(source_key)

        if source_key == "code":
            value = normalize_code(value)
        else:
            value = normalize_text(value)

        setattr(warehouse, model_field, value)

    if "is_default" in data:
        warehouse.is_default = normalize_bool(data.get("is_default"), default=False)

    if "extra_data" in data and isinstance(data.get("extra_data"), dict):
        warehouse.extra_data = data.get("extra_data") or {}

    if user and getattr(user, "is_authenticated", False):
        warehouse.updated_by = user

    warehouse.full_clean()
    warehouse.save()

    return warehouse


@transaction.atomic
def set_warehouse_status(
    *,
    company: Company,
    warehouse: Warehouse,
    status: str,
    user=None,
) -> Warehouse:
    """
    Change warehouse status.
    """
    validate_warehouse_for_company(company=company, warehouse=warehouse)

    if status == WarehouseStatus.ACTIVE:
        warehouse.activate(user=user)
        return warehouse

    if status == WarehouseStatus.INACTIVE:
        warehouse.deactivate(user=user)
        return warehouse

    if status == WarehouseStatus.ARCHIVED:
        warehouse.archive(user=user)
        return warehouse

    raise ValidationError("Unsupported warehouse status.")


def resolve_stock_location(
    *,
    company: Company,
    warehouse: Warehouse,
    location: InventoryLocation | None = None,
    user=None,
) -> InventoryLocation:
    """
    Resolve the inventory location used by stock services.

    Priority:
    1. Explicit location supplied by the caller.
    2. Active default location for the warehouse.
    3. Active STOCK location for the warehouse.
    4. Create a safe default STOCK location.

    Active multi-location rule:
    Each StockItem row represents one independent balance for
    company / warehouse / location / item. When the caller omits
    a location, the warehouse default operational location is used.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )

    if location is not None:
        if location.company_id != company.id:
            raise ValidationError(
                "Selected inventory location does not belong to this company."
            )

        if location.warehouse_id != warehouse.id:
            raise ValidationError(
                "Selected inventory location does not belong to this warehouse."
            )

        if (
            getattr(location, "status", "") != "ACTIVE"
            or not getattr(location, "is_active", False)
        ):
            raise ValidationError(
                "Selected inventory location is not active."
            )

        return location

    resolved_location = (
        InventoryLocation.objects.filter(
            company=company,
            warehouse=warehouse,
            status="ACTIVE",
            is_active=True,
            is_default=True,
        )
        .order_by("sequence", "id")
        .first()
    )

    if resolved_location is not None:
        return resolved_location

    resolved_location = (
        InventoryLocation.objects.filter(
            company=company,
            warehouse=warehouse,
            code="STOCK",
        )
        .order_by("id")
        .first()
    )

    if resolved_location is not None:
        update_fields = []

        if resolved_location.status != "ACTIVE":
            resolved_location.status = "ACTIVE"
            update_fields.append("status")

        if not resolved_location.is_active:
            resolved_location.is_active = True
            update_fields.append("is_active")

        if not resolved_location.is_default:
            resolved_location.is_default = True
            update_fields.append("is_default")

        if not resolved_location.is_pickable:
            resolved_location.is_pickable = True
            update_fields.append("is_pickable")

        if user and getattr(user, "is_authenticated", False):
            resolved_location.updated_by = user
            update_fields.append("updated_by")

        if update_fields:
            update_fields.append("updated_at")
            resolved_location.save(update_fields=update_fields)

        return resolved_location

    resolved_location = InventoryLocation(
        company=company,
        warehouse=warehouse,
        parent=None,
        status="ACTIVE",
        location_type="BIN",
        code="STOCK",
        name="Main Stock",
        name_ar="المخزون الرئيسي",
        name_en="Main Stock",
        barcode="",
        is_default=True,
        is_receiving=False,
        is_shipping=False,
        is_adjustment=False,
        is_pickable=True,
        is_active=True,
        sequence=10,
        notes=(
            "Automatically created by the location-aware "
            "stock services bridge."
        ),
        extra_data={
            "created_by_phase": "22.1.6.3",
            "purpose": "default_stock_location",
        },
        created_by=(
            user
            if user and getattr(user, "is_authenticated", False)
            else None
        ),
        updated_by=(
            user
            if user and getattr(user, "is_authenticated", False)
            else None
        ),
    )
    resolved_location.full_clean()
    resolved_location.save()

    return resolved_location


def get_or_create_stock_item(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    location: InventoryLocation | None = None,
    user=None,
) -> StockItem:
    """
    Get or create one location-level stock balance row.

    The same catalog item may have independent balances in multiple
    active locations inside the same warehouse. When location is omitted,
    the warehouse default stock location is resolved automatically.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )
    validate_item_for_inventory(
        company=company,
        item=item,
    )

    resolved_location = resolve_stock_location(
        company=company,
        warehouse=warehouse,
        location=location,
        user=user,
    )

    stock_item, _created = StockItem.objects.get_or_create(
        company=company,
        warehouse=warehouse,
        location=resolved_location,
        item=item,
        defaults={
            "quantity_on_hand": QUANTITY_ZERO,
            "reserved_quantity": QUANTITY_ZERO,
            "minimum_quantity": QUANTITY_ZERO,
            "maximum_quantity": QUANTITY_ZERO,
            "average_cost": quantize_money(
                item.cost_price
                or item.purchase_price
                or MONEY_ZERO
            ),
        },
    )

    return stock_item


def generate_stock_movement_number(company: Company) -> str:
    """
    Generate movement number per company.

    Format:
        STM-000001
    """
    last_id = (
        StockMovement.objects.filter(company=company).aggregate(max_id=Max("id"))[
            "max_id"
        ]
        or 0
    )
    return f"STM-{last_id + 1:06d}"


def resolve_movement_direction(
    *,
    movement_type: str,
    direction: str | None = None,
) -> str:
    """
    Resolve stock direction based on movement type.
    """
    if movement_type in [
        StockMovementType.IN,
        StockMovementType.TRANSFER_IN,
    ]:
        return StockMovementDirection.INCREASE

    if movement_type in [
        StockMovementType.OUT,
        StockMovementType.TRANSFER_OUT,
    ]:
        return StockMovementDirection.DECREASE

    if movement_type == StockMovementType.ADJUSTMENT:
        if direction not in [
            StockMovementDirection.INCREASE,
            StockMovementDirection.DECREASE,
        ]:
            raise ValidationError("Adjustment movement requires direction.")
        return direction

    raise ValidationError("Unsupported stock movement type.")


@transaction.atomic
def create_stock_movement(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    movement_type: str,
    location: InventoryLocation | None = None,
    quantity: Decimal | int | float | str,
    direction: str | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    movement_date=None,
    movement_number: str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
    post_immediately: bool = True,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Create stock movement.

    If post_immediately=True, movement is posted and stock balance is updated.

    If post_accounting=False, the stock ledger is posted without creating
    a separate accounting journal entry. This is used when a parent
    operational document creates one unified accounting entry.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )
    validate_item_for_inventory(company=company, item=item)

    quantity_value = quantize_quantity(quantity)
    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError("Quantity must be greater than zero.")

    resolved_direction = resolve_movement_direction(
        movement_type=movement_type,
        direction=direction,
    )

    stock_item = get_or_create_stock_item(
        company=company,
        warehouse=warehouse,
        item=item,
        location=location,
        user=user,
    )

    resolved_location = stock_item.location

    if unit_cost is not None:
        cost_source = unit_cost
    elif resolved_direction == StockMovementDirection.DECREASE:
        cost_source = (
            stock_item.average_cost
            or item.cost_price
            or item.purchase_price
            or MONEY_ZERO
        )
    else:
        cost_source = (
            item.cost_price
            or item.purchase_price
            or stock_item.average_cost
            or MONEY_ZERO
        )

    cost = quantize_money(cost_source)

    movement = StockMovement(
        company=company,
        warehouse=warehouse,
        location=resolved_location,
        stock_item=stock_item,
        item=item,
        movement_type=movement_type,
        direction=resolved_direction,
        status=StockMovementStatus.DRAFT,
        movement_number=movement_number or generate_stock_movement_number(company),
        movement_date=movement_date or timezone.localdate(),
        quantity=quantity_value,
        unit_cost=cost,
        reference_type=normalize_text(reference_type),
        reference_id=reference_id,
        reference_number=normalize_text(reference_number),
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )
    movement.apply_item_snapshot()
    movement.full_clean()
    movement.save()

    if post_immediately:
        movement = post_stock_movement(
            company=company,
            movement=movement,
            user=user,
            post_accounting=post_accounting,
        )

    return movement


def get_inventory_posting_source(movement: StockMovement) -> str:
    """
    Resolve PostingSource for inventory movement.
    """
    if movement.movement_type == StockMovementType.IN:
        return POSTING_SOURCE_INVENTORY_RECEIPT

    if movement.movement_type == StockMovementType.OUT:
        return POSTING_SOURCE_INVENTORY_ISSUE

    if movement.movement_type == StockMovementType.ADJUSTMENT:
        return POSTING_SOURCE_INVENTORY_ADJUSTMENT

    if movement.movement_type in [
        StockMovementType.TRANSFER_IN,
        StockMovementType.TRANSFER_OUT,
    ]:
        return POSTING_SOURCE_INVENTORY_TRANSFER

    return PostingSource.OTHER


def get_inventory_routing_source(movement: StockMovement) -> str:
    """
    Resolve AccountingRoutingSource for inventory movement.
    """
    if movement.movement_type == StockMovementType.IN:
        return AccountingRoutingSource.INVENTORY_RECEIPT

    if movement.movement_type == StockMovementType.OUT:
        return AccountingRoutingSource.INVENTORY_ISSUE

    if movement.movement_type == StockMovementType.ADJUSTMENT:
        return AccountingRoutingSource.INVENTORY_ADJUSTMENT

    if movement.movement_type in [
        StockMovementType.TRANSFER_IN,
        StockMovementType.TRANSFER_OUT,
    ]:
        return AccountingRoutingSource.INVENTORY_TRANSFER

    return AccountingRoutingSource.OTHER


def should_post_stock_movement_to_accounting(movement: StockMovement) -> bool:
    """
    Decide whether a stock movement should create a financial journal entry.

    Same-company transfer movements are stock ledger movements only in this
    foundation. They do not change total inventory value at GL level because
    the inventory remains owned by the same company.
    """
    if movement.movement_type in [
        StockMovementType.TRANSFER_IN,
        StockMovementType.TRANSFER_OUT,
    ]:
        return False

    return movement.movement_type in [
        StockMovementType.IN,
        StockMovementType.OUT,
        StockMovementType.ADJUSTMENT,
    ]


def source_id(value: Any) -> str:
    """
    Normalize source id for JournalEntry.source_id.
    """
    if value in [None, ""]:
        return ""

    return str(value).strip()


def get_existing_stock_movement_auto_entry(movement: StockMovement) -> JournalEntry | None:
    """
    Return existing automatic journal entry for a stock movement.

    This prevents duplicate accounting posting for the same stock movement.
    """
    if not movement:
        return None

    company = getattr(movement, "company", None)

    if not company:
        return None

    return (
        JournalEntry.objects.filter(
            company=company,
            source_type=AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
            source_id=source_id(getattr(movement, "pk", None)),
            source_number=normalize_text(getattr(movement, "movement_number", "")),
            is_auto_posted=True,
        )
        .exclude(status=JournalEntryStatus.CANCELLED)
        .order_by("id")
        .first()
    )


def find_stock_movement_journal_entry(movement: StockMovement) -> JournalEntry | None:
    """
    Public helper to find the automatic accounting entry linked to a stock movement.
    """
    return get_existing_stock_movement_auto_entry(movement)


def get_inventory_offset_account(
    *,
    company: Company,
    movement: StockMovement,
    routing_source: str,
):
    """
    Resolve the counter account for inventory movement posting.

    Priority:
    - OUT: cost of sales
    - ADJUSTMENT: inventory adjustment
    - IN: inventory adjustment, then opening equity, then suspense
    """
    if movement.movement_type == StockMovementType.OUT:
        account = get_account_by_purpose(
            company,
            ACCOUNT_PURPOSE_COST_OF_SALES,
            source=routing_source,
            required=False,
        )
        if account:
            return account

    if movement.movement_type == StockMovementType.ADJUSTMENT:
        account = get_account_by_purpose(
            company,
            ACCOUNT_PURPOSE_INVENTORY_ADJUSTMENT,
            source=routing_source,
            required=False,
        )
        if account:
            return account

    for purpose in [
        ACCOUNT_PURPOSE_INVENTORY_ADJUSTMENT,
        ACCOUNT_PURPOSE_OPENING_EQUITY,
        ACCOUNT_PURPOSE_SUSPENSE,
        AccountingAccountPurpose.OTHER,
    ]:
        account = get_account_by_purpose(
            company,
            purpose,
            source=routing_source,
            required=False,
        )
        if account:
            return account

    raise AccountingPostingError("لا يوجد حساب مقابل صالح لترحيل حركة المخزون.")


@transaction.atomic
def post_stock_movement_to_accounting(
    movement: StockMovement,
    *,
    actor: Any = None,
    auto_post: bool = True,
) -> JournalEntry | None:
    """
    Create and optionally post automatic accounting journal entry for posted stock movement.

    Accounting treatment:
    - Inventory IN:
        Debit  Inventory
        Credit Inventory Adjustment / Opening Equity / Suspense

    - Inventory OUT:
        Debit  Cost of Sales / Inventory Adjustment
        Credit Inventory

    - Adjustment IN:
        Debit  Inventory
        Credit Inventory Adjustment

    - Adjustment OUT:
        Debit  Inventory Adjustment
        Credit Inventory

    - Same-company transfers:
        No GL journal entry in this foundation.

    Safety:
    - Uses movement.company as tenant source.
    - Prevents duplicate entries.
    - Refuses non-posted movements.
    - Refuses zero-value movements.
    """
    if not movement:
        raise AccountingPostingError("حركة المخزون مطلوبة للترحيل المحاسبي.")

    company = getattr(movement, "company", None)

    if not company:
        raise AccountingPostingError("الشركة مطلوبة لترحيل حركة المخزون.")

    if getattr(movement, "company_id", None) != getattr(company, "pk", None):
        raise AccountingPostingError("حركة المخزون لا تتبع الشركة المحددة.")

    if not should_post_stock_movement_to_accounting(movement):
        return None

    movement_number = normalize_text(getattr(movement, "movement_number", "")) or f"STOCK-MOVEMENT-{movement.pk}"

    existing = get_existing_stock_movement_auto_entry(movement)

    if existing:
        if auto_post and existing.status == JournalEntryStatus.DRAFT:
            return post_journal_entry(existing, actor=actor)

        return existing

    if movement.status != StockMovementStatus.POSTED:
        raise AccountingPostingError("لا يمكن ترحيل حركة مخزون غير مرحلة.")

    total_cost = quantize_money(getattr(movement, "total_cost", MONEY_ZERO))

    if total_cost <= MONEY_ZERO:
        return None

    seed_company_chart_of_accounts(company)

    routing_source = get_inventory_routing_source(movement)
    posting_source = get_inventory_posting_source(movement)

    inventory_account = get_account_by_purpose(
        company,
        AccountingAccountPurpose.INVENTORY,
        source=routing_source,
        required=True,
    )
    offset_account = get_inventory_offset_account(
        company=company,
        movement=movement,
        routing_source=routing_source,
    )

    currency = normalize_text(getattr(company, "currency_code", "") or "SAR").upper()
    entry_date = getattr(movement, "movement_date", None) or timezone.localdate()
    warehouse_id = source_id(getattr(movement, "warehouse_id", None))
    item_id = source_id(getattr(movement, "item_id", None))
    reference_number = normalize_text(getattr(movement, "reference_number", ""))

    description = f"قيد تلقائي لحركة مخزون {movement_number}"

    entry = create_journal_entry_header(
        company=company,
        entry_date=entry_date,
        entry_number=generate_journal_entry_number(company, prefix="STK"),
        posting_source=posting_source,
        reference=movement_number,
        external_reference=reference_number or movement_number,
        description=description,
        notes="تم إنشاء هذا القيد تلقائيًا عند ترحيل حركة المخزون.",
        currency=currency,
        source_type=AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
        source_id=source_id(movement.pk),
        source_number=movement_number,
        is_auto_posted=True,
        actor=actor,
    )

    inventory_line_description = f"المخزون عن حركة {movement_number}"
    offset_line_description = f"الحساب المقابل لحركة مخزون {movement_number}"

    if movement.direction == StockMovementDirection.INCREASE:
        lines = [
            EntryLinePayload(
                account=inventory_account,
                description=inventory_line_description,
                debit_amount=total_cost,
                credit_amount=MONEY_ZERO,
                currency=currency,
                source_line_id=f"stock-inventory-{movement.pk}",
                sort_order=1,
                metadata={
                    "source": AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
                    "movement_id": movement.pk,
                    "movement_number": movement_number,
                    "warehouse_id": warehouse_id,
                    "item_id": item_id,
                    "direction": movement.direction,
                    "movement_type": movement.movement_type,
                    "bucket": "inventory",
                },
            ),
            EntryLinePayload(
                account=offset_account,
                description=offset_line_description,
                debit_amount=MONEY_ZERO,
                credit_amount=total_cost,
                currency=currency,
                source_line_id=f"stock-offset-{movement.pk}",
                sort_order=2,
                metadata={
                    "source": AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
                    "movement_id": movement.pk,
                    "movement_number": movement_number,
                    "warehouse_id": warehouse_id,
                    "item_id": item_id,
                    "direction": movement.direction,
                    "movement_type": movement.movement_type,
                    "bucket": "offset",
                },
            ),
        ]
    elif movement.direction == StockMovementDirection.DECREASE:
        lines = [
            EntryLinePayload(
                account=offset_account,
                description=offset_line_description,
                debit_amount=total_cost,
                credit_amount=MONEY_ZERO,
                currency=currency,
                source_line_id=f"stock-offset-{movement.pk}",
                sort_order=1,
                metadata={
                    "source": AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
                    "movement_id": movement.pk,
                    "movement_number": movement_number,
                    "warehouse_id": warehouse_id,
                    "item_id": item_id,
                    "direction": movement.direction,
                    "movement_type": movement.movement_type,
                    "bucket": "offset",
                },
            ),
            EntryLinePayload(
                account=inventory_account,
                description=inventory_line_description,
                debit_amount=MONEY_ZERO,
                credit_amount=total_cost,
                currency=currency,
                source_line_id=f"stock-inventory-{movement.pk}",
                sort_order=2,
                metadata={
                    "source": AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
                    "movement_id": movement.pk,
                    "movement_number": movement_number,
                    "warehouse_id": warehouse_id,
                    "item_id": item_id,
                    "direction": movement.direction,
                    "movement_type": movement.movement_type,
                    "bucket": "inventory",
                },
            ),
        ]
    else:
        raise AccountingPostingError("اتجاه حركة المخزون غير مدعوم محاسبيًا.")

    entry = replace_journal_entry_lines(
        entry,
        lines,
        actor=actor,
    )

    entry.metadata = {
        **(entry.metadata or {}),
        "source": AUTO_SOURCE_TYPE_STOCK_MOVEMENT,
        "source_app": "inventory",
        "movement_id": movement.pk,
        "movement_number": movement_number,
        "movement_type": movement.movement_type,
        "direction": movement.direction,
        "warehouse_id": warehouse_id,
        "item_id": item_id,
        "quantity": str(getattr(movement, "quantity", QUANTITY_ZERO)),
        "unit_cost": str(getattr(movement, "unit_cost", MONEY_ZERO)),
        "total_cost": str(total_cost),
        "reference_type": normalize_text(getattr(movement, "reference_type", "")),
        "reference_id": source_id(getattr(movement, "reference_id", None)),
        "reference_number": reference_number,
        "auto_posted_by_phase": "phase_10_3",
    }

    metadata_update_fields = ["metadata", "updated_at"]

    if actor is not None and getattr(actor, "is_authenticated", False):
        entry.updated_by = actor
        metadata_update_fields.append("updated_by")

    entry.save(update_fields=metadata_update_fields)

    if auto_post:
        entry = post_journal_entry(entry, actor=actor)

    return entry


@transaction.atomic
def post_stock_movement(
    *,
    company: Company,
    movement: StockMovement,
    user=None,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Post draft movement and update StockItem balance.

    When post_accounting=True, create the normal inventory accounting
    entry when applicable. Parent document workflows can set it to False
    when they create one unified accounting entry.
    """
    if movement.company_id != company.id:
        raise ValidationError("Selected stock movement does not belong to this company.")

    if not movement.can_post:
        raise ValidationError("Only draft stock movements can be posted.")

    validate_warehouse_for_company(
        company=company,
        warehouse=movement.warehouse,
        require_active=True,
    )
    validate_item_for_inventory(company=company, item=movement.item)

    if not movement.stock_item_id:
        raise ValidationError(
            "Stock movement must be linked to a stock balance before posting."
        )

    stock_item = (
        StockItem.objects.select_for_update()
        .select_related("location")
        .get(
            id=movement.stock_item_id,
            company=company,
            warehouse=movement.warehouse,
            item=movement.item,
        )
    )

    if movement.location_id != stock_item.location_id:
        raise ValidationError(
            {
                "location": (
                    "Stock movement location must match its stock balance "
                    "location."
                )
            }
        )

    quantity_before = quantize_quantity(stock_item.quantity_on_hand)
    quantity = quantize_quantity(movement.quantity)

    if movement.direction == StockMovementDirection.INCREASE:
        quantity_after = quantize_quantity(quantity_before + quantity)
    elif movement.direction == StockMovementDirection.DECREASE:
        quantity_after = quantize_quantity(quantity_before - quantity)
    else:
        raise ValidationError("Unsupported stock movement direction.")

    if quantity_after < QUANTITY_ZERO:
        raise ValidationError("Stock quantity cannot become negative.")

    stock_item.quantity_on_hand = quantity_after
    stock_item.last_movement_at = timezone.now()

    if movement.direction == StockMovementDirection.INCREASE and movement.unit_cost > MONEY_ZERO:
        old_total_cost = quantize_money(quantity_before * stock_item.average_cost)
        new_total_cost = quantize_money(quantity * movement.unit_cost)
        new_quantity = quantize_quantity(quantity_before + quantity)

        if new_quantity > QUANTITY_ZERO:
            stock_item.average_cost = quantize_money(
                (old_total_cost + new_total_cost) / new_quantity
            )

    stock_item.full_clean()
    stock_item.save(
        update_fields=[
            "quantity_on_hand",
            "average_cost",
            "last_movement_at",
            "updated_at",
        ]
    )

    movement.stock_item = stock_item
    movement.quantity_before = quantity_before
    movement.quantity_after = quantity_after
    movement.total_cost = quantize_money(movement.quantity * movement.unit_cost)
    movement.status = StockMovementStatus.POSTED
    movement.posted_at = timezone.now()

    if user and getattr(user, "is_authenticated", False):
        movement.posted_by = user
        movement.updated_by = user

    movement.full_clean()
    movement.save(
        update_fields=[
            "stock_item",
            "quantity_before",
            "quantity_after",
            "total_cost",
            "status",
            "posted_at",
            "posted_by",
            "updated_by",
            "updated_at",
        ]
    )

    if post_accounting:
        try:
            post_stock_movement_to_accounting(
                movement,
                actor=user,
                auto_post=True,
            )
        except AccountingPostingError as exc:
            raise ValidationError(
                {
                    "accounting": str(exc),
                }
            ) from exc

    return movement


@transaction.atomic
def cancel_draft_stock_movement(
    *,
    company: Company,
    movement: StockMovement,
    reason: str = "",
    user=None,
) -> StockMovement:
    """
    Cancel draft movement only.

    Posted movement cancellation/reversal should be handled later
    by creating a reverse movement, not by deleting stock ledger.
    """
    if movement.company_id != company.id:
        raise ValidationError("Selected stock movement does not belong to this company.")

    if not movement.can_cancel:
        raise ValidationError("Only draft stock movements can be cancelled.")

    movement.status = StockMovementStatus.CANCELLED
    movement.cancelled_at = timezone.now()
    movement.cancellation_reason = normalize_text(reason)

    if user and getattr(user, "is_authenticated", False):
        movement.cancelled_by = user
        movement.updated_by = user

    movement.full_clean()
    movement.save(
        update_fields=[
            "status",
            "cancelled_at",
            "cancelled_by",
            "cancellation_reason",
            "updated_by",
            "updated_at",
        ]
    )

    return movement


def receive_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    quantity: Decimal | int | float | str,
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    user=None,
) -> StockMovement:
    """
    Receive stock into warehouse.
    """
    return create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.IN,
        location=location,
        quantity=quantity,
        unit_cost=unit_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        user=user,
        post_immediately=True,
    )


def issue_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    quantity: Decimal | int | float | str,
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Issue stock from warehouse.
    """
    return create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.OUT,
        location=location,
        quantity=quantity,
        unit_cost=unit_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        extra_data=extra_data,
        user=user,
        post_immediately=True,
        post_accounting=post_accounting,
    )


def adjust_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    quantity: Decimal | int | float | str,
    direction: str,
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    reference_number: str = "",
    notes: str = "",
    user=None,
) -> StockMovement:
    """
    Manual stock adjustment.
    """
    return create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.ADJUSTMENT,
        location=location,
        direction=direction,
        quantity=quantity,
        unit_cost=unit_cost,
        reference_type="manual_adjustment",
        reference_number=reference_number,
        notes=notes,
        user=user,
        post_immediately=True,
    )


@transaction.atomic
def transfer_stock(
    *,
    company: Company,
    source_warehouse: Warehouse,
    target_warehouse: Warehouse,
    item: CatalogItem,
    quantity: Decimal | int | float | str,
    source_location: InventoryLocation | None = None,
    target_location: InventoryLocation | None = None,
    reference_number: str = "",
    notes: str = "",
    user=None,
) -> dict[str, StockMovement]:
    """
    Transfer stock between two inventory locations in the same company.

    Supported routes:
    - between different locations inside the same warehouse;
    - between locations in different warehouses.

    Two posted ledger movements are created:
    - TRANSFER_OUT from the source location;
    - TRANSFER_IN into the target location.

    Same-company transfers do not create accounting journal entries.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=source_warehouse,
        require_active=True,
    )
    validate_warehouse_for_company(
        company=company,
        warehouse=target_warehouse,
        require_active=True,
    )
    validate_item_for_inventory(
        company=company,
        item=item,
    )

    resolved_source_location = resolve_stock_location(
        company=company,
        warehouse=source_warehouse,
        location=source_location,
        user=user,
    )
    resolved_target_location = resolve_stock_location(
        company=company,
        warehouse=target_warehouse,
        location=target_location,
        user=user,
    )

    if (
        source_warehouse.id == target_warehouse.id
        and resolved_source_location.id == resolved_target_location.id
    ):
        raise ValidationError(
            "Source and target inventory locations cannot be the same."
        )

    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            "Quantity must be greater than zero."
        )

    outgoing = create_stock_movement(
        company=company,
        warehouse=source_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_OUT,
        location=resolved_source_location,
        quantity=quantity_value,
        reference_type="inventory_location_transfer",
        reference_number=reference_number,
        notes=notes,
        user=user,
        post_immediately=True,
    )

    incoming = create_stock_movement(
        company=company,
        warehouse=target_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_IN,
        location=resolved_target_location,
        quantity=quantity_value,
        unit_cost=outgoing.unit_cost,
        reference_type="inventory_location_transfer",
        reference_number=reference_number,
        notes=notes,
        user=user,
        post_immediately=True,
    )

    return {
        "outgoing": outgoing,
        "incoming": incoming,
    }


def validate_inventory_tracking_item(
    *,
    company: Company,
    item: CatalogItem,
    expected_method: str | None = None,
) -> None:
    """
    Validate that a catalog item can use detailed inventory tracking.

    company is always taken from trusted request/company context.
    """
    validate_item_for_inventory(
        company=company,
        item=item,
    )

    tracking_method = getattr(
        item,
        "inventory_tracking_method",
        CatalogItemTrackingMethod.NONE,
    )

    if tracking_method not in {
        CatalogItemTrackingMethod.BATCH,
        CatalogItemTrackingMethod.SERIAL,
    }:
        raise ValidationError(
            {
                "item": (
                    "Selected catalog item does not use "
                    "batch or serial inventory tracking."
                )
            }
        )

    if (
        expected_method is not None
        and tracking_method != expected_method
    ):
        raise ValidationError(
            {
                "item": (
                    "Selected catalog item does not use the "
                    "required inventory tracking method."
                )
            }
        )


def get_company_inventory_batches(
    company: Company,
) -> QuerySet[InventoryBatch]:
    """
    Return batch master records for one company only.
    """
    return (
        InventoryBatch.objects.filter(company=company)
        .select_related(
            "company",
            "item",
            "item__unit",
            "created_by",
            "updated_by",
        )
        .order_by(
            "item_id",
            "expiry_date",
            "batch_number",
            "id",
        )
    )


def get_company_inventory_batch_balances(
    company: Company,
) -> QuerySet[InventoryBatchBalance]:
    """
    Return location-level batch balances for one company only.
    """
    return (
        InventoryBatchBalance.objects.filter(company=company)
        .select_related(
            "company",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "item__unit",
            "batch",
        )
        .order_by(
            "warehouse_id",
            "location_id",
            "item_id",
            "batch_id",
            "id",
        )
    )


def get_company_inventory_serial_numbers(
    company: Company,
) -> QuerySet[InventorySerialNumber]:
    """
    Return serial number records for one company only.
    """
    return (
        InventorySerialNumber.objects.filter(company=company)
        .select_related(
            "company",
            "item",
            "item__unit",
            "warehouse",
            "location",
            "stock_item",
            "created_by",
            "updated_by",
        )
        .order_by(
            "item_id",
            "serial_number",
            "id",
        )
    )


def get_company_inventory_tracking_entries(
    company: Company,
) -> QuerySet[InventoryTrackingEntry]:
    """
    Return immutable detailed tracking ledger entries for one company.
    """
    return (
        InventoryTrackingEntry.objects.filter(company=company)
        .select_related(
            "company",
            "item",
            "warehouse",
            "location",
            "stock_item",
            "stock_movement",
            "batch",
            "serial_number",
            "created_by",
        )
        .order_by(
            "-occurred_at",
            "-created_at",
            "-id",
        )
    )


def validate_inventory_batch_for_company(
    *,
    company: Company,
    batch: InventoryBatch,
    item: CatalogItem | None = None,
    require_available: bool = False,
) -> None:
    """
    Validate batch ownership, item relation, and lifecycle availability.
    """
    if batch.company_id != company.id:
        raise ValidationError(
            {
                "batch": (
                    "Selected inventory batch does not "
                    "belong to this company."
                )
            }
        )

    if batch.item.company_id != company.id:
        raise ValidationError(
            {
                "batch": (
                    "Selected inventory batch item does not "
                    "belong to this company."
                )
            }
        )

    if item is not None and batch.item_id != item.id:
        raise ValidationError(
            {
                "batch": (
                    "Selected inventory batch does not "
                    "belong to this catalog item."
                )
            }
        )

    validate_inventory_tracking_item(
        company=company,
        item=batch.item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )

    if require_available and not batch.is_available_for_issue:
        raise ValidationError(
            {
                "batch": (
                    "Selected inventory batch is not "
                    "available for issue."
                )
            }
        )


def validate_inventory_serial_for_company(
    *,
    company: Company,
    serial_number: InventorySerialNumber,
    item: CatalogItem | None = None,
    warehouse: Warehouse | None = None,
    location: InventoryLocation | None = None,
    require_available: bool = False,
) -> None:
    """
    Validate serial ownership and current stock position.
    """
    if serial_number.company_id != company.id:
        raise ValidationError(
            {
                "serial_number": (
                    "Selected serial number does not "
                    "belong to this company."
                )
            }
        )

    if serial_number.item.company_id != company.id:
        raise ValidationError(
            {
                "serial_number": (
                    "Selected serial number item does not "
                    "belong to this company."
                )
            }
        )

    if item is not None and serial_number.item_id != item.id:
        raise ValidationError(
            {
                "serial_number": (
                    "Selected serial number does not "
                    "belong to this catalog item."
                )
            }
        )

    if (
        warehouse is not None
        and serial_number.warehouse_id != warehouse.id
    ):
        raise ValidationError(
            {
                "serial_number": (
                    "Selected serial number is not stored "
                    "in this warehouse."
                )
            }
        )

    if (
        location is not None
        and serial_number.location_id != location.id
    ):
        raise ValidationError(
            {
                "serial_number": (
                    "Selected serial number is not stored "
                    "in this inventory location."
                )
            }
        )

    validate_inventory_tracking_item(
        company=company,
        item=serial_number.item,
        expected_method=CatalogItemTrackingMethod.SERIAL,
    )

    if require_available and not serial_number.is_available:
        raise ValidationError(
            {
                "serial_number": (
                    "Selected serial number is not "
                    "available for issue."
                )
            }
        )


@transaction.atomic
def create_inventory_batch(
    *,
    company: Company,
    item: CatalogItem,
    batch_number: str,
    supplier_batch_number: str = "",
    manufactured_at=None,
    expiry_date=None,
    received_at=None,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> InventoryBatch:
    """
    Create one company-scoped batch or lot master record.
    """
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )

    normalized_batch_number = normalize_code(
        batch_number
    )

    if not normalized_batch_number:
        raise ValidationError(
            {
                "batch_number": (
                    "Inventory batch number is required."
                )
            }
        )

    batch = InventoryBatch(
        company=company,
        item=item,
        status=InventoryBatchStatus.ACTIVE,
        batch_number=normalized_batch_number,
        supplier_batch_number=normalize_code(
            supplier_batch_number
        ),
        manufactured_at=manufactured_at,
        expiry_date=expiry_date,
        received_at=received_at,
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
        updated_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
    )
    batch.full_clean()
    batch.save()

    return batch


@transaction.atomic
def get_or_create_inventory_batch_balance(
    *,
    company: Company,
    warehouse: Warehouse,
    location: InventoryLocation,
    item: CatalogItem,
    batch: InventoryBatch,
    stock_item: StockItem | None = None,
    user=None,
) -> InventoryBatchBalance:
    """
    Get or create one batch balance per warehouse location.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )
    validate_inventory_location_for_company(
        company=company,
        location=location,
        warehouse=warehouse,
        require_active=True,
    )
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )
    validate_inventory_batch_for_company(
        company=company,
        batch=batch,
        item=item,
    )

    resolved_stock_item = stock_item

    if resolved_stock_item is None:
        resolved_stock_item = get_or_create_stock_item(
            company=company,
            warehouse=warehouse,
            location=location,
            item=item,
            user=user,
        )

    if resolved_stock_item.company_id != company.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this company."
                )
            }
        )

    if resolved_stock_item.warehouse_id != warehouse.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this warehouse."
                )
            }
        )

    if resolved_stock_item.location_id != location.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this inventory location."
                )
            }
        )

    if resolved_stock_item.item_id != item.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this catalog item."
                )
            }
        )

    balance, created = (
        InventoryBatchBalance.objects.get_or_create(
            company=company,
            warehouse=warehouse,
            location=location,
            item=item,
            batch=batch,
            defaults={
                "stock_item": resolved_stock_item,
                "quantity_on_hand": QUANTITY_ZERO,
                "reserved_quantity": QUANTITY_ZERO,
                "average_cost": quantize_money(
                    resolved_stock_item.average_cost
                ),
            },
        )
    )

    if (
        not created
        and balance.stock_item_id
        != resolved_stock_item.id
    ):
        raise ValidationError(
            {
                "stock_item": (
                    "Existing batch balance is linked to "
                    "a different stock balance."
                )
            }
        )

    return balance


@transaction.atomic
def register_inventory_serial_number(
    *,
    company: Company,
    item: CatalogItem,
    serial_number: str,
    warehouse: Warehouse | None = None,
    location: InventoryLocation | None = None,
    stock_item: StockItem | None = None,
    manufacturer_serial_number: str = "",
    unit_cost: Decimal | int | float | str | None = None,
    received_at=None,
    status: str = InventorySerialStatus.AVAILABLE,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> InventorySerialNumber:
    """
    Register one serial number inside a company.

    Available or reserved serials must have a valid warehouse,
    location, and stock balance.
    """
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.SERIAL,
    )

    normalized_serial = normalize_code(
        serial_number
    )

    if not normalized_serial:
        raise ValidationError(
            {
                "serial_number": (
                    "Inventory serial number is required."
                )
            }
        )

    normalized_status = (
        normalize_code(status)
        or InventorySerialStatus.AVAILABLE
    )

    in_stock_statuses = {
        InventorySerialStatus.AVAILABLE,
        InventorySerialStatus.RESERVED,
        InventorySerialStatus.BLOCKED,
    }

    resolved_stock_item = stock_item
    resolved_location = location
    resolved_warehouse = warehouse

    if normalized_status in in_stock_statuses:
        if resolved_warehouse is None:
            raise ValidationError(
                {
                    "warehouse": (
                        "Warehouse is required for an "
                        "in-stock serial number."
                    )
                }
            )

        validate_warehouse_for_company(
            company=company,
            warehouse=resolved_warehouse,
            require_active=True,
        )

        resolved_location = resolve_stock_location(
            company=company,
            warehouse=resolved_warehouse,
            location=resolved_location,
            user=user,
        )

        if resolved_stock_item is None:
            resolved_stock_item = get_or_create_stock_item(
                company=company,
                warehouse=resolved_warehouse,
                location=resolved_location,
                item=item,
                user=user,
            )

        if resolved_stock_item.company_id != company.id:
            raise ValidationError(
                {
                    "stock_item": (
                        "Selected stock balance does not "
                        "belong to this company."
                    )
                }
            )

        if (
            resolved_stock_item.warehouse_id
            != resolved_warehouse.id
        ):
            raise ValidationError(
                {
                    "stock_item": (
                        "Selected stock balance does not "
                        "belong to this warehouse."
                    )
                }
            )

        if (
            resolved_stock_item.location_id
            != resolved_location.id
        ):
            raise ValidationError(
                {
                    "stock_item": (
                        "Selected stock balance does not "
                        "belong to this inventory location."
                    )
                }
            )

        if resolved_stock_item.item_id != item.id:
            raise ValidationError(
                {
                    "stock_item": (
                        "Selected stock balance does not "
                        "belong to this catalog item."
                    )
                }
            )

    serial = InventorySerialNumber(
        company=company,
        item=item,
        warehouse=resolved_warehouse,
        location=resolved_location,
        stock_item=resolved_stock_item,
        status=normalized_status,
        serial_number=normalized_serial,
        manufacturer_serial_number=normalize_code(
            manufacturer_serial_number
        ),
        unit_cost=quantize_money(
            unit_cost
            if unit_cost is not None
            else (
                item.cost_price
                or item.purchase_price
                or MONEY_ZERO
            )
        ),
        received_at=(
            received_at
            if received_at is not None
            else (
                timezone.now()
                if normalized_status in in_stock_statuses
                else None
            )
        ),
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
        updated_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
    )
    serial.full_clean()
    serial.save()

    return serial


def resolve_tracking_entry_direction(
    entry_type: str,
) -> str:
    """
    Resolve quantity direction for a tracking ledger entry.
    """
    increase_types = {
        InventoryTrackingEntryType.RECEIPT,
        InventoryTrackingEntryType.TRANSFER_IN,
        InventoryTrackingEntryType.ADJUSTMENT_IN,
        InventoryTrackingEntryType.RELEASE,
        InventoryTrackingEntryType.UNBLOCK,
    }

    decrease_types = {
        InventoryTrackingEntryType.ISSUE,
        InventoryTrackingEntryType.TRANSFER_OUT,
        InventoryTrackingEntryType.ADJUSTMENT_OUT,
        InventoryTrackingEntryType.RESERVATION,
        InventoryTrackingEntryType.BLOCK,
    }

    if entry_type in increase_types:
        return StockMovementDirection.INCREASE

    if entry_type in decrease_types:
        return StockMovementDirection.DECREASE

    raise ValidationError(
        {
            "entry_type": (
                "Unsupported inventory tracking "
                "entry type."
            )
        }
    )


@transaction.atomic
def create_inventory_tracking_entry(
    *,
    company: Company,
    item: CatalogItem,
    warehouse: Warehouse,
    location: InventoryLocation,
    stock_item: StockItem,
    entry_type: str,
    quantity: Decimal | int | float | str,
    batch: InventoryBatch | None = None,
    serial_number: InventorySerialNumber | None = None,
    stock_movement: StockMovement | None = None,
    quantity_before: Decimal | int | float | str = QUANTITY_ZERO,
    quantity_after: Decimal | int | float | str = QUANTITY_ZERO,
    unit_cost: Decimal | int | float | str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    occurred_at=None,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> InventoryTrackingEntry:
    """
    Create one immutable detailed inventory tracking ledger entry.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
    )
    validate_inventory_location_for_company(
        company=company,
        location=location,
        warehouse=warehouse,
    )
    validate_item_for_inventory(
        company=company,
        item=item,
    )

    if stock_item.company_id != company.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this company."
                )
            }
        )

    if stock_item.warehouse_id != warehouse.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this warehouse."
                )
            }
        )

    if stock_item.location_id != location.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this inventory location."
                )
            }
        )

    if stock_item.item_id != item.id:
        raise ValidationError(
            {
                "stock_item": (
                    "Selected stock balance does not "
                    "belong to this catalog item."
                )
            }
        )

    if (batch is None) == (serial_number is None):
        raise ValidationError(
            {
                "tracking": (
                    "Exactly one batch or serial number "
                    "must be supplied."
                )
            }
        )

    if batch is not None:
        validate_inventory_batch_for_company(
            company=company,
            batch=batch,
            item=item,
        )

    if serial_number is not None:
        validate_inventory_serial_for_company(
            company=company,
            serial_number=serial_number,
            item=item,
        )

    if stock_movement is not None:
        if stock_movement.company_id != company.id:
            raise ValidationError(
                {
                    "stock_movement": (
                        "Selected stock movement does not "
                        "belong to this company."
                    )
                }
            )

        if stock_movement.item_id != item.id:
            raise ValidationError(
                {
                    "stock_movement": (
                        "Selected stock movement does not "
                        "belong to this catalog item."
                    )
                }
            )

        if stock_movement.warehouse_id != warehouse.id:
            raise ValidationError(
                {
                    "stock_movement": (
                        "Selected stock movement does not "
                        "belong to this warehouse."
                    )
                }
            )

        if stock_movement.location_id != location.id:
            raise ValidationError(
                {
                    "stock_movement": (
                        "Selected stock movement does not "
                        "belong to this inventory location."
                    )
                }
            )

    normalized_entry_type = normalize_code(
        entry_type
    )
    direction = resolve_tracking_entry_direction(
        normalized_entry_type
    )

    quantity_value = quantize_quantity(
        quantity
    )

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Tracking quantity must be greater "
                    "than zero."
                )
            }
        )

    if (
        serial_number is not None
        and quantity_value != Decimal("1.0000")
    ):
        raise ValidationError(
            {
                "quantity": (
                    "Serial tracking entries must have "
                    "quantity equal to one."
                )
            }
        )

    entry = InventoryTrackingEntry(
        company=company,
        item=item,
        warehouse=warehouse,
        location=location,
        stock_item=stock_item,
        stock_movement=stock_movement,
        batch=batch,
        serial_number=serial_number,
        entry_type=normalized_entry_type,
        direction=direction,
        quantity=quantity_value,
        quantity_before=quantize_quantity(
            quantity_before
        ),
        quantity_after=quantize_quantity(
            quantity_after
        ),
        unit_cost=quantize_money(
            unit_cost
            if unit_cost is not None
            else stock_item.average_cost
        ),
        reference_type=normalize_text(
            reference_type
        ),
        reference_id=reference_id,
        reference_number=normalize_text(
            reference_number
        ),
        occurred_at=occurred_at or timezone.now(),
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
    )
    entry.full_clean()
    entry.save()

    return entry


def _normalize_serial_input(
    serial_values: list[Any] | tuple[Any, ...],
) -> list[Any]:
    """
    Normalize and validate a serial input collection.
    """
    values = list(serial_values or [])

    if not values:
        raise ValidationError(
            {
                "serial_numbers": (
                    "At least one serial number is required."
                )
            }
        )

    return values


def _validate_unique_serial_text_values(
    serial_values: list[str],
) -> list[str]:
    """
    Normalize serial text values and reject duplicates.
    """
    normalized_values = [
        normalize_code(value)
        for value in serial_values
    ]

    if any(not value for value in normalized_values):
        raise ValidationError(
            {
                "serial_numbers": (
                    "Serial numbers cannot be empty."
                )
            }
        )

    if len(normalized_values) != len(
        set(normalized_values)
    ):
        raise ValidationError(
            {
                "serial_numbers": (
                    "Duplicate serial numbers are not allowed "
                    "inside one stock receipt."
                )
            }
        )

    return normalized_values


@transaction.atomic
def receive_batch_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    batch: InventoryBatch,
    quantity: Decimal | int | float | str,
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Receive stock for one tracked inventory batch.

    The general StockItem balance, batch location balance,
    stock movement, and tracking ledger are updated atomically.
    """
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )
    validate_inventory_batch_for_company(
        company=company,
        batch=batch,
        item=item,
    )

    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Batch receipt quantity must be "
                    "greater than zero."
                )
            }
        )

    movement = create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.IN,
        location=location,
        quantity=quantity_value,
        unit_cost=unit_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.BATCH
            ),
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
        },
        user=user,
        post_immediately=True,
        post_accounting=post_accounting,
    )

    stock_item = movement.stock_item
    resolved_location = movement.location

    batch_balance = get_or_create_inventory_batch_balance(
        company=company,
        warehouse=warehouse,
        location=resolved_location,
        item=item,
        batch=batch,
        stock_item=stock_item,
        user=user,
    )

    batch_balance = (
        InventoryBatchBalance.objects.select_for_update()
        .get(
            id=batch_balance.id,
            company=company,
        )
    )

    quantity_before = quantize_quantity(
        batch_balance.quantity_on_hand
    )
    quantity_after = quantize_quantity(
        quantity_before + quantity_value
    )

    cost = quantize_money(
        movement.unit_cost
    )

    if cost > MONEY_ZERO:
        old_total_cost = quantize_money(
            quantity_before
            * batch_balance.average_cost
        )
        received_total_cost = quantize_money(
            quantity_value
            * cost
        )

        if quantity_after > QUANTITY_ZERO:
            batch_balance.average_cost = quantize_money(
                (
                    old_total_cost
                    + received_total_cost
                )
                / quantity_after
            )

    batch_balance.quantity_on_hand = quantity_after
    batch_balance.last_movement_at = (
        movement.posted_at
        or timezone.now()
    )
    batch_balance.full_clean()
    batch_balance.save(
        update_fields=[
            "quantity_on_hand",
            "average_cost",
            "last_movement_at",
            "updated_at",
        ]
    )

    batch_update_fields = []

    if batch.status in {
        InventoryBatchStatus.DEPLETED,
        InventoryBatchStatus.EXPIRED,
    } and not batch.is_expired:
        batch.status = InventoryBatchStatus.ACTIVE
        batch_update_fields.append("status")

    if batch.received_at is None:
        batch.received_at = (
            movement.posted_at
            or timezone.now()
        )
        batch_update_fields.append("received_at")

    if user and getattr(
        user,
        "is_authenticated",
        False,
    ):
        batch.updated_by = user
        batch_update_fields.append("updated_by")

    if batch_update_fields:
        batch.full_clean()
        batch_update_fields.append("updated_at")
        batch.save(
            update_fields=list(
                dict.fromkeys(batch_update_fields)
            )
        )

    create_inventory_tracking_entry(
        company=company,
        item=item,
        warehouse=warehouse,
        location=resolved_location,
        stock_item=stock_item,
        stock_movement=movement,
        batch=batch,
        entry_type=InventoryTrackingEntryType.RECEIPT,
        quantity=quantity_value,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        unit_cost=movement.unit_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        occurred_at=movement.posted_at,
        notes=notes,
        extra_data=extra_data,
        user=user,
    )

    return movement


@transaction.atomic
def issue_batch_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    batch: InventoryBatch,
    quantity: Decimal | int | float | str,
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Issue stock from one tracked inventory batch.
    """
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )
    validate_inventory_batch_for_company(
        company=company,
        batch=batch,
        item=item,
        require_available=True,
    )

    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Batch issue quantity must be "
                    "greater than zero."
                )
            }
        )

    resolved_location = resolve_stock_location(
        company=company,
        warehouse=warehouse,
        location=location,
        user=user,
    )

    stock_item = get_or_create_stock_item(
        company=company,
        warehouse=warehouse,
        location=resolved_location,
        item=item,
        user=user,
    )

    batch_balance = (
        InventoryBatchBalance.objects.select_for_update()
        .filter(
            company=company,
            warehouse=warehouse,
            location=resolved_location,
            stock_item=stock_item,
            item=item,
            batch=batch,
        )
        .first()
    )

    if batch_balance is None:
        raise ValidationError(
            {
                "batch": (
                    "No batch balance exists in the "
                    "selected inventory location."
                )
            }
        )

    quantity_before = quantize_quantity(
        batch_balance.quantity_on_hand
    )
    available_quantity = quantize_quantity(
        batch_balance.available_quantity
    )

    if quantity_value > available_quantity:
        raise ValidationError(
            {
                "quantity": (
                    "Batch available quantity is insufficient "
                    "for this issue."
                )
            }
        )

    quantity_after = quantize_quantity(
        quantity_before - quantity_value
    )

    movement = create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.OUT,
        location=resolved_location,
        quantity=quantity_value,
        unit_cost=(
            unit_cost
            if unit_cost is not None
            else batch_balance.average_cost
        ),
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.BATCH
            ),
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
        },
        user=user,
        post_immediately=True,
        post_accounting=post_accounting,
    )

    batch_balance.quantity_on_hand = quantity_after
    batch_balance.last_movement_at = (
        movement.posted_at
        or timezone.now()
    )
    batch_balance.full_clean()
    batch_balance.save(
        update_fields=[
            "quantity_on_hand",
            "last_movement_at",
            "updated_at",
        ]
    )

    other_positive_balance_exists = (
        InventoryBatchBalance.objects.filter(
            company=company,
            batch=batch,
            quantity_on_hand__gt=QUANTITY_ZERO,
        )
        .exclude(id=batch_balance.id)
        .exists()
    )

    if (
        quantity_after == QUANTITY_ZERO
        and not other_positive_balance_exists
        and batch.status == InventoryBatchStatus.ACTIVE
    ):
        batch.status = InventoryBatchStatus.DEPLETED

        if user and getattr(
            user,
            "is_authenticated",
            False,
        ):
            batch.updated_by = user

        batch.full_clean()
        batch.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

    create_inventory_tracking_entry(
        company=company,
        item=item,
        warehouse=warehouse,
        location=resolved_location,
        stock_item=stock_item,
        stock_movement=movement,
        batch=batch,
        entry_type=InventoryTrackingEntryType.ISSUE,
        quantity=quantity_value,
        quantity_before=quantity_before,
        quantity_after=quantity_after,
        unit_cost=movement.unit_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        occurred_at=movement.posted_at,
        notes=notes,
        extra_data=extra_data,
        user=user,
    )

    return movement


@transaction.atomic
def receive_serial_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    serial_numbers: list[str] | tuple[str, ...],
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    manufacturer_serial_numbers: (
        dict[str, str] | None
    ) = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Receive serial-tracked stock.

    One serial record and one tracking ledger entry are
    created for each received unit.
    """
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.SERIAL,
    )

    raw_serial_values = _normalize_serial_input(
        serial_numbers
    )
    normalized_serials = (
        _validate_unique_serial_text_values(
            [
                str(value)
                for value in raw_serial_values
            ]
        )
    )

    duplicate_exists = (
        InventorySerialNumber.objects.filter(
            company=company,
            serial_number__in=normalized_serials,
        )
        .exists()
    )

    if duplicate_exists:
        raise ValidationError(
            {
                "serial_numbers": (
                    "One or more serial numbers already "
                    "exist in this company."
                )
            }
        )

    resolved_location = resolve_stock_location(
        company=company,
        warehouse=warehouse,
        location=location,
        user=user,
    )

    quantity_value = quantize_quantity(
        len(normalized_serials)
    )

    movement = create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.IN,
        location=resolved_location,
        quantity=quantity_value,
        unit_cost=unit_cost,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.SERIAL
            ),
            "serial_numbers": normalized_serials,
        },
        user=user,
        post_immediately=True,
        post_accounting=post_accounting,
    )

    manufacturer_map = {
        normalize_code(key): normalize_code(value)
        for key, value in (
            manufacturer_serial_numbers or {}
        ).items()
    }

    for normalized_serial in normalized_serials:
        serial = register_inventory_serial_number(
            company=company,
            item=item,
            warehouse=warehouse,
            location=resolved_location,
            stock_item=movement.stock_item,
            serial_number=normalized_serial,
            manufacturer_serial_number=(
                manufacturer_map.get(
                    normalized_serial,
                    "",
                )
            ),
            unit_cost=movement.unit_cost,
            received_at=(
                movement.posted_at
                or timezone.now()
            ),
            status=InventorySerialStatus.AVAILABLE,
            notes=notes,
            extra_data={
                **(extra_data or {}),
                "received_by_movement_id": movement.id,
                "received_by_movement_number": (
                    movement.movement_number
                ),
            },
            user=user,
        )

        create_inventory_tracking_entry(
            company=company,
            item=item,
            warehouse=warehouse,
            location=resolved_location,
            stock_item=movement.stock_item,
            stock_movement=movement,
            serial_number=serial,
            entry_type=(
                InventoryTrackingEntryType.RECEIPT
            ),
            quantity=Decimal("1.0000"),
            quantity_before=QUANTITY_ZERO,
            quantity_after=Decimal("1.0000"),
            unit_cost=movement.unit_cost,
            reference_type=reference_type,
            reference_id=reference_id,
            reference_number=reference_number,
            occurred_at=movement.posted_at,
            notes=notes,
            extra_data=extra_data,
            user=user,
        )

    return movement


@transaction.atomic
def issue_serial_stock(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
    serial_numbers: (
        list[InventorySerialNumber]
        | tuple[InventorySerialNumber, ...]
    ),
    location: InventoryLocation | None = None,
    unit_cost: Decimal | int | float | str | None = None,
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
    post_accounting: bool = True,
) -> StockMovement:
    """
    Issue selected serial numbers from one inventory location.
    """
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.SERIAL,
    )

    serial_values = _normalize_serial_input(
        serial_numbers
    )

    serial_ids = [
        serial.id
        for serial in serial_values
        if isinstance(
            serial,
            InventorySerialNumber,
        )
        and serial.id is not None
    ]

    if len(serial_ids) != len(serial_values):
        raise ValidationError(
            {
                "serial_numbers": (
                    "Every serial value must be a saved "
                    "InventorySerialNumber instance."
                )
            }
        )

    if len(serial_ids) != len(set(serial_ids)):
        raise ValidationError(
            {
                "serial_numbers": (
                    "Duplicate serial records are not allowed "
                    "inside one stock issue."
                )
            }
        )

    resolved_location = resolve_stock_location(
        company=company,
        warehouse=warehouse,
        location=location,
        user=user,
    )

    locked_serials = list(
        InventorySerialNumber.objects.select_for_update()
        .select_related(
            "item",
            "warehouse",
            "location",
            "stock_item",
        )
        .filter(
            company=company,
            id__in=serial_ids,
        )
        .order_by("id")
    )

    if len(locked_serials) != len(serial_ids):
        raise ValidationError(
            {
                "serial_numbers": (
                    "One or more serial numbers were not "
                    "found for this company."
                )
            }
        )

    for serial in locked_serials:
        validate_inventory_serial_for_company(
            company=company,
            serial_number=serial,
            item=item,
            warehouse=warehouse,
            location=resolved_location,
            require_available=True,
        )

    stock_item_ids = {
        serial.stock_item_id
        for serial in locked_serials
    }

    if len(stock_item_ids) != 1:
        raise ValidationError(
            {
                "serial_numbers": (
                    "All issued serial numbers must belong "
                    "to the same stock balance."
                )
            }
        )

    stock_item = locked_serials[0].stock_item

    quantity_value = quantize_quantity(
        len(locked_serials)
    )

    movement = create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=item,
        movement_type=StockMovementType.OUT,
        location=resolved_location,
        quantity=quantity_value,
        unit_cost=(
            unit_cost
            if unit_cost is not None
            else stock_item.average_cost
        ),
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.SERIAL
            ),
            "serial_ids": serial_ids,
            "serial_numbers": [
                serial.serial_number
                for serial in locked_serials
            ],
        },
        user=user,
        post_immediately=True,
        post_accounting=post_accounting,
    )

    for serial in locked_serials:
        create_inventory_tracking_entry(
            company=company,
            item=item,
            warehouse=warehouse,
            location=resolved_location,
            stock_item=stock_item,
            stock_movement=movement,
            serial_number=serial,
            entry_type=InventoryTrackingEntryType.ISSUE,
            quantity=Decimal("1.0000"),
            quantity_before=Decimal("1.0000"),
            quantity_after=QUANTITY_ZERO,
            unit_cost=serial.unit_cost,
            reference_type=reference_type,
            reference_id=reference_id,
            reference_number=reference_number,
            occurred_at=movement.posted_at,
            notes=notes,
            extra_data=extra_data,
            user=user,
        )

        serial.status = InventorySerialStatus.ISSUED
        serial.warehouse = None
        serial.location = None
        serial.stock_item = None
        serial.issued_at = (
            movement.posted_at
            or timezone.now()
        )

        if user and getattr(
            user,
            "is_authenticated",
            False,
        ):
            serial.updated_by = user

        serial.full_clean()
        serial.save(
            update_fields=[
                "status",
                "warehouse",
                "location",
                "stock_item",
                "issued_at",
                "updated_by",
                "updated_at",
            ]
        )

    return movement


@transaction.atomic
def transfer_batch_stock(
    *,
    company: Company,
    source_warehouse: Warehouse,
    target_warehouse: Warehouse,
    item: CatalogItem,
    batch: InventoryBatch,
    quantity: Decimal | int | float | str,
    source_location: InventoryLocation | None = None,
    target_location: InventoryLocation | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> dict[str, StockMovement]:
    """
    Transfer one tracked batch between inventory locations.

    The operation creates two posted stock movements and two
    tracking ledger entries while preserving the company-wide
    batch lifecycle.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=source_warehouse,
        require_active=True,
    )
    validate_warehouse_for_company(
        company=company,
        warehouse=target_warehouse,
        require_active=True,
    )
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )
    validate_inventory_batch_for_company(
        company=company,
        batch=batch,
        item=item,
        require_available=True,
    )

    resolved_source_location = resolve_stock_location(
        company=company,
        warehouse=source_warehouse,
        location=source_location,
        user=user,
    )
    resolved_target_location = resolve_stock_location(
        company=company,
        warehouse=target_warehouse,
        location=target_location,
        user=user,
    )

    if (
        source_warehouse.id == target_warehouse.id
        and resolved_source_location.id
        == resolved_target_location.id
    ):
        raise ValidationError(
            {
                "target_location": (
                    "Source and target inventory locations "
                    "cannot be the same."
                )
            }
        )

    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Batch transfer quantity must be "
                    "greater than zero."
                )
            }
        )

    source_stock_item = get_or_create_stock_item(
        company=company,
        warehouse=source_warehouse,
        location=resolved_source_location,
        item=item,
        user=user,
    )

    source_batch_balance = (
        InventoryBatchBalance.objects.select_for_update()
        .filter(
            company=company,
            warehouse=source_warehouse,
            location=resolved_source_location,
            stock_item=source_stock_item,
            item=item,
            batch=batch,
        )
        .first()
    )

    if source_batch_balance is None:
        raise ValidationError(
            {
                "batch": (
                    "No batch balance exists in the "
                    "source inventory location."
                )
            }
        )

    source_quantity_before = quantize_quantity(
        source_batch_balance.quantity_on_hand
    )
    source_available_quantity = quantize_quantity(
        source_batch_balance.available_quantity
    )

    if quantity_value > source_available_quantity:
        raise ValidationError(
            {
                "quantity": (
                    "Source batch available quantity is "
                    "insufficient for this transfer."
                )
            }
        )

    target_stock_item = get_or_create_stock_item(
        company=company,
        warehouse=target_warehouse,
        location=resolved_target_location,
        item=item,
        user=user,
    )

    target_batch_balance = (
        get_or_create_inventory_batch_balance(
            company=company,
            warehouse=target_warehouse,
            location=resolved_target_location,
            item=item,
            batch=batch,
            stock_item=target_stock_item,
            user=user,
        )
    )

    target_batch_balance = (
        InventoryBatchBalance.objects.select_for_update()
        .get(
            id=target_batch_balance.id,
            company=company,
        )
    )

    source_quantity_after = quantize_quantity(
        source_quantity_before - quantity_value
    )
    target_quantity_before = quantize_quantity(
        target_batch_balance.quantity_on_hand
    )
    target_quantity_after = quantize_quantity(
        target_quantity_before + quantity_value
    )

    transfer_reference = (
        normalize_text(reference_number)
        or f"BATCH-TRANSFER-{batch.id}"
    )

    outgoing = create_stock_movement(
        company=company,
        warehouse=source_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_OUT,
        location=resolved_source_location,
        quantity=quantity_value,
        unit_cost=source_batch_balance.average_cost,
        reference_type="inventory_batch_transfer",
        reference_number=transfer_reference,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.BATCH
            ),
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
            "target_warehouse_id": target_warehouse.id,
            "target_location_id": (
                resolved_target_location.id
            ),
        },
        user=user,
        post_immediately=True,
        post_accounting=False,
    )

    incoming = create_stock_movement(
        company=company,
        warehouse=target_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_IN,
        location=resolved_target_location,
        quantity=quantity_value,
        unit_cost=outgoing.unit_cost,
        reference_type="inventory_batch_transfer",
        reference_number=transfer_reference,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.BATCH
            ),
            "batch_id": batch.id,
            "batch_number": batch.batch_number,
            "source_warehouse_id": source_warehouse.id,
            "source_location_id": (
                resolved_source_location.id
            ),
            "outgoing_movement_id": outgoing.id,
        },
        user=user,
        post_immediately=True,
        post_accounting=False,
    )

    source_batch_balance.quantity_on_hand = (
        source_quantity_after
    )
    source_batch_balance.last_movement_at = (
        outgoing.posted_at
        or timezone.now()
    )
    source_batch_balance.full_clean()
    source_batch_balance.save(
        update_fields=[
            "quantity_on_hand",
            "last_movement_at",
            "updated_at",
        ]
    )

    if outgoing.unit_cost > MONEY_ZERO:
        old_target_total = quantize_money(
            target_quantity_before
            * target_batch_balance.average_cost
        )
        transferred_total = quantize_money(
            quantity_value
            * outgoing.unit_cost
        )

        if target_quantity_after > QUANTITY_ZERO:
            target_batch_balance.average_cost = (
                quantize_money(
                    (
                        old_target_total
                        + transferred_total
                    )
                    / target_quantity_after
                )
            )

    target_batch_balance.quantity_on_hand = (
        target_quantity_after
    )
    target_batch_balance.last_movement_at = (
        incoming.posted_at
        or timezone.now()
    )
    target_batch_balance.full_clean()
    target_batch_balance.save(
        update_fields=[
            "quantity_on_hand",
            "average_cost",
            "last_movement_at",
            "updated_at",
        ]
    )

    create_inventory_tracking_entry(
        company=company,
        item=item,
        warehouse=source_warehouse,
        location=resolved_source_location,
        stock_item=source_stock_item,
        stock_movement=outgoing,
        batch=batch,
        entry_type=(
            InventoryTrackingEntryType.TRANSFER_OUT
        ),
        quantity=quantity_value,
        quantity_before=source_quantity_before,
        quantity_after=source_quantity_after,
        unit_cost=outgoing.unit_cost,
        reference_type="inventory_batch_transfer",
        reference_number=transfer_reference,
        occurred_at=outgoing.posted_at,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "target_warehouse_id": target_warehouse.id,
            "target_location_id": (
                resolved_target_location.id
            ),
            "incoming_movement_id": incoming.id,
        },
        user=user,
    )

    create_inventory_tracking_entry(
        company=company,
        item=item,
        warehouse=target_warehouse,
        location=resolved_target_location,
        stock_item=target_stock_item,
        stock_movement=incoming,
        batch=batch,
        entry_type=(
            InventoryTrackingEntryType.TRANSFER_IN
        ),
        quantity=quantity_value,
        quantity_before=target_quantity_before,
        quantity_after=target_quantity_after,
        unit_cost=incoming.unit_cost,
        reference_type="inventory_batch_transfer",
        reference_number=transfer_reference,
        occurred_at=incoming.posted_at,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "source_warehouse_id": source_warehouse.id,
            "source_location_id": (
                resolved_source_location.id
            ),
            "outgoing_movement_id": outgoing.id,
        },
        user=user,
    )

    return {
        "outgoing": outgoing,
        "incoming": incoming,
    }


@transaction.atomic
def transfer_serial_stock(
    *,
    company: Company,
    source_warehouse: Warehouse,
    target_warehouse: Warehouse,
    item: CatalogItem,
    serial_numbers: (
        list[InventorySerialNumber]
        | tuple[InventorySerialNumber, ...]
    ),
    source_location: InventoryLocation | None = None,
    target_location: InventoryLocation | None = None,
    reference_number: str = "",
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> dict[str, StockMovement]:
    """
    Transfer selected serial numbers between inventory locations.

    Serial status remains unchanged and each serial is moved to the
    target warehouse, location, and stock balance.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=source_warehouse,
        require_active=True,
    )
    validate_warehouse_for_company(
        company=company,
        warehouse=target_warehouse,
        require_active=True,
    )
    validate_inventory_tracking_item(
        company=company,
        item=item,
        expected_method=CatalogItemTrackingMethod.SERIAL,
    )

    serial_values = _normalize_serial_input(
        serial_numbers
    )

    serial_ids = [
        serial.id
        for serial in serial_values
        if isinstance(
            serial,
            InventorySerialNumber,
        )
        and serial.id is not None
    ]

    if len(serial_ids) != len(serial_values):
        raise ValidationError(
            {
                "serial_numbers": (
                    "Every serial value must be a saved "
                    "InventorySerialNumber instance."
                )
            }
        )

    if len(serial_ids) != len(set(serial_ids)):
        raise ValidationError(
            {
                "serial_numbers": (
                    "Duplicate serial records are not allowed "
                    "inside one stock transfer."
                )
            }
        )

    resolved_source_location = resolve_stock_location(
        company=company,
        warehouse=source_warehouse,
        location=source_location,
        user=user,
    )
    resolved_target_location = resolve_stock_location(
        company=company,
        warehouse=target_warehouse,
        location=target_location,
        user=user,
    )

    if (
        source_warehouse.id == target_warehouse.id
        and resolved_source_location.id
        == resolved_target_location.id
    ):
        raise ValidationError(
            {
                "target_location": (
                    "Source and target inventory locations "
                    "cannot be the same."
                )
            }
        )

    locked_serials = list(
        InventorySerialNumber.objects.select_for_update()
        .select_related(
            "item",
            "warehouse",
            "location",
            "stock_item",
        )
        .filter(
            company=company,
            id__in=serial_ids,
        )
        .order_by("id")
    )

    if len(locked_serials) != len(serial_ids):
        raise ValidationError(
            {
                "serial_numbers": (
                    "One or more serial numbers were not "
                    "found for this company."
                )
            }
        )

    for serial in locked_serials:
        validate_inventory_serial_for_company(
            company=company,
            serial_number=serial,
            item=item,
            warehouse=source_warehouse,
            location=resolved_source_location,
            require_available=True,
        )

    source_stock_item_ids = {
        serial.stock_item_id
        for serial in locked_serials
    }

    if len(source_stock_item_ids) != 1:
        raise ValidationError(
            {
                "serial_numbers": (
                    "All transferred serial numbers must "
                    "belong to the same source stock balance."
                )
            }
        )

    source_stock_item = locked_serials[0].stock_item

    target_stock_item = get_or_create_stock_item(
        company=company,
        warehouse=target_warehouse,
        location=resolved_target_location,
        item=item,
        user=user,
    )

    quantity_value = quantize_quantity(
        len(locked_serials)
    )

    transfer_reference = (
        normalize_text(reference_number)
        or "SERIAL-TRANSFER-"
        + "-".join(
            str(serial.id)
            for serial in locked_serials
        )
    )

    serial_id_list = [
        serial.id
        for serial in locked_serials
    ]
    serial_number_list = [
        serial.serial_number
        for serial in locked_serials
    ]

    outgoing = create_stock_movement(
        company=company,
        warehouse=source_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_OUT,
        location=resolved_source_location,
        quantity=quantity_value,
        unit_cost=source_stock_item.average_cost,
        reference_type="inventory_serial_transfer",
        reference_number=transfer_reference,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.SERIAL
            ),
            "serial_ids": serial_id_list,
            "serial_numbers": serial_number_list,
            "target_warehouse_id": target_warehouse.id,
            "target_location_id": (
                resolved_target_location.id
            ),
        },
        user=user,
        post_immediately=True,
        post_accounting=False,
    )

    incoming = create_stock_movement(
        company=company,
        warehouse=target_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_IN,
        location=resolved_target_location,
        quantity=quantity_value,
        unit_cost=outgoing.unit_cost,
        reference_type="inventory_serial_transfer",
        reference_number=transfer_reference,
        notes=notes,
        extra_data={
            **(extra_data or {}),
            "inventory_tracking_method": (
                CatalogItemTrackingMethod.SERIAL
            ),
            "serial_ids": serial_id_list,
            "serial_numbers": serial_number_list,
            "source_warehouse_id": source_warehouse.id,
            "source_location_id": (
                resolved_source_location.id
            ),
            "outgoing_movement_id": outgoing.id,
        },
        user=user,
        post_immediately=True,
        post_accounting=False,
    )

    for serial in locked_serials:
        create_inventory_tracking_entry(
            company=company,
            item=item,
            warehouse=source_warehouse,
            location=resolved_source_location,
            stock_item=source_stock_item,
            stock_movement=outgoing,
            serial_number=serial,
            entry_type=(
                InventoryTrackingEntryType.TRANSFER_OUT
            ),
            quantity=Decimal("1.0000"),
            quantity_before=Decimal("1.0000"),
            quantity_after=QUANTITY_ZERO,
            unit_cost=serial.unit_cost,
            reference_type="inventory_serial_transfer",
            reference_number=transfer_reference,
            occurred_at=outgoing.posted_at,
            notes=notes,
            extra_data={
                **(extra_data or {}),
                "target_warehouse_id": target_warehouse.id,
                "target_location_id": (
                    resolved_target_location.id
                ),
                "incoming_movement_id": incoming.id,
            },
            user=user,
        )

        serial.warehouse = target_warehouse
        serial.location = resolved_target_location
        serial.stock_item = target_stock_item

        if user and getattr(
            user,
            "is_authenticated",
            False,
        ):
            serial.updated_by = user

        serial.full_clean()
        serial.save(
            update_fields=[
                "warehouse",
                "location",
                "stock_item",
                "updated_by",
                "updated_at",
            ]
        )

        create_inventory_tracking_entry(
            company=company,
            item=item,
            warehouse=target_warehouse,
            location=resolved_target_location,
            stock_item=target_stock_item,
            stock_movement=incoming,
            serial_number=serial,
            entry_type=(
                InventoryTrackingEntryType.TRANSFER_IN
            ),
            quantity=Decimal("1.0000"),
            quantity_before=QUANTITY_ZERO,
            quantity_after=Decimal("1.0000"),
            unit_cost=serial.unit_cost,
            reference_type="inventory_serial_transfer",
            reference_number=transfer_reference,
            occurred_at=incoming.posted_at,
            notes=notes,
            extra_data={
                **(extra_data or {}),
                "source_warehouse_id": source_warehouse.id,
                "source_location_id": (
                    resolved_source_location.id
                ),
                "outgoing_movement_id": outgoing.id,
            },
            user=user,
        )

    return {
        "outgoing": outgoing,
        "incoming": incoming,
    }

# ============================================================
# Phase 22.3.2.1 - Stock Reservation Service Foundation
# ============================================================


def generate_stock_reservation_number(
    company: Company,
) -> str:
    """
    Generate the next company-scoped reservation number.
    """
    if company is None:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    last_id = (
        StockReservation.objects
        .filter(company=company)
        .aggregate(max_id=Max("id"))
        .get("max_id")
        or 0
    )

    return f"RSV-{last_id + 1:06d}"


def get_company_stock_reservations(
    company: Company,
) -> QuerySet[StockReservation]:
    """
    Return reservations belonging to one company.
    """
    if company is None:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    return (
        StockReservation.objects
        .filter(company=company)
        .select_related(
            "company",
            "sales_order",
            "sales_order__branch",
            "sales_order__customer",
            "created_by",
            "updated_by",
            "allocated_by",
            "released_by",
            "cancelled_by",
        )
        .prefetch_related("allocations")
        .order_by("-created_at", "-id")
    )


def get_company_stock_reservation_allocations(
    company: Company,
) -> QuerySet[StockReservationAllocation]:
    """
    Return allocations belonging to one company.
    """
    if company is None:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    return (
        StockReservationAllocation.objects
        .filter(company=company)
        .select_related(
            "company",
            "reservation",
            "reservation__sales_order",
            "sales_order_item",
            "sales_order_item__order",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "item__unit",
            "batch",
            "serial_number",
            "created_by",
            "updated_by",
            "released_by",
        )
        .order_by(
            "reservation_id",
            "sales_order_item_id",
            "warehouse_id",
            "location_id",
            "id",
        )
    )


def validate_sales_order_for_stock_reservation(
    *,
    company: Company,
    sales_order: SalesOrder,
    require_reservable_status: bool = True,
) -> None:
    """
    Validate sales order ownership and lifecycle.
    """
    if company is None:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    if sales_order is None:
        raise ValidationError(
            {"sales_order": "Sales order is required."}
        )

    if sales_order.company_id != company.id:
        raise ValidationError(
            {
                "sales_order": (
                    "Sales order does not belong "
                    "to this company."
                )
            }
        )

    if not require_reservable_status:
        return

    allowed_statuses = {
        SalesOrderStatus.CONFIRMED,
        SalesOrderStatus.PROCESSING,
    }

    if sales_order.status not in allowed_statuses:
        raise ValidationError(
            {
                "sales_order": (
                    "Only confirmed or processing sales "
                    "orders can reserve stock."
                )
            }
        )


def validate_sales_order_item_for_stock_reservation(
    *,
    company: Company,
    sales_order: SalesOrder,
    sales_order_item: SalesOrderItem,
) -> None:
    """
    Validate one sales order item for reservation.
    """
    validate_sales_order_for_stock_reservation(
        company=company,
        sales_order=sales_order,
    )

    if sales_order_item is None:
        raise ValidationError(
            {
                "sales_order_item": (
                    "Sales order item is required."
                )
            }
        )

    if sales_order_item.company_id != company.id:
        raise ValidationError(
            {
                "sales_order_item": (
                    "Sales order item does not belong "
                    "to this company."
                )
            }
        )

    if sales_order_item.order_id != sales_order.id:
        raise ValidationError(
            {
                "sales_order_item": (
                    "Sales order item does not belong "
                    "to this sales order."
                )
            }
        )

    if not sales_order_item.catalog_item_id:
        raise ValidationError(
            {
                "sales_order_item": (
                    "Sales order item must reference "
                    "a catalog item."
                )
            }
        )

    item = sales_order_item.catalog_item

    validate_item_for_inventory(
        company=company,
        item=item,
    )

    if not item.track_inventory:
        raise ValidationError(
            {
                "sales_order_item": (
                    "Catalog item must have inventory "
                    "tracking enabled."
                )
            }
        )

    if (
        quantize_quantity(sales_order_item.quantity)
        <= QUANTITY_ZERO
    ):
        raise ValidationError(
            {
                "sales_order_item": (
                    "Sales order item quantity must be "
                    "greater than zero."
                )
            }
        )


def build_stock_reservation_allocation_payload(
    allocation: StockReservationAllocation,
) -> dict[str, Any]:
    """
    Serialize one reservation allocation.
    """
    return {
        "id": allocation.id,
        "company_id": allocation.company_id,
        "reservation_id": allocation.reservation_id,
        "sales_order_id": (
            allocation.reservation.sales_order_id
        ),
        "sales_order_item_id": (
            allocation.sales_order_item_id
        ),
        "warehouse_id": allocation.warehouse_id,
        "warehouse_code": allocation.warehouse.code,
        "warehouse_name": (
            allocation.warehouse.display_name
        ),
        "location_id": allocation.location_id,
        "location_code": allocation.location.code,
        "location_name": (
            allocation.location.display_name
        ),
        "location_path": allocation.location.full_path,
        "stock_item_id": allocation.stock_item_id,
        "item_id": allocation.item_id,
        "item_code": allocation.item.code,
        "item_name": allocation.item.name,
        "batch_id": allocation.batch_id,
        "batch_number": (
            allocation.batch.batch_number
            if allocation.batch_id
            else ""
        ),
        "serial_number_id": (
            allocation.serial_number_id
        ),
        "serial_number": (
            allocation.serial_number.serial_number
            if allocation.serial_number_id
            else ""
        ),
        "status": allocation.status,
        "reserved_quantity": str(
            allocation.reserved_quantity
        ),
        "fulfilled_quantity": str(
            allocation.fulfilled_quantity
        ),
        "released_quantity": str(
            allocation.released_quantity
        ),
        "remaining_reserved_quantity": str(
            allocation.remaining_reserved_quantity
        ),
        "reserved_at": (
            allocation.reserved_at.isoformat()
            if allocation.reserved_at
            else None
        ),
        "fulfilled_at": (
            allocation.fulfilled_at.isoformat()
            if allocation.fulfilled_at
            else None
        ),
        "released_at": (
            allocation.released_at.isoformat()
            if allocation.released_at
            else None
        ),
        "cancelled_at": (
            allocation.cancelled_at.isoformat()
            if allocation.cancelled_at
            else None
        ),
        "release_reason": allocation.release_reason,
        "cancellation_reason": (
            allocation.cancellation_reason
        ),
        "notes": allocation.notes,
        "extra_data": allocation.extra_data or {},
        "created_at": (
            allocation.created_at.isoformat()
            if allocation.created_at
            else None
        ),
        "updated_at": (
            allocation.updated_at.isoformat()
            if allocation.updated_at
            else None
        ),
    }


def build_stock_reservation_payload(
    reservation: StockReservation,
    *,
    include_allocations: bool = False,
) -> dict[str, Any]:
    """
    Serialize one stock reservation.
    """
    data = {
        "id": reservation.id,
        "company_id": reservation.company_id,
        "sales_order_id": reservation.sales_order_id,
        "sales_order_number": (
            reservation.sales_order.order_number
        ),
        "reservation_number": (
            reservation.reservation_number
        ),
        "status": reservation.status,
        "source": reservation.source,
        "requested_quantity": str(
            reservation.requested_quantity
        ),
        "reserved_quantity": str(
            reservation.reserved_quantity
        ),
        "fulfilled_quantity": str(
            reservation.fulfilled_quantity
        ),
        "released_quantity": str(
            reservation.released_quantity
        ),
        "remaining_reserved_quantity": str(
            reservation.remaining_reserved_quantity
        ),
        "unallocated_quantity": str(
            reservation.unallocated_quantity
        ),
        "is_active": reservation.is_active,
        "is_terminal": reservation.is_terminal,
        "is_expired_now": reservation.is_expired_now,
        "expires_at": (
            reservation.expires_at.isoformat()
            if reservation.expires_at
            else None
        ),
        "allocated_at": (
            reservation.allocated_at.isoformat()
            if reservation.allocated_at
            else None
        ),
        "fulfilled_at": (
            reservation.fulfilled_at.isoformat()
            if reservation.fulfilled_at
            else None
        ),
        "released_at": (
            reservation.released_at.isoformat()
            if reservation.released_at
            else None
        ),
        "cancelled_at": (
            reservation.cancelled_at.isoformat()
            if reservation.cancelled_at
            else None
        ),
        "expired_at": (
            reservation.expired_at.isoformat()
            if reservation.expired_at
            else None
        ),
        "release_reason": reservation.release_reason,
        "cancellation_reason": (
            reservation.cancellation_reason
        ),
        "notes": reservation.notes,
        "extra_data": reservation.extra_data or {},
        "created_by_id": reservation.created_by_id,
        "updated_by_id": reservation.updated_by_id,
        "allocated_by_id": reservation.allocated_by_id,
        "released_by_id": reservation.released_by_id,
        "cancelled_by_id": reservation.cancelled_by_id,
        "created_at": (
            reservation.created_at.isoformat()
            if reservation.created_at
            else None
        ),
        "updated_at": (
            reservation.updated_at.isoformat()
            if reservation.updated_at
            else None
        ),
    }

    if include_allocations:
        allocations = (
            reservation.allocations
            .select_related(
                "reservation",
                "sales_order_item",
                "warehouse",
                "location",
                "stock_item",
                "item",
                "batch",
                "serial_number",
            )
            .order_by(
                "sales_order_item_id",
                "warehouse_id",
                "location_id",
                "id",
            )
        )

        data["allocations"] = [
            build_stock_reservation_allocation_payload(
                allocation
            )
            for allocation in allocations
        ]

    return data


# End Phase 22.3.2.1 - Stock Reservation Service Foundation
# ============================================================

# ============================================================
# Phase 22.3.2.2 - Atomic Stock Reservation Allocation
# ============================================================


def _reservation_actor(user):
    """
    Return authenticated user or None for audit fields.
    """
    if user and getattr(
        user,
        "is_authenticated",
        False,
    ):
        return user

    return None


def _get_sales_order_requested_quantity(
    sales_order: SalesOrder,
) -> Decimal:
    """
    Calculate total reservable product quantity for one order.
    """
    total = QUANTITY_ZERO

    order_items = (
        sales_order.items
        .select_related("catalog_item")
        .order_by("id")
    )

    for order_item in order_items:
        if not order_item.catalog_item_id:
            continue

        item = order_item.catalog_item

        if not item.track_inventory:
            continue

        if item.item_type != CatalogItemType.PRODUCT:
            continue

        total = quantize_quantity(
            total
            + quantize_quantity(
                order_item.quantity
            )
        )

    return total


@transaction.atomic
def create_sales_order_stock_reservation(
    *,
    company: Company,
    sales_order: SalesOrder,
    reservation_number: str | None = None,
    expires_at=None,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> StockReservation:
    """
    Create one draft reservation header for a sales order.

    This operation does not update StockItem and does not create
    any StockMovement. Physical stock is affected only when an
    allocation is created.
    """
    locked_order = (
        SalesOrder.objects
        .select_for_update()
        .prefetch_related("items__catalog_item")
        .get(
            id=sales_order.id,
            company=company,
        )
    )

    validate_sales_order_for_stock_reservation(
        company=company,
        sales_order=locked_order,
    )

    requested_quantity = (
        _get_sales_order_requested_quantity(
            locked_order
        )
    )

    if requested_quantity <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "sales_order": (
                    "Sales order has no inventory-tracked "
                    "product quantity to reserve."
                )
            }
        )

    active_statuses = {
        StockReservationStatus.DRAFT,
        StockReservationStatus.PARTIALLY_ALLOCATED,
        StockReservationStatus.ALLOCATED,
        StockReservationStatus.PARTIALLY_FULFILLED,
    }

    existing_active = (
        StockReservation.objects
        .select_for_update()
        .filter(
            company=company,
            sales_order=locked_order,
            status__in=active_statuses,
        )
        .order_by("id")
        .first()
    )

    if existing_active is not None:
        raise ValidationError(
            {
                "sales_order": (
                    "An active stock reservation already "
                    "exists for this sales order."
                )
            }
        )

    actor = _reservation_actor(user)

    reservation = StockReservation(
        company=company,
        sales_order=locked_order,
        reservation_number=(
            normalize_code(reservation_number)
            or generate_stock_reservation_number(
                company
            )
        ),
        status=StockReservationStatus.DRAFT,
        source=StockReservationSource.SALES_ORDER,
        requested_quantity=requested_quantity,
        reserved_quantity=QUANTITY_ZERO,
        fulfilled_quantity=QUANTITY_ZERO,
        released_quantity=QUANTITY_ZERO,
        expires_at=expires_at,
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )
    reservation.full_clean()
    reservation.save()

    return reservation


@transaction.atomic
def allocate_stock_reservation(
    *,
    company: Company,
    reservation: StockReservation,
    sales_order_item: SalesOrderItem,
    stock_item: StockItem,
    quantity: Decimal | int | float | str,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> StockReservationAllocation:
    """
    Reserve physical quantity from one location-level StockItem.

    Atomic effects:
    - lock reservation;
    - lock sales order item;
    - lock StockItem;
    - increase StockItem.reserved_quantity;
    - create reservation allocation;
    - update reservation totals and lifecycle.

    No StockMovement is created and quantity_on_hand is unchanged.
    """
    quantity_value = quantize_quantity(
        quantity
    )

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Reservation allocation quantity must "
                    "be greater than zero."
                )
            }
        )

    locked_reservation = (
        StockReservation.objects
        .select_for_update()
        .select_related("sales_order")
        .get(
            id=reservation.id,
            company=company,
        )
    )

    allowed_statuses = {
        StockReservationStatus.DRAFT,
        StockReservationStatus.PARTIALLY_ALLOCATED,
    }

    if locked_reservation.status not in allowed_statuses:
        raise ValidationError(
            {
                "reservation": (
                    "Only draft or partially allocated "
                    "reservations can receive allocations."
                )
            }
        )

    if locked_reservation.is_expired_now:
        raise ValidationError(
            {
                "reservation": (
                    "Expired reservation cannot receive "
                    "new allocations."
                )
            }
        )

    locked_order_item = (
        SalesOrderItem.objects
        .select_for_update()
        .select_related(
            "order",
            "catalog_item",
        )
        .get(
            id=sales_order_item.id,
            company=company,
        )
    )

    validate_sales_order_item_for_stock_reservation(
        company=company,
        sales_order=locked_reservation.sales_order,
        sales_order_item=locked_order_item,
    )

    locked_stock_item = (
        StockItem.objects
        .select_for_update()
        .select_related(
            "warehouse",
            "location",
            "item",
        )
        .get(
            id=stock_item.id,
            company=company,
        )
    )

    validate_warehouse_for_company(
        company=company,
        warehouse=locked_stock_item.warehouse,
        require_active=True,
    )
    validate_inventory_location_for_company(
        company=company,
        location=locked_stock_item.location,
        warehouse=locked_stock_item.warehouse,
        require_active=True,
    )

    if not locked_stock_item.location.is_pickable:
        raise ValidationError(
            {
                "location": (
                    "Stock reservation requires a pickable "
                    "inventory location."
                )
            }
        )

    if (
        locked_stock_item.item_id
        != locked_order_item.catalog_item_id
    ):
        raise ValidationError(
            {
                "stock_item": (
                    "Stock balance item does not match "
                    "the sales order item."
                )
            }
        )

    if quantity_value > locked_stock_item.available_quantity:
        raise ValidationError(
            {
                "quantity": (
                    "Available stock quantity is insufficient "
                    "for this reservation allocation."
                )
            }
        )

    if quantity_value > (
        locked_reservation.unallocated_quantity
    ):
        raise ValidationError(
            {
                "quantity": (
                    "Allocation quantity exceeds the "
                    "reservation unallocated quantity."
                )
            }
        )

    existing_line_quantity = QUANTITY_ZERO

    existing_allocations = (
        StockReservationAllocation.objects
        .select_for_update()
        .filter(
            company=company,
            reservation=locked_reservation,
            sales_order_item=locked_order_item,
        )
        .exclude(
            status__in=[
                StockReservationAllocationStatus.RELEASED,
                StockReservationAllocationStatus.CANCELLED,
            ]
        )
    )

    for existing_allocation in existing_allocations:
        existing_line_quantity = quantize_quantity(
            existing_line_quantity
            + existing_allocation.reserved_quantity
        )

    order_line_quantity = quantize_quantity(
        locked_order_item.quantity
    )

    if (
        existing_line_quantity + quantity_value
        > order_line_quantity
    ):
        raise ValidationError(
            {
                "quantity": (
                    "Allocation quantity exceeds the sales "
                    "order item quantity."
                )
            }
        )

    actor = _reservation_actor(user)
    now = timezone.now()

    allocation = StockReservationAllocation(
        company=company,
        reservation=locked_reservation,
        sales_order_item=locked_order_item,
        warehouse=locked_stock_item.warehouse,
        location=locked_stock_item.location,
        stock_item=locked_stock_item,
        item=locked_stock_item.item,
        status=(
            StockReservationAllocationStatus.RESERVED
        ),
        reserved_quantity=quantity_value,
        fulfilled_quantity=QUANTITY_ZERO,
        released_quantity=QUANTITY_ZERO,
        reserved_at=now,
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )
    allocation.full_clean()

    locked_stock_item.reserved_quantity = (
        quantize_quantity(
            locked_stock_item.reserved_quantity
            + quantity_value
        )
    )
    locked_stock_item.full_clean()
    locked_stock_item.save(
        update_fields=[
            "reserved_quantity",
            "updated_at",
        ]
    )

    allocation.save()

    locked_reservation.reserved_quantity = (
        quantize_quantity(
            locked_reservation.reserved_quantity
            + quantity_value
        )
    )

    if (
        locked_reservation.reserved_quantity
        == locked_reservation.requested_quantity
    ):
        locked_reservation.status = (
            StockReservationStatus.ALLOCATED
        )
    else:
        locked_reservation.status = (
            StockReservationStatus
            .PARTIALLY_ALLOCATED
        )

    if locked_reservation.allocated_at is None:
        locked_reservation.allocated_at = now

    if actor is not None:
        locked_reservation.allocated_by = actor
        locked_reservation.updated_by = actor

    locked_reservation.full_clean()
    locked_reservation.save(
        update_fields=[
            "reserved_quantity",
            "status",
            "allocated_at",
            "allocated_by",
            "updated_by",
            "updated_at",
        ]
    )

    return allocation


# End Phase 22.3.2.2 - Atomic Stock Reservation Allocation
# ============================================================

# ============================================================
# Phase 22.3.2.3 - Reservation Release Cancellation Expiry
# ============================================================


def _resolve_reservation_active_status(
    reservation: StockReservation,
) -> str:
    """
    Resolve a non-terminal reservation status from its totals.
    """
    remaining_quantity = quantize_quantity(
        reservation.remaining_reserved_quantity
    )

    if remaining_quantity <= QUANTITY_ZERO:
        if (
            reservation.fulfilled_quantity
            >= reservation.reserved_quantity
            and reservation.reserved_quantity
            > QUANTITY_ZERO
        ):
            return StockReservationStatus.FULFILLED

        if (
            reservation.released_quantity
            >= reservation.reserved_quantity
            and reservation.fulfilled_quantity
            == QUANTITY_ZERO
        ):
            return StockReservationStatus.RELEASED

    if reservation.fulfilled_quantity > QUANTITY_ZERO:
        return (
            StockReservationStatus
            .PARTIALLY_FULFILLED
        )

    if (
        reservation.reserved_quantity
        >= reservation.requested_quantity
    ):
        return StockReservationStatus.ALLOCATED

    if reservation.reserved_quantity > QUANTITY_ZERO:
        return (
            StockReservationStatus
            .PARTIALLY_ALLOCATED
        )

    return StockReservationStatus.DRAFT


def _release_locked_stock_quantity(
    *,
    company: Company,
    stock_item: StockItem,
    quantity: Decimal,
) -> StockItem:
    """
    Decrease one locked StockItem reserved quantity safely.
    """
    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Released quantity must be greater "
                    "than zero."
                )
            }
        )

    locked_stock_item = (
        StockItem.objects
        .select_for_update()
        .get(
            id=stock_item.id,
            company=company,
        )
    )

    current_reserved = quantize_quantity(
        locked_stock_item.reserved_quantity
    )

    if quantity_value > current_reserved:
        raise ValidationError(
            {
                "reserved_quantity": (
                    "Stock reserved quantity is lower than "
                    "the requested release quantity."
                )
            }
        )

    locked_stock_item.reserved_quantity = (
        quantize_quantity(
            current_reserved - quantity_value
        )
    )

    locked_stock_item.full_clean()
    locked_stock_item.save(
        update_fields=[
            "reserved_quantity",
            "updated_at",
        ]
    )

    return locked_stock_item



def _release_locked_tracked_allocation_quantity(
    *,
    company: Company,
    allocation: StockReservationAllocation,
    quantity: Decimal,
    user=None,
) -> None:
    """
    Release batch or serial reservation effects.

    Batch allocation:
    - decrease InventoryBatchBalance.reserved_quantity.

    Serial allocation:
    - release the complete serial allocation;
    - change serial status from RESERVED to AVAILABLE.

    StockItem is released separately by the caller.
    No StockMovement or InventoryTrackingEntry is created.
    """
    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Tracked release quantity must be "
                    "greater than zero."
                )
            }
        )

    if allocation.batch_id:
        locked_batch_balance = (
            InventoryBatchBalance.objects
            .select_for_update()
            .filter(
                company=company,
                warehouse_id=allocation.warehouse_id,
                location_id=allocation.location_id,
                stock_item_id=allocation.stock_item_id,
                item_id=allocation.item_id,
                batch_id=allocation.batch_id,
            )
            .first()
        )

        if locked_batch_balance is None:
            raise ValidationError(
                {
                    "batch": (
                        "Batch balance for this reservation "
                        "allocation was not found."
                    )
                }
            )

        current_reserved = quantize_quantity(
            locked_batch_balance.reserved_quantity
        )

        if quantity_value > current_reserved:
            raise ValidationError(
                {
                    "reserved_quantity": (
                        "Batch reserved quantity is lower than "
                        "the requested release quantity."
                    )
                }
            )

        locked_batch_balance.reserved_quantity = (
            quantize_quantity(
                current_reserved - quantity_value
            )
        )
        locked_batch_balance.full_clean()
        locked_batch_balance.save(
            update_fields=[
                "reserved_quantity",
                "updated_at",
            ]
        )

    if allocation.serial_number_id:
        remaining_quantity = quantize_quantity(
            allocation.remaining_reserved_quantity
        )

        if quantity_value != remaining_quantity:
            raise ValidationError(
                {
                    "quantity": (
                        "A serial number reservation must be "
                        "released completely."
                    )
                }
            )

        locked_serial = (
            InventorySerialNumber.objects
            .select_for_update()
            .filter(
                id=allocation.serial_number_id,
                company=company,
            )
            .first()
        )

        if locked_serial is None:
            raise ValidationError(
                {
                    "serial_number": (
                        "Serial number for this reservation "
                        "allocation was not found."
                    )
                }
            )

        if locked_serial.status != InventorySerialStatus.RESERVED:
            raise ValidationError(
                {
                    "serial_number": (
                        "Only a reserved serial number can "
                        "be released."
                    )
                }
            )

        locked_serial.status = InventorySerialStatus.AVAILABLE

        actor = _reservation_actor(user)

        if actor is not None:
            locked_serial.updated_by = actor

        locked_serial.full_clean()
        locked_serial.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )


@transaction.atomic
def release_stock_reservation_allocation(
    *,
    company: Company,
    allocation: StockReservationAllocation,
    quantity: Decimal | int | float | str | None = None,
    reason: str = "",
    user=None,
) -> StockReservationAllocation:
    """
    Release part or all of one reservation allocation.

    The operation:
    - locks the allocation, reservation, and StockItem;
    - decreases StockItem.reserved_quantity;
    - increases allocation and reservation released totals;
    - does not change quantity_on_hand;
    - does not create StockMovement.
    """
    locked_allocation = (
        StockReservationAllocation.objects
        .select_for_update()
        .select_related(
            "reservation",
            "stock_item",
            "warehouse",
            "location",
            "item",
            "batch",
            "serial_number",
        )
        .filter(
            id=allocation.id,
            company=company,
        )
        .first()
    )

    if locked_allocation is None:
        raise ValidationError(
            {
                "allocation": (
                    "Reservation allocation does not belong "
                    "to this company."
                )
            }
        )

    if locked_allocation.status not in {
        StockReservationAllocationStatus.RESERVED,
        (
            StockReservationAllocationStatus
            .PARTIALLY_FULFILLED
        ),
    }:
        raise ValidationError(
            {
                "allocation": (
                    "Only active reservation allocations "
                    "can be released."
                )
            }
        )

    available_to_release = quantize_quantity(
        locked_allocation.remaining_reserved_quantity
    )

    if available_to_release <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "allocation": (
                    "Reservation allocation has no remaining "
                    "quantity to release."
                )
            }
        )

    quantity_value = quantize_quantity(
        available_to_release
        if quantity is None
        else quantity
    )

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Released quantity must be greater "
                    "than zero."
                )
            }
        )

    if quantity_value > available_to_release:
        raise ValidationError(
            {
                "quantity": (
                    "Released quantity exceeds the allocation "
                    "remaining reserved quantity."
                )
            }
        )

    locked_reservation = (
        StockReservation.objects
        .select_for_update()
        .get(
            id=locked_allocation.reservation_id,
            company=company,
        )
    )

    if locked_reservation.is_terminal:
        raise ValidationError(
            {
                "reservation": (
                    "Terminal reservations cannot release "
                    "additional quantities."
                )
            }
        )

    actor = _reservation_actor(user)
    now = timezone.now()
    normalized_reason = normalize_text(reason)

    _release_locked_stock_quantity(
        company=company,
        stock_item=locked_allocation.stock_item,
        quantity=quantity_value,
    )

    _release_locked_tracked_allocation_quantity(
        company=company,
        allocation=locked_allocation,
        quantity=quantity_value,
        user=user,
    )

    locked_allocation.released_quantity = (
        quantize_quantity(
            locked_allocation.released_quantity
            + quantity_value
        )
    )
    locked_allocation.released_at = now
    locked_allocation.release_reason = (
        normalized_reason
        or locked_allocation.release_reason
    )

    remaining_after_release = quantize_quantity(
        locked_allocation.remaining_reserved_quantity
    )

    if remaining_after_release <= QUANTITY_ZERO:
        if (
            locked_allocation.fulfilled_quantity
            == QUANTITY_ZERO
        ):
            locked_allocation.status = (
                StockReservationAllocationStatus.RELEASED
            )
        else:
            locked_allocation.status = (
                StockReservationAllocationStatus
                .PARTIALLY_FULFILLED
            )
    elif (
        locked_allocation.fulfilled_quantity
        > QUANTITY_ZERO
    ):
        locked_allocation.status = (
            StockReservationAllocationStatus
            .PARTIALLY_FULFILLED
        )
    else:
        locked_allocation.status = (
            StockReservationAllocationStatus.RESERVED
        )

    if actor is not None:
        locked_allocation.released_by = actor
        locked_allocation.updated_by = actor

    locked_allocation.full_clean()
    locked_allocation.save(
        update_fields=[
            "released_quantity",
            "status",
            "released_at",
            "release_reason",
            "released_by",
            "updated_by",
            "updated_at",
        ]
    )

    locked_reservation.released_quantity = (
        quantize_quantity(
            locked_reservation.released_quantity
            + quantity_value
        )
    )
    locked_reservation.release_reason = (
        normalized_reason
        or locked_reservation.release_reason
    )

    resolved_status = (
        _resolve_reservation_active_status(
            locked_reservation
        )
    )
    locked_reservation.status = resolved_status

    if resolved_status == StockReservationStatus.RELEASED:
        locked_reservation.released_at = now

    if actor is not None:
        locked_reservation.released_by = actor
        locked_reservation.updated_by = actor

    locked_reservation.full_clean()
    locked_reservation.save(
        update_fields=[
            "released_quantity",
            "status",
            "released_at",
            "release_reason",
            "released_by",
            "updated_by",
            "updated_at",
        ]
    )

    locked_allocation.refresh_from_db()

    return locked_allocation


def _release_all_locked_reservation_allocations(
    *,
    company: Company,
    reservation: StockReservation,
    final_allocation_status: str,
    reason: str,
    user=None,
) -> Decimal:
    """
    Release every remaining physical quantity for one reservation.

    The caller must run inside transaction.atomic and hold the
    reservation row lock.
    """
    actor = _reservation_actor(user)
    now = timezone.now()
    normalized_reason = normalize_text(reason)
    total_released = QUANTITY_ZERO

    allocations = list(
        StockReservationAllocation.objects
        .select_for_update()
        .select_related(
            "stock_item",
            "warehouse",
            "location",
            "item",
            "batch",
            "serial_number",
        )
        .filter(
            company=company,
            reservation=reservation,
        )
        .order_by("id")
    )

    for allocation in allocations:
        remaining_quantity = quantize_quantity(
            allocation.remaining_reserved_quantity
        )

        if remaining_quantity > QUANTITY_ZERO:
            _release_locked_stock_quantity(
                company=company,
                stock_item=allocation.stock_item,
                quantity=remaining_quantity,
            )

            _release_locked_tracked_allocation_quantity(
                company=company,
                allocation=allocation,
                quantity=remaining_quantity,
                user=user,
            )

            allocation.released_quantity = (
                quantize_quantity(
                    allocation.released_quantity
                    + remaining_quantity
                )
            )
            allocation.released_at = now
            allocation.release_reason = (
                normalized_reason
                or allocation.release_reason
            )

            total_released = quantize_quantity(
                total_released + remaining_quantity
            )

        allocation.status = final_allocation_status

        if (
            final_allocation_status
            == StockReservationAllocationStatus.CANCELLED
        ):
            allocation.cancelled_at = now
            allocation.cancellation_reason = (
                normalized_reason
                or "Reservation cancelled."
            )

        if actor is not None:
            allocation.released_by = actor
            allocation.updated_by = actor

        allocation.full_clean()
        allocation.save(
            update_fields=[
                "released_quantity",
                "status",
                "released_at",
                "cancelled_at",
                "release_reason",
                "cancellation_reason",
                "released_by",
                "updated_by",
                "updated_at",
            ]
        )

    return total_released


@transaction.atomic
def cancel_stock_reservation(
    *,
    company: Company,
    reservation: StockReservation,
    reason: str = "",
    user=None,
) -> StockReservation:
    """
    Cancel a reservation and release all remaining allocations.
    """
    locked_reservation = (
        StockReservation.objects
        .select_for_update()
        .filter(
            id=reservation.id,
            company=company,
        )
        .first()
    )

    if locked_reservation is None:
        raise ValidationError(
            {
                "reservation": (
                    "Stock reservation does not belong "
                    "to this company."
                )
            }
        )

    if locked_reservation.is_terminal:
        raise ValidationError(
            {
                "reservation": (
                    "Terminal stock reservation cannot "
                    "be cancelled again."
                )
            }
        )

    actor = _reservation_actor(user)
    now = timezone.now()
    normalized_reason = (
        normalize_text(reason)
        or "Reservation cancelled."
    )

    released_quantity = (
        _release_all_locked_reservation_allocations(
            company=company,
            reservation=locked_reservation,
            final_allocation_status=(
                StockReservationAllocationStatus.CANCELLED
            ),
            reason=normalized_reason,
            user=user,
        )
    )

    locked_reservation.released_quantity = (
        quantize_quantity(
            locked_reservation.released_quantity
            + released_quantity
        )
    )
    locked_reservation.status = (
        StockReservationStatus.CANCELLED
    )
    locked_reservation.cancelled_at = now
    locked_reservation.cancellation_reason = (
        normalized_reason
    )

    if released_quantity > QUANTITY_ZERO:
        locked_reservation.released_at = now
        locked_reservation.release_reason = (
            normalized_reason
        )

    if actor is not None:
        locked_reservation.cancelled_by = actor
        locked_reservation.released_by = actor
        locked_reservation.updated_by = actor

    locked_reservation.full_clean()
    locked_reservation.save(
        update_fields=[
            "released_quantity",
            "status",
            "released_at",
            "cancelled_at",
            "release_reason",
            "cancellation_reason",
            "released_by",
            "cancelled_by",
            "updated_by",
            "updated_at",
        ]
    )

    locked_reservation.refresh_from_db()

    return locked_reservation


@transaction.atomic
def expire_stock_reservation(
    *,
    company: Company,
    reservation: StockReservation,
    reason: str = "",
    user=None,
    force: bool = False,
) -> StockReservation:
    """
    Expire one reservation and release all remaining allocations.

    By default, expires_at must already be reached. force=True is
    reserved for controlled administrative workflows and tests.
    """
    locked_reservation = (
        StockReservation.objects
        .select_for_update()
        .filter(
            id=reservation.id,
            company=company,
        )
        .first()
    )

    if locked_reservation is None:
        raise ValidationError(
            {
                "reservation": (
                    "Stock reservation does not belong "
                    "to this company."
                )
            }
        )

    if locked_reservation.is_terminal:
        raise ValidationError(
            {
                "reservation": (
                    "Terminal stock reservation cannot "
                    "be expired again."
                )
            }
        )

    now = timezone.now()

    if not force:
        if locked_reservation.expires_at is None:
            raise ValidationError(
                {
                    "expires_at": (
                        "Reservation does not have an "
                        "expiry date."
                    )
                }
            )

        if locked_reservation.expires_at > now:
            raise ValidationError(
                {
                    "expires_at": (
                        "Reservation expiry date has not "
                        "been reached."
                    )
                }
            )

    actor = _reservation_actor(user)
    normalized_reason = (
        normalize_text(reason)
        or "Reservation expired."
    )

    released_quantity = (
        _release_all_locked_reservation_allocations(
            company=company,
            reservation=locked_reservation,
            final_allocation_status=(
                StockReservationAllocationStatus.RELEASED
            ),
            reason=normalized_reason,
            user=user,
        )
    )

    locked_reservation.released_quantity = (
        quantize_quantity(
            locked_reservation.released_quantity
            + released_quantity
        )
    )
    locked_reservation.status = (
        StockReservationStatus.EXPIRED
    )
    locked_reservation.expired_at = now

    if released_quantity > QUANTITY_ZERO:
        locked_reservation.released_at = now
        locked_reservation.release_reason = (
            normalized_reason
        )

    if actor is not None:
        locked_reservation.released_by = actor
        locked_reservation.updated_by = actor

    locked_reservation.full_clean()
    locked_reservation.save(
        update_fields=[
            "released_quantity",
            "status",
            "released_at",
            "expired_at",
            "release_reason",
            "released_by",
            "updated_by",
            "updated_at",
        ]
    )

    locked_reservation.refresh_from_db()

    return locked_reservation


# End Phase 22.3.2.3 - Reservation Release Cancellation Expiry
# ============================================================

# ============================================================
# Phase 22.3.3.1 - Batch and Serial Reservation Allocation
# ============================================================


def _lock_reservation_for_tracked_allocation(
    *,
    company: Company,
    reservation: StockReservation,
) -> StockReservation:
    """
    Lock and validate a reservation before tracked allocation.
    """
    locked_reservation = (
        StockReservation.objects
        .select_for_update()
        .select_related("sales_order")
        .filter(
            id=reservation.id,
            company=company,
        )
        .first()
    )

    if locked_reservation is None:
        raise ValidationError(
            {
                "reservation": (
                    "Stock reservation does not belong "
                    "to this company."
                )
            }
        )

    if locked_reservation.status not in {
        StockReservationStatus.DRAFT,
        StockReservationStatus.PARTIALLY_ALLOCATED,
    }:
        raise ValidationError(
            {
                "reservation": (
                    "Only draft or partially allocated "
                    "reservations can receive allocations."
                )
            }
        )

    if locked_reservation.is_expired_now:
        raise ValidationError(
            {
                "reservation": (
                    "Expired reservation cannot receive "
                    "new allocations."
                )
            }
        )

    validate_sales_order_for_stock_reservation(
        company=company,
        sales_order=locked_reservation.sales_order,
    )

    return locked_reservation


def _lock_sales_order_item_for_tracked_allocation(
    *,
    company: Company,
    reservation: StockReservation,
    sales_order_item: SalesOrderItem,
) -> SalesOrderItem:
    """
    Lock and validate one reservation sales order line.
    """
    locked_order_item = (
        SalesOrderItem.objects
        .select_for_update()
        .select_related(
            "order",
            "catalog_item",
        )
        .filter(
            id=sales_order_item.id,
            company=company,
        )
        .first()
    )

    if locked_order_item is None:
        raise ValidationError(
            {
                "sales_order_item": (
                    "Sales order item does not belong "
                    "to this company."
                )
            }
        )

    validate_sales_order_item_for_stock_reservation(
        company=company,
        sales_order=reservation.sales_order,
        sales_order_item=locked_order_item,
    )

    return locked_order_item


def _get_active_order_line_allocation_quantity(
    *,
    company: Company,
    reservation: StockReservation,
    sales_order_item: SalesOrderItem,
) -> Decimal:
    """
    Return historical reserved quantity on active line allocations.
    """
    total = QUANTITY_ZERO

    allocations = (
        StockReservationAllocation.objects
        .select_for_update()
        .filter(
            company=company,
            reservation=reservation,
            sales_order_item=sales_order_item,
        )
        .exclude(
            status__in=[
                StockReservationAllocationStatus.RELEASED,
                StockReservationAllocationStatus.CANCELLED,
            ]
        )
        .order_by("id")
    )

    for allocation in allocations:
        total = quantize_quantity(
            total + allocation.reserved_quantity
        )

    return total


def _validate_tracked_allocation_limits(
    *,
    company: Company,
    reservation: StockReservation,
    sales_order_item: SalesOrderItem,
    quantity: Decimal,
) -> None:
    """
    Validate reservation-header and sales-order-line quantity limits.
    """
    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Reservation allocation quantity must "
                    "be greater than zero."
                )
            }
        )

    if quantity_value > reservation.unallocated_quantity:
        raise ValidationError(
            {
                "quantity": (
                    "Allocation quantity exceeds the "
                    "reservation unallocated quantity."
                )
            }
        )

    existing_line_quantity = (
        _get_active_order_line_allocation_quantity(
            company=company,
            reservation=reservation,
            sales_order_item=sales_order_item,
        )
    )

    order_line_quantity = quantize_quantity(
        sales_order_item.quantity
    )

    if (
        existing_line_quantity + quantity_value
        > order_line_quantity
    ):
        raise ValidationError(
            {
                "quantity": (
                    "Allocation quantity exceeds the sales "
                    "order item quantity."
                )
            }
        )


def _finalize_tracked_reservation_allocation(
    *,
    reservation: StockReservation,
    quantity: Decimal,
    user=None,
) -> StockReservation:
    """
    Update reservation totals after one tracked allocation.
    """
    quantity_value = quantize_quantity(quantity)
    actor = _reservation_actor(user)
    now = timezone.now()

    reservation.reserved_quantity = quantize_quantity(
        reservation.reserved_quantity + quantity_value
    )

    if (
        reservation.reserved_quantity
        == reservation.requested_quantity
    ):
        reservation.status = (
            StockReservationStatus.ALLOCATED
        )
    else:
        reservation.status = (
            StockReservationStatus.PARTIALLY_ALLOCATED
        )

    if reservation.allocated_at is None:
        reservation.allocated_at = now

    if actor is not None:
        reservation.allocated_by = actor
        reservation.updated_by = actor

    reservation.full_clean()
    reservation.save(
        update_fields=[
            "reserved_quantity",
            "status",
            "allocated_at",
            "allocated_by",
            "updated_by",
            "updated_at",
        ]
    )

    return reservation


@transaction.atomic
def allocate_batch_stock_reservation(
    *,
    company: Company,
    reservation: StockReservation,
    sales_order_item: SalesOrderItem,
    batch_balance: InventoryBatchBalance,
    quantity: Decimal | int | float | str,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> StockReservationAllocation:
    """
    Reserve quantity from one location-level batch balance.

    Atomic effects:
    - lock reservation and sales order line;
    - lock batch master, batch balance, and StockItem;
    - increase StockItem.reserved_quantity;
    - increase InventoryBatchBalance.reserved_quantity;
    - create one batch-linked reservation allocation;
    - update reservation totals and lifecycle.

    No quantity_on_hand change and no StockMovement is created.
    """
    quantity_value = quantize_quantity(quantity)

    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "quantity": (
                    "Batch reservation quantity must be "
                    "greater than zero."
                )
            }
        )

    locked_reservation = (
        _lock_reservation_for_tracked_allocation(
            company=company,
            reservation=reservation,
        )
    )

    locked_order_item = (
        _lock_sales_order_item_for_tracked_allocation(
            company=company,
            reservation=locked_reservation,
            sales_order_item=sales_order_item,
        )
    )

    locked_batch_balance = (
        InventoryBatchBalance.objects
        .select_for_update()
        .select_related(
            "warehouse",
            "location",
            "stock_item",
            "item",
            "batch",
        )
        .filter(
            id=batch_balance.id,
            company=company,
        )
        .first()
    )

    if locked_batch_balance is None:
        raise ValidationError(
            {
                "batch_balance": (
                    "Inventory batch balance does not belong "
                    "to this company."
                )
            }
        )

    locked_batch = (
        InventoryBatch.objects
        .select_for_update()
        .filter(
            id=locked_batch_balance.batch_id,
            company=company,
        )
        .first()
    )

    if locked_batch is None:
        raise ValidationError(
            {
                "batch": (
                    "Inventory batch does not belong "
                    "to this company."
                )
            }
        )

    locked_stock_item = (
        StockItem.objects
        .select_for_update()
        .select_related(
            "warehouse",
            "location",
            "item",
        )
        .filter(
            id=locked_batch_balance.stock_item_id,
            company=company,
        )
        .first()
    )

    if locked_stock_item is None:
        raise ValidationError(
            {
                "stock_item": (
                    "Batch stock balance does not belong "
                    "to this company."
                )
            }
        )

    validate_warehouse_for_company(
        company=company,
        warehouse=locked_batch_balance.warehouse,
        require_active=True,
    )
    validate_inventory_location_for_company(
        company=company,
        location=locked_batch_balance.location,
        warehouse=locked_batch_balance.warehouse,
        require_active=True,
    )
    validate_inventory_tracking_item(
        company=company,
        item=locked_batch_balance.item,
        expected_method=CatalogItemTrackingMethod.BATCH,
    )
    validate_inventory_batch_for_company(
        company=company,
        batch=locked_batch,
        item=locked_batch_balance.item,
        require_available=True,
    )

    if not locked_batch_balance.location.is_pickable:
        raise ValidationError(
            {
                "location": (
                    "Batch reservation requires a pickable "
                    "inventory location."
                )
            }
        )

    if (
        locked_batch_balance.item_id
        != locked_order_item.catalog_item_id
    ):
        raise ValidationError(
            {
                "batch_balance": (
                    "Batch balance item does not match "
                    "the sales order item."
                )
            }
        )

    if (
        locked_batch_balance.stock_item_id
        != locked_stock_item.id
        or locked_stock_item.warehouse_id
        != locked_batch_balance.warehouse_id
        or locked_stock_item.location_id
        != locked_batch_balance.location_id
        or locked_stock_item.item_id
        != locked_batch_balance.item_id
    ):
        raise ValidationError(
            {
                "batch_balance": (
                    "Batch balance stock source is inconsistent."
                )
            }
        )

    if quantity_value > locked_batch_balance.available_quantity:
        raise ValidationError(
            {
                "quantity": (
                    "Batch available quantity is insufficient "
                    "for this reservation."
                )
            }
        )

    if quantity_value > locked_stock_item.available_quantity:
        raise ValidationError(
            {
                "quantity": (
                    "Stock available quantity is insufficient "
                    "for this batch reservation."
                )
            }
        )

    _validate_tracked_allocation_limits(
        company=company,
        reservation=locked_reservation,
        sales_order_item=locked_order_item,
        quantity=quantity_value,
    )

    actor = _reservation_actor(user)
    now = timezone.now()

    allocation = StockReservationAllocation(
        company=company,
        reservation=locked_reservation,
        sales_order_item=locked_order_item,
        warehouse=locked_batch_balance.warehouse,
        location=locked_batch_balance.location,
        stock_item=locked_stock_item,
        item=locked_batch_balance.item,
        batch=locked_batch,
        serial_number=None,
        status=StockReservationAllocationStatus.RESERVED,
        reserved_quantity=quantity_value,
        fulfilled_quantity=QUANTITY_ZERO,
        released_quantity=QUANTITY_ZERO,
        reserved_at=now,
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )
    allocation.full_clean()

    locked_stock_item.reserved_quantity = (
        quantize_quantity(
            locked_stock_item.reserved_quantity
            + quantity_value
        )
    )
    locked_stock_item.full_clean()

    locked_batch_balance.reserved_quantity = (
        quantize_quantity(
            locked_batch_balance.reserved_quantity
            + quantity_value
        )
    )
    locked_batch_balance.full_clean()

    locked_stock_item.save(
        update_fields=[
            "reserved_quantity",
            "updated_at",
        ]
    )
    locked_batch_balance.save(
        update_fields=[
            "reserved_quantity",
            "updated_at",
        ]
    )
    allocation.save()

    _finalize_tracked_reservation_allocation(
        reservation=locked_reservation,
        quantity=quantity_value,
        user=user,
    )

    return allocation


@transaction.atomic
def allocate_serial_stock_reservation(
    *,
    company: Company,
    reservation: StockReservation,
    sales_order_item: SalesOrderItem,
    serial_number: InventorySerialNumber,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
    user=None,
) -> StockReservationAllocation:
    """
    Reserve one serial-number-tracked physical unit.

    Atomic effects:
    - lock reservation and sales order line;
    - lock serial number and its StockItem;
    - require serial status AVAILABLE;
    - increase StockItem.reserved_quantity by one;
    - change serial status to RESERVED;
    - create one serial-linked allocation;
    - update reservation totals and lifecycle.

    No quantity_on_hand change and no StockMovement is created.
    """
    quantity_value = Decimal("1.0000")

    locked_reservation = (
        _lock_reservation_for_tracked_allocation(
            company=company,
            reservation=reservation,
        )
    )

    locked_order_item = (
        _lock_sales_order_item_for_tracked_allocation(
            company=company,
            reservation=locked_reservation,
            sales_order_item=sales_order_item,
        )
    )

    locked_serial = (
        InventorySerialNumber.objects
        .select_for_update()
        .select_related(
            "warehouse",
            "location",
            "stock_item",
            "item",
        )
        .filter(
            id=serial_number.id,
            company=company,
        )
        .first()
    )

    if locked_serial is None:
        raise ValidationError(
            {
                "serial_number": (
                    "Inventory serial number does not belong "
                    "to this company."
                )
            }
        )

    if locked_serial.status != InventorySerialStatus.AVAILABLE:
        raise ValidationError(
            {
                "serial_number": (
                    "Only an available serial number can "
                    "be reserved."
                )
            }
        )

    if (
        not locked_serial.warehouse_id
        or not locked_serial.location_id
        or not locked_serial.stock_item_id
    ):
        raise ValidationError(
            {
                "serial_number": (
                    "Serial number must have a current "
                    "warehouse, location, and stock balance."
                )
            }
        )

    locked_stock_item = (
        StockItem.objects
        .select_for_update()
        .select_related(
            "warehouse",
            "location",
            "item",
        )
        .filter(
            id=locked_serial.stock_item_id,
            company=company,
        )
        .first()
    )

    if locked_stock_item is None:
        raise ValidationError(
            {
                "stock_item": (
                    "Serial number stock balance does not "
                    "belong to this company."
                )
            }
        )

    validate_warehouse_for_company(
        company=company,
        warehouse=locked_serial.warehouse,
        require_active=True,
    )
    validate_inventory_location_for_company(
        company=company,
        location=locked_serial.location,
        warehouse=locked_serial.warehouse,
        require_active=True,
    )
    validate_inventory_tracking_item(
        company=company,
        item=locked_serial.item,
        expected_method=CatalogItemTrackingMethod.SERIAL,
    )
    validate_inventory_serial_for_company(
        company=company,
        serial_number=locked_serial,
        item=locked_serial.item,
        warehouse=locked_serial.warehouse,
        location=locked_serial.location,
        require_available=True,
    )

    if not locked_serial.location.is_pickable:
        raise ValidationError(
            {
                "location": (
                    "Serial reservation requires a pickable "
                    "inventory location."
                )
            }
        )

    if (
        locked_serial.item_id
        != locked_order_item.catalog_item_id
    ):
        raise ValidationError(
            {
                "serial_number": (
                    "Serial number item does not match "
                    "the sales order item."
                )
            }
        )

    if (
        locked_stock_item.warehouse_id
        != locked_serial.warehouse_id
        or locked_stock_item.location_id
        != locked_serial.location_id
        or locked_stock_item.item_id
        != locked_serial.item_id
    ):
        raise ValidationError(
            {
                "serial_number": (
                    "Serial number stock position is inconsistent."
                )
            }
        )

    if locked_stock_item.available_quantity < quantity_value:
        raise ValidationError(
            {
                "quantity": (
                    "Stock available quantity is insufficient "
                    "for this serial reservation."
                )
            }
        )

    _validate_tracked_allocation_limits(
        company=company,
        reservation=locked_reservation,
        sales_order_item=locked_order_item,
        quantity=quantity_value,
    )

    actor = _reservation_actor(user)
    now = timezone.now()

    allocation = StockReservationAllocation(
        company=company,
        reservation=locked_reservation,
        sales_order_item=locked_order_item,
        warehouse=locked_serial.warehouse,
        location=locked_serial.location,
        stock_item=locked_stock_item,
        item=locked_serial.item,
        batch=None,
        serial_number=locked_serial,
        status=StockReservationAllocationStatus.RESERVED,
        reserved_quantity=quantity_value,
        fulfilled_quantity=QUANTITY_ZERO,
        released_quantity=QUANTITY_ZERO,
        reserved_at=now,
        notes=normalize_text(notes),
        extra_data=extra_data or {},
        created_by=actor,
        updated_by=actor,
    )
    allocation.full_clean()

    locked_stock_item.reserved_quantity = (
        quantize_quantity(
            locked_stock_item.reserved_quantity
            + quantity_value
        )
    )
    locked_stock_item.full_clean()

    locked_serial.status = InventorySerialStatus.RESERVED

    if actor is not None:
        locked_serial.updated_by = actor

    locked_serial.full_clean()

    locked_stock_item.save(
        update_fields=[
            "reserved_quantity",
            "updated_at",
        ]
    )
    locked_serial.save(
        update_fields=[
            "status",
            "updated_by",
            "updated_at",
        ]
    )
    allocation.save()

    _finalize_tracked_reservation_allocation(
        reservation=locked_reservation,
        quantity=quantity_value,
        user=user,
    )

    return allocation


# End Phase 22.3.3.1 - Batch and Serial Reservation Allocation
# ============================================================

# ============================================================
# Phase 22.4 - Goods Issues Services
# ============================================================

GOODS_ISSUE_STOCK_REFERENCE = "goods_issue_item"


def generate_goods_issue_number(
    company: Company,
) -> str:
    """
    Generate a company-scoped goods issue number.

    Format:
        GI-000001
    """
    if company is None:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    last_number = (
        GoodsIssue.objects
        .filter(company=company)
        .aggregate(value=Max("id"))
        .get("value")
        or 0
    )

    return f"GI-{last_number + 1:06d}"


def get_company_goods_issues(
    company: Company,
) -> QuerySet[GoodsIssue]:
    """
    Return all goods issues for one company.
    """
    return (
        GoodsIssue.objects
        .filter(company=company)
        .select_related(
            "company",
            "sales_order",
            "warehouse",
            "location",
            "created_by",
            "updated_by",
            "posted_by",
            "cancelled_by",
        )
        .order_by(
            "-issue_date",
            "-id",
        )
    )


def get_company_goods_issue_items(
    company: Company,
) -> QuerySet[GoodsIssueItem]:
    """
    Return all goods issue lines for one company.
    """
    return (
        GoodsIssueItem.objects
        .filter(company=company)
        .select_related(
            "issue",
            "sales_order_item",
            "reservation_allocation",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "item__unit",
            "batch",
            "serial_number",
            "stock_movement",
        )
    )


def get_goods_issue_for_company(
    *,
    company: Company,
    goods_issue_id: int | str,
) -> GoodsIssue:
    """
    Resolve one company-scoped goods issue.
    """
    issue = (
        get_company_goods_issues(company)
        .filter(id=goods_issue_id)
        .first()
    )

    if not issue:
        raise ValidationError(
            {
                "goods_issue":
                    "Goods issue was not found for this company."
            }
        )

    return issue


def _resolve_goods_issue_sales_order(
    *,
    company: Company,
    sales_order_id: int | str,
) -> SalesOrder:
    """
    Resolve a sales order eligible for goods issue.
    """
    if not sales_order_id:
        raise ValidationError(
            {
                "sales_order":
                    "Sales order is required."
            }
        )

    order = (
        SalesOrder.objects
        .select_for_update()
        .select_related(
            "company",
            "branch",
            "customer",
        )
        .filter(
            id=sales_order_id,
            company=company,
        )
        .first()
    )

    if not order:
        raise ValidationError(
            {
                "sales_order":
                    "Sales order was not found for this company."
            }
        )

    if order.status not in [
        SalesOrderStatus.CONFIRMED,
        SalesOrderStatus.PROCESSING,
    ]:
        raise ValidationError(
            {
                "sales_order":
                    "Sales order must be confirmed or processing "
                    "before issuing goods."
            }
        )

    return order


def _resolve_goods_issue_warehouse(
    *,
    company: Company,
    warehouse_id: int | str,
) -> Warehouse:
    """
    Resolve an active company warehouse for goods issue.
    """
    if not warehouse_id:
        raise ValidationError(
            {
                "warehouse":
                    "Warehouse is required."
            }
        )

    warehouse = (
        Warehouse.objects
        .select_for_update()
        .filter(
            id=warehouse_id,
            company=company,
        )
        .first()
    )

    if not warehouse:
        raise ValidationError(
            {
                "warehouse":
                    "Warehouse was not found for this company."
            }
        )

    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )

    return warehouse


def _resolve_goods_issue_location(
    *,
    company: Company,
    warehouse: Warehouse,
    location_id: int | str | None = None,
    user=None,
) -> InventoryLocation:
    """
    Resolve issue location.
    """
    if location_id:
        location = (
            InventoryLocation.objects
            .select_for_update()
            .filter(
                id=location_id,
                company=company,
                warehouse=warehouse,
            )
            .first()
        )

        if not location:
            raise ValidationError(
                {
                    "location":
                        "Location was not found for this warehouse."
                }
            )

        validate_inventory_location_for_company(
            company=company,
            location=location,
            warehouse=warehouse,
            require_active=True,
        )

        return location

    shipping_location = get_inventory_location_by_purpose(
        company=company,
        warehouse=warehouse,
        purpose="shipping",
        require_active=True,
    )

    if shipping_location:
        return shipping_location

    return resolve_stock_location(
        company=company,
        warehouse=warehouse,
        location=None,
        user=user,
    )


def _resolve_goods_issue_allocation(
    *,
    company: Company,
    order: SalesOrder,
    allocation_id: int | str,
) -> StockReservationAllocation:
    """
    Resolve an active reservation allocation for goods issue.
    """
    allocation = (
        StockReservationAllocation.objects
        .select_for_update()
        .select_related(
            "reservation",
            "sales_order_item",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "batch",
            "serial_number",
        )
        .filter(
            id=allocation_id,
            company=company,
            reservation__sales_order=order,
        )
        .first()
    )

    if not allocation:
        raise ValidationError(
            {
                "reservation_allocation":
                    "Reservation allocation was not found "
                    "for this sales order."
            }
        )

    if allocation.status not in [
        StockReservationAllocationStatus.RESERVED,
        StockReservationAllocationStatus.PARTIALLY_FULFILLED,
    ]:
        raise ValidationError(
            {
                "reservation_allocation":
                    "Reservation allocation is not active."
            }
        )

    if allocation.remaining_reserved_quantity <= QUANTITY_ZERO:
        raise ValidationError(
            {
                "reservation_allocation":
                    "Reservation allocation has no remaining "
                    "quantity to issue."
            }
        )

    return allocation


def _resolve_goods_issue_order_item(
    *,
    company: Company,
    order: SalesOrder,
    order_item_id: int | str,
) -> SalesOrderItem:
    """
    Resolve one sales order item inside a sales order.
    """
    if not order_item_id:
        raise ValidationError(
            {
                "sales_order_item":
                    "Sales order item is required."
            }
        )

    order_item = (
        SalesOrderItem.objects
        .select_for_update()
        .select_related(
            "order",
            "catalog_item",
            "catalog_item__unit",
        )
        .filter(
            id=order_item_id,
            company=company,
            order=order,
        )
        .first()
    )

    if not order_item:
        raise ValidationError(
            {
                "sales_order_item":
                    "Sales order item was not found "
                    "inside this order."
            }
        )

    if not order_item.catalog_item_id:
        raise ValidationError(
            {
                "sales_order_item":
                    "Sales order item must reference "
                    "a catalog item before goods issue."
            }
        )

    validate_item_for_inventory(
        company=company,
        item=order_item.catalog_item,
    )

    return order_item


def _resolve_goods_issue_stock_item(
    *,
    company: Company,
    warehouse: Warehouse,
    location: InventoryLocation,
    item: CatalogItem,
    stock_item_id: int | str,
) -> StockItem:
    """
    Resolve stock balance for direct goods issue.
    """
    if not stock_item_id:
        raise ValidationError(
            {
                "stock_item":
                    "Stock item is required when no reservation "
                    "allocation is supplied."
            }
        )

    stock_item = (
        StockItem.objects
        .select_for_update()
        .filter(
            id=stock_item_id,
            company=company,
            warehouse=warehouse,
            location=location,
            item=item,
        )
        .first()
    )

    if not stock_item:
        raise ValidationError(
            {
                "stock_item":
                    "Stock item was not found for this location "
                    "and catalog item."
            }
        )

    return stock_item


def _consume_reserved_allocation_for_goods_issue(
    *,
    company: Company,
    issue_item: GoodsIssueItem,
    user=None,
) -> None:
    """
    Consume reservation quantities before issuing stock.

    This reduces reserved quantities and marks allocation/reservation progress.
    """
    if not issue_item.reservation_allocation_id:
        return

    quantity = quantize_quantity(issue_item.quantity)

    allocation = (
        StockReservationAllocation.objects
        .select_for_update()
        .select_related(
            "reservation",
            "stock_item",
            "warehouse",
            "location",
            "item",
            "batch",
            "serial_number",
        )
        .get(
            id=issue_item.reservation_allocation_id,
            company=company,
        )
    )

    if quantity > allocation.remaining_reserved_quantity:
        raise ValidationError(
            {
                "quantity":
                    "Goods issue quantity exceeds the remaining "
                    "reserved allocation quantity."
            }
        )

    stock_item = (
        StockItem.objects
        .select_for_update()
        .get(
            id=allocation.stock_item_id,
            company=company,
        )
    )

    if quantity > stock_item.reserved_quantity:
        raise ValidationError(
            {
                "reserved_quantity":
                    "Stock reserved quantity is lower than "
                    "the goods issue quantity."
            }
        )

    stock_item.reserved_quantity = quantize_quantity(
        stock_item.reserved_quantity - quantity
    )
    stock_item.full_clean()
    stock_item.save(
        update_fields=[
            "reserved_quantity",
            "updated_at",
        ]
    )

    if allocation.batch_id:
        batch_balance = (
            InventoryBatchBalance.objects
            .select_for_update()
            .filter(
                company=company,
                warehouse=allocation.warehouse,
                location=allocation.location,
                stock_item=allocation.stock_item,
                item=allocation.item,
                batch=allocation.batch,
            )
            .first()
        )

        if batch_balance is None:
            raise ValidationError(
                {
                    "batch":
                        "Reserved batch balance was not found."
                }
            )

        if quantity > batch_balance.reserved_quantity:
            raise ValidationError(
                {
                    "reserved_quantity":
                        "Batch reserved quantity is lower than "
                        "the goods issue quantity."
                }
            )

        batch_balance.reserved_quantity = quantize_quantity(
            batch_balance.reserved_quantity - quantity
        )
        batch_balance.full_clean()
        batch_balance.save(
            update_fields=[
                "reserved_quantity",
                "updated_at",
            ]
        )

    if allocation.serial_number_id:
        if quantity != Decimal("1.0000"):
            raise ValidationError(
                {
                    "quantity":
                        "Serial allocation must be issued completely."
                }
            )

        serial = (
            InventorySerialNumber.objects
            .select_for_update()
            .get(
                id=allocation.serial_number_id,
                company=company,
            )
        )

        if serial.status != InventorySerialStatus.RESERVED:
            raise ValidationError(
                {
                    "serial_number":
                        "Only reserved serial numbers can be issued "
                        "through a reservation allocation."
                }
            )

        serial.status = InventorySerialStatus.AVAILABLE

        if user and getattr(user, "is_authenticated", False):
            serial.updated_by = user

        serial.full_clean()
        serial.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )

    allocation.fulfilled_quantity = quantize_quantity(
        allocation.fulfilled_quantity + quantity
    )
    allocation.fulfilled_at = timezone.now()

    if allocation.remaining_reserved_quantity <= QUANTITY_ZERO:
        allocation.status = StockReservationAllocationStatus.FULFILLED
    else:
        allocation.status = (
            StockReservationAllocationStatus
            .PARTIALLY_FULFILLED
        )

    if user and getattr(user, "is_authenticated", False):
        allocation.updated_by = user

    allocation.full_clean()
    allocation.save(
        update_fields=[
            "status",
            "fulfilled_quantity",
            "fulfilled_at",
            "updated_by",
            "updated_at",
        ]
    )

    reservation = (
        StockReservation.objects
        .select_for_update()
        .get(
            id=allocation.reservation_id,
            company=company,
        )
    )
    reservation.fulfilled_quantity = quantize_quantity(
        reservation.fulfilled_quantity + quantity
    )
    reservation.status = _resolve_reservation_active_status(
        reservation
    )

    if user and getattr(user, "is_authenticated", False):
        reservation.updated_by = user

    reservation.full_clean()
    reservation.save(
        update_fields=[
            "status",
            "fulfilled_quantity",
            "updated_by",
            "updated_at",
        ]
    )


def build_goods_issue_item(
    *,
    issue: GoodsIssue,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
    user=None,
) -> GoodsIssueItem:
    """
    Build one draft goods issue item.
    """
    if not issue.is_draft:
        raise ValidationError(
            "Only draft goods issues can be edited."
        )

    allocation_id = (
        payload.get("reservation_allocation_id")
        or payload.get("allocation_id")
    )

    if allocation_id:
        allocation = _resolve_goods_issue_allocation(
            company=company,
            order=issue.sales_order,
            allocation_id=allocation_id,
        )

        quantity = quantize_quantity(
            payload.get("quantity")
            if payload.get("quantity") not in [None, ""]
            else allocation.remaining_reserved_quantity
        )

        if quantity <= QUANTITY_ZERO:
            raise ValidationError(
                {
                    "quantity":
                        "Goods issue quantity must be greater than zero."
                }
            )

        if quantity > allocation.remaining_reserved_quantity:
            raise ValidationError(
                {
                    "quantity":
                        "Goods issue quantity exceeds reservation allocation."
                }
            )

        issue_item = GoodsIssueItem(
            issue=issue,
            company=company,
            sales_order_item=allocation.sales_order_item,
            reservation_allocation=allocation,
            warehouse=allocation.warehouse,
            location=allocation.location,
            stock_item=allocation.stock_item,
            item=allocation.item,
            batch=allocation.batch,
            serial_number=allocation.serial_number,
            line_number=int(
                payload.get("line_number")
                or line_number
            ),
            quantity=quantity,
            unit_cost=(
                payload.get("unit_cost")
                if payload.get("unit_cost") not in [None, ""]
                else allocation.stock_item.average_cost
            ),
            notes=normalize_text(
                payload.get("notes")
            ),
            extra_data=(
                payload.get("extra_data")
                if isinstance(payload.get("extra_data"), dict)
                else {}
            ),
        )
        issue_item.save()
        return issue_item

    order_item = _resolve_goods_issue_order_item(
        company=company,
        order=issue.sales_order,
        order_item_id=(
            payload.get("sales_order_item_id")
            or payload.get("order_item_id")
        ),
    )

    warehouse = issue.warehouse
    location = _resolve_goods_issue_location(
        company=company,
        warehouse=warehouse,
        location_id=(
            payload.get("location_id")
            or (
                issue.location_id
                if issue.location_id
                else None
            )
        ),
        user=user,
    )

    stock_item = _resolve_goods_issue_stock_item(
        company=company,
        warehouse=warehouse,
        location=location,
        item=order_item.catalog_item,
        stock_item_id=payload.get("stock_item_id"),
    )

    batch = None
    serial_number = None

    batch_id = payload.get("batch_id")
    serial_id = (
        payload.get("serial_number_id")
        or payload.get("serial_id")
    )

    if batch_id:
        batch = (
            InventoryBatch.objects
            .filter(
                id=batch_id,
                company=company,
                item=order_item.catalog_item,
            )
            .first()
        )

        if not batch:
            raise ValidationError(
                {
                    "batch":
                        "Batch was not found for this company and item."
                }
            )

    if serial_id:
        serial_number = (
            InventorySerialNumber.objects
            .filter(
                id=serial_id,
                company=company,
                item=order_item.catalog_item,
                warehouse=warehouse,
                location=location,
            )
            .first()
        )

        if not serial_number:
            raise ValidationError(
                {
                    "serial_number":
                        "Serial number was not found for this location."
                }
            )

    quantity = quantize_quantity(
        payload.get("quantity")
    )

    issue_item = GoodsIssueItem(
        issue=issue,
        company=company,
        sales_order_item=order_item,
        warehouse=warehouse,
        location=location,
        stock_item=stock_item,
        item=order_item.catalog_item,
        batch=batch,
        serial_number=serial_number,
        line_number=int(
            payload.get("line_number")
            or line_number
        ),
        quantity=quantity,
        unit_cost=(
            payload.get("unit_cost")
            if payload.get("unit_cost") not in [None, ""]
            else stock_item.average_cost
        ),
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(payload.get("extra_data"), dict)
            else {}
        ),
    )
    issue_item.save()

    return issue_item


@transaction.atomic
def create_goods_issue(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> GoodsIssue:
    """
    Create a draft goods issue from a sales order.
    """
    if not company:
        raise ValidationError(
            {"company": "Company context is required."}
        )

    items_payload = payload.get("items") or []

    if not isinstance(items_payload, list) or not items_payload:
        raise ValidationError(
            {
                "items":
                    "At least one goods issue item is required."
            }
        )

    sales_order = _resolve_goods_issue_sales_order(
        company=company,
        sales_order_id=(
            payload.get("sales_order_id")
            or payload.get("order_id")
        ),
    )

    warehouse = _resolve_goods_issue_warehouse(
        company=company,
        warehouse_id=(
            payload.get("warehouse_id")
            or payload.get("warehouse")
        ),
    )

    location = None
    if payload.get("location_id") or payload.get("location"):
        location = _resolve_goods_issue_location(
            company=company,
            warehouse=warehouse,
            location_id=(
                payload.get("location_id")
                or payload.get("location")
            ),
            user=user,
        )

    issue_date = payload.get("issue_date")
    if issue_date in [None, ""]:
        issue_date = timezone.localdate()

    issue = GoodsIssue(
        company=company,
        sales_order=sales_order,
        warehouse=warehouse,
        location=location,
        issue_number=(
            normalize_text(payload.get("issue_number"))
            or generate_goods_issue_number(company)
        ),
        issue_date=issue_date,
        status=GoodsIssueStatus.DRAFT,
        notes=normalize_text(
            payload.get("notes")
        ),
        extra_data=(
            payload.get("extra_data")
            if isinstance(payload.get("extra_data"), dict)
            else {}
        ),
        created_by=user,
        updated_by=user,
    )
    issue.full_clean()
    issue.save()

    for index, item_payload in enumerate(
        items_payload,
        start=1,
    ):
        if not isinstance(item_payload, dict):
            raise ValidationError(
                {
                    "items":
                        "Each goods issue item must be an object."
                }
            )

        build_goods_issue_item(
            issue=issue,
            company=company,
            payload=item_payload,
            line_number=index,
            user=user,
        )

    issue.refresh_from_db()
    return issue


def get_existing_goods_issue_stock_movement(
    issue_item: GoodsIssueItem,
) -> StockMovement | None:
    """
    Return existing non-cancelled stock movement for a goods issue item.
    """
    if issue_item.stock_movement_id:
        return issue_item.stock_movement

    return (
        StockMovement.objects
        .filter(
            company=issue_item.company,
            reference_type=GOODS_ISSUE_STOCK_REFERENCE,
            reference_id=issue_item.id,
        )
        .exclude(
            status=StockMovementStatus.CANCELLED,
        )
        .order_by("id")
        .first()
    )


def post_goods_issue_item_to_inventory(
    *,
    issue_item: GoodsIssueItem,
    user=None,
) -> StockMovement:
    """
    Create one posted inventory issue movement.
    """
    existing = get_existing_goods_issue_stock_movement(
        issue_item
    )

    if existing:
        if existing.status != StockMovementStatus.POSTED:
            raise ValidationError(
                {
                    "inventory":
                        "Existing goods issue stock movement "
                        "is not posted."
                }
            )

        if not issue_item.stock_movement_id:
            GoodsIssueItem.objects.filter(
                pk=issue_item.pk,
                stock_movement__isnull=True,
            ).update(
                stock_movement=existing,
                updated_at=timezone.now(),
            )
            issue_item.stock_movement = existing

        return existing

    _consume_reserved_allocation_for_goods_issue(
        company=issue_item.company,
        issue_item=issue_item,
        user=user,
    )

    movement_kwargs = {
        "company": issue_item.company,
        "warehouse": issue_item.warehouse,
        "location": issue_item.location,
        "item": issue_item.item,
        "unit_cost": issue_item.unit_cost,
        "reference_type": GOODS_ISSUE_STOCK_REFERENCE,
        "reference_id": issue_item.id,
        "reference_number": issue_item.issue.issue_number,
        "notes": (
            "Sales order goods issue "
            f"{issue_item.issue.issue_number}"
        ),
        "extra_data": {
            **(issue_item.extra_data or {}),
            "source": "goods_issue",
            "goods_issue_id": issue_item.issue_id,
            "goods_issue_item_id": issue_item.id,
            "sales_order_id": issue_item.issue.sales_order_id,
            "sales_order_item_id": issue_item.sales_order_item_id,
            "reservation_allocation_id": (
                issue_item.reservation_allocation_id
            ),
        },
        "user": user,
        "post_accounting": True,
    }

    if issue_item.serial_number_id:
        movement = issue_serial_stock(
            serial_numbers=[
                issue_item.serial_number,
            ],
            **movement_kwargs,
        )
    elif issue_item.batch_id:
        movement = issue_batch_stock(
            batch=issue_item.batch,
            quantity=issue_item.quantity,
            **movement_kwargs,
        )
    else:
        movement = issue_stock(
            quantity=issue_item.quantity,
            **movement_kwargs,
        )

    GoodsIssueItem.objects.filter(
        pk=issue_item.pk,
        stock_movement__isnull=True,
    ).update(
        stock_movement=movement,
        updated_at=timezone.now(),
    )
    issue_item.stock_movement = movement

    return movement


@transaction.atomic
def post_goods_issue(
    *,
    issue: GoodsIssue,
    user=None,
) -> GoodsIssue:
    """
    Atomically post a goods issue and decrease inventory.
    """
    locked_issue = (
        GoodsIssue.objects
        .select_for_update()
        .select_related(
            "company",
            "sales_order",
            "warehouse",
            "location",
        )
        .get(pk=issue.pk)
    )

    if locked_issue.status == GoodsIssueStatus.POSTED:
        return locked_issue

    if not locked_issue.can_be_posted:
        raise ValidationError(
            "Only draft goods issues can be posted."
        )

    locked_items = list(
        locked_issue.items
        .select_for_update()
        .select_related(
            "issue",
            "issue__sales_order",
            "sales_order_item",
            "reservation_allocation",
            "reservation_allocation__reservation",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "batch",
            "serial_number",
            "stock_movement",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not locked_items:
        raise ValidationError(
            "Cannot post a goods issue without items."
        )

    if locked_issue.sales_order.status == SalesOrderStatus.CONFIRMED:
        locked_issue.sales_order.start_processing(user=user)

    for issue_item in locked_items:
        post_goods_issue_item_to_inventory(
            issue_item=issue_item,
            user=user,
        )

    locked_issue.mark_posted(user=user)
    locked_issue.refresh_from_db()

    return locked_issue


@transaction.atomic
def cancel_goods_issue(
    *,
    issue: GoodsIssue,
    reason: str = "",
    user=None,
) -> GoodsIssue:
    """
    Cancel a draft goods issue.
    """
    locked_issue = (
        GoodsIssue.objects
        .select_for_update()
        .get(pk=issue.pk)
    )

    locked_issue.cancel(
        reason=normalize_text(reason),
        user=user,
    )
    locked_issue.refresh_from_db()

    return locked_issue


def serialize_goods_issue_item(
    item: GoodsIssueItem,
) -> dict[str, Any]:
    """
    Serialize one goods issue item.
    """
    return {
        "id": item.id,
        "line_number": item.line_number,
        "sales_order_item_id": item.sales_order_item_id,
        "reservation_allocation_id": (
            item.reservation_allocation_id
        ),
        "warehouse_id": item.warehouse_id,
        "location_id": item.location_id,
        "stock_item_id": item.stock_item_id,
        "catalog_item_id": item.item_id,
        "batch_id": item.batch_id,
        "serial_number_id": item.serial_number_id,
        "stock_movement_id": item.stock_movement_id,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": item.item_name_ar_snapshot,
        "item_name_en": item.item_name_en_snapshot,
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "unit_cost": str(item.unit_cost),
        "notes": item.notes,
        "extra_data": item.extra_data or {},
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        ),
        "updated_at": (
            item.updated_at.isoformat()
            if item.updated_at
            else None
        ),
    }


def serialize_goods_issue(
    issue: GoodsIssue,
    *,
    include_items: bool = True,
) -> dict[str, Any]:
    """
    Serialize a goods issue for APIs.
    """
    data = {
        "id": issue.id,
        "company_id": issue.company_id,
        "issue_number": issue.issue_number,
        "issue_date": (
            issue.issue_date.isoformat()
            if issue.issue_date
            else None
        ),
        "status": issue.status,
        "sales_order": {
            "id": issue.sales_order_id,
            "order_number": issue.sales_order.order_number,
            "status": issue.sales_order.status,
        },
        "warehouse": {
            "id": issue.warehouse_id,
            "code": issue.warehouse.code,
            "name": issue.warehouse.display_name,
        },
        "location": (
            {
                "id": issue.location_id,
                "code": issue.location.code,
                "name": issue.location.display_name,
            }
            if issue.location_id
            else None
        ),
        "total_quantity": str(issue.total_quantity),
        "posted_at": (
            issue.posted_at.isoformat()
            if issue.posted_at
            else None
        ),
        "cancelled_at": (
            issue.cancelled_at.isoformat()
            if issue.cancelled_at
            else None
        ),
        "cancellation_reason": issue.cancellation_reason,
        "notes": issue.notes,
        "extra_data": issue.extra_data or {},
        "allowed_actions": {
            "post": issue.can_be_posted,
            "cancel": issue.can_be_cancelled,
        },
        "created_at": (
            issue.created_at.isoformat()
            if issue.created_at
            else None
        ),
        "updated_at": (
            issue.updated_at.isoformat()
            if issue.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            serialize_goods_issue_item(item)
            for item in (
                issue.items
                .select_related(
                    "sales_order_item",
                    "reservation_allocation",
                    "warehouse",
                    "location",
                    "stock_item",
                    "item",
                    "batch",
                    "serial_number",
                    "stock_movement",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return data

# ============================================================
# Phase 22.5 - Physical Inventory and Cycle Count Services
# ============================================================


def generate_physical_inventory_count_number(company: Company) -> str:
    """
    Generate physical inventory count number per company.

    Format:
        PIC-000001
    """
    last_id = (
        PhysicalInventoryCount.objects.filter(company=company)
        .aggregate(max_id=Max("id"))["max_id"]
        or 0
    )
    return f"PIC-{last_id + 1:06d}"


def validate_physical_inventory_count_for_company(
    *,
    company: Company,
    count: PhysicalInventoryCount,
) -> None:
    """
    Validate physical inventory count tenant ownership.
    """
    if count.company_id != company.id:
        raise ValidationError(
            "Selected physical inventory count does not belong to this company."
        )

    validate_warehouse_for_company(
        company=company,
        warehouse=count.warehouse,
    )

    if count.location_id:
        validate_inventory_location_for_company(
            company=company,
            location=count.location,
            warehouse=count.warehouse,
        )


def get_company_physical_inventory_counts(
    company: Company,
) -> QuerySet[PhysicalInventoryCount]:
    """
    Return physical inventory counts for one company only.
    """
    return (
        PhysicalInventoryCount.objects.filter(company=company)
        .select_related(
            "company",
            "warehouse",
            "location",
            "started_by",
            "posted_by",
            "cancelled_by",
            "created_by",
            "updated_by",
        )
        .order_by(
            "-count_date",
            "-created_at",
            "-id",
        )
    )


def get_company_physical_inventory_count_items(
    company: Company,
) -> QuerySet[PhysicalInventoryCountItem]:
    """
    Return physical inventory count lines for one company only.
    """
    return (
        PhysicalInventoryCountItem.objects.filter(company=company)
        .select_related(
            "count",
            "company",
            "warehouse",
            "location",
            "stock_item",
            "item",
            "item__unit",
            "stock_movement",
        )
        .order_by(
            "count_id",
            "line_number",
            "id",
        )
    )


def build_physical_inventory_count_item_payload(
    item: PhysicalInventoryCountItem,
) -> dict[str, Any]:
    """
    Serialize a physical inventory count line for APIs/services.
    """
    return {
        "id": item.id,
        "count_id": item.count_id,
        "company_id": item.company_id,
        "warehouse_id": item.warehouse_id,
        "location_id": item.location_id,
        "stock_item_id": item.stock_item_id,
        "item_id": item.item_id,
        "line_number": item.line_number,
        "system_quantity": str(item.system_quantity),
        "counted_quantity": str(item.counted_quantity),
        "variance_quantity": str(item.variance_quantity),
        "system_unit_cost": str(item.system_unit_cost),
        "variance_value": str(item.variance_value),
        "has_variance": item.has_variance,
        "stock_movement_id": item.stock_movement_id,
        "item_code_snapshot": item.item_code_snapshot,
        "item_name_snapshot": item.item_name_snapshot,
        "item_name_ar_snapshot": item.item_name_ar_snapshot,
        "item_name_en_snapshot": item.item_name_en_snapshot,
        "unit_name_snapshot": item.unit_name_snapshot,
        "notes": item.notes,
        "extra_data": item.extra_data or {},
        "created_at": (
            item.created_at.isoformat()
            if item.created_at
            else None
        ),
        "updated_at": (
            item.updated_at.isoformat()
            if item.updated_at
            else None
        ),
    }


def build_physical_inventory_count_payload(
    count: PhysicalInventoryCount,
    *,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize physical inventory count header.
    """
    data = {
        "id": count.id,
        "company_id": count.company_id,
        "warehouse_id": count.warehouse_id,
        "warehouse_code": count.warehouse.code,
        "warehouse_name": count.warehouse.display_name,
        "location_id": count.location_id,
        "location_code": count.location.code if count.location_id else "",
        "location_name": (
            count.location.display_name
            if count.location_id
            else ""
        ),
        "status": count.status,
        "scope": count.scope,
        "count_number": count.count_number,
        "count_date": (
            count.count_date.isoformat()
            if count.count_date
            else None
        ),
        "total_system_quantity": str(count.total_system_quantity),
        "total_counted_quantity": str(count.total_counted_quantity),
        "total_variance_quantity": str(count.total_variance_quantity),
        "total_variance_value": str(count.total_variance_value),
        "started_at": (
            count.started_at.isoformat()
            if count.started_at
            else None
        ),
        "posted_at": (
            count.posted_at.isoformat()
            if count.posted_at
            else None
        ),
        "cancelled_at": (
            count.cancelled_at.isoformat()
            if count.cancelled_at
            else None
        ),
        "cancellation_reason": count.cancellation_reason,
        "notes": count.notes,
        "extra_data": count.extra_data or {},
        "allowed_actions": {
            "start": count.can_be_started,
            "post": count.can_be_posted,
            "cancel": count.can_be_cancelled,
        },
        "created_at": (
            count.created_at.isoformat()
            if count.created_at
            else None
        ),
        "updated_at": (
            count.updated_at.isoformat()
            if count.updated_at
            else None
        ),
    }

    if include_items:
        data["items"] = [
            build_physical_inventory_count_item_payload(item)
            for item in (
                count.items.select_related(
                    "warehouse",
                    "location",
                    "stock_item",
                    "item",
                    "item__unit",
                    "stock_movement",
                )
                .order_by(
                    "line_number",
                    "id",
                )
            )
        ]

    return data


def recalculate_physical_inventory_count_totals(
    count: PhysicalInventoryCount,
) -> PhysicalInventoryCount:
    """
    Recalculate physical inventory count totals from lines.
    """
    totals = count.items.aggregate(
        total_system_quantity=Sum("system_quantity"),
        total_counted_quantity=Sum("counted_quantity"),
        total_variance_quantity=Sum("variance_quantity"),
        total_variance_value=Sum("variance_value"),
    )

    count.total_system_quantity = quantize_quantity(
        totals.get("total_system_quantity") or QUANTITY_ZERO
    )
    count.total_counted_quantity = quantize_quantity(
        totals.get("total_counted_quantity") or QUANTITY_ZERO
    )
    count.total_variance_quantity = quantize_quantity(
        totals.get("total_variance_quantity") or QUANTITY_ZERO
    )
    count.total_variance_value = quantize_money(
        totals.get("total_variance_value") or MONEY_ZERO
    )
    count.save(
        update_fields=[
            "total_system_quantity",
            "total_counted_quantity",
            "total_variance_quantity",
            "total_variance_value",
            "updated_at",
        ]
    )

    return count


def resolve_physical_inventory_scope(
    *,
    warehouse: Warehouse,
    location: InventoryLocation | None,
    raw_scope: str | None,
) -> str:
    """
    Resolve and validate count scope.
    """
    scope = normalize_code(raw_scope)

    if not scope:
        scope = (
            PhysicalInventoryCountScope.LOCATION
            if location is not None
            else PhysicalInventoryCountScope.CYCLE_COUNT
        )

    if scope not in {
        PhysicalInventoryCountScope.FULL_WAREHOUSE,
        PhysicalInventoryCountScope.LOCATION,
        PhysicalInventoryCountScope.CYCLE_COUNT,
    }:
        raise ValidationError(
            "Unsupported physical inventory count scope."
        )

    if scope == PhysicalInventoryCountScope.LOCATION and location is None:
        raise ValidationError(
            "Location scope requires an inventory location."
        )

    if scope == PhysicalInventoryCountScope.FULL_WAREHOUSE and location is not None:
        raise ValidationError(
            "Full warehouse counts cannot be restricted to one location."
        )

    return scope


def resolve_physical_inventory_stock_items(
    *,
    company: Company,
    warehouse: Warehouse,
    location: InventoryLocation | None = None,
    stock_item_ids: list[int] | None = None,
) -> QuerySet[StockItem]:
    """
    Resolve countable stock balances for a physical inventory count.
    """
    queryset = (
        StockItem.objects.filter(
            company=company,
            warehouse=warehouse,
        )
        .select_related(
            "company",
            "warehouse",
            "location",
            "item",
            "item__unit",
        )
        .order_by(
            "location_id",
            "item__name",
            "id",
        )
    )

    if location is not None:
        validate_inventory_location_for_company(
            company=company,
            location=location,
            warehouse=warehouse,
            require_active=True,
        )
        queryset = queryset.filter(location=location)

    if stock_item_ids:
        queryset = queryset.filter(id__in=stock_item_ids)

    return queryset


@transaction.atomic
def create_physical_inventory_count(
    *,
    company: Company,
    warehouse: Warehouse,
    location: InventoryLocation | None = None,
    data: dict[str, Any] | None = None,
    user=None,
) -> PhysicalInventoryCount:
    """
    Create physical inventory count and optional initial lines.

    Supported data keys:
    - count_number
    - count_date
    - scope
    - notes
    - extra_data
    - stock_item_ids
    - items: [{stock_item_id, counted_quantity, notes}]
    - include_current_stock: True to snapshot all matching stock balances
    """
    payload = data or {}

    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )

    if location is not None:
        validate_inventory_location_for_company(
            company=company,
            location=location,
            warehouse=warehouse,
            require_active=True,
        )

    scope = resolve_physical_inventory_scope(
        warehouse=warehouse,
        location=location,
        raw_scope=payload.get("scope"),
    )

    count = PhysicalInventoryCount(
        company=company,
        warehouse=warehouse,
        location=location,
        status=PhysicalInventoryCountStatus.DRAFT,
        scope=scope,
        count_number=(
            normalize_code(payload.get("count_number"))
            or generate_physical_inventory_count_number(company)
        ),
        count_date=payload.get("count_date") or timezone.localdate(),
        notes=normalize_text(payload.get("notes")),
        extra_data=(
            payload.get("extra_data")
            if isinstance(payload.get("extra_data"), dict)
            else {}
        ),
        created_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
        updated_by=(
            user
            if getattr(user, "is_authenticated", False)
            else None
        ),
    )
    count.full_clean()
    count.save()

    explicit_items = payload.get("items")
    include_current_stock = normalize_bool(
        payload.get("include_current_stock"),
        default=False,
    )

    if isinstance(explicit_items, list):
        for item_payload in explicit_items:
            stock_item_id = item_payload.get("stock_item_id")
            if not stock_item_id:
                raise ValidationError(
                    "Each physical inventory item requires stock_item_id."
                )

            stock_item = StockItem.objects.select_related(
                "warehouse",
                "location",
                "item",
                "item__unit",
            ).filter(
                id=stock_item_id,
                company=company,
                warehouse=warehouse,
            ).first()

            if not stock_item:
                raise ValidationError(
                    "Selected stock item was not found for this warehouse."
                )

            add_physical_inventory_count_item(
                company=company,
                count=count,
                stock_item=stock_item,
                counted_quantity=item_payload.get("counted_quantity"),
                notes=normalize_text(item_payload.get("notes")),
                extra_data=(
                    item_payload.get("extra_data")
                    if isinstance(item_payload.get("extra_data"), dict)
                    else {}
                ),
            )
    elif include_current_stock:
        stock_item_ids = payload.get("stock_item_ids")
        if stock_item_ids is not None and not isinstance(stock_item_ids, list):
            raise ValidationError(
                "stock_item_ids must be a list when provided."
            )

        for stock_item in resolve_physical_inventory_stock_items(
            company=company,
            warehouse=warehouse,
            location=location,
            stock_item_ids=stock_item_ids,
        ):
            add_physical_inventory_count_item(
                company=company,
                count=count,
                stock_item=stock_item,
                counted_quantity=stock_item.quantity_on_hand,
            )

    recalculate_physical_inventory_count_totals(count)

    return count


@transaction.atomic
def start_physical_inventory_count(
    *,
    company: Company,
    count: PhysicalInventoryCount,
    user=None,
) -> PhysicalInventoryCount:
    """
    Start a draft physical inventory count.
    """
    validate_physical_inventory_count_for_company(
        company=company,
        count=count,
    )

    if not count.can_be_started:
        raise ValidationError(
            "Only draft physical inventory counts can be started."
        )

    count.status = PhysicalInventoryCountStatus.IN_PROGRESS
    count.started_at = timezone.now()

    if user and getattr(user, "is_authenticated", False):
        count.started_by = user
        count.updated_by = user

    count.full_clean()
    count.save(
        update_fields=[
            "status",
            "started_at",
            "started_by",
            "updated_by",
            "updated_at",
        ]
    )

    return count


@transaction.atomic
def add_physical_inventory_count_item(
    *,
    company: Company,
    count: PhysicalInventoryCount,
    stock_item: StockItem,
    counted_quantity: Decimal | int | float | str | None = None,
    notes: str = "",
    extra_data: dict[str, Any] | None = None,
) -> PhysicalInventoryCountItem:
    """
    Add or update a physical inventory count line.

    The line freezes the stock balance quantity and average cost at the time
    the line is added.
    """
    validate_physical_inventory_count_for_company(
        company=company,
        count=count,
    )

    if count.status not in {
        PhysicalInventoryCountStatus.DRAFT,
        PhysicalInventoryCountStatus.IN_PROGRESS,
    }:
        raise ValidationError(
            "Physical inventory count lines can only be edited before posting."
        )

    if stock_item.company_id != company.id:
        raise ValidationError(
            "Selected stock item does not belong to this company."
        )

    if stock_item.warehouse_id != count.warehouse_id:
        raise ValidationError(
            "Selected stock item does not belong to count warehouse."
        )

    if (
        count.location_id
        and stock_item.location_id != count.location_id
    ):
        raise ValidationError(
            "Selected stock item does not belong to count location."
        )

    system_quantity = quantize_quantity(stock_item.quantity_on_hand)

    if counted_quantity is None:
        counted_quantity = system_quantity

    counted_value = quantize_quantity(counted_quantity)

    if counted_value < QUANTITY_ZERO:
        raise ValidationError(
            "Counted quantity cannot be negative."
        )

    line_number = (
        count.items.aggregate(max_line=Max("line_number"))["max_line"]
        or 0
    ) + 1

    count_item, _created = PhysicalInventoryCountItem.objects.update_or_create(
        count=count,
        stock_item=stock_item,
        defaults={
            "company": company,
            "warehouse": stock_item.warehouse,
            "location": stock_item.location,
            "item": stock_item.item,
            "line_number": line_number,
            "system_quantity": system_quantity,
            "counted_quantity": counted_value,
            "system_unit_cost": quantize_money(stock_item.average_cost),
            "notes": normalize_text(notes),
            "extra_data": extra_data or {},
        },
    )

    count_item.full_clean()
    count_item.save()

    recalculate_physical_inventory_count_totals(count)

    return count_item


@transaction.atomic
def set_physical_inventory_count_item_quantity(
    *,
    company: Company,
    count_item: PhysicalInventoryCountItem,
    counted_quantity: Decimal | int | float | str,
    notes: str | None = None,
) -> PhysicalInventoryCountItem:
    """
    Update counted quantity for one count line.
    """
    count = count_item.count

    validate_physical_inventory_count_for_company(
        company=company,
        count=count,
    )

    if count.status not in {
        PhysicalInventoryCountStatus.DRAFT,
        PhysicalInventoryCountStatus.IN_PROGRESS,
    }:
        raise ValidationError(
            "Physical inventory count lines can only be updated before posting."
        )

    count_item.counted_quantity = quantize_quantity(counted_quantity)

    if notes is not None:
        count_item.notes = normalize_text(notes)

    count_item.full_clean()
    count_item.save(
        update_fields=[
            "counted_quantity",
            "variance_quantity",
            "variance_value",
            "notes",
            "updated_at",
        ]
    )

    recalculate_physical_inventory_count_totals(count)

    return count_item


@transaction.atomic
def mark_physical_inventory_count_counted(
    *,
    company: Company,
    count: PhysicalInventoryCount,
    user=None,
) -> PhysicalInventoryCount:
    """
    Mark a physical inventory count as counted and ready for posting.
    """
    validate_physical_inventory_count_for_company(
        company=company,
        count=count,
    )

    if count.status not in {
        PhysicalInventoryCountStatus.DRAFT,
        PhysicalInventoryCountStatus.IN_PROGRESS,
    }:
        raise ValidationError(
            "Only draft or in-progress physical inventory counts can be marked counted."
        )

    if not count.items.exists():
        raise ValidationError(
            "Physical inventory count must have at least one line."
        )

    recalculate_physical_inventory_count_totals(count)
    count.refresh_from_db()

    count.status = PhysicalInventoryCountStatus.COUNTED

    if user and getattr(user, "is_authenticated", False):
        count.updated_by = user

    count.full_clean()
    count.save(
        update_fields=[
            "status",
            "updated_by",
            "updated_at",
        ]
    )

    return count


@transaction.atomic
def post_physical_inventory_count(
    *,
    company: Company,
    count: PhysicalInventoryCount,
    user=None,
    post_accounting: bool = True,
) -> PhysicalInventoryCount:
    """
    Post physical inventory count variances to stock movements.

    Positive variance creates ADJUSTMENT/INCREASE.
    Negative variance creates ADJUSTMENT/DECREASE.
    Zero variance creates no stock movement.
    """
    validate_physical_inventory_count_for_company(
        company=company,
        count=count,
    )

    if count.status == PhysicalInventoryCountStatus.POSTED:
        return count

    if not count.can_be_posted:
        raise ValidationError(
            "Only in-progress or counted physical inventory counts can be posted."
        )

    count_items = (
        count.items.select_for_update()
        .select_related(
            "stock_item",
            "warehouse",
            "location",
            "item",
        )
        .order_by(
            "line_number",
            "id",
        )
    )

    if not count_items.exists():
        raise ValidationError(
            "Physical inventory count must have at least one line."
        )

    for count_item in count_items:
        if count_item.stock_movement_id:
            continue

        variance = quantize_quantity(count_item.variance_quantity)

        if variance == QUANTITY_ZERO:
            continue

        direction = (
            StockMovementDirection.INCREASE
            if variance > QUANTITY_ZERO
            else StockMovementDirection.DECREASE
        )
        quantity = abs(variance)

        movement = create_stock_movement(
            company=company,
            warehouse=count_item.warehouse,
            location=count_item.location,
            item=count_item.item,
            movement_type=StockMovementType.ADJUSTMENT,
            direction=direction,
            quantity=quantity,
            unit_cost=count_item.system_unit_cost,
            reference_type="physical_inventory_count",
            reference_id=count.id,
            reference_number=count.count_number,
            notes=(
                normalize_text(count.notes)
                or f"Physical inventory count {count.count_number}"
            ),
            extra_data={
                "physical_inventory_count_id": count.id,
                "physical_inventory_count_item_id": count_item.id,
                "system_quantity": str(count_item.system_quantity),
                "counted_quantity": str(count_item.counted_quantity),
                "variance_quantity": str(count_item.variance_quantity),
            },
            user=user,
            post_immediately=True,
            post_accounting=post_accounting,
        )

        count_item.stock_movement = movement
        count_item.save(
            update_fields=[
                "stock_movement",
                "updated_at",
            ]
        )

    recalculate_physical_inventory_count_totals(count)
    count.refresh_from_db()

    count.status = PhysicalInventoryCountStatus.POSTED
    count.posted_at = timezone.now()

    if user and getattr(user, "is_authenticated", False):
        count.posted_by = user
        count.updated_by = user

    count.full_clean()
    count.save(
        update_fields=[
            "status",
            "posted_at",
            "posted_by",
            "updated_by",
            "updated_at",
        ]
    )

    return count


@transaction.atomic
def cancel_physical_inventory_count(
    *,
    company: Company,
    count: PhysicalInventoryCount,
    reason: str = "",
    user=None,
) -> PhysicalInventoryCount:
    """
    Cancel an unposted physical inventory count.
    """
    validate_physical_inventory_count_for_company(
        company=company,
        count=count,
    )

    if not count.can_be_cancelled:
        raise ValidationError(
            "Only unposted physical inventory counts can be cancelled."
        )

    if count.items.filter(stock_movement__isnull=False).exists():
        raise ValidationError(
            "Physical inventory count with posted movements cannot be cancelled."
        )

    count.status = PhysicalInventoryCountStatus.CANCELLED
    count.cancelled_at = timezone.now()
    count.cancellation_reason = normalize_text(reason)

    if user and getattr(user, "is_authenticated", False):
        count.cancelled_by = user
        count.updated_by = user

    count.full_clean()
    count.save(
        update_fields=[
            "status",
            "cancelled_at",
            "cancelled_by",
            "cancellation_reason",
            "updated_by",
            "updated_at",
        ]
    )

    return count


# End Phase 22.5 - Physical Inventory and Cycle Count Services
# ============================================================

# ============================================================
# Phase 22.5 Final - Advanced Inventory Valuation Services
# ============================================================


def get_company_inventory_valuation_stock_items(
    company: Company,
) -> QuerySet[StockItem]:
    """
    Return stock balances used by inventory valuation.

    Valuation source of truth:
    - StockItem.quantity_on_hand
    - StockItem.reserved_quantity
    - StockItem.average_cost

    The valuation is current-state valuation, not historical costing layers.
    Historical layers can be added later without changing this public summary
    contract.
    """
    return (
        StockItem.objects.filter(company=company)
        .select_related(
            "company",
            "warehouse",
            "warehouse__branch",
            "location",
            "item",
            "item__unit",
            "item__category",
        )
        .order_by(
            "warehouse__name",
            "location__name",
            "item__name",
            "id",
        )
    )


def _apply_inventory_valuation_filters(
    queryset: QuerySet[StockItem],
    *,
    warehouse_id: Any = None,
    location_id: Any = None,
    item_id: Any = None,
    category_id: Any = None,
    branch_id: Any = None,
    search: str = "",
    include_zero_quantity: bool = True,
) -> QuerySet[StockItem]:
    """
    Apply common valuation filters.

    company filtering must already be applied by the caller.
    """
    normalized_search = normalize_text(search)

    if warehouse_id not in [None, ""]:
        queryset = queryset.filter(warehouse_id=warehouse_id)

    if location_id not in [None, ""]:
        queryset = queryset.filter(location_id=location_id)

    if item_id not in [None, ""]:
        queryset = queryset.filter(item_id=item_id)

    if category_id not in [None, ""]:
        queryset = queryset.filter(item__category_id=category_id)

    if branch_id not in [None, ""]:
        queryset = queryset.filter(warehouse__branch_id=branch_id)

    if normalized_search:
        queryset = queryset.filter(
            Q(item__code__icontains=normalized_search)
            | Q(item__sku__icontains=normalized_search)
            | Q(item__barcode__icontains=normalized_search)
            | Q(item__name__icontains=normalized_search)
            | Q(item__name_ar__icontains=normalized_search)
            | Q(item__name_en__icontains=normalized_search)
            | Q(warehouse__code__icontains=normalized_search)
            | Q(warehouse__name__icontains=normalized_search)
            | Q(warehouse__name_ar__icontains=normalized_search)
            | Q(warehouse__name_en__icontains=normalized_search)
            | Q(location__code__icontains=normalized_search)
            | Q(location__name__icontains=normalized_search)
            | Q(location__name_ar__icontains=normalized_search)
            | Q(location__name_en__icontains=normalized_search)
        )

    if not include_zero_quantity:
        queryset = queryset.filter(quantity_on_hand__gt=QUANTITY_ZERO)

    return queryset


def _inventory_weighted_average_cost(
    *,
    quantity: Decimal,
    value: Decimal,
) -> Decimal:
    """
    Calculate weighted average cost safely.
    """
    quantity = quantize_quantity(quantity)
    value = quantize_money(value)

    if quantity <= QUANTITY_ZERO:
        return MONEY_ZERO

    return quantize_money(value / quantity)


def _empty_inventory_valuation_summary() -> dict[str, Any]:
    """
    Return empty valuation summary with stable keys.
    """
    return {
        "location_balances_count": 0,
        "distinct_items_count": 0,
        "warehouses_count": 0,
        "locations_count": 0,
        "total_quantity_on_hand": str(QUANTITY_ZERO),
        "total_reserved_quantity": str(QUANTITY_ZERO),
        "total_available_quantity": str(QUANTITY_ZERO),
        "total_inventory_value": str(MONEY_ZERO),
        "total_reserved_value": str(MONEY_ZERO),
        "total_available_value": str(MONEY_ZERO),
        "weighted_average_cost": str(MONEY_ZERO),
    }


def build_stock_item_valuation_payload(
    stock_item: StockItem,
) -> dict[str, Any]:
    """
    Serialize valuation for one stock balance row.
    """
    item = stock_item.item
    warehouse = stock_item.warehouse
    location = stock_item.location
    branch = warehouse.branch if warehouse.branch_id else None

    quantity_on_hand = quantize_quantity(stock_item.quantity_on_hand)
    reserved_quantity = quantize_quantity(stock_item.reserved_quantity)
    available_quantity = quantize_quantity(stock_item.available_quantity)
    average_cost = quantize_money(stock_item.average_cost)

    inventory_value = quantize_money(quantity_on_hand * average_cost)
    reserved_value = quantize_money(reserved_quantity * average_cost)
    available_value = quantize_money(available_quantity * average_cost)

    return {
        "stock_item_id": stock_item.id,
        "company_id": stock_item.company_id,
        "warehouse_id": stock_item.warehouse_id,
        "warehouse": {
            "id": warehouse.id,
            "code": warehouse.code,
            "name": warehouse.display_name,
            "warehouse_type": warehouse.warehouse_type,
            "status": warehouse.status,
        },
        "branch": {
            "id": branch.id,
            "name": branch.display_name,
            "branch_code": branch.branch_code,
        }
        if branch
        else None,
        "location_id": stock_item.location_id,
        "location": {
            "id": location.id,
            "code": location.code,
            "name": location.display_name,
            "full_path": location.full_path,
            "location_type": location.location_type,
            "status": location.status,
        }
        if location
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
            "category_id": item.category_id,
            "unit_id": item.unit_id,
        },
        "quantity_on_hand": str(quantity_on_hand),
        "reserved_quantity": str(reserved_quantity),
        "available_quantity": str(available_quantity),
        "average_cost": str(average_cost),
        "inventory_value": str(inventory_value),
        "reserved_value": str(reserved_value),
        "available_value": str(available_value),
        "last_movement_at": (
            stock_item.last_movement_at.isoformat()
            if stock_item.last_movement_at
            else None
        ),
    }


def _accumulate_inventory_valuation_group(
    groups: dict[Any, dict[str, Any]],
    *,
    key: Any,
    identity: dict[str, Any],
    stock_item: StockItem,
) -> None:
    """
    Accumulate valuation totals for one grouping bucket.
    """
    if key not in groups:
        groups[key] = {
            **identity,
            "location_balances_count": 0,
            "_item_ids": set(),
            "_warehouse_ids": set(),
            "_location_ids": set(),
            "_quantity_on_hand": QUANTITY_ZERO,
            "_reserved_quantity": QUANTITY_ZERO,
            "_available_quantity": QUANTITY_ZERO,
            "_inventory_value": MONEY_ZERO,
            "_reserved_value": MONEY_ZERO,
            "_available_value": MONEY_ZERO,
        }

    quantity_on_hand = quantize_quantity(stock_item.quantity_on_hand)
    reserved_quantity = quantize_quantity(stock_item.reserved_quantity)
    available_quantity = quantize_quantity(stock_item.available_quantity)
    average_cost = quantize_money(stock_item.average_cost)

    inventory_value = quantize_money(quantity_on_hand * average_cost)
    reserved_value = quantize_money(reserved_quantity * average_cost)
    available_value = quantize_money(available_quantity * average_cost)

    group = groups[key]
    group["location_balances_count"] += 1
    group["_item_ids"].add(stock_item.item_id)
    group["_warehouse_ids"].add(stock_item.warehouse_id)
    group["_location_ids"].add(stock_item.location_id)
    group["_quantity_on_hand"] = quantize_quantity(
        group["_quantity_on_hand"] + quantity_on_hand
    )
    group["_reserved_quantity"] = quantize_quantity(
        group["_reserved_quantity"] + reserved_quantity
    )
    group["_available_quantity"] = quantize_quantity(
        group["_available_quantity"] + available_quantity
    )
    group["_inventory_value"] = quantize_money(
        group["_inventory_value"] + inventory_value
    )
    group["_reserved_value"] = quantize_money(
        group["_reserved_value"] + reserved_value
    )
    group["_available_value"] = quantize_money(
        group["_available_value"] + available_value
    )


def _finalize_inventory_valuation_group(
    group: dict[str, Any],
) -> dict[str, Any]:
    """
    Convert internal group accumulators to public payload.
    """
    quantity_on_hand = quantize_quantity(group.pop("_quantity_on_hand"))
    reserved_quantity = quantize_quantity(group.pop("_reserved_quantity"))
    available_quantity = quantize_quantity(group.pop("_available_quantity"))
    inventory_value = quantize_money(group.pop("_inventory_value"))
    reserved_value = quantize_money(group.pop("_reserved_value"))
    available_value = quantize_money(group.pop("_available_value"))

    item_ids = group.pop("_item_ids")
    warehouse_ids = group.pop("_warehouse_ids")
    location_ids = group.pop("_location_ids")

    group.update(
        {
            "distinct_items_count": len(item_ids),
            "warehouses_count": len(warehouse_ids),
            "locations_count": len(location_ids),
            "quantity_on_hand": str(quantity_on_hand),
            "reserved_quantity": str(reserved_quantity),
            "available_quantity": str(available_quantity),
            "inventory_value": str(inventory_value),
            "reserved_value": str(reserved_value),
            "available_value": str(available_value),
            "weighted_average_cost": str(
                _inventory_weighted_average_cost(
                    quantity=quantity_on_hand,
                    value=inventory_value,
                )
            ),
        }
    )

    return group


def build_inventory_valuation_summary(
    *,
    company: Company,
    warehouse_id: Any = None,
    location_id: Any = None,
    item_id: Any = None,
    category_id: Any = None,
    branch_id: Any = None,
    search: str = "",
    include_zero_quantity: bool = True,
    include_rows: bool = False,
    include_groups: bool = True,
) -> dict[str, Any]:
    """
    Build current inventory valuation summary for one company.

    This does not trust frontend company_id and must always receive company
    from the request/company context.
    """
    queryset = get_company_inventory_valuation_stock_items(company)
    queryset = _apply_inventory_valuation_filters(
        queryset,
        warehouse_id=warehouse_id,
        location_id=location_id,
        item_id=item_id,
        category_id=category_id,
        branch_id=branch_id,
        search=search,
        include_zero_quantity=include_zero_quantity,
    )

    stock_items = list(queryset)

    summary = _empty_inventory_valuation_summary()

    item_ids: set[int] = set()
    warehouse_ids: set[int] = set()
    location_ids: set[int] = set()

    total_quantity_on_hand = QUANTITY_ZERO
    total_reserved_quantity = QUANTITY_ZERO
    total_available_quantity = QUANTITY_ZERO
    total_inventory_value = MONEY_ZERO
    total_reserved_value = MONEY_ZERO
    total_available_value = MONEY_ZERO

    item_groups: dict[Any, dict[str, Any]] = {}
    warehouse_groups: dict[Any, dict[str, Any]] = {}
    location_groups: dict[Any, dict[str, Any]] = {}
    rows: list[dict[str, Any]] = []

    for stock_item in stock_items:
        quantity_on_hand = quantize_quantity(stock_item.quantity_on_hand)
        reserved_quantity = quantize_quantity(stock_item.reserved_quantity)
        available_quantity = quantize_quantity(stock_item.available_quantity)
        average_cost = quantize_money(stock_item.average_cost)

        inventory_value = quantize_money(quantity_on_hand * average_cost)
        reserved_value = quantize_money(reserved_quantity * average_cost)
        available_value = quantize_money(available_quantity * average_cost)

        item_ids.add(stock_item.item_id)
        warehouse_ids.add(stock_item.warehouse_id)
        location_ids.add(stock_item.location_id)

        total_quantity_on_hand = quantize_quantity(
            total_quantity_on_hand + quantity_on_hand
        )
        total_reserved_quantity = quantize_quantity(
            total_reserved_quantity + reserved_quantity
        )
        total_available_quantity = quantize_quantity(
            total_available_quantity + available_quantity
        )
        total_inventory_value = quantize_money(
            total_inventory_value + inventory_value
        )
        total_reserved_value = quantize_money(
            total_reserved_value + reserved_value
        )
        total_available_value = quantize_money(
            total_available_value + available_value
        )

        if include_rows:
            rows.append(build_stock_item_valuation_payload(stock_item))

        if include_groups:
            item = stock_item.item
            warehouse = stock_item.warehouse
            location = stock_item.location
            branch = warehouse.branch if warehouse.branch_id else None

            _accumulate_inventory_valuation_group(
                item_groups,
                key=stock_item.item_id,
                identity={
                    "item_id": item.id,
                    "code": item.code,
                    "sku": item.sku,
                    "barcode": item.barcode,
                    "name": item.name,
                    "name_ar": item.name_ar,
                    "name_en": item.name_en,
                    "category_id": item.category_id,
                    "unit_id": item.unit_id,
                },
                stock_item=stock_item,
            )

            _accumulate_inventory_valuation_group(
                warehouse_groups,
                key=stock_item.warehouse_id,
                identity={
                    "warehouse_id": warehouse.id,
                    "code": warehouse.code,
                    "name": warehouse.display_name,
                    "warehouse_type": warehouse.warehouse_type,
                    "status": warehouse.status,
                    "branch_id": warehouse.branch_id,
                    "branch_name": branch.display_name if branch else "",
                },
                stock_item=stock_item,
            )

            _accumulate_inventory_valuation_group(
                location_groups,
                key=stock_item.location_id,
                identity={
                    "location_id": location.id if location else None,
                    "warehouse_id": warehouse.id,
                    "code": location.code if location else "",
                    "name": location.display_name if location else "",
                    "full_path": location.full_path if location else "",
                    "location_type": location.location_type if location else "",
                    "status": location.status if location else "",
                },
                stock_item=stock_item,
            )

    summary.update(
        {
            "location_balances_count": len(stock_items),
            "distinct_items_count": len(item_ids),
            "warehouses_count": len(warehouse_ids),
            "locations_count": len(location_ids),
            "total_quantity_on_hand": str(total_quantity_on_hand),
            "total_reserved_quantity": str(total_reserved_quantity),
            "total_available_quantity": str(total_available_quantity),
            "total_inventory_value": str(total_inventory_value),
            "total_reserved_value": str(total_reserved_value),
            "total_available_value": str(total_available_value),
            "weighted_average_cost": str(
                _inventory_weighted_average_cost(
                    quantity=total_quantity_on_hand,
                    value=total_inventory_value,
                )
            ),
        }
    )

    payload = {
        "summary": summary,
        "filters": {
            "warehouse_id": str(warehouse_id or ""),
            "location_id": str(location_id or ""),
            "item_id": str(item_id or ""),
            "category_id": str(category_id or ""),
            "branch_id": str(branch_id or ""),
            "search": normalize_text(search),
            "include_zero_quantity": include_zero_quantity,
        },
    }

    if include_rows:
        payload["rows"] = rows
        payload["rows_count"] = len(rows)

    if include_groups:
        payload["items"] = [
            _finalize_inventory_valuation_group(group)
            for group in item_groups.values()
        ]
        payload["warehouses"] = [
            _finalize_inventory_valuation_group(group)
            for group in warehouse_groups.values()
        ]
        payload["locations"] = [
            _finalize_inventory_valuation_group(group)
            for group in location_groups.values()
        ]

        payload["items_count"] = len(payload["items"])
        payload["warehouses_count"] = len(payload["warehouses"])
        payload["locations_count"] = len(payload["locations"])

    return payload


# End Phase 22.5 Final - Advanced Inventory Valuation Services
# ============================================================
