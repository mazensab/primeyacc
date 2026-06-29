# ============================================================
# 📂 jewelry/services.py
# 🧠 Mhamcloud | Jewelry and Gold Backend Services — Phase 25.1
# ============================================================
# ✅ Seed default jewelry metals and karats
# ✅ Create daily gold rates safely per company
# ✅ Estimate and snapshot jewelry item prices
# ✅ Decimal-safe calculations for gold, making, VAT and totals
# ✅ API payload builders for company-scoped endpoints
# ============================================================
# القاعدة المعتمدة:
# - الخدمات لا تعتمد على واجهة المستخدم.
# - لا يوجد كسر للمخزون أو الكتالوج الحالي.
# - أي حساب مالي يتم باستخدام Decimal فقط.
# ============================================================

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from .models import (
    JewelryGoldRate,
    JewelryGoldRateStatus,
    JewelryItem,
    JewelryKarat,
    JewelryMakingChargeType,
    JewelryMetal,
    JewelryMetalType,
)


MONEY_QUANT = Decimal("0.01")
WEIGHT_QUANT = Decimal("0.000001")


def decimal_or_zero(value):
    if value in (None, ""):
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def quant_money(value):
    return decimal_or_zero(value).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def quant_weight(value):
    return decimal_or_zero(value).quantize(WEIGHT_QUANT, rounding=ROUND_HALF_UP)


def karat_to_purity_percent(karat_value):
    karat_value = decimal_or_zero(karat_value)
    if karat_value <= 0:
        return Decimal("0.0000")
    return ((karat_value / Decimal("24")) * Decimal("100")).quantize(
        Decimal("0.0001"),
        rounding=ROUND_HALF_UP,
    )


@transaction.atomic
def seed_default_jewelry_foundation(company):
    gold, _ = JewelryMetal.objects.get_or_create(
        company=company,
        code="GOLD",
        defaults={
            "name": "Gold",
            "metal_type": JewelryMetalType.GOLD,
            "purity_percent": Decimal("100.0000"),
            "is_active": True,
        },
    )

    karat_specs = [
        ("24K", "Gold 24K", Decimal("24.000")),
        ("22K", "Gold 22K", Decimal("22.000")),
        ("21K", "Gold 21K", Decimal("21.000")),
        ("18K", "Gold 18K", Decimal("18.000")),
    ]

    karats = []
    for code, name, value in karat_specs:
        karat, _ = JewelryKarat.objects.get_or_create(
            company=company,
            code=code,
            defaults={
                "metal": gold,
                "name": name,
                "karat_value": value,
                "purity_percent": karat_to_purity_percent(value),
                "is_default": code == "21K",
                "is_active": True,
            },
        )
        karats.append(karat)

    return {
        "metal": gold,
        "karats": karats,
    }


def metal_payload(metal):
    return {
        "id": metal.id,
        "company_id": metal.company_id,
        "code": metal.code,
        "name": metal.name,
        "metal_type": metal.metal_type,
        "purity_percent": str(metal.purity_percent),
        "is_active": metal.is_active,
        "notes": metal.notes,
        "created_at": metal.created_at.isoformat() if metal.created_at else None,
        "updated_at": metal.updated_at.isoformat() if metal.updated_at else None,
    }


def karat_payload(karat):
    return {
        "id": karat.id,
        "company_id": karat.company_id,
        "metal_id": karat.metal_id,
        "metal_code": karat.metal.code if karat.metal_id else None,
        "code": karat.code,
        "name": karat.name,
        "karat_value": str(karat.karat_value),
        "purity_percent": str(karat.purity_percent),
        "is_default": karat.is_default,
        "is_active": karat.is_active,
        "notes": karat.notes,
        "created_at": karat.created_at.isoformat() if karat.created_at else None,
        "updated_at": karat.updated_at.isoformat() if karat.updated_at else None,
    }


def gold_rate_payload(rate):
    return {
        "id": rate.id,
        "company_id": rate.company_id,
        "metal_id": rate.metal_id,
        "metal_code": rate.metal.code if rate.metal_id else None,
        "karat_id": rate.karat_id,
        "karat_code": rate.karat.code if rate.karat_id else None,
        "rate_date": rate.rate_date.isoformat() if rate.rate_date else None,
        "buying_price_per_gram": str(rate.buying_price_per_gram),
        "selling_price_per_gram": str(rate.selling_price_per_gram),
        "currency": rate.currency,
        "status": rate.status,
        "source": rate.source,
        "notes": rate.notes,
        "created_at": rate.created_at.isoformat() if rate.created_at else None,
        "updated_at": rate.updated_at.isoformat() if rate.updated_at else None,
    }


