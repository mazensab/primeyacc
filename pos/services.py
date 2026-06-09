# ============================================================
# 📂 pos/services.py
# 🧠 PrimeyAcc | POS Services V1.0
# ------------------------------------------------------------
# ✅ POS Register Creation Service
# ✅ POS Session Open / Close / Cancel Services
# ✅ POS Order Draft Foundation
# ✅ POS Order Item Snapshot Service
# ✅ POS Payment Line Foundation
# ✅ POS Totals Recalculation
# ✅ Session Duplicate Protection
# ✅ Company-level Tenant Isolation Validation
# ✅ Checkout Preview Foundation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف هو طبقة منطق POS التشغيلية
# - لا تقبل أي خدمة company_id من الفرونت كمصدر ثقة
# - الشركة يجب أن تصل للخدمة من API بعد استخراجها من المستخدم الحالي
# - كل كائن مرتبط يجب أن ينتمي لنفس الشركة
# - لا يتم فتح أكثر من جلسة نشطة لنفس Register
# - لا يتم إنشاء طلب بيع POS إلا على جلسة مفتوحة
# - لا يتم الترحيل المحاسبي أو خصم المخزون في هذه النسخة من الملف
# - تكامل Sales / Inventory / Treasury / Accounting سيتم في أجزاء لاحقة من Phase 13
# - هذا الملف يحافظ على أساس آمن وقابل للتوسع بدون كسر المراحل السابقة
# ============================================================

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Max, Sum
from django.utils import timezone

from catalog.models import CatalogItemStatus
from .models import (
    POSOrder,
    POSOrderItem,
    POSOrderStatus,
    POSPayment,
    POSPaymentLineStatus,
    POSPaymentLineType,
    POSPaymentStatus,
    POSRegister,
    POSRegisterStatus,
    POSSession,
    POSSessionStatus,
    ZERO_MONEY,
    ZERO_QUANTITY,
)


MONEY_QUANT = Decimal("0.01")
QUANTITY_QUANT = Decimal("0.0001")


def _to_money(value: Any) -> Decimal:
    """
    Convert a value to a safe money Decimal.
    """

    if value in [None, ""]:
        return ZERO_MONEY

    return Decimal(str(value)).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


def _to_quantity(value: Any) -> Decimal:
    """
    Convert a value to a safe quantity Decimal.
    """

    if value in [None, ""]:
        return ZERO_QUANTITY

    return Decimal(str(value)).quantize(QUANTITY_QUANT, rounding=ROUND_HALF_UP)


def _get_user_or_none(user=None):
    """
    Return an authenticated user or None.
    """

    if user and getattr(user, "is_authenticated", False):
        return user

    return None


def _validate_same_company(obj, company, field_name: str) -> None:
    """
    Validate that a related object belongs to the same company.
    """

    if obj is None:
        return

    if not company:
        raise ValidationError({"company": "Company is required."})

    if getattr(obj, "company_id", None) != company.id:
        raise ValidationError({field_name: f"{field_name} must belong to the same company."})


def _next_sequence_number(model, company, field_name: str, prefix: str) -> str:
    """
    Generate a simple company-scoped sequence number.

    This is a foundation generator. It avoids relying on frontend numbers.
    More advanced numbering can later move to company settings if needed.
    """

    current_max = (
        model.objects.filter(company=company, **{f"{field_name}__startswith": prefix})
        .aggregate(max_id=Max("id"))
        .get("max_id")
        or 0
    )
    next_number = int(current_max) + 1
    return f"{prefix}{next_number:06d}"


def generate_pos_register_code(company) -> str:
    """
    Generate POS register code for one company.
    """

    return _next_sequence_number(
        model=POSRegister,
        company=company,
        field_name="code",
        prefix="POS-R-",
    )


def generate_pos_session_number(company) -> str:
    """
    Generate POS session number for one company.
    """

    return _next_sequence_number(
        model=POSSession,
        company=company,
        field_name="session_number",
        prefix="POS-S-",
    )


def generate_pos_order_number(company) -> str:
    """
    Generate POS order number for one company.
    """

    return _next_sequence_number(
        model=POSOrder,
        company=company,
        field_name="order_number",
        prefix="POS-O-",
    )


