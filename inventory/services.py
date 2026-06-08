# ============================================================
# 📂 inventory/services.py
# 🧠 PrimeyAcc | Company Inventory Services V1.0
# ------------------------------------------------------------
# ✅ Company-scoped warehouse services
# ✅ Company-scoped stock balance services
# ✅ Stock movement posting engine
# ✅ Tenant isolation validation
# ✅ No frontend company_id trust
# ✅ Prevent negative stock
# ✅ Catalog item snapshot through StockMovement model
# ✅ Ready for purchase receiving integration later
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل العمليات تستقبل company من request/company context
# - لا نقبل company_id من الواجهة
# - كل warehouse / branch / item يجب أن يتبع نفس الشركة
# - الخدمات هي المكان الوحيد لتطبيق أثر حركة المخزون على الرصيد
# - StockMovement هو الدفتر
# - StockItem هو الرصيد الحالي
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max, QuerySet
from django.utils import timezone

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
) -> StockMovement:
    """
    Create stock movement.

    If post_immediately=True, movement is posted and stock balance is updated.
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
        )

    return movement


@transaction.atomic
def post_stock_movement(
    *,
    company: Company,
    movement: StockMovement,
    user=None,
) -> StockMovement:
    """
    Post draft movement and update StockItem balance.
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
    reference_type: str = "",
    reference_id: int | None = None,
    reference_number: str = "",
    notes: str = "",
    user=None,
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
        unit_cost=None,
        reference_type=reference_type,
        reference_id=reference_id,
        reference_number=reference_number,
        notes=notes,
        user=user,
        post_immediately=True,
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