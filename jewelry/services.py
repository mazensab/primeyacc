# ============================================================
# 📂 jewelry/services.py
# 🧠 PrimeyAcc | Jewelry and Gold Backend Services — Phase 25.1
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