@transaction.atomic
def create_pos_register(
    *,
    company,
    branch,
    name: str,
    code: str = "",
    warehouse=None,
    treasury_account=None,
    default_payment_method=None,
    default_payment_terminal=None,
    receipt_header: str = "",
    receipt_footer: str = "",
    notes: str = "",
    user=None,
) -> POSRegister:
    """
    Create a POS register inside one company.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    name = (name or "").strip()
    code = (code or "").strip().upper() or generate_pos_register_code(company)

    if not name:
        raise ValidationError({"name": "Register name is required."})

    _validate_same_company(branch, company, "branch")
    _validate_same_company(warehouse, company, "warehouse")
    _validate_same_company(treasury_account, company, "treasury_account")
    _validate_same_company(default_payment_method, company, "default_payment_method")
    _validate_same_company(default_payment_terminal, company, "default_payment_terminal")

    register = POSRegister(
        company=company,
        branch=branch,
        warehouse=warehouse,
        treasury_account=treasury_account,
        default_payment_method=default_payment_method,
        default_payment_terminal=default_payment_terminal,
        name=name,
        code=code,
        status=POSRegisterStatus.ACTIVE,
        is_active=True,
        receipt_header=receipt_header or "",
        receipt_footer=receipt_footer or "",
        notes=notes or "",
        created_by=_get_user_or_none(user),
        updated_by=_get_user_or_none(user),
    )
    register.full_clean()
    register.save()

    return register


@transaction.atomic
def open_pos_session(
    *,
    company,
    register: POSRegister,
    opening_cash_amount=ZERO_MONEY,
    session_number: str = "",
    notes: str = "",
    user=None,
) -> POSSession:
    """
    Open a cashier session for a POS register.

    Only one open session is allowed for the same register.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(register, company, "register")

    if not register.is_available:
        raise ValidationError({"register": "Register is not active."})

    existing_open_session = POSSession.objects.select_for_update().filter(
        company=company,
        register=register,
        status=POSSessionStatus.OPEN,
    ).first()

    if existing_open_session:
        raise ValidationError(
            {
                "session": "This register already has an open POS session.",
            }
        )

    session_number = (session_number or "").strip().upper() or generate_pos_session_number(company)
    opening_cash = _to_money(opening_cash_amount)

    if opening_cash < ZERO_MONEY:
        raise ValidationError({"opening_cash_amount": "Opening cash amount cannot be negative."})

    session = POSSession(
        company=company,
        register=register,
        branch=register.branch,
        warehouse=register.warehouse,
        treasury_account=register.treasury_account,
        session_number=session_number,
        status=POSSessionStatus.OPEN,
        opening_cash_amount=opening_cash,
        expected_cash_amount=opening_cash,
        opened_by=_get_user_or_none(user),
        opened_at=timezone.now(),
        notes=notes or "",
    )
    session.full_clean()
    session.save()

    return session


def calculate_session_expected_cash(session: POSSession) -> Decimal:
    """
    Calculate expected cash for a POS session.

    In this foundation version, only confirmed CASH POSPayment lines are counted.
    """

    if not session:
        raise ValidationError({"session": "Session is required."})

    cash_payments_total = (
        POSPayment.objects.filter(
            company=session.company,
            order__session=session,
            payment_type=POSPaymentLineType.CASH,
            status=POSPaymentLineStatus.CONFIRMED,
        )
        .aggregate(total=Sum("amount"))
        .get("total")
        or ZERO_MONEY
    )

    return _to_money(session.opening_cash_amount + cash_payments_total)


