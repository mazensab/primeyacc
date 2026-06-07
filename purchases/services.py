# ============================================================
# 📂 purchases/services.py
# 🧠 PrimeyAcc | Purchases Services V1.0
# ------------------------------------------------------------
# ✅ Backend-only service layer for supplier bills
# ✅ Company-scoped tenant isolation
# ✅ No frontend company_id trust
# ✅ Supplier, branch, and catalog item validation
# ✅ Safe purchase bill number generation
# ✅ Create, update, post, and cancel helpers
# ✅ Totals handled by models
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - كل العمليات تستقبل company من request.company أو membership
# - لا نثق بأي company_id قادم من الواجهة
# - المورد يجب أن يكون من نفس الشركة ونوعه SUPPLIER أو BOTH
# - الصنف يجب أن يكون من نفس الشركة وقابلًا للشراء
# - الفاتورة لا تعدل بعد POSTED أو CANCELLED
# ============================================================

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from catalog.models import CatalogItem
from companies.models import Branch, Company
from parties.models import BusinessParty, BusinessPartyStatus, BusinessPartyType
from purchases.models import PurchaseBill, PurchaseBillItem, PurchaseBillStatus


def normalize_date(value: Any, *, field_name: str) -> date | None:
    """
    Normalize date input safely.

    Accepts:
    - None
    - date
    - datetime
    - YYYY-MM-DD string
    """
    if value in [None, ""]:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value.strip())
        except ValueError as exc:
            raise ValidationError({field_name: "Invalid date format. Use YYYY-MM-DD."}) from exc

    raise ValidationError({field_name: "Invalid date value."})


def normalize_decimal(value: Any, *, field_name: str, default: Decimal = Decimal("0.00")) -> Decimal:
    """
    Normalize decimal input safely.
    """
    if value in [None, ""]:
        return default

    try:
        return Decimal(str(value))
    except Exception as exc:
        raise ValidationError({field_name: "Invalid decimal value."}) from exc


def get_company_purchase_prefix(company: Company) -> str:
    """
    Read purchase prefix from company operational settings when available.
    """
    settings_obj = getattr(company, "operational_settings", None)

    if settings_obj and getattr(settings_obj, "purchase_prefix", ""):
        return settings_obj.purchase_prefix.strip() or "PUR"

    return "PUR"


def generate_purchase_bill_number(company: Company) -> str:
    """
    Generate a simple company-scoped purchase bill number.

    Format:
    PUR-YYYYMMDD-000001

    This is safe enough for the current backend foundation.
    Later we can move numbering to a dedicated sequence service.
    """
    today = timezone.localdate()
    prefix = get_company_purchase_prefix(company)
    date_part = today.strftime("%Y%m%d")
    starts_with = f"{prefix}-{date_part}-"

    last_bill = (
        PurchaseBill.objects.filter(
            company=company,
            bill_number__startswith=starts_with,
        )
        .order_by("-bill_number")
        .first()
    )

    next_number = 1

    if last_bill:
        try:
            next_number = int(last_bill.bill_number.split("-")[-1]) + 1
        except (TypeError, ValueError):
            next_number = 1

    return f"{starts_with}{next_number:06d}"


def get_supplier_for_company(company: Company, supplier_id: int | str) -> BusinessParty:
    """
    Return a valid supplier for one company.
    """
    try:
        supplier = BusinessParty.objects.get(
            id=supplier_id,
            company=company,
        )
    except BusinessParty.DoesNotExist as exc:
        raise ValidationError({"supplier": "Supplier was not found for this company."}) from exc

    if supplier.party_type not in [
        BusinessPartyType.SUPPLIER,
        BusinessPartyType.BOTH,
    ]:
        raise ValidationError({"supplier": "Selected party is not a supplier."})

    if supplier.status != BusinessPartyStatus.ACTIVE:
        raise ValidationError({"supplier": "Selected supplier is not active."})

    return supplier


def get_branch_for_company(company: Company, branch_id: int | str | None) -> Branch | None:
    """
    Return a branch owned by the company.
    """
    if branch_id in [None, ""]:
        return None

    try:
        return Branch.objects.get(
            id=branch_id,
            company=company,
        )
    except Branch.DoesNotExist as exc:
        raise ValidationError({"branch": "Branch was not found for this company."}) from exc


def get_purchase_item_for_company(company: Company, item_id: int | str) -> CatalogItem:
    """
    Return a valid purchasable catalog item for one company.
    """
    try:
        item = CatalogItem.objects.get(
            id=item_id,
            company=company,
        )
    except CatalogItem.DoesNotExist as exc:
        raise ValidationError({"item": "Catalog item was not found for this company."}) from exc

    if not item.is_purchasable:
        raise ValidationError({"item": "Selected catalog item is not purchasable."})

    return item


