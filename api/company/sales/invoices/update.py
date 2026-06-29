# ============================================================
# 📂 api/company/sales/invoices/update.py
# 🧠 Mhamcloud | Company Sales Invoice Update API V1.0
# ------------------------------------------------------------
# ✅ Update company-scoped draft sales invoice
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Blocks cross-company access
# ✅ Allows replacing draft invoice items
# ✅ Blocks updates for issued/cancelled invoices
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يتم تعديل الفاتورة بعد إصدارها أو إلغائها في هذه المرحلة
# - تحديث البنود هنا يكون replace كامل لبنود المسودة عند إرسال items
# - هذه المرحلة لا تنشئ قيود محاسبية ولا حركات مخزون ولا مدفوعات
# - صلاحية التعديل المطلوبة: company.sales.invoices.update
# ============================================================

from __future__ import annotations

import json
from typing import Any

from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import SalesInvoice, SalesInvoiceSource, SalesInvoiceStatus
from sales.services import (
    create_sales_invoice_item,
    resolve_company_branch,
    resolve_customer,
    serialize_sales_invoice,
)


class SalesInvoiceUpdateAPIError(Exception):
    """
    Small API-level error for sales invoice update endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceUpdateAPIError("Current company context was not resolved.")

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
            raise SalesInvoiceUpdateAPIError("Items must be a valid JSON list.")

        if isinstance(parsed, list):
            return [
                item
                for item in parsed
                if isinstance(item, dict)
            ]

        if isinstance(parsed, dict):
            return [parsed]

    raise SalesInvoiceUpdateAPIError("Items must be a list of invoice lines.")


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


def _get_company_invoice(*, company, invoice_id: int | str) -> SalesInvoice | None:
    """
    Return invoice only if it belongs to the current company.
    """
    return (
        SalesInvoice.objects.select_related(
            "company",
            "branch",
            "customer",
            "created_by",
            "updated_by",
        )
        .prefetch_related(
            "items",
            "items__catalog_item",
        )
        .filter(
            company=company,
            id=invoice_id,
        )
        .first()
    )


@transaction.atomic
def _update_invoice_from_payload(
    *,
    invoice: SalesInvoice,
    company,
    user,
    payload: dict[str, Any],
) -> SalesInvoice:
    """
    Apply safe update payload to a draft invoice.
    """
    if invoice.status != SalesInvoiceStatus.DRAFT:
        raise SalesInvoiceUpdateAPIError("Only draft sales invoices can be updated.")

    if "branch_id" in payload:
        invoice.branch = resolve_company_branch(
            company,
            payload.get("branch_id"),
        )

    if "customer_id" in payload:
        invoice.customer = resolve_customer(
            company,
            payload.get("customer_id"),
        )

    if "invoice_date" in payload:
        invoice.invoice_date = payload.get("invoice_date") or invoice.invoice_date

    if "due_date" in payload:
        invoice.due_date = payload.get("due_date") or None

    if "source" in payload:
        source = _normalize_text(payload.get("source") or SalesInvoiceSource.MANUAL).upper()
        if source in SalesInvoiceSource.values:
            invoice.source = source

    if "public_notes" in payload or "notes" in payload:
        invoice.public_notes = _normalize_text(
            payload.get("public_notes")
            if "public_notes" in payload
            else payload.get("notes")
        )

    if "internal_notes" in payload:
        invoice.internal_notes = _normalize_text(payload.get("internal_notes"))

    if isinstance(payload.get("extra_data"), dict):
        invoice.extra_data = payload.get("extra_data") or {}

    if user:
        invoice.updated_by = user

    invoice.full_clean()
    invoice.save()

    invoice.refresh_snapshots(save=True)

    if "items" in payload:
        items = _normalize_items(payload.get("items"))

        invoice.items.all().delete()

        for index, item_payload in enumerate(items, start=1):
            create_sales_invoice_item(
                invoice=invoice,
                company=company,
                payload=item_payload,
                line_number=index,
            )

    invoice.recalculate_totals(save=True)

    return invoice


@api_view(["PATCH", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoice_update(request: Request, invoice_id: int) -> Response:
    """
    Update a draft sales invoice for the current company only.

    Important:
    - Issued invoices are not editable in this phase.
    - Cancelled invoices are not editable.
    - If items is provided, old items are replaced fully.
    """
    try:
        company = _get_request_company(request)
        user = _get_request_user(request)
        payload = _get_payload(request)

        invoice = _get_company_invoice(
            company=company,
            invoice_id=invoice_id,
        )

        if not invoice:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Sales invoice was not found.",
                    "errors": {
                        "detail": "Sales invoice was not found.",
                    },
                },
                status=404,
            )

        invoice = _update_invoice_from_payload(
            invoice=invoice,
            company=company,
            user=user,
            payload=payload,
        )

        invoice.refresh_from_db()

        data = serialize_sales_invoice(invoice, include_items=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoice updated successfully.",
                "invoice": data,
                "data": data,
            },
            status=200,
        )

    except SalesInvoiceUpdateAPIError as exc:
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
                "message": "Sales invoice could not be updated.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )


company_sales_invoice_update.required_company_permissions = [
    "company.sales.invoices.update",
]