@transaction.atomic
def close_pos_session(
    *,
    company,
    session: POSSession,
    closing_cash_amount=ZERO_MONEY,
    notes: str = "",
    user=None,
) -> POSSession:
    """
    Close an open POS session.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(session, company, "session")

    session = POSSession.objects.select_for_update().get(pk=session.pk)

    if session.status != POSSessionStatus.OPEN:
        raise ValidationError({"session": "Only open sessions can be closed."})

    closing_cash = _to_money(closing_cash_amount)

    if closing_cash < ZERO_MONEY:
        raise ValidationError({"closing_cash_amount": "Closing cash amount cannot be negative."})

    expected_cash = calculate_session_expected_cash(session)
    difference = _to_money(closing_cash - expected_cash)

    session.status = POSSessionStatus.CLOSED
    session.closing_cash_amount = closing_cash
    session.expected_cash_amount = expected_cash
    session.difference_amount = difference
    session.closed_by = _get_user_or_none(user)
    session.closed_at = timezone.now()

    if notes:
        session.notes = notes

    session.full_clean()
    session.save(
        update_fields=[
            "status",
            "closing_cash_amount",
            "expected_cash_amount",
            "difference_amount",
            "closed_by",
            "closed_at",
            "notes",
            "updated_at",
        ]
    )

    return session


@transaction.atomic
def cancel_pos_session(
    *,
    company,
    session: POSSession,
    reason: str = "",
    user=None,
) -> POSSession:
    """
    Cancel an open POS session if it has no completed orders.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(session, company, "session")

    session = POSSession.objects.select_for_update().get(pk=session.pk)

    if session.status != POSSessionStatus.OPEN:
        raise ValidationError({"session": "Only open sessions can be cancelled."})

    has_completed_orders = POSOrder.objects.filter(
        company=company,
        session=session,
        status=POSOrderStatus.COMPLETED,
    ).exists()

    if has_completed_orders:
        raise ValidationError(
            {
                "session": "Cannot cancel a session that has completed POS orders.",
            }
        )

    session.status = POSSessionStatus.CANCELLED
    session.cancelled_by = _get_user_or_none(user)
    session.cancelled_at = timezone.now()
    session.cancellation_reason = reason or ""

    session.full_clean()
    session.save(
        update_fields=[
            "status",
            "cancelled_by",
            "cancelled_at",
            "cancellation_reason",
            "updated_at",
        ]
    )

    return session


@transaction.atomic
def create_pos_order(
    *,
    company,
    session: POSSession,
    customer=None,
    order_number: str = "",
    notes: str = "",
    user=None,
) -> POSOrder:
    """
    Create a draft POS order under an open session.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(session, company, "session")
    _validate_same_company(customer, company, "customer")

    if session.status != POSSessionStatus.OPEN:
        raise ValidationError({"session": "POS order can only be created in an open session."})

    register = session.register

    if not register.is_available:
        raise ValidationError({"register": "Register is not active."})

    order_number = (order_number or "").strip().upper() or generate_pos_order_number(company)

    order = POSOrder(
        company=company,
        session=session,
        register=register,
        branch=session.branch,
        warehouse=session.warehouse,
        customer=customer,
        order_number=order_number,
        status=POSOrderStatus.DRAFT,
        payment_status=POSPaymentStatus.UNPAID,
        created_by=_get_user_or_none(user),
        updated_by=_get_user_or_none(user),
        notes=notes or "",
    )
    order.full_clean()
    order.save()

    return order


def calculate_pos_order_item_amounts(
    *,
    quantity,
    unit_price,
    discount_amount=ZERO_MONEY,
    tax_rate=ZERO_MONEY,
) -> dict[str, Decimal]:
    """
    Calculate POS order item amounts.
    """

    quantity = _to_quantity(quantity)
    unit_price = _to_money(unit_price)
    discount_amount = _to_money(discount_amount)
    tax_rate = Decimal(str(tax_rate or ZERO_MONEY))

    if quantity <= ZERO_QUANTITY:
        raise ValidationError({"quantity": "Quantity must be greater than zero."})

    if unit_price < ZERO_MONEY:
        raise ValidationError({"unit_price": "Unit price cannot be negative."})

    if discount_amount < ZERO_MONEY:
        raise ValidationError({"discount_amount": "Discount amount cannot be negative."})

    if tax_rate < ZERO_MONEY:
        raise ValidationError({"tax_rate": "Tax rate cannot be negative."})

    gross_amount = _to_money(quantity * unit_price)

    if discount_amount > gross_amount:
        raise ValidationError({"discount_amount": "Discount amount cannot exceed gross amount."})

    taxable_amount = _to_money(gross_amount - discount_amount)
    tax_amount = _to_money(taxable_amount * tax_rate / Decimal("100"))
    line_total = _to_money(taxable_amount + tax_amount)

    return {
        "quantity": quantity,
        "unit_price": unit_price,
        "discount_amount": discount_amount,
        "taxable_amount": taxable_amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "line_total": line_total,
    }


@transaction.atomic
def add_pos_order_item(
    *,
    company,
    order: POSOrder,
    catalog_item,
    quantity,
    unit_price=None,
    discount_amount=ZERO_MONEY,
    tax_rate=None,
) -> POSOrderItem:
    """
    Add an item line to a draft POS order.

    Catalog item snapshot fields are stored immediately.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(order, company, "order")
    _validate_same_company(catalog_item, company, "catalog_item")

    if order.status != POSOrderStatus.DRAFT:
        raise ValidationError({"order": "Items can only be added to draft POS orders."})

    if catalog_item.status != CatalogItemStatus.ACTIVE:
        raise ValidationError({"catalog_item": "Catalog item is not active."})

    if not catalog_item.is_sellable:
        raise ValidationError({"catalog_item": "Catalog item is not sellable."})

    unit_price = _to_money(unit_price if unit_price is not None else catalog_item.sale_price)
    tax_rate = Decimal(str(tax_rate if tax_rate is not None else catalog_item.tax_rate))

    amounts = calculate_pos_order_item_amounts(
        quantity=quantity,
        unit_price=unit_price,
        discount_amount=discount_amount,
        tax_rate=tax_rate if catalog_item.taxable else ZERO_MONEY,
    )

    unit_name = ""
    if catalog_item.unit_id:
        unit_name = catalog_item.unit.name or catalog_item.unit.symbol or ""

    item = POSOrderItem(
        company=company,
        order=order,
        catalog_item=catalog_item,
        item_code=catalog_item.code or "",
        item_sku=catalog_item.sku or "",
        item_barcode=catalog_item.barcode or "",
        item_name=catalog_item.name,
        unit_name=unit_name,
        quantity=amounts["quantity"],
        unit_price=amounts["unit_price"],
        discount_amount=amounts["discount_amount"],
        taxable_amount=amounts["taxable_amount"],
        tax_rate=amounts["tax_rate"],
        tax_amount=amounts["tax_amount"],
        line_total=amounts["line_total"],
    )
    item.full_clean()
    item.save()

    recalculate_pos_order_totals(order=order)

    return item