def build_purchase_bill_item(
    *,
    bill: PurchaseBill,
    company: Company,
    payload: dict[str, Any],
    line_number: int,
) -> PurchaseBillItem:
    """
    Build and save one purchase bill item.
    """
    item = get_purchase_item_for_company(
        company,
        payload.get("item_id") or payload.get("item"),
    )

    bill_item = PurchaseBillItem(
        bill=bill,
        company=company,
        item=item,
        line_number=int(payload.get("line_number") or line_number),
        quantity=normalize_decimal(
            payload.get("quantity", Decimal("1.0000")),
            field_name="quantity",
            default=Decimal("1.0000"),
        ),
        unit_price=normalize_decimal(
            payload.get("unit_price", item.purchase_price or item.cost_price),
            field_name="unit_price",
            default=item.purchase_price or item.cost_price,
        ),
        discount_amount=normalize_decimal(
            payload.get("discount_amount", Decimal("0.00")),
            field_name="discount_amount",
            default=Decimal("0.00"),
        ),
        notes=str(payload.get("notes") or ""),
        extra_data=payload.get("extra_data") if isinstance(payload.get("extra_data"), dict) else {},
    )
    bill_item.save()

    return bill_item


@transaction.atomic
def create_purchase_bill(
    *,
    company: Company,
    payload: dict[str, Any],
    user=None,
) -> PurchaseBill:
    """
    Create a draft purchase bill with items.
    """
    if not company:
        raise ValidationError("Company is required.")

    supplier = get_supplier_for_company(
        company,
        payload.get("supplier_id") or payload.get("supplier"),
    )
    branch = get_branch_for_company(
        company,
        payload.get("branch_id") or payload.get("branch"),
    )

    items_payload = payload.get("items") or []
    if not isinstance(items_payload, list) or not items_payload:
        raise ValidationError({"items": "At least one purchase bill item is required."})

    bill_date = normalize_date(
        payload.get("bill_date") or timezone.localdate(),
        field_name="bill_date",
    )
    due_date = normalize_date(
        payload.get("due_date"),
        field_name="due_date",
    )

    bill = PurchaseBill(
        company=company,
        branch=branch,
        supplier=supplier,
        status=PurchaseBillStatus.DRAFT,
        bill_number=(payload.get("bill_number") or "").strip() or generate_purchase_bill_number(company),
        supplier_bill_number=(payload.get("supplier_bill_number") or "").strip(),
        bill_date=bill_date or timezone.localdate(),
        due_date=due_date,
        currency_code=(payload.get("currency_code") or company.currency_code or "SAR").strip().upper(),
        notes=str(payload.get("notes") or ""),
        extra_data=payload.get("extra_data") if isinstance(payload.get("extra_data"), dict) else {},
        created_by=user,
        updated_by=user,
    )
    bill.full_clean()
    bill.save()

    for index, item_payload in enumerate(items_payload, start=1):
        if not isinstance(item_payload, dict):
            raise ValidationError({"items": "Each item must be an object."})

        build_purchase_bill_item(
            bill=bill,
            company=company,
            payload=item_payload,
            line_number=index,
        )

    bill.recalculate_totals(save=True)

    return bill


@transaction.atomic
def update_purchase_bill(
    *,
    bill: PurchaseBill,
    payload: dict[str, Any],
    user=None,
) -> PurchaseBill:
    """
    Update an existing draft purchase bill.

    If items are provided, old items are replaced.
    """
    if not bill.can_edit:
        raise ValidationError("Only draft purchase bills can be updated.")

    company = bill.company

    if "supplier_id" in payload or "supplier" in payload:
        bill.supplier = get_supplier_for_company(
            company,
            payload.get("supplier_id") or payload.get("supplier"),
        )

    if "branch_id" in payload or "branch" in payload:
        bill.branch = get_branch_for_company(
            company,
            payload.get("branch_id") or payload.get("branch"),
        )

    if "bill_number" in payload:
        bill.bill_number = (payload.get("bill_number") or "").strip()

    if "supplier_bill_number" in payload:
        bill.supplier_bill_number = (payload.get("supplier_bill_number") or "").strip()

    if "bill_date" in payload:
        bill.bill_date = normalize_date(
            payload.get("bill_date"),
            field_name="bill_date",
        ) or bill.bill_date

    if "due_date" in payload:
        bill.due_date = normalize_date(
            payload.get("due_date"),
            field_name="due_date",
        )

    if "currency_code" in payload:
        bill.currency_code = (payload.get("currency_code") or "SAR").strip().upper()

    if "notes" in payload:
        bill.notes = str(payload.get("notes") or "")

    if isinstance(payload.get("extra_data"), dict):
        bill.extra_data = payload["extra_data"]

    bill.updated_by = user
    bill.full_clean()
    bill.save()

    if "items" in payload:
        items_payload = payload.get("items") or []

        if not isinstance(items_payload, list) or not items_payload:
            raise ValidationError({"items": "At least one purchase bill item is required."})

        bill.items.all().delete()

        for index, item_payload in enumerate(items_payload, start=1):
            if not isinstance(item_payload, dict):
                raise ValidationError({"items": "Each item must be an object."})

            build_purchase_bill_item(
                bill=bill,
                company=company,
                payload=item_payload,
                line_number=index,
            )

    bill.recalculate_totals(save=True)

    return bill


@transaction.atomic
def post_purchase_bill(
    *,
    bill: PurchaseBill,
    user=None,
) -> PurchaseBill:
    """
    Post a draft purchase bill.
    """
    bill.post(user=user)
    bill.refresh_from_db()
    return bill


@transaction.atomic
def cancel_purchase_bill(
    *,
    bill: PurchaseBill,
    reason: str = "",
    user=None,
) -> PurchaseBill:
    """
    Cancel a draft or posted purchase bill.
    """
    bill.cancel(reason=reason, user=user)
    bill.refresh_from_db()
    return bill