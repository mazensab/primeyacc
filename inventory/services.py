# ============================================================
# 📂 inventory/services.py
# 🧠 PrimeyAcc | Company Inventory Services V1.1
# ------------------------------------------------------------
# ✅ Company-scoped warehouse services
# ✅ Company-scoped stock balance services
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
from catalog.models import CatalogItem, CatalogItemType
from companies.models import Branch, Company

from .models import (
    MONEY_ZERO,
    QUANTITY_ZERO,
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


def get_company_stock_items(company: Company) -> QuerySet[StockItem]:
    """
    Return stock balances for one company.
    """
    return StockItem.objects.filter(company=company).select_related(
        "company",
        "warehouse",
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


def get_or_create_stock_item(
    *,
    company: Company,
    warehouse: Warehouse,
    item: CatalogItem,
) -> StockItem:
    """
    Get or create current stock balance row.
    """
    validate_warehouse_for_company(
        company=company,
        warehouse=warehouse,
        require_active=True,
    )
    validate_item_for_inventory(company=company, item=item)

    stock_item, _created = StockItem.objects.get_or_create(
        company=company,
        warehouse=warehouse,
        item=item,
        defaults={
            "quantity_on_hand": QUANTITY_ZERO,
            "reserved_quantity": QUANTITY_ZERO,
            "minimum_quantity": QUANTITY_ZERO,
            "maximum_quantity": QUANTITY_ZERO,
            "average_cost": quantize_money(item.cost_price or item.purchase_price or MONEY_ZERO),
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
    )

    cost = quantize_money(
        unit_cost
        if unit_cost is not None
        else item.cost_price or item.purchase_price or stock_item.average_cost or MONEY_ZERO
    )

    movement = StockMovement(
        company=company,
        warehouse=warehouse,
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

    stock_item = StockItem.objects.select_for_update().get(
        company=company,
        warehouse=movement.warehouse,
        item=movement.item,
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
    reference_number: str = "",
    notes: str = "",
    user=None,
) -> dict[str, StockMovement]:
    """
    Transfer stock between two warehouses in the same company.

    This foundation creates two posted ledger records:
    - TRANSFER_OUT from source warehouse
    - TRANSFER_IN into target warehouse

    Same-company transfer is inventory ledger movement only here.
    It does not create GL journal entries because ownership and total inventory
    value remain inside the same company.
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

    if source_warehouse.id == target_warehouse.id:
        raise ValidationError("Source and target warehouses cannot be the same.")

    validate_item_for_inventory(company=company, item=item)

    quantity_value = quantize_quantity(quantity)
    if quantity_value <= QUANTITY_ZERO:
        raise ValidationError("Quantity must be greater than zero.")

    outgoing = create_stock_movement(
        company=company,
        warehouse=source_warehouse,
        item=item,
        movement_type=StockMovementType.TRANSFER_OUT,
        quantity=quantity_value,
        reference_type="warehouse_transfer",
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
        quantity=quantity_value,
        unit_cost=outgoing.unit_cost,
        reference_type="warehouse_transfer",
        reference_number=reference_number,
        notes=notes,
        user=user,
        post_immediately=True,
    )

    return {
        "outgoing": outgoing,
        "incoming": incoming,
    }