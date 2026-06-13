# ============================================================
# api/company/sales/customer_credits/allocate.py
# PrimeyAcc | Customer Credit Allocation Create API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.services import (
    allocate_customer_credit,
    serialize_customer_credit_allocation,
)

from ._shared import (
    CustomerCreditAPIError,
    company_payload,
    get_company_credit_note,
    get_company_invoice,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_customer_credit_allocate(
    request: Request,
) -> Response:
    """
    Allocate posted customer credit to an issued invoice.
    """
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        credit_note_id = payload.get(
            "credit_note_id"
        )
        invoice_id = payload.get(
            "invoice_id"
        )
        amount = payload.get("amount")

        credit_note = get_company_credit_note(
            company=company,
            credit_note_id=credit_note_id,
        )

        if not credit_note:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Sales credit note was "
                        "not found."
                    ),
                    "errors": {
                        "credit_note": (
                            "Sales credit note was "
                            "not found."
                        ),
                    },
                },
                status=404,
            )

        invoice = get_company_invoice(
            company=company,
            invoice_id=invoice_id,
        )

        if not invoice:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Sales invoice was not found."
                    ),
                    "errors": {
                        "invoice": (
                            "Sales invoice was not found."
                        ),
                    },
                },
                status=404,
            )

        allocation = allocate_customer_credit(
            company=company,
            credit_note=credit_note,
            invoice=invoice,
            amount=amount,
            user=user,
        )

        data = serialize_customer_credit_allocation(
            allocation
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Customer credit allocated "
                    "successfully."
                ),
                "company": company_payload(company),
                "allocation": data,
                "data": data,
            },
            status=201,
        )

    except CustomerCreditAPIError as exc:
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
                "message": (
                    "Customer credit could not "
                    "be allocated."
                ),
                "errors": validation_error_payload(
                    exc
                ),
            },
            status=400,
        )


company_customer_credit_allocate.required_company_permissions = [
    "company.sales.customer_credits.allocate",
]
