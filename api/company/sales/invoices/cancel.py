# ============================================================
# 📂 api/company/sales/invoices/cancel.py
# 🧠 Mhamcloud | Company Sales Invoice Cancel API V1.0
# ------------------------------------------------------------
# ✅ Cancel company-scoped issued sales invoice
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Blocks cross-company access
# ✅ Cancels through sales.services
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - إلغاء الفاتورة يتم من خلال sales.services
# - لا نحذف الفاتورة، فقط نغير حالتها إلى CANCELLED
# - هذه المرحلة لا تنشئ قيود عكسية ولا حركات مخزون عكسية
# - صلاحية الإلغاء المطلوبة: company.sales.invoices.cancel
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import SalesInvoice
from sales.services import (
    cancel_sales_invoice,
    serialize_sales_invoice,
)


class SalesInvoiceCancelAPIError(Exception):
    """
    Small API-level error for sales invoice cancel endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceCancelAPIError("Current company context was not resolved.")

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


def _validation_error_payload(exc: ValidationError) -> dict:
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
            "issued_by",
            "cancelled_by",
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


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoice_cancel(request: Request, invoice_id: int) -> Response:
    """
    Cancel an issued sales invoice for the current company only.

    Payload:
    {
        "reason": "Customer requested cancellation"
    }
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

        reason = _normalize_text(
            payload.get("reason")
            or payload.get("cancelled_reason")
            or payload.get("note")
            or ""
        )

        invoice = cancel_sales_invoice(
            company=company,
            invoice=invoice,
            reason=reason,
            user=user,
        )

        invoice.refresh_from_db()

        data = serialize_sales_invoice(invoice, include_items=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoice cancelled successfully.",
                "invoice": data,
                "data": data,
            },
            status=200,
        )

    except SalesInvoiceCancelAPIError as exc:
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
                "message": "Sales invoice could not be cancelled.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )


company_sales_invoice_cancel.required_company_permissions = [
    "company.sales.invoices.cancel",
]