def jewelry_item_payload(item):
    return {
        "id": item.id,
        "company_id": item.company_id,
        "sku": item.sku,
        "name": item.name,
        "metal_id": item.metal_id,
        "metal_code": item.metal.code if item.metal_id else None,
        "karat_id": item.karat_id,
        "karat_code": item.karat.code if item.karat_id else None,
        "catalog_item_id": item.catalog_item_id,
        "inventory_item_id": item.inventory_item_id,
        "gross_weight": str(item.gross_weight),
        "stone_weight": str(item.stone_weight),
        "net_gold_weight": str(item.net_gold_weight),
        "making_charge_type": item.making_charge_type,
        "making_charge_value": str(item.making_charge_value),
        "stone_value": str(item.stone_value),
        "other_charges": str(item.other_charges),
        "vat_rate": str(item.vat_rate),
        "last_gold_rate_id": item.last_gold_rate_id,
        "last_base_amount": str(item.last_base_amount),
        "last_making_amount": str(item.last_making_amount),
        "last_subtotal": str(item.last_subtotal),
        "last_vat_amount": str(item.last_vat_amount),
        "last_total": str(item.last_total),
        "last_priced_at": item.last_priced_at.isoformat() if item.last_priced_at else None,
        "status": item.status,
        "notes": item.notes,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def get_latest_active_gold_rate(company, metal, karat=None, rate_date=None):
    qs = JewelryGoldRate.objects.filter(
        company=company,
        metal=metal,
        status=JewelryGoldRateStatus.ACTIVE,
    )
    if karat is not None:
        qs = qs.filter(karat=karat)
    if rate_date is not None:
        qs = qs.filter(rate_date__lte=rate_date)
    return qs.order_by("-rate_date", "-id").first()


@transaction.atomic
def create_gold_rate(
    *,
    company,
    metal,
    karat=None,
    rate_date=None,
    buying_price_per_gram,
    selling_price_per_gram,
    currency="SAR",
    status=JewelryGoldRateStatus.ACTIVE,
    source="",
    notes="",
):
    rate = JewelryGoldRate.objects.create(
        company=company,
        metal=metal,
        karat=karat,
        rate_date=rate_date or timezone.localdate(),
        buying_price_per_gram=decimal_or_zero(buying_price_per_gram),
        selling_price_per_gram=decimal_or_zero(selling_price_per_gram),
        currency=currency or "SAR",
        status=status,
        source=source or "",
        notes=notes or "",
    )
    return rate


def calculate_making_amount(*, net_gold_weight, base_amount, charge_type, charge_value):
    charge_value = decimal_or_zero(charge_value)
    net_gold_weight = decimal_or_zero(net_gold_weight)
    base_amount = decimal_or_zero(base_amount)

    if charge_type == JewelryMakingChargeType.FIXED:
        return quant_money(charge_value)

    if charge_type == JewelryMakingChargeType.PERCENTAGE:
        return quant_money(base_amount * (charge_value / Decimal("100")))

    return quant_money(net_gold_weight * charge_value)


def estimate_jewelry_price(
    *,
    net_gold_weight,
    gold_price_per_gram,
    making_charge_type=JewelryMakingChargeType.PER_GRAM,
    making_charge_value=Decimal("0"),
    stone_value=Decimal("0"),
    other_charges=Decimal("0"),
    vat_rate=Decimal("15.0000"),
):
    net_gold_weight = quant_weight(net_gold_weight)
    gold_price_per_gram = decimal_or_zero(gold_price_per_gram)

    base_amount = quant_money(net_gold_weight * gold_price_per_gram)
    making_amount = calculate_making_amount(
        net_gold_weight=net_gold_weight,
        base_amount=base_amount,
        charge_type=making_charge_type,
        charge_value=making_charge_value,
    )

    stone_value = quant_money(stone_value)
    other_charges = quant_money(other_charges)

    subtotal = quant_money(base_amount + making_amount + stone_value + other_charges)
    vat_amount = quant_money(subtotal * (decimal_or_zero(vat_rate) / Decimal("100")))
    total = quant_money(subtotal + vat_amount)

    return {
        "net_gold_weight": str(net_gold_weight),
        "gold_price_per_gram": str(gold_price_per_gram),
        "base_amount": str(base_amount),
        "making_amount": str(making_amount),
        "stone_value": str(stone_value),
        "other_charges": str(other_charges),
        "subtotal": str(subtotal),
        "vat_rate": str(decimal_or_zero(vat_rate)),
        "vat_amount": str(vat_amount),
        "total": str(total),
        "currency": "SAR",
    }


@transaction.atomic
def price_jewelry_item(item, *, gold_rate=None, save=True):
    if gold_rate is None:
        gold_rate = get_latest_active_gold_rate(item.company, item.metal, item.karat)

    if gold_rate is None:
        raise ValueError("No active gold rate found for this jewelry item.")

    estimate = estimate_jewelry_price(
        net_gold_weight=item.net_gold_weight,
        gold_price_per_gram=gold_rate.selling_price_per_gram,
        making_charge_type=item.making_charge_type,
        making_charge_value=item.making_charge_value,
        stone_value=item.stone_value,
        other_charges=item.other_charges,
        vat_rate=item.vat_rate,
    )

    if save:
        item.last_gold_rate = gold_rate
        item.last_base_amount = decimal_or_zero(estimate["base_amount"])
        item.last_making_amount = decimal_or_zero(estimate["making_amount"])
        item.last_subtotal = decimal_or_zero(estimate["subtotal"])
        item.last_vat_amount = decimal_or_zero(estimate["vat_amount"])
        item.last_total = decimal_or_zero(estimate["total"])
        item.last_priced_at = timezone.now()
        item.save(
            update_fields=[
                "last_gold_rate",
                "last_base_amount",
                "last_making_amount",
                "last_subtotal",
                "last_vat_amount",
                "last_total",
                "last_priced_at",
                "updated_at",
            ]
        )

    return estimate


def jewelry_summary_payload(company):
    return {
        "company_id": company.id,
        "metals_count": JewelryMetal.objects.filter(company=company).count(),
        "active_metals_count": JewelryMetal.objects.filter(company=company, is_active=True).count(),
        "karats_count": JewelryKarat.objects.filter(company=company).count(),
        "gold_rates_count": JewelryGoldRate.objects.filter(company=company).count(),
        "active_gold_rates_count": JewelryGoldRate.objects.filter(
            company=company,
            status=JewelryGoldRateStatus.ACTIVE,
        ).count(),
        "items_count": JewelryItem.objects.filter(company=company).count(),
        "active_items_count": JewelryItem.objects.filter(company=company, status="active").count(),
    }

# ============================================================
# Phase 25.2 — Jewelry Catalog, Inventory, Purchase and Sales Integration
# ============================================================
# ✅ Link JewelryItem to CatalogItem safely
# ✅ Sync latest jewelry pricing into catalog sale/purchase/cost prices
# ✅ Receive jewelry stock into inventory using existing StockMovement engine
# ✅ Build sales and purchase payloads from jewelry pricing snapshots
# ✅ Create draft sales invoices and purchase bills from JewelryItem
# ✅ Keep all integrations company-scoped and isolated inside jewelry services
# ============================================================


def _phase252_normalize_bool(value, default=False):
    if value in (None, ""):
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "yes", "y", "on"}:
            return True
        if normalized in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def _phase252_get_jewelry_catalog_unit(company, unit_id=None, user=None):
    """
    Resolve or create a default PCS catalog unit for jewelry pieces.
    """
    from catalog.models import CatalogUnit, CatalogUnitStatus

    if unit_id not in (None, ""):
        unit = CatalogUnit.objects.filter(
            company=company,
            id=unit_id,
        ).first()
        if unit is None:
            raise ValueError("Catalog unit was not found for this company.")
        return unit

    unit = (
        CatalogUnit.objects.filter(
            company=company,
            code="PCS",
        )
        .order_by("id")
        .first()
    )
    if unit is not None:
        return unit

    unit = CatalogUnit(
        company=company,
        status=CatalogUnitStatus.ACTIVE,
        code="PCS",
        name="Piece",
        name_ar="قطعة",
        name_en="Piece",
        symbol="pc",
        decimal_places=2,
        is_default=False,
        notes="Automatically created by Jewelry Phase 25.2.",
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )
    unit.full_clean()
    unit.save()
    return unit


