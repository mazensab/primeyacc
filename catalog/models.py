# ============================================================
# 📂 catalog/models.py
# 🧠 PrimeyAcc | Company Catalog Models V1.0
# ------------------------------------------------------------
# ✅ Company-scoped catalog foundation
# ✅ Categories, units, products, and services
# ✅ Tenant isolation through company FK
# ✅ No frontend company_id trust
# ✅ Product/service unified as CatalogItem
# ✅ Safe uniqueness per company
# ✅ Category/unit ownership validation
# ✅ Ready for invoices, sales, purchases, and inventory later
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل بيانات الكتالوج مرتبطة بشركة واحدة فقط
# - الشركة تؤخذ من request.company في APIs وليس من company_id القادم من الفرونت
# - المنتج/الخدمة لا يرتبط مباشرة بفرع في هذه المرحلة
# - التصنيف والوحدة يجب أن يكونا تابعين لنفس شركة المنتج
# - المخزون والأسعار حسب الفروع ستكون في مراحل لاحقة بجداول مستقلة
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from companies.models import Company


class CatalogCategoryStatus(models.TextChoices):
    """
    Status values for catalog categories.
    """

    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class CatalogUnitStatus(models.TextChoices):
    """
    Status values for catalog units.
    """

    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class CatalogItemType(models.TextChoices):
    """
    Catalog item type.

    PRODUCT:
        Physical or inventory-capable item.

    SERVICE:
        Non-stock service item.
    """

    PRODUCT = "PRODUCT", "Product"
    SERVICE = "SERVICE", "Service"


