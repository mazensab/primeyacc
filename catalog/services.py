# ============================================================
# 📂 catalog/services.py
# 🧠 PrimeyAcc | Company Catalog Services V1.0
# ------------------------------------------------------------
# ✅ Company-scoped catalog query helpers
# ✅ Safe create/update helpers for categories, units, and items
# ✅ Category/unit ownership validation
# ✅ Prevent frontend company_id trust
# ✅ Shared serialization helpers for APIs
# ✅ Status transition helpers
# ✅ Choices helper for frontend/API consumers
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - أي category_id أو unit_id يجب أن يكون تابعًا لنفس الشركة الحالية
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - CatalogItem هو الأساس الموحد للمنتجات والخدمات
# ============================================================

from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from companies.models import Company

from .models import (
    CatalogCategory,
    CatalogCategoryStatus,
    CatalogItem,
    CatalogItemStatus,
    CatalogItemType,
    CatalogUnit,
    CatalogUnitStatus,
)


User = get_user_model()


class CatalogServiceError(ValueError):
    """
    Raised when catalog service validation fails.

    API views will convert this error into a safe JSON 400 response.
    """


# ============================================================
# Internal helpers
# ============================================================

def _clean_text(value: Any) -> str:
    """
    Normalize optional text input.
    """
    if value is None:
        return ""

    return str(value).strip()


