# ============================================================
# 📂 inventory/migrations/0004_backfill_stock_locations.py
# 🧠 Mhamcloud | Existing Stock Locations Data Migration V1.0
# ------------------------------------------------------------
# ✅ Create/reuse one default stock location per used warehouse
# ✅ Backfill existing StockItem.location values
# ✅ Backfill existing StockMovement.location values
# ✅ Prefer movement stock-item location when available
# ✅ Preserve quantities, costs, references and movement status
# ✅ Reversible by clearing location links only
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم حذف أو دمج أي رصيد
# - لا يتم تغيير الكميات أو التكاليف
# - المواقع الموجودة يعاد استخدامها قبل إنشاء موقع جديد
# - reverse يعيد location إلى NULL ولا يحذف مواقع المستودع
# ============================================================

from django.db import migrations


DEFAULT_LOCATION_CODE = "STOCK"


def _get_or_create_default_location(
    *,
    InventoryLocation,
    warehouse_id,
    company_id,
    database_alias,
):
    """
    Resolve the warehouse default stock location using historical models.
    """
    locations = InventoryLocation.objects.using(database_alias)

    location = (
        locations.filter(
            company_id=company_id,
            warehouse_id=warehouse_id,
            is_default=True,
        )
        .order_by("id")
        .first()
    )

    if location is not None:
        return location

    location = (
        locations.filter(
            company_id=company_id,
            warehouse_id=warehouse_id,
            code=DEFAULT_LOCATION_CODE,
        )
        .order_by("id")
        .first()
    )

    if location is not None:
        update_fields = []

        if not location.is_default:
            location.is_default = True
            update_fields.append("is_default")

        if not location.is_active:
            location.is_active = True
            update_fields.append("is_active")

        if location.status != "ACTIVE":
            location.status = "ACTIVE"
            update_fields.append("status")

        if not location.is_pickable:
            location.is_pickable = True
            update_fields.append("is_pickable")

        if update_fields:
            location.save(
                using=database_alias,
                update_fields=update_fields,
            )

        return location

    return locations.create(
        company_id=company_id,
        warehouse_id=warehouse_id,
        parent_id=None,
        status="ACTIVE",
        location_type="BIN",
        code=DEFAULT_LOCATION_CODE,
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
            "Automatically created while migrating existing "
            "warehouse-level stock balances."
        ),
        extra_data={
            "created_by_migration": (
                "0004_backfill_stock_locations"
            ),
            "purpose": "existing_stock_backfill",
        },
        created_by_id=None,
        updated_by_id=None,
    )


def backfill_stock_locations(apps, schema_editor):
    """
    Link existing warehouse-level stock data to default locations.
    """
    InventoryLocation = apps.get_model(
        "inventory",
        "InventoryLocation",
    )
    StockItem = apps.get_model(
        "inventory",
        "StockItem",
    )
    StockMovement = apps.get_model(
        "inventory",
        "StockMovement",
    )

    database_alias = schema_editor.connection.alias

    stock_items = StockItem.objects.using(database_alias)
    stock_movements = StockMovement.objects.using(database_alias)

    warehouse_pairs = set(
        stock_items.filter(location_id__isnull=True)
        .values_list(
            "warehouse_id",
            "company_id",
        )
        .distinct()
    )

    warehouse_pairs.update(
        stock_movements.filter(location_id__isnull=True)
        .values_list(
            "warehouse_id",
            "company_id",
        )
        .distinct()
    )

    default_location_ids = {}

    for warehouse_id, company_id in warehouse_pairs:
        location = _get_or_create_default_location(
            InventoryLocation=InventoryLocation,
            warehouse_id=warehouse_id,
            company_id=company_id,
            database_alias=database_alias,
        )

        default_location_ids[
            (warehouse_id, company_id)
        ] = location.id

    for (
        warehouse_id,
        company_id,
    ), location_id in default_location_ids.items():
        stock_items.filter(
            company_id=company_id,
            warehouse_id=warehouse_id,
            location_id__isnull=True,
        ).update(
            location_id=location_id,
        )

    movements_with_stock_items = (
        stock_movements.filter(
            location_id__isnull=True,
            stock_item_id__isnull=False,
        )
        .select_related("stock_item")
        .iterator(chunk_size=500)
    )

    movement_updates = []

    for movement in movements_with_stock_items:
        stock_item_location_id = getattr(
            movement.stock_item,
            "location_id",
            None,
        )

        if stock_item_location_id:
            movement.location_id = stock_item_location_id
            movement_updates.append(movement)

        if len(movement_updates) >= 500:
            StockMovement.objects.using(
                database_alias
            ).bulk_update(
                movement_updates,
                ["location"],
                batch_size=500,
            )
            movement_updates = []

    if movement_updates:
        StockMovement.objects.using(
            database_alias
        ).bulk_update(
            movement_updates,
            ["location"],
            batch_size=500,
        )

    for (
        warehouse_id,
        company_id,
    ), location_id in default_location_ids.items():
        stock_movements.filter(
            company_id=company_id,
            warehouse_id=warehouse_id,
            location_id__isnull=True,
        ).update(
            location_id=location_id,
        )


def reverse_stock_locations(apps, schema_editor):
    """
    Clear migrated links without deleting created/reused locations.
    """
    StockItem = apps.get_model(
        "inventory",
        "StockItem",
    )
    StockMovement = apps.get_model(
        "inventory",
        "StockMovement",
    )

    database_alias = schema_editor.connection.alias

    StockMovement.objects.using(database_alias).update(
        location_id=None,
    )
    StockItem.objects.using(database_alias).update(
        location_id=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        (
            "inventory",
            "0003_stockitem_location_stockmovement_location_and_more",
        ),
    ]

    operations = [
        migrations.RunPython(
            backfill_stock_locations,
            reverse_stock_locations,
        ),
    ]