class CatalogItemStatus(models.TextChoices):
    """
    Status values for catalog items.
    """

    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class CatalogCategory(models.Model):
    """
    Company-scoped catalog category.

    Used to group products and services inside one company only.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="catalog_categories",
        db_index=True,
    )

    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        related_name="children",
        blank=True,
        null=True,
    )

    status = models.CharField(
        max_length=20,
        choices=CatalogCategoryStatus.choices,
        default=CatalogCategoryStatus.ACTIVE,
        db_index=True,
    )

    code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        help_text="Optional category code unique per company when provided.",
    )

    name = models.CharField(
        max_length=255,
        db_index=True,
    )

    name_ar = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    name_en = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_catalog_categories",
        blank=True,
        null=True,
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_catalog_categories",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Catalog Category"
        verbose_name_plural = "Catalog Categories"
        ordering = ["sort_order", "name", "id"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "name"]),
            models.Index(fields=["company", "parent"]),
            models.Index(fields=["company", "sort_order"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                condition=~Q(code=""),
                name="unique_catalog_category_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_catalog_category_name_per_company",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.company}"

    @property
    def is_active_category(self) -> bool:
        return self.status == CatalogCategoryStatus.ACTIVE

    def clean(self) -> None:
        super().clean()

        self.code = (self.code or "").strip()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()

        if not self.name:
            self.name = self.name_ar or self.name_en

        if not self.name:
            raise ValidationError({"name": "Category name is required."})

        if self.parent_id:
            if self.parent_id == self.id:
                raise ValidationError(
                    {"parent": "Category cannot be parent of itself."}
                )

            if self.parent.company_id != self.company_id:
                raise ValidationError(
                    {"parent": "Parent category must belong to the same company."}
                )


class CatalogUnit(models.Model):
    """
    Company-scoped catalog unit.

    Examples:
        Piece, Box, Hour, Day, Service, Kg, Meter.
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="catalog_units",
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=CatalogUnitStatus.choices,
        default=CatalogUnitStatus.ACTIVE,
        db_index=True,
    )

    code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        help_text="Optional unit code unique per company when provided.",
    )

    name = models.CharField(
        max_length=120,
        db_index=True,
    )

    name_ar = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    name_en = models.CharField(
        max_length=120,
        blank=True,
        default="",
    )

    symbol = models.CharField(
        max_length=30,
        blank=True,
        default="",
        help_text="Short unit symbol such as pcs, kg, h.",
    )

    decimal_places = models.PositiveSmallIntegerField(
        default=2,
        help_text="Allowed decimal places for quantities using this unit.",
    )

    is_default = models.BooleanField(
        default=False,
        db_index=True,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_catalog_units",
        blank=True,
        null=True,
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_catalog_units",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Catalog Unit"
        verbose_name_plural = "Catalog Units"
        ordering = ["name", "id"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "name"]),
            models.Index(fields=["company", "is_default"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                condition=~Q(code=""),
                name="unique_catalog_unit_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_catalog_unit_name_per_company",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.company}"

    @property
    def is_active_unit(self) -> bool:
        return self.status == CatalogUnitStatus.ACTIVE

    def clean(self) -> None:
        super().clean()

        self.code = (self.code or "").strip()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()
        self.symbol = (self.symbol or "").strip()

        if not self.name:
            self.name = self.name_ar or self.name_en or self.symbol

        if not self.name:
            raise ValidationError({"name": "Unit name is required."})

        if self.decimal_places > 6:
            raise ValidationError(
                {"decimal_places": "Decimal places cannot be greater than 6."}
            )


class CatalogItem(models.Model):
    """
    Company-scoped product/service item.

    This unified model is the foundation for:
    - Sales invoice items
    - Purchase invoice items
    - Service billing
    - Inventory tracking later
    """

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="catalog_items",
        db_index=True,
    )

    category = models.ForeignKey(
        CatalogCategory,
        on_delete=models.SET_NULL,
        related_name="catalog_items",
        blank=True,
        null=True,
    )

    unit = models.ForeignKey(
        CatalogUnit,
        on_delete=models.SET_NULL,
        related_name="catalog_items",
        blank=True,
        null=True,
    )

    item_type = models.CharField(
        max_length=20,
        choices=CatalogItemType.choices,
        default=CatalogItemType.PRODUCT,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=CatalogItemStatus.choices,
        default=CatalogItemStatus.ACTIVE,
        db_index=True,
    )

    code = models.CharField(
        max_length=50,
        blank=True,
        default="",
        db_index=True,
        help_text="Optional internal item code unique per company when provided.",
    )

    sku = models.CharField(
        max_length=80,
        blank=True,
        default="",
        db_index=True,
        help_text="Optional SKU unique per company when provided.",
    )

    barcode = models.CharField(
        max_length=120,
        blank=True,
        default="",
        db_index=True,
        help_text="Optional barcode unique per company when provided.",
    )

    name = models.CharField(
        max_length=255,
        db_index=True,
    )

    name_ar = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    name_en = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    sale_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    purchase_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    cost_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    is_sellable = models.BooleanField(
        default=True,
        db_index=True,
    )

    is_purchasable = models.BooleanField(
        default=True,
        db_index=True,
    )

    track_inventory = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Inventory tracking will be handled in later phases.",
    )

    taxable = models.BooleanField(
        default=True,
        db_index=True,
    )

    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="VAT/tax percentage for this item.",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
    )

    image = models.ImageField(
        upload_to="catalog/items/",
        blank=True,
        null=True,
    )

    notes = models.TextField(
        blank=True,
        default="",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_catalog_items",
        blank=True,
        null=True,
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="updated_catalog_items",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        verbose_name = "Catalog Item"
        verbose_name_plural = "Catalog Items"
        ordering = ["sort_order", "name", "id"]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["company", "item_type"]),
            models.Index(fields=["company", "category"]),
            models.Index(fields=["company", "unit"]),
            models.Index(fields=["company", "is_sellable"]),
            models.Index(fields=["company", "is_purchasable"]),
            models.Index(fields=["company", "track_inventory"]),
            models.Index(fields=["company", "taxable"]),
            models.Index(fields=["company", "name"]),
            models.Index(fields=["company", "created_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "code"],
                condition=~Q(code=""),
                name="unique_catalog_item_code_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "sku"],
                condition=~Q(sku=""),
                name="unique_catalog_item_sku_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "barcode"],
                condition=~Q(barcode=""),
                name="unique_catalog_item_barcode_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "name"],
                name="unique_catalog_item_name_per_company",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.company}"

    @property
    def is_product(self) -> bool:
        return self.item_type == CatalogItemType.PRODUCT

    @property
    def is_service(self) -> bool:
        return self.item_type == CatalogItemType.SERVICE

    @property
    def is_active_item(self) -> bool:
        return self.status == CatalogItemStatus.ACTIVE

    def clean(self) -> None:
        super().clean()

        self.code = (self.code or "").strip()
        self.sku = (self.sku or "").strip()
        self.barcode = (self.barcode or "").strip()
        self.name = (self.name or "").strip()
        self.name_ar = (self.name_ar or "").strip()
        self.name_en = (self.name_en or "").strip()

        if not self.name:
            self.name = self.name_ar or self.name_en

        if not self.name:
            raise ValidationError({"name": "Item name is required."})

        if self.category_id and self.category.company_id != self.company_id:
            raise ValidationError(
                {"category": "Category must belong to the same company."}
            )

        if self.unit_id and self.unit.company_id != self.company_id:
            raise ValidationError(
                {"unit": "Unit must belong to the same company."}
            )

        if self.item_type == CatalogItemType.SERVICE:
            self.track_inventory = False

        if self.tax_rate < Decimal("0.00"):
            raise ValidationError({"tax_rate": "Tax rate cannot be negative."})

        if self.sale_price < Decimal("0.00"):
            raise ValidationError({"sale_price": "Sale price cannot be negative."})

        if self.purchase_price < Decimal("0.00"):
            raise ValidationError(
                {"purchase_price": "Purchase price cannot be negative."}
            )

        if self.cost_price < Decimal("0.00"):
            raise ValidationError({"cost_price": "Cost price cannot be negative."})