def _clean_decimal(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    """
    Normalize decimal values safely.
    """
    if value in [None, ""]:
        return default

    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid decimal value.") from exc

    if number < Decimal("0"):
        raise CatalogServiceError("Decimal value cannot be negative.")

    return number


def _clean_int(value: Any, default: int = 0) -> int:
    """
    Normalize positive integer values safely.
    """
    if value in [None, ""]:
        return default

    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid integer value.") from exc

    if number < 0:
        raise CatalogServiceError("Integer value cannot be negative.")

    return number


def _clean_bool(value: Any, default: bool = False) -> bool:
    """
    Normalize boolean-like input values.
    """
    if value in [None, ""]:
        return default

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in ["1", "true", "yes", "y", "on"]:
            return True
        if normalized in ["0", "false", "no", "n", "off"]:
            return False

    return bool(value)


def _validate_choice(value: Any, allowed_values: list[str], field_name: str) -> str:
    """
    Validate a TextChoices value.
    """
    cleaned = _clean_text(value).upper()

    if cleaned not in allowed_values:
        raise CatalogServiceError(f"Invalid {field_name}.")

    return cleaned


def _ensure_category_code_is_unique(
    *,
    company: Company,
    code: str,
    exclude_category_id: int | None = None,
) -> None:
    """
    Ensure category code is unique inside the same company when provided.
    """
    if not code:
        return

    queryset = CatalogCategory.objects.filter(
        company=company,
        code=code,
    )

    if exclude_category_id:
        queryset = queryset.exclude(id=exclude_category_id)

    if queryset.exists():
        raise CatalogServiceError("Category code already exists in this company.")


def _ensure_category_name_is_unique(
    *,
    company: Company,
    name: str,
    exclude_category_id: int | None = None,
) -> None:
    """
    Ensure category name is unique inside the same company.
    """
    queryset = CatalogCategory.objects.filter(
        company=company,
        name=name,
    )

    if exclude_category_id:
        queryset = queryset.exclude(id=exclude_category_id)

    if queryset.exists():
        raise CatalogServiceError("Category name already exists in this company.")


def _ensure_unit_code_is_unique(
    *,
    company: Company,
    code: str,
    exclude_unit_id: int | None = None,
) -> None:
    """
    Ensure unit code is unique inside the same company when provided.
    """
    if not code:
        return

    queryset = CatalogUnit.objects.filter(
        company=company,
        code=code,
    )

    if exclude_unit_id:
        queryset = queryset.exclude(id=exclude_unit_id)

    if queryset.exists():
        raise CatalogServiceError("Unit code already exists in this company.")


def _ensure_unit_name_is_unique(
    *,
    company: Company,
    name: str,
    exclude_unit_id: int | None = None,
) -> None:
    """
    Ensure unit name is unique inside the same company.
    """
    queryset = CatalogUnit.objects.filter(
        company=company,
        name=name,
    )

    if exclude_unit_id:
        queryset = queryset.exclude(id=exclude_unit_id)

    if queryset.exists():
        raise CatalogServiceError("Unit name already exists in this company.")


def _ensure_item_unique_fields(
    *,
    company: Company,
    code: str,
    sku: str,
    barcode: str,
    name: str,
    exclude_item_id: int | None = None,
) -> None:
    """
    Ensure item identifiers are unique inside the same company.
    """
    checks = [
        ("code", code, "Item code already exists in this company."),
        ("sku", sku, "Item SKU already exists in this company."),
        ("barcode", barcode, "Item barcode already exists in this company."),
        ("name", name, "Item name already exists in this company."),
    ]

    for field_name, value, message in checks:
        if field_name != "name" and not value:
            continue

        queryset = CatalogItem.objects.filter(
            company=company,
            **{field_name: value},
        )

        if exclude_item_id:
            queryset = queryset.exclude(id=exclude_item_id)

        if queryset.exists():
            raise CatalogServiceError(message)


# ============================================================
# Resolve helpers
# ============================================================

def resolve_category_for_company(
    *,
    company: Company,
    category_id: Any,
) -> CatalogCategory | None:
    """
    Resolve category safely inside the current company.

    The frontend may send category_id as a selector only.
    It is accepted only if the category belongs to the resolved company.
    """
    if category_id in [None, ""]:
        return None

    try:
        parsed_category_id = int(category_id)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid category_id.") from exc

    category = CatalogCategory.objects.filter(
        id=parsed_category_id,
        company=company,
    ).first()

    if not category:
        raise CatalogServiceError("Category does not belong to the current company.")

    return category


def resolve_parent_category_for_company(
    *,
    company: Company,
    parent_id: Any,
    exclude_category_id: int | None = None,
) -> CatalogCategory | None:
    """
    Resolve parent category safely inside the current company.
    """
    if parent_id in [None, ""]:
        return None

    try:
        parsed_parent_id = int(parent_id)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid parent_id.") from exc

    if exclude_category_id and parsed_parent_id == exclude_category_id:
        raise CatalogServiceError("Category cannot be parent of itself.")

    parent = CatalogCategory.objects.filter(
        id=parsed_parent_id,
        company=company,
    ).first()

    if not parent:
        raise CatalogServiceError("Parent category does not belong to the current company.")

    return parent


def resolve_unit_for_company(
    *,
    company: Company,
    unit_id: Any,
) -> CatalogUnit | None:
    """
    Resolve unit safely inside the current company.

    The frontend may send unit_id as a selector only.
    It is accepted only if the unit belongs to the resolved company.
    """
    if unit_id in [None, ""]:
        return None

    try:
        parsed_unit_id = int(unit_id)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid unit_id.") from exc

    unit = CatalogUnit.objects.filter(
        id=parsed_unit_id,
        company=company,
    ).first()

    if not unit:
        raise CatalogServiceError("Unit does not belong to the current company.")

    return unit


# ============================================================
# Query helpers
# ============================================================

def get_company_categories_queryset(
    *,
    company: Company,
) -> QuerySet[CatalogCategory]:
    """
    Return CatalogCategory records scoped to one company only.
    """
    return (
        CatalogCategory.objects.select_related(
            "company",
            "parent",
            "created_by",
            "updated_by",
        )
        .filter(company=company)
        .order_by("sort_order", "name", "id")
    )


def get_company_units_queryset(
    *,
    company: Company,
) -> QuerySet[CatalogUnit]:
    """
    Return CatalogUnit records scoped to one company only.
    """
    return (
        CatalogUnit.objects.select_related(
            "company",
            "created_by",
            "updated_by",
        )
        .filter(company=company)
        .order_by("name", "id")
    )


def get_company_items_queryset(
    *,
    company: Company,
) -> QuerySet[CatalogItem]:
    """
    Return CatalogItem records scoped to one company only.
    """
    return (
        CatalogItem.objects.select_related(
            "company",
            "category",
            "unit",
            "created_by",
            "updated_by",
        )
        .filter(company=company)
        .order_by("sort_order", "name", "id")
    )


def filter_categories_queryset(
    queryset: QuerySet[CatalogCategory],
    *,
    search: str = "",
    status: str = "",
    parent_id: Any = None,
) -> QuerySet[CatalogCategory]:
    """
    Apply safe filters to an already company-scoped categories queryset.
    """
    search = _clean_text(search)
    status = _clean_text(status).upper()

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(description__icontains=search)
        )

    if status:
        if status not in CatalogCategoryStatus.values:
            raise CatalogServiceError("Invalid status filter.")
        queryset = queryset.filter(status=status)

    if parent_id not in [None, ""]:
        try:
            parsed_parent_id = int(parent_id)
        except (TypeError, ValueError) as exc:
            raise CatalogServiceError("Invalid parent_id filter.") from exc

        queryset = queryset.filter(parent_id=parsed_parent_id)

    return queryset


