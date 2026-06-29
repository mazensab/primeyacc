# ============================================================
# 📂 api/company/sales/invoices/create.py
# 🧠 Mhamcloud | Company Sales Invoices Create API V1.0
# ------------------------------------------------------------
# ✅ Create company-scoped sales invoice
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Validates branch/customer/catalog item through sales.services
# ✅ Supports draft invoice with items
# ✅ Optional issue_now flag
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - إنشاء الفاتورة يتم من خلال sales.services وليس منطق مكرر داخل API
# - هذه المرحلة لا تنشئ قيود محاسبية ولا حركات مخزون ولا مدفوعات
# - صلاحية الإنشاء المطلوبة: company.sales.invoices.create
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import SalesInvoiceSource
from sales.services import (
    create_sales_invoice,
    issue_sales_invoice,
    serialize_sales_invoice,
)


class SalesInvoiceCreateAPIError(Exception):
    """
    Small API-level error for sales invoice create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceCreateAPIError("Current company context was not resolved.")

    return company


def _get_request_user(request: Request):
    """
    Return authenticated request user when available.
    """
    user = getattr(request, "user", None)

    if user and getattr(user, "is_authenticated", False):
        return user

    return None


def _get_payload(request: Request) -> dict[str, Any]:
    """
    Return request payload safely.

    DRF usually provides request.data. This helper keeps the endpoint safe
    if request.data is unavailable for any reason.
    """
    try:
        data = request.data
    except Exception:
        data = {}

    if isinstance(data, dict):
        return data

    return {}


def _normalize_text(value: Any) -> str:
    """
    Normalize text payload values.
    """
    return str(value or "").strip()


def _normalize_items(value: Any) -> list[dict[str, Any]]:
    """
    Normalize invoice items payload.

    Accepts:
    - items as list
    - items as JSON string
    - item as single dict
    """
    if value in [None, ""]:
        return []

    if isinstance(value, list):
        return [
            item
            for item in value
            if isinstance(item, dict)
        ]

    if isinstance(value, dict):
        return [value]

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            raise SalesInvoiceCreateAPIError("Items must be a valid JSON list.")

        if isinstance(parsed, list):
            return [
                item
                for item in parsed
                if isinstance(item, dict)
            ]

        if isinstance(parsed, dict):
            return [parsed]

    raise SalesInvoiceCreateAPIError("Items must be a list of invoice lines.")


def _normalize_bool(value: Any, default: bool = False) -> bool:
    """
    Normalize boolean-like payload values.
    """
    if value in [None, ""]:
        return default

    if isinstance(value, bool):
        return value

    value_text = str(value).strip().lower()

    if value_text in ["1", "true", "yes", "y", "on"]:
        return True

    if value_text in ["0", "false", "no", "n", "off"]:
        return False

    return default


def _validation_error_payload(exc: ValidationError) -> dict[str, Any]:
    """
    Convert Django ValidationError into a safe API error payload.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {
            "detail": exc.messages,
        }

    return {
        "detail": str(exc),
    }


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoice_create(request: Request) -> Response:
    """
    Create a sales invoice for the current company only.

    Payload:
    {
        "branch_id": 1,
        "customer_id": 10,
        "invoice_date": "2026-06-07",
        "due_date": "2026-06-30",
        "source": "MANUAL",
        "public_notes": "...",
        "internal_notes": "...",
        "items": [
            {
                "catalog_item_id": 1,
                "quantity": "2",
                "unit_price": "100.00",
                "discount_amount": "0.00",
                "taxable": true,
                "tax_rate": "15.00"
            }
        ],
        "issue_now": false
    }
    """
    try:
        company = _get_request_company(request)
        user = _get_request_user(request)
        payload = _get_payload(request)

        source = _normalize_text(payload.get("source") or SalesInvoiceSource.MANUAL).upper()
        if source not in SalesInvoiceSource.values:
            source = SalesInvoiceSource.MANUAL

        items = _normalize_items(payload.get("items"))
        issue_now = _normalize_bool(payload.get("issue_now"), default=False)

        invoice = create_sales_invoice(
            company=company,
            user=user,
            branch_id=payload.get("branch_id"),
            customer_id=payload.get("customer_id"),
            invoice_date=payload.get("invoice_date") or None,
            due_date=payload.get("due_date") or None,
            source=source,
            public_notes=payload.get("public_notes") or payload.get("notes") or "",
            internal_notes=payload.get("internal_notes") or "",
            items=items,
            extra_data=payload.get("extra_data") if isinstance(payload.get("extra_data"), dict) else {},
        )

        if issue_now:
            invoice = issue_sales_invoice(
                company=company,
                invoice=invoice,
                user=user,
            )

        invoice.refresh_from_db()

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoice created successfully.",
                "invoice": serialize_sales_invoice(invoice, include_items=True),
                "data": serialize_sales_invoice(invoice, include_items=True),
            },
            status=201,
        )

    except SalesInvoiceCreateAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Sales invoice could not be created.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )


company_sales_invoice_create.required_company_permissions = [
    "company.sales.invoices.create",
]