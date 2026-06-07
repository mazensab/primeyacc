# ============================================================
# 📂 api/company/sales/invoices/detail.py
# 🧠 PrimeyAcc | Company Sales Invoice Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one company-scoped sales invoice
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Includes invoice items
# ✅ Blocks cross-company access
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - هذا الملف مسؤول عن عرض تفاصيل فاتورة مبيعات واحدة فقط
# - صلاحية العرض المطلوبة: company.sales.invoices.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import SalesInvoice
from sales.services import serialize_sales_invoice


class SalesInvoiceDetailAPIError(Exception):
    """
    Small API-level error for sales invoice detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesInvoiceDetailAPIError("Current company context was not resolved.")

    return company


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


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_invoice_detail(request: Request, invoice_id: int) -> Response:
    """
    Return sales invoice details for the current company only.
    """
    try:
        company = _get_request_company(request)
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

        data = serialize_sales_invoice(invoice, include_items=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Sales invoice loaded successfully.",
                "invoice": data,
                "data": data,
            },
            status=200,
        )

    except SalesInvoiceDetailAPIError as exc:
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


company_sales_invoice_detail.required_company_permissions = [
    "company.sales.invoices.view",
]