# ============================================================
# ?? api/company/sales/credit_notes/detail.py
# ?? PrimeyAcc | Company Sales Credit Note Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.services import (
    serialize_sales_credit_note,
)

from ._shared import (
    SalesCreditNoteAPIError,
    company_payload,
    get_company_credit_note,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_credit_note_detail(
    request: Request,
    credit_note_id: int,
) -> Response:
    """
    Return one company-scoped credit note with lines.
    """
    try:
        company = get_request_company(request)

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
                        "detail": (
                            "Sales credit note was "
                            "not found."
                        ),
                    },
                },
                status=404,
            )

        data = serialize_sales_credit_note(
            credit_note,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "credit_note": data,
                "data": data,
            },
            status=200,
        )

    except SalesCreditNoteAPIError as exc:
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


company_sales_credit_note_detail.required_company_permissions = [
    "company.sales.credit_notes.view",
]