def _phase252_get_jewelry_catalog_category(company, category_id=None):
    """
    Resolve optional jewelry category. Category remains optional.
    """
    if category_id in (None, ""):
        return None

    from catalog.models import CatalogCategory

    category = CatalogCategory.objects.filter(
        company=company,
        id=category_id,
    ).first()
    if category is None:
        raise ValueError("Catalog category was not found for this company.")
    return category


def _phase252_active_catalog_item(company, catalog_item_id):
    if catalog_item_id in (None, ""):
        return None

    from catalog.models import CatalogItem

    return CatalogItem.objects.filter(
        company=company,
        id=catalog_item_id,
    ).first()


def _phase252_jewelry_catalog_extra_data(item):
    return {
        "activity": "jewelry",
        "jewelry_item_id": item.id,
        "jewelry_sku": item.sku,
        "metal_id": item.metal_id,
        "metal_code": item.metal.code if item.metal_id else "",
        "karat_id": item.karat_id,
        "karat_code": item.karat.code if item.karat_id else "",
        "gross_weight": str(item.gross_weight),
        "stone_weight": str(item.stone_weight),
        "net_gold_weight": str(item.net_gold_weight),
        "making_charge_type": item.making_charge_type,
        "making_charge_value": str(item.making_charge_value),
        "stone_value": str(item.stone_value),
        "other_charges": str(item.other_charges),
        "vat_rate": str(item.vat_rate),
        "phase": "25.2",
    }