@transaction.atomic
def recalculate_pos_order_totals(*, order: POSOrder) -> POSOrder:
    """
    Recalculate totals for a POS order from its items and payments.
    """

    if not order:
        raise ValidationError({"order": "Order is required."})

    totals = order.items.aggregate(
        subtotal=Sum("taxable_amount"),
        discount=Sum("discount_amount"),
        tax=Sum("tax_amount"),
        total=Sum("line_total"),
    )

    paid_total = (
        order.payments.filter(status=POSPaymentLineStatus.CONFIRMED)
        .aggregate(total=Sum("amount"))
        .get("total")
        or ZERO_MONEY
    )

    subtotal = _to_money(totals.get("subtotal") or ZERO_MONEY)
    discount = _to_money(totals.get("discount") or ZERO_MONEY)
    tax = _to_money(totals.get("tax") or ZERO_MONEY)
    total = _to_money(totals.get("total") or ZERO_MONEY)
    paid_total = _to_money(paid_total)

    order.subtotal_amount = subtotal
    order.discount_amount = discount
    order.taxable_amount = subtotal
    order.tax_amount = tax
    order.total_amount = total
    order.paid_amount = paid_total

    if paid_total <= ZERO_MONEY:
        order.payment_status = POSPaymentStatus.UNPAID
    elif paid_total < total:
        order.payment_status = POSPaymentStatus.PARTIALLY_PAID
    else:
        order.payment_status = POSPaymentStatus.PAID

    order.change_amount = _to_money(paid_total - total) if paid_total > total else ZERO_MONEY

    order.full_clean()
    order.save(
        update_fields=[
            "subtotal_amount",
            "discount_amount",
            "taxable_amount",
            "tax_amount",
            "total_amount",
            "paid_amount",
            "payment_status",
            "change_amount",
            "updated_at",
        ]
    )

    return order