def filter_units_queryset(
    queryset: QuerySet[CatalogUnit],
    *,
    search: str = "",
    status: str = "",
    is_default: Any = None,
) -> QuerySet[CatalogUnit]:
    """
    Apply safe filters to an already company-scoped units queryset.
    """
    search = _clean_text(search)
    status = _clean_text(status).upper()

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(symbol__icontains=search)
        )

    if status:
        if status not in CatalogUnitStatus.values:
            raise CatalogServiceError("Invalid status filter.")
        queryset = queryset.filter(status=status)

    if is_default not in [None, ""]:
        queryset = queryset.filter(is_default=_clean_bool(is_default))

    return queryset


def filter_items_queryset(
    queryset: QuerySet[CatalogItem],
    *,
    search: str = "",
    item_type: str = "",
    status: str = "",
    category_id: Any = None,
    unit_id: Any = None,
    is_sellable: Any = None,
    is_purchasable: Any = None,
    track_inventory: Any = None,
    taxable: Any = None,
) -> QuerySet[CatalogItem]:
    """
    Apply safe filters to an already company-scoped items queryset.
    """
    search = _clean_text(search)
    item_type = _clean_text(item_type).upper()
    status = _clean_text(status).upper()

    if search:
        queryset = queryset.filter(
            Q(code__icontains=search)
            | Q(sku__icontains=search)
            | Q(barcode__icontains=search)
            | Q(name__icontains=search)
            | Q(name_ar__icontains=search)
            | Q(name_en__icontains=search)
            | Q(description__icontains=search)
            | Q(category__name__icontains=search)
            | Q(unit__name__icontains=search)
        )

    if item_type:
        if item_type not in CatalogItemType.values:
            raise CatalogServiceError("Invalid item_type filter.")
        queryset = queryset.filter(item_type=item_type)

    if status:
        if status not in CatalogItemStatus.values:
            raise CatalogServiceError("Invalid status filter.")
        queryset = queryset.filter(status=status)

    if category_id not in [None, ""]:
        try:
            parsed_category_id = int(category_id)
        except (TypeError, ValueError) as exc:
            raise CatalogServiceError("Invalid category_id filter.") from exc

        queryset = queryset.filter(category_id=parsed_category_id)

    if unit_id not in [None, ""]:
        try:
            parsed_unit_id = int(unit_id)
        except (TypeError, ValueError) as exc:
            raise CatalogServiceError("Invalid unit_id filter.") from exc

        queryset = queryset.filter(unit_id=parsed_unit_id)

    if is_sellable not in [None, ""]:
        queryset = queryset.filter(is_sellable=_clean_bool(is_sellable))

    if is_purchasable not in [None, ""]:
        queryset = queryset.filter(is_purchasable=_clean_bool(is_purchasable))

    if track_inventory not in [None, ""]:
        queryset = queryset.filter(track_inventory=_clean_bool(track_inventory))

    if taxable not in [None, ""]:
        queryset = queryset.filter(taxable=_clean_bool(taxable))

    return queryset


def get_company_category_or_raise(
    *,
    company: Company,
    category_id: Any,
) -> CatalogCategory:
    """
    Return a single category scoped to the current company.
    """
    try:
        parsed_category_id = int(category_id)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid category id.") from exc

    category = get_company_categories_queryset(company=company).filter(
        id=parsed_category_id,
    ).first()

    if not category:
        raise CatalogServiceError("Catalog category was not found.")

    return category


