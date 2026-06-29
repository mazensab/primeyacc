# ============================================================
# 📂 jewelry/models.py
# 🧠 Mhamcloud | Jewelry and Gold Backend Models — Phase 25.1
# ============================================================
# ✅ Company-scoped jewelry and gold foundation
# ✅ Metal, karat, gold-rate, jewelry item and pricing snapshot
# ✅ Activity-specific models without touching inventory internals
# ✅ Safe Decimal fields for weights, purity, making charges and prices
# ✅ Supports catalog/inventory linking by reference fields for future closure
# ============================================================
# القاعدة المعتمدة:
# - لا يتم كسر أي منجز سابق في catalog أو inventory.
# - جميع السجلات الحساسة مرتبطة بالشركة.
# - التسعير يحفظ snapshot واضحا قابلا للمراجعة.
# - الربط العميق مع المخزون يتم لاحقا بعد ثبات نشاط الذهب.
# ============================================================

from decimal import Decimal

from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.utils import timezone


class JewelryMetalType(models.TextChoices):
    GOLD = "gold", "Gold"
    SILVER = "silver", "Silver"
    PLATINUM = "platinum", "Platinum"
    DIAMOND = "diamond", "Diamond"
    GEMSTONE = "gemstone", "Gemstone"
    OTHER = "other", "Other"


class JewelryMakingChargeType(models.TextChoices):
    PER_GRAM = "per_gram", "Per gram"
    FIXED = "fixed", "Fixed"
    PERCENTAGE = "percentage", "Percentage"


class JewelryItemStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    DISCONTINUED = "discontinued", "Discontinued"


class JewelryGoldRateStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ACTIVE = "active", "Active"
    ARCHIVED = "archived", "Archived"


class JewelryMetal(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="jewelry_metals",
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=160)
    metal_type = models.CharField(
        max_length=32,
        choices=JewelryMetalType.choices,
        default=JewelryMetalType.GOLD,
    )
    purity_percent = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=Decimal("100.0000"),
        validators=[MinValueValidator(Decimal("0.0001")), MaxValueValidator(Decimal("100.0000"))],
    )
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "metal_type", "code"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_jewelry_metal_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "metal_type"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class JewelryKarat(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="jewelry_karats",
    )
    metal = models.ForeignKey(
        JewelryMetal,
        on_delete=models.PROTECT,
        related_name="karats",
    )
    code = models.CharField(max_length=32)
    name = models.CharField(max_length=120)
    karat_value = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001")), MaxValueValidator(Decimal("24.000"))],
    )
    purity_percent = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        validators=[MinValueValidator(Decimal("0.0001")), MaxValueValidator(Decimal("100.0000"))],
    )
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "-karat_value", "code"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                name="unique_jewelry_karat_code_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "metal"]),
            models.Index(fields=["company", "is_active"]),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"


class JewelryGoldRate(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="jewelry_gold_rates",
    )
    metal = models.ForeignKey(
        JewelryMetal,
        on_delete=models.PROTECT,
        related_name="gold_rates",
    )
    karat = models.ForeignKey(
        JewelryKarat,
        on_delete=models.PROTECT,
        related_name="gold_rates",
        null=True,
        blank=True,
    )
    rate_date = models.DateField(default=timezone.localdate)
    buying_price_per_gram = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("0.000000"))],
    )
    selling_price_per_gram = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        validators=[MinValueValidator(Decimal("0.000000"))],
    )
    currency = models.CharField(max_length=8, default="SAR")
    status = models.CharField(
        max_length=16,
        choices=JewelryGoldRateStatus.choices,
        default=JewelryGoldRateStatus.ACTIVE,
    )
    source = models.CharField(max_length=120, blank=True, default="")
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "-rate_date", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "metal", "karat", "rate_date", "status"],
                name="unique_jewelry_gold_rate_scope",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "rate_date"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "metal", "karat"]),
        ]

    def __str__(self):
        karat_code = self.karat.code if self.karat_id else "base"
        return f"{self.rate_date} {self.metal.code}/{karat_code} {self.selling_price_per_gram}"


class JewelryItem(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="jewelry_items",
    )
    sku = models.CharField(max_length=80)
    name = models.CharField(max_length=220)
    metal = models.ForeignKey(
        JewelryMetal,
        on_delete=models.PROTECT,
        related_name="jewelry_items",
    )
    karat = models.ForeignKey(
        JewelryKarat,
        on_delete=models.PROTECT,
        related_name="jewelry_items",
        null=True,
        blank=True,
    )

    catalog_item_id = models.PositiveBigIntegerField(null=True, blank=True)
    inventory_item_id = models.PositiveBigIntegerField(null=True, blank=True)

    gross_weight = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        validators=[MinValueValidator(Decimal("0.000000"))],
    )
    stone_weight = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        validators=[MinValueValidator(Decimal("0.000000"))],
    )
    net_gold_weight = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        validators=[MinValueValidator(Decimal("0.000000"))],
    )

    making_charge_type = models.CharField(
        max_length=24,
        choices=JewelryMakingChargeType.choices,
        default=JewelryMakingChargeType.PER_GRAM,
    )
    making_charge_value = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        validators=[MinValueValidator(Decimal("0.000000"))],
    )

    stone_value = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        validators=[MinValueValidator(Decimal("0.000000"))],
    )
    other_charges = models.DecimalField(
        max_digits=18,
        decimal_places=6,
        default=Decimal("0.000000"),
        validators=[MinValueValidator(Decimal("0.000000"))],
    )
    vat_rate = models.DecimalField(
        max_digits=7,
        decimal_places=4,
        default=Decimal("15.0000"),
        validators=[MinValueValidator(Decimal("0.0000")), MaxValueValidator(Decimal("100.0000"))],
    )

    last_gold_rate = models.ForeignKey(
        JewelryGoldRate,
        on_delete=models.SET_NULL,
        related_name="priced_items",
        null=True,
        blank=True,
    )
    last_base_amount = models.DecimalField(max_digits=18, decimal_places=6, default=Decimal("0.000000"))
    last_making_amount = models.DecimalField(max_digits=18, decimal_places=6, default=Decimal("0.000000"))
    last_subtotal = models.DecimalField(max_digits=18, decimal_places=6, default=Decimal("0.000000"))
    last_vat_amount = models.DecimalField(max_digits=18, decimal_places=6, default=Decimal("0.000000"))
    last_total = models.DecimalField(max_digits=18, decimal_places=6, default=Decimal("0.000000"))
    last_priced_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(
        max_length=24,
        choices=JewelryItemStatus.choices,
        default=JewelryItemStatus.ACTIVE,
    )
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["company_id", "sku"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "sku"],
                name="unique_jewelry_item_sku_per_company",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "metal", "karat"]),
            models.Index(fields=["company", "catalog_item_id"]),
            models.Index(fields=["company", "inventory_item_id"]),
        ]

    def __str__(self):
        return f"{self.sku} - {self.name}"