@transaction.atomic
def add_pos_payment_line(
    *,
    company,
    order: POSOrder,
    payment_method,
    amount,
    payment_type: str = POSPaymentLineType.CASH,
    payment_terminal=None,
    treasury_account=None,
    reference: str = "",
    notes: str = "",
    confirm_now: bool = False,
    user=None,
) -> POSPayment:
    """
    Add a payment line to a POS order.

    This foundation service does not create treasury transaction yet.
    Treasury integration will be added later in Phase 13.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(order, company, "order")
    _validate_same_company(payment_method, company, "payment_method")
    _validate_same_company(payment_terminal, company, "payment_terminal")
    _validate_same_company(treasury_account, company, "treasury_account")

    if order.status != POSOrderStatus.DRAFT:
        raise ValidationError({"order": "Payments can only be added to draft POS orders."})

    amount = _to_money(amount)

    if amount <= ZERO_MONEY:
        raise ValidationError({"amount": "Amount must be greater than zero."})

    status = POSPaymentLineStatus.CONFIRMED if confirm_now else POSPaymentLineStatus.PENDING
    now = timezone.now() if confirm_now else None

    payment = POSPayment(
        company=company,
        order=order,
        payment_method=payment_method,
        payment_terminal=payment_terminal,
        treasury_account=treasury_account or order.register.treasury_account,
        payment_type=payment_type,
        status=status,
        amount=amount,
        reference=(reference or "").strip(),
        notes=notes or "",
        created_by=_get_user_or_none(user),
        updated_by=_get_user_or_none(user),
        confirmed_by=_get_user_or_none(user) if confirm_now else None,
        confirmed_at=now,
    )
    payment.full_clean()
    payment.save()

    recalculate_pos_order_totals(order=order)

    return payment


@transaction.atomic
def confirm_pos_payment_line(
    *,
    company,
    payment: POSPayment,
    user=None,
) -> POSPayment:
    """
    Confirm a pending POS payment line.
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    _validate_same_company(payment, company, "payment")

    payment = POSPayment.objects.select_for_update().get(pk=payment.pk)

    if payment.status != POSPaymentLineStatus.PENDING:
        raise ValidationError({"payment": "Only pending payment lines can be confirmed."})

    if payment.order.status != POSOrderStatus.DRAFT:
        raise ValidationError({"order": "Payment can only be confirmed while order is draft."})

    payment.status = POSPaymentLineStatus.CONFIRMED
    payment.confirmed_by = _get_user_or_none(user)
    payment.confirmed_at = timezone.now()

    payment.full_clean()
    payment.save(
        update_fields=[
            "status",
            "confirmed_by",
            "confirmed_at",
            "updated_at",
        ]
    )

    recalculate_pos_order_totals(order=payment.order)

    return payment


def preview_pos_checkout(
    *,
    company,
    lines: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Preview POS checkout totals without creating database records.

    Expected line shape:
        {
            "catalog_item": CatalogItem instance,
            "quantity": "1",
            "unit_price": optional,
            "discount_amount": optional,
            "tax_rate": optional,
        }
    """

    if not company:
        raise ValidationError({"company": "Company is required."})

    if not lines:
        raise ValidationError({"lines": "At least one checkout line is required."})

    preview_lines = []
    subtotal = ZERO_MONEY
    discount = ZERO_MONEY
    tax = ZERO_MONEY
    total = ZERO_MONEY

    for line in lines:
        catalog_item = line.get("catalog_item")
        _validate_same_company(catalog_item, company, "catalog_item")

        if catalog_item.status != CatalogItemStatus.ACTIVE:
            raise ValidationError({"catalog_item": "Catalog item is not active."})

        if not catalog_item.is_sellable:
            raise ValidationError({"catalog_item": "Catalog item is not sellable."})

        unit_price = line.get("unit_price", catalog_item.sale_price)
        tax_rate = line.get("tax_rate", catalog_item.tax_rate)

        amounts = calculate_pos_order_item_amounts(
            quantity=line.get("quantity"),
            unit_price=unit_price,
            discount_amount=line.get("discount_amount", ZERO_MONEY),
            tax_rate=tax_rate if catalog_item.taxable else ZERO_MONEY,
        )

        subtotal += amounts["taxable_amount"]
        discount += amounts["discount_amount"]
        tax += amounts["tax_amount"]
        total += amounts["line_total"]

        preview_lines.append(
            {
                "catalog_item_id": catalog_item.id,
                "item_code": catalog_item.code,
                "item_sku": catalog_item.sku,
                "item_barcode": catalog_item.barcode,
                "item_name": catalog_item.name,
                "quantity": amounts["quantity"],
                "unit_price": amounts["unit_price"],
                "discount_amount": amounts["discount_amount"],
                "taxable_amount": amounts["taxable_amount"],
                "tax_rate": amounts["tax_rate"],
                "tax_amount": amounts["tax_amount"],
                "line_total": amounts["line_total"],
            }
        )

    return {
        "lines": preview_lines,
        "subtotal_amount": _to_money(subtotal),
        "discount_amount": _to_money(discount),
        "taxable_amount": _to_money(subtotal),
        "tax_amount": _to_money(tax),
        "total_amount": _to_money(total),
    }