def get_company_unit_or_raise(
    *,
    company: Company,
    unit_id: Any,
) -> CatalogUnit:
    """
    Return a single unit scoped to the current company.
    """
    try:
        parsed_unit_id = int(unit_id)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid unit id.") from exc

    unit = get_company_units_queryset(company=company).filter(
        id=parsed_unit_id,
    ).first()

    if not unit:
        raise CatalogServiceError("Catalog unit was not found.")

    return unit


def get_company_item_or_raise(
    *,
    company: Company,
    item_id: Any,
) -> CatalogItem:
    """
    Return a single catalog item scoped to the current company.
    """
    try:
        parsed_item_id = int(item_id)
    except (TypeError, ValueError) as exc:
        raise CatalogServiceError("Invalid item id.") from exc

    item = get_company_items_queryset(company=company).filter(
        id=parsed_item_id,
    ).first()

    if not item:
        raise CatalogServiceError("Catalog item was not found.")

    return item


# ============================================================
# Serialization
# ============================================================

def serialize_catalog_category(category: CatalogCategory) -> dict[str, Any]:
    """
    Serialize CatalogCategory for company APIs.

    Keep this explicit instead of exposing model fields blindly.
    """
    return {
        "id": category.id,
        "company_id": category.company_id,
        "company_name": category.company.display_name if category.company_id else "",
        "parent_id": category.parent_id,
        "parent_name": category.parent.name if category.parent_id else "",
        "status": category.status,
        "status_label": category.get_status_display(),
        "code": category.code,
        "name": category.name,
        "name_ar": category.name_ar,
        "name_en": category.name_en,
        "description": category.description,
        "sort_order": category.sort_order,
        "is_active_category": category.is_active_category,
        "notes": category.notes,
        "extra_data": category.extra_data,
        "created_by_id": category.created_by_id,
        "updated_by_id": category.updated_by_id,
        "created_at": category.created_at.isoformat() if category.created_at else None,
        "updated_at": category.updated_at.isoformat() if category.updated_at else None,
    }


def serialize_catalog_unit(unit: CatalogUnit) -> dict[str, Any]:
    """
    Serialize CatalogUnit for company APIs.

    Keep this explicit instead of exposing model fields blindly.
    """
    return {
        "id": unit.id,
        "company_id": unit.company_id,
        "company_name": unit.company.display_name if unit.company_id else "",
        "status": unit.status,
        "status_label": unit.get_status_display(),
        "code": unit.code,
        "name": unit.name,
        "name_ar": unit.name_ar,
        "name_en": unit.name_en,
        "symbol": unit.symbol,
        "decimal_places": unit.decimal_places,
        "is_default": unit.is_default,
        "is_active_unit": unit.is_active_unit,
        "notes": unit.notes,
        "extra_data": unit.extra_data,
        "created_by_id": unit.created_by_id,
        "updated_by_id": unit.updated_by_id,
        "created_at": unit.created_at.isoformat() if unit.created_at else None,
        "updated_at": unit.updated_at.isoformat() if unit.updated_at else None,
    }