def build_jewelry_catalog_payload(
    item,
    *,
    unit_id=None,
    category_id=None,
    force_reprice=True,
    user=None,
):
    """
    Build a safe CatalogItem payload from JewelryItem.
    """
    if force_reprice or not item.last_priced_at:
        price_jewelry_item(item, save=True)

    unit = _phase252_get_jewelry_catalog_unit(
        item.company,
        unit_id=unit_id,
        user=user,
    )
    category = _phase252_get_jewelry_catalog_category(
        item.company,
        category_id=category_id,
    )

    purchase_cost = quant_money(
        decimal_or_zero(item.last_base_amount)
        + decimal_or_zero(item.last_making_amount)
        + decimal_or_zero(item.stone_value)
        + decimal_or_zero(item.other_charges)
    )

    from catalog.models import CatalogItemStatus, CatalogItemType

    return {
        "category_id": category.id if category else None,
        "unit_id": unit.id,
        "item_type": CatalogItemType.PRODUCT,
        "status": CatalogItemStatus.ACTIVE,
        "code": item.sku,
        "sku": item.sku,
        "barcode": "",
        "name": item.name,
        "name_ar": "",
        "name_en": item.name,
        "description": (
            f"Jewelry item {item.sku} | "
            f"{item.metal.code if item.metal_id else ''} "
            f"{item.karat.code if item.karat_id else ''} | "
            f"net weight {item.net_gold_weight}"
        ).strip(),
        "sale_price": item.last_total,
        "purchase_price": purchase_cost,
        "cost_price": purchase_cost,
        "is_sellable": True,
        "is_purchasable": True,
        "track_inventory": True,
        "taxable": True,
        "tax_rate": quant_money(item.vat_rate),
        "sort_order": 0,
        "notes": item.notes or "Synchronized from jewelry activity.",
        "extra_data": _phase252_jewelry_catalog_extra_data(item),
    }


@transaction.atomic
def sync_jewelry_item_to_catalog(
    item,
    *,
    unit_id=None,
    category_id=None,
    update_existing=True,
    force_reprice=True,
    user=None,
):
    """
    Create or update a CatalogItem linked to a JewelryItem.

    The existing JewelryItem keeps catalog_item_id as a lightweight
    cross-app reference to avoid rewriting old Phase 25.1 migrations.
    """
    if item is None:
        raise ValueError("Jewelry item is required.")

    payload = build_jewelry_catalog_payload(
        item,
        unit_id=unit_id,
        category_id=category_id,
        force_reprice=force_reprice,
        user=user,
    )

    from catalog.models import CatalogItem
    from catalog.services import create_catalog_item, update_catalog_item

    catalog_item = _phase252_active_catalog_item(
        item.company,
        item.catalog_item_id,
    )

    if catalog_item is None:
        catalog_item = (
            CatalogItem.objects.filter(
                company=item.company,
                sku=item.sku,
            )
            .order_by("id")
            .first()
        )

    if catalog_item is None:
        catalog_item = (
            CatalogItem.objects.filter(
                company=item.company,
                code=item.sku,
            )
            .order_by("id")
            .first()
        )

    created = False

    if catalog_item is None:
        catalog_item = create_catalog_item(
            company=item.company,
            data=payload,
            user=user,
        )
        created = True
    elif update_existing:
        catalog_item = update_catalog_item(
            item=catalog_item,
            data=payload,
            user=user,
        )

    if item.catalog_item_id != catalog_item.id:
        item.catalog_item_id = catalog_item.id
        item.save(update_fields=["catalog_item_id", "updated_at"])

    return {
        "created": created,
        "catalog_item": catalog_item,
        "jewelry_item": item,
    }


def build_jewelry_sales_line_payload(
    item,
    *,
    quantity=1,
    force_reprice=True,
):
    """
    Build a sales document item payload for one JewelryItem.
    """
    if not item.catalog_item_id:
        raise ValueError("Jewelry item must be synced to catalog first.")

    if force_reprice or not item.last_priced_at:
        price_jewelry_item(item, save=True)

    return {
        "catalog_item_id": item.catalog_item_id,
        "quantity": str(quant_weight(quantity)),
        "unit_price": str(quant_money(item.last_total)),
        "discount_amount": "0.00",
        "taxable": True,
        "tax_rate": str(quant_money(item.vat_rate)),
        "description": (
            f"Jewelry sale {item.sku} | "
            f"metal={item.metal.code if item.metal_id else ''} | "
            f"karat={item.karat.code if item.karat_id else ''} | "
            f"net_gold_weight={item.net_gold_weight}"
        ),
    }


def build_jewelry_purchase_line_payload(
    item,
    *,
    quantity=1,
    unit_price=None,
    force_reprice=True,
):
    """
    Build a purchase bill item payload for one JewelryItem.
    """
    if not item.catalog_item_id:
        raise ValueError("Jewelry item must be synced to catalog first.")

    if force_reprice or not item.last_priced_at:
        price_jewelry_item(item, save=True)

    default_unit_price = quant_money(
        decimal_or_zero(item.last_base_amount)
        + decimal_or_zero(item.last_making_amount)
        + decimal_or_zero(item.stone_value)
        + decimal_or_zero(item.other_charges)
    )

    return {
        "item_id": item.catalog_item_id,
        "quantity": str(quant_weight(quantity)),
        "unit_price": str(quant_money(unit_price if unit_price is not None else default_unit_price)),
        "discount_amount": "0.00",
        "notes": (
            f"Jewelry purchase {item.sku} | "
            f"metal={item.metal.code if item.metal_id else ''} | "
            f"karat={item.karat.code if item.karat_id else ''} | "
            f"net_gold_weight={item.net_gold_weight}"
        ),
        "extra_data": {
            "source": "jewelry",
            "jewelry_item_id": item.id,
            "jewelry_sku": item.sku,
        },
    }


@transaction.atomic
def create_jewelry_sales_invoice(
    *,
    company,
    item,
    customer_id=None,
    branch_id=None,
    quantity=1,
    user=None,
):
    """
    Create a draft sales invoice for one jewelry item.
    """
    if item.company_id != company.id:
        raise ValueError("Jewelry item does not belong to this company.")

    sync_jewelry_item_to_catalog(
        item,
        user=user,
        update_existing=True,
        force_reprice=True,
    )

    from sales.services import create_sales_invoice

    invoice = create_sales_invoice(
        company=company,
        user=user,
        branch_id=branch_id,
        customer_id=customer_id,
        items=[
            build_jewelry_sales_line_payload(
                item,
                quantity=quantity,
                force_reprice=False,
            )
        ],
        extra_data={
            "source": "jewelry",
            "jewelry_item_id": item.id,
            "jewelry_sku": item.sku,
            "phase": "25.2",
        },
    )

    return invoice


@transaction.atomic
def create_jewelry_purchase_bill(
    *,
    company,
    item,
    supplier_id,
    branch_id=None,
    quantity=1,
    unit_price=None,
    user=None,
):
    """
    Create a draft purchase bill for one jewelry item.
    """
    if item.company_id != company.id:
        raise ValueError("Jewelry item does not belong to this company.")

    sync_jewelry_item_to_catalog(
        item,
        user=user,
        update_existing=True,
        force_reprice=True,
    )

    from purchases.services import create_purchase_bill

    bill = create_purchase_bill(
        company=company,
        payload={
            "supplier_id": supplier_id,
            "branch_id": branch_id,
            "items": [
                build_jewelry_purchase_line_payload(
                    item,
                    quantity=quantity,
                    unit_price=unit_price,
                    force_reprice=False,
                )
            ],
            "extra_data": {
                "source": "jewelry",
                "jewelry_item_id": item.id,
                "jewelry_sku": item.sku,
                "phase": "25.2",
            },
        },
        user=user,
    )

    return bill


