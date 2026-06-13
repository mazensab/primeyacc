from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    serialize_supplier_debit_note,
)

from ._shared import (
    SupplierDebitNoteAPIError,
    company_payload,
    get_company_supplier_debit_note,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_supplier_debit_note_detail(
    request: Request,
    debit_note_id: int,
) -> Response:
    """
    Return one company-scoped supplier debit note.
    """
    try:
        company = get_request_company(request)

        debit_note = get_company_supplier_debit_note(
            company=company,
            debit_note_id=debit_note_id,
        )

        if not debit_note:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Supplier debit note was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Supplier debit note was not found."
                        ),
                    },
                },
                status=404,
            )

        data = serialize_supplier_debit_note(
            debit_note,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "debit_note": data,
                "data": data,
            },
            status=200,
        )

    except SupplierDebitNoteAPIError as exc:
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


company_supplier_debit_note_detail.required_company_permissions = [
    "company.purchases.debit_notes.view",
]
