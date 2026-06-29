# ============================================================
# 📂 api/company/purchases/bills/serializers.py
# 🧠 Mhamcloud | Company Purchase Bills API Serializers V1.0
# ------------------------------------------------------------
# ✅ Serialize purchase bills for /company APIs
# ✅ Serialize purchase bill items
# ✅ Supplier / branch / totals snapshots
# ✅ Safe decimal/date serialization
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - APIs داخل /company تعتمد على request.company وليس company_id من الواجهة
# - serializer هنا للعرض فقط وليس مصدر قرار للعزل
# - الخدمات في purchases/services.py هي مصدر إنشاء وتحديث الفواتير
# ============================================================

from __future__ import annotations

from typing import Any

from purchases.models import PurchaseBill, PurchaseBillItem


def decimal_to_string(value) -> str:
    """
    Serialize Decimal safely as string for frontend consistency.
    """
    if value is None:
        return "0.00"

    return str(value)


def serialize_supplier(supplier) -> dict[str, Any] | None:
    """
    Serialize supplier basic data.
    """
    if not supplier:
        return None

    return {
        "id": supplier.id,
        "display_name": supplier.display_name,
        "legal_name": supplier.legal_name,
        "code": supplier.code,
        "party_type": supplier.party_type,
        "status": supplier.status,
        "phone": supplier.phone,
        "mobile": supplier.mobile,
        "email": supplier.email,
        "vat_number": supplier.vat_number,
        "commercial_registration": supplier.commercial_registration,
        "city": supplier.city,
    }


def serialize_branch(branch) -> dict[str, Any] | None:
    """
    Serialize branch basic data.
    """
    if not branch:
        return None

    return {
        "id": branch.id,
        "name": branch.display_name,
        "branch_code": branch.branch_code,
        "branch_type": branch.branch_type,
        "status": branch.status,
        "is_active": branch.is_active,
        "city": branch.city,
    }


def serialize_purchase_bill_item(item: PurchaseBillItem) -> dict[str, Any]:
    """
    Serialize one purchase bill item.
    """
    return {
        "id": item.id,
        "bill_id": item.bill_id,
        "company_id": item.company_id,
        "item_id": item.item_id,
        "line_number": item.line_number,
        "item_code": item.item_code_snapshot,
        "item_name": item.item_name_snapshot,
        "item_name_ar": item.item_name_ar_snapshot,
        "item_name_en": item.item_name_en_snapshot,
        "unit_name": item.unit_name_snapshot,
        "quantity": str(item.quantity),
        "unit_price": decimal_to_string(item.unit_price),
        "discount_amount": decimal_to_string(item.discount_amount),
        "taxable": item.taxable,
        "tax_rate": decimal_to_string(item.tax_rate),
        "subtotal_amount": decimal_to_string(item.subtotal_amount),
        "taxable_amount": decimal_to_string(item.taxable_amount),
        "tax_amount": decimal_to_string(item.tax_amount),
        "total_amount": decimal_to_string(item.total_amount),
        "notes": item.notes,
        "extra_data": item.extra_data or {},
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_purchase_bill(
    bill: PurchaseBill,
    *,
    include_items: bool = False,
) -> dict[str, Any]:
    """
    Serialize one purchase bill.
    """
    data = {
        "id": bill.id,
        "company_id": bill.company_id,
        "branch_id": bill.branch_id,
        "supplier_id": bill.supplier_id,
        "status": bill.status,
        "bill_number": bill.bill_number,
        "supplier_bill_number": bill.supplier_bill_number,
        "bill_date": bill.bill_date.isoformat() if bill.bill_date else None,
        "due_date": bill.due_date.isoformat() if bill.due_date else None,
        "currency_code": bill.currency_code,
        "subtotal_amount": decimal_to_string(bill.subtotal_amount),
        "discount_amount": decimal_to_string(bill.discount_amount),
        "taxable_amount": decimal_to_string(bill.taxable_amount),
        "tax_amount": decimal_to_string(bill.tax_amount),
        "total_amount": decimal_to_string(bill.total_amount),
        "posted_at": bill.posted_at.isoformat() if bill.posted_at else None,
        "posted_by_id": bill.posted_by_id,
        "cancelled_at": bill.cancelled_at.isoformat() if bill.cancelled_at else None,
        "cancelled_by_id": bill.cancelled_by_id,
        "cancellation_reason": bill.cancellation_reason,
        "can_edit": bill.can_edit,
        "can_post": bill.can_post,
        "can_cancel": bill.can_cancel,
        "notes": bill.notes,
        "extra_data": bill.extra_data or {},
        "supplier": serialize_supplier(bill.supplier),
        "branch": serialize_branch(bill.branch),
        "created_by_id": bill.created_by_id,
        "updated_by_id": bill.updated_by_id,
        "created_at": bill.created_at.isoformat() if bill.created_at else None,
        "updated_at": bill.updated_at.isoformat() if bill.updated_at else None,
    }

    if include_items:
        data["items"] = [
            serialize_purchase_bill_item(item)
            for item in bill.items.select_related("item").all()
        ]

    return data