@transaction.atomic
def receive_jewelry_item_stock(
    *,
    company,
    item,
    warehouse_id,
    location_id=None,
    quantity=1,
    unit_cost=None,
    reference_number="",
    user=None,
):
    """
    Receive jewelry stock into inventory using the existing stock engine.

    Accounting posting is disabled here because this endpoint is an
    inventory receiving integration helper. Supplier bill accounting remains
    in purchases services.
    """
    if item.company_id != company.id:
        raise ValueError("Jewelry item does not belong to this company.")

    sync_jewelry_item_to_catalog(
        item,
        user=user,
        update_existing=True,
        force_reprice=True,
    )

    from catalog.models import CatalogItem
    from inventory.models import InventoryLocation, StockMovementType, Warehouse
    from inventory.services import create_stock_movement

    warehouse = Warehouse.objects.filter(
        company=company,
        id=warehouse_id,
        status="ACTIVE",
        is_active=True,
    ).first()
    if warehouse is None:
        raise ValueError("Active warehouse was not found for this company.")

    location = None
    if location_id not in (None, ""):
        location = InventoryLocation.objects.filter(
            company=company,
            warehouse=warehouse,
            id=location_id,
        ).first()
        if location is None:
            raise ValueError("Inventory location was not found for this warehouse.")

    catalog_item = CatalogItem.objects.filter(
        company=company,
        id=item.catalog_item_id,
    ).first()
    if catalog_item is None:
        raise ValueError("Linked catalog item was not found.")

    movement = create_stock_movement(
        company=company,
        warehouse=warehouse,
        item=catalog_item,
        movement_type=StockMovementType.IN,
        location=location,
        quantity=quantity,
        unit_cost=unit_cost if unit_cost is not None else catalog_item.cost_price,
        reference_type="jewelry_item",
        reference_id=item.id,
        reference_number=reference_number or item.sku,
        notes=f"Jewelry stock receipt for {item.sku}",
        extra_data={
            "source": "jewelry",
            "jewelry_item_id": item.id,
            "jewelry_sku": item.sku,
            "phase": "25.2",
        },
        user=user,
        post_immediately=True,
        post_accounting=False,
    )

    item.inventory_item_id = movement.stock_item_id
    item.save(update_fields=["inventory_item_id", "updated_at"])

    return movement


def jewelry_integration_payload(item):
    """
    Return a compact integration status payload for APIs.
    """
    data = jewelry_item_payload(item)

    catalog_item = None
    stock_item = None

    if item.catalog_item_id:
        from catalog.models import CatalogItem

        catalog_item = CatalogItem.objects.filter(
            company=item.company,
            id=item.catalog_item_id,
        ).first()

    if item.inventory_item_id:
        from inventory.models import StockItem

        stock_item = (
            StockItem.objects.select_related("warehouse", "location", "item")
            .filter(
                company=item.company,
                id=item.inventory_item_id,
            )
            .first()
        )

    data["integration"] = {
        "catalog_linked": catalog_item is not None,
        "inventory_linked": stock_item is not None,
        "catalog": (
            {
                "id": catalog_item.id,
                "code": catalog_item.code,
                "sku": catalog_item.sku,
                "name": catalog_item.name,
                "sale_price": str(catalog_item.sale_price),
                "purchase_price": str(catalog_item.purchase_price),
                "cost_price": str(catalog_item.cost_price),
                "track_inventory": catalog_item.track_inventory,
            }
            if catalog_item
            else None
        ),
        "stock": (
            {
                "id": stock_item.id,
                "warehouse_id": stock_item.warehouse_id,
                "warehouse_name": stock_item.warehouse.display_name,
                "location_id": stock_item.location_id,
                "location_name": stock_item.location.display_name,
                "quantity_on_hand": str(stock_item.quantity_on_hand),
                "reserved_quantity": str(stock_item.reserved_quantity),
                "available_quantity": str(stock_item.available_quantity),
                "average_cost": str(stock_item.average_cost),
            }
            if stock_item
            else None
        ),
    }

    return data
