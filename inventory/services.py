# ============================================================
# 📂 inventory/services.py
# 🧠 PrimeyAcc | Company Inventory Services V2.0
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
from django.db.models import Max, QuerySet
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