def serialize_catalog_item(item: CatalogItem) -> dict[str, Any]:
    """
    Serialize CatalogItem for company APIs.

    Keep this explicit instead of exposing model fields blindly.
    """
    image_url = item.image.url if item.image else ""

    return {
        "id": item.id,
        "company_id": item.company_id,
        "company_name": item.company.display_name if item.company_id else "",
        "category_id": item.category_id,
        "category_name": item.category.name if item.category_id else "",
        "unit_id": item.unit_id,
        "unit_name": item.unit.name if item.unit_id else "",
        "unit_symbol": item.unit.symbol if item.unit_id else "",
        "item_type": item.item_type,
        "item_type_label": item.get_item_type_display(),
        "status": item.status,
        "status_label": item.get_status_display(),
        "code": item.code,
        "sku": item.sku,
        "barcode": item.barcode,
        "name": item.name,
        "name_ar": item.name_ar,
        "name_en": item.name_en,
        "description": item.description,
        "sale_price": str(item.sale_price),
        "purchase_price": str(item.purchase_price),
        "cost_price": str(item.cost_price),
        "is_sellable": item.is_sellable,
        "is_purchasable": item.is_purchasable,
        "track_inventory": item.track_inventory,
        "taxable": item.taxable,
        "tax_rate": str(item.tax_rate),
        "sort_order": item.sort_order,
        "image_url": image_url,
        "is_product": item.is_product,
        "is_service": item.is_service,
        "is_active_item": item.is_active_item,
        "notes": item.notes,
        "extra_data": item.extra_data,
        "created_by_id": item.created_by_id,
        "updated_by_id": item.updated_by_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_catalog_choices() -> dict[str, list[dict[str, str]]]:
    """
    Return catalog choices for API consumers.
    """
    return {
        "category_statuses": [
            {"value": value, "label": label}
            for value, label in CatalogCategoryStatus.choices
        ],
        "unit_statuses": [
            {"value": value, "label": label}
            for value, label in CatalogUnitStatus.choices
        ],
        "item_types": [
            {"value": value, "label": label}
            for value, label in CatalogItemType.choices
        ],
        "item_statuses": [
            {"value": value, "label": label}
            for value, label in CatalogItemStatus.choices
        ],
    }


# ============================================================
# Category create/update
# ============================================================

def build_category_payload(
    *,
    company: Company,
    data: dict[str, Any],
    existing_category: CatalogCategory | None = None,
) -> dict[str, Any]:
    """
    Build safe category payload from incoming API/Admin-like data.

    company is passed explicitly from trusted backend context.
    Any incoming company_id is intentionally ignored.
    """
    parent = resolve_parent_category_for_company(
        company=company,
        parent_id=data.get("parent_id") or data.get("parent"),
        exclude_category_id=existing_category.id if existing_category else None,
    )

    status = data.get(
        "status",
        existing_category.status if existing_category else CatalogCategoryStatus.ACTIVE,
    )

    status = _validate_choice(
        status,
        list(CatalogCategoryStatus.values),
        "status",
    )

    name = _clean_text(data.get("name"))
    name_ar = _clean_text(data.get("name_ar"))
    name_en = _clean_text(data.get("name_en"))

    if not name and existing_category:
        name = existing_category.name

    if not name:
        name = name_ar or name_en

    if not name:
        raise CatalogServiceError("Category name is required.")

    code = _clean_text(data.get("code"))
    if not code and existing_category:
        code = existing_category.code

    _ensure_category_code_is_unique(
        company=company,
        code=code,
        exclude_category_id=existing_category.id if existing_category else None,
    )
    _ensure_category_name_is_unique(
        company=company,
        name=name,
        exclude_category_id=existing_category.id if existing_category else None,
    )

    return {
        "company": company,
        "parent": parent,
        "status": status,
        "code": code,
        "name": name,
        "name_ar": name_ar,
        "name_en": name_en,
        "description": _clean_text(data.get("description")),
        "sort_order": _clean_int(data.get("sort_order")),
        "notes": _clean_text(data.get("notes")),
        "extra_data": data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    }


def create_catalog_category(
    *,
    company: Company,
    data: dict[str, Any],
    user: User | None = None,
) -> CatalogCategory:
    """
    Create a CatalogCategory scoped to the current company.
    """
    payload = build_category_payload(
        company=company,
        data=data,
    )

    category = CatalogCategory(**payload)
    category.created_by = user
    category.updated_by = user
    category.full_clean()
    category.save()

    return category


def update_catalog_category(
    *,
    category: CatalogCategory,
    data: dict[str, Any],
    user: User | None = None,
) -> CatalogCategory:
    """
    Update a CatalogCategory without changing tenant ownership.
    """
    payload = build_category_payload(
        company=category.company,
        data=data,
        existing_category=category,
    )

    protected_fields = {
        "company",
    }

    for field_name, value in payload.items():
        if field_name in protected_fields:
            continue
        setattr(category, field_name, value)

    category.updated_by = user
    category.full_clean()
    category.save()

    return category


# ============================================================
# Unit create/update
# ============================================================

def build_unit_payload(
    *,
    company: Company,
    data: dict[str, Any],
    existing_unit: CatalogUnit | None = None,
) -> dict[str, Any]:
    """
    Build safe unit payload from incoming API/Admin-like data.

    company is passed explicitly from trusted backend context.
    Any incoming company_id is intentionally ignored.
    """
    status = data.get(
        "status",
        existing_unit.status if existing_unit else CatalogUnitStatus.ACTIVE,
    )

    status = _validate_choice(
        status,
        list(CatalogUnitStatus.values),
        "status",
    )

    name = _clean_text(data.get("name"))
    name_ar = _clean_text(data.get("name_ar"))
    name_en = _clean_text(data.get("name_en"))
    symbol = _clean_text(data.get("symbol"))

    if not name and existing_unit:
        name = existing_unit.name

    if not name:
        name = name_ar or name_en or symbol

    if not name:
        raise CatalogServiceError("Unit name is required.")

    code = _clean_text(data.get("code"))
    if not code and existing_unit:
        code = existing_unit.code

    decimal_places = _clean_int(
        data.get("decimal_places"),
        existing_unit.decimal_places if existing_unit else 2,
    )

    if decimal_places > 6:
        raise CatalogServiceError("Decimal places cannot be greater than 6.")

    _ensure_unit_code_is_unique(
        company=company,
        code=code,
        exclude_unit_id=existing_unit.id if existing_unit else None,
    )
    _ensure_unit_name_is_unique(
        company=company,
        name=name,
        exclude_unit_id=existing_unit.id if existing_unit else None,
    )

    return {
        "company": company,
        "status": status,
        "code": code,
        "name": name,
        "name_ar": name_ar,
        "name_en": name_en,
        "symbol": symbol,
        "decimal_places": decimal_places,
        "is_default": _clean_bool(
            data.get("is_default"),
            existing_unit.is_default if existing_unit else False,
        ),
        "notes": _clean_text(data.get("notes")),
        "extra_data": data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    }


def create_catalog_unit(
    *,
    company: Company,
    data: dict[str, Any],
    user: User | None = None,
) -> CatalogUnit:
    """
    Create a CatalogUnit scoped to the current company.
    """
    payload = build_unit_payload(
        company=company,
        data=data,
    )

    unit = CatalogUnit(**payload)
    unit.created_by = user
    unit.updated_by = user
    unit.full_clean()
    unit.save()

    return unit


def update_catalog_unit(
    *,
    unit: CatalogUnit,
    data: dict[str, Any],
    user: User | None = None,
) -> CatalogUnit:
    """
    Update a CatalogUnit without changing tenant ownership.
    """
    payload = build_unit_payload(
        company=unit.company,
        data=data,
        existing_unit=unit,
    )

    protected_fields = {
        "company",
    }

    for field_name, value in payload.items():
        if field_name in protected_fields:
            continue
        setattr(unit, field_name, value)

    unit.updated_by = user
    unit.full_clean()
    unit.save()

    return unit


# ============================================================
# Item create/update
# ============================================================

def build_item_payload(
    *,
    company: Company,
    data: dict[str, Any],
    existing_item: CatalogItem | None = None,
) -> dict[str, Any]:
    """
    Build safe item payload from incoming API/Admin-like data.

    company is passed explicitly from trusted backend context.
    Any incoming company_id is intentionally ignored.
    """
    category = resolve_category_for_company(
        company=company,
        category_id=data.get("category_id") or data.get("category"),
    )
    unit = resolve_unit_for_company(
        company=company,
        unit_id=data.get("unit_id") or data.get("unit"),
    )

    item_type = data.get(
        "item_type",
        existing_item.item_type if existing_item else CatalogItemType.PRODUCT,
    )
    status = data.get(
        "status",
        existing_item.status if existing_item else CatalogItemStatus.ACTIVE,
    )

    item_type = _validate_choice(
        item_type,
        list(CatalogItemType.values),
        "item_type",
    )
    status = _validate_choice(
        status,
        list(CatalogItemStatus.values),
        "status",
    )

    name = _clean_text(data.get("name"))
    name_ar = _clean_text(data.get("name_ar"))
    name_en = _clean_text(data.get("name_en"))

    if not name and existing_item:
        name = existing_item.name

    if not name:
        name = name_ar or name_en

    if not name:
        raise CatalogServiceError("Item name is required.")

    code = _clean_text(data.get("code"))
    sku = _clean_text(data.get("sku"))
    barcode = _clean_text(data.get("barcode"))

    if not code and existing_item:
        code = existing_item.code
    if not sku and existing_item:
        sku = existing_item.sku
    if not barcode and existing_item:
        barcode = existing_item.barcode

    _ensure_item_unique_fields(
        company=company,
        code=code,
        sku=sku,
        barcode=barcode,
        name=name,
        exclude_item_id=existing_item.id if existing_item else None,
    )

    is_sellable = _clean_bool(
        data.get("is_sellable"),
        existing_item.is_sellable if existing_item else True,
    )
    is_purchasable = _clean_bool(
        data.get("is_purchasable"),
        existing_item.is_purchasable if existing_item else True,
    )
    track_inventory = _clean_bool(
        data.get("track_inventory"),
        existing_item.track_inventory if existing_item else False,
    )

    if item_type == CatalogItemType.SERVICE:
        track_inventory = False

    return {
        "company": company,
        "category": category,
        "unit": unit,
        "item_type": item_type,
        "status": status,
        "code": code,
        "sku": sku,
        "barcode": barcode,
        "name": name,
        "name_ar": name_ar,
        "name_en": name_en,
        "description": _clean_text(data.get("description")),
        "sale_price": _clean_decimal(data.get("sale_price"), Decimal("0.00")),
        "purchase_price": _clean_decimal(data.get("purchase_price"), Decimal("0.00")),
        "cost_price": _clean_decimal(data.get("cost_price"), Decimal("0.00")),
        "is_sellable": is_sellable,
        "is_purchasable": is_purchasable,
        "track_inventory": track_inventory,
        "taxable": _clean_bool(
            data.get("taxable"),
            existing_item.taxable if existing_item else True,
        ),
        "tax_rate": _clean_decimal(data.get("tax_rate"), Decimal("15.00")),
        "sort_order": _clean_int(data.get("sort_order")),
        "notes": _clean_text(data.get("notes")),
        "extra_data": data.get("extra_data") if isinstance(data.get("extra_data"), dict) else {},
    }


def create_catalog_item(
    *,
    company: Company,
    data: dict[str, Any],
    user: User | None = None,
) -> CatalogItem:
    """
    Create a CatalogItem scoped to the current company.
    """
    payload = build_item_payload(
        company=company,
        data=data,
    )

    item = CatalogItem(**payload)
    item.created_by = user
    item.updated_by = user
    item.full_clean()
    item.save()

    return item


def update_catalog_item(
    *,
    item: CatalogItem,
    data: dict[str, Any],
    user: User | None = None,
) -> CatalogItem:
    """
    Update a CatalogItem without changing tenant ownership.
    """
    payload = build_item_payload(
        company=item.company,
        data=data,
        existing_item=item,
    )

    protected_fields = {
        "company",
    }

    for field_name, value in payload.items():
        if field_name in protected_fields:
            continue
        setattr(item, field_name, value)

    item.updated_by = user
    item.full_clean()
    item.save()

    return item


# ============================================================
# Status helpers
# ============================================================

def set_catalog_category_status(
    *,
    category: CatalogCategory,
    status: str,
    user: User | None = None,
) -> CatalogCategory:
    """
    Set category status safely.
    """
    status = _validate_choice(
        status,
        list(CatalogCategoryStatus.values),
        "status",
    )

    category.status = status
    category.updated_by = user
    category.full_clean()
    category.save()
    category.refresh_from_db()

    return category


def set_catalog_unit_status(
    *,
    unit: CatalogUnit,
    status: str,
    user: User | None = None,
) -> CatalogUnit:
    """
    Set unit status safely.
    """
    status = _validate_choice(
        status,
        list(CatalogUnitStatus.values),
        "status",
    )

    unit.status = status
    unit.updated_by = user
    unit.full_clean()
    unit.save()
    unit.refresh_from_db()

    return unit


def set_catalog_item_status(
    *,
    item: CatalogItem,
    status: str,
    user: User | None = None,
) -> CatalogItem:
    """
    Set item status safely.
    """
    status = _validate_choice(
        status,
        list(CatalogItemStatus.values),
        "status",
    )

    item.status = status
    item.updated_by = user
    item.full_clean()
    item.save()
    item.refresh_from_db()

    return item