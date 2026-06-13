from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.services import (
    issue_supplier_debit_note,
    serialize_supplier_debit_note,
)

from ._shared import (
    SupplierDebitNoteAPIError,
    company_payload,
    get_company_supplier_debit_note,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_supplier_debit_note_issue(
    request: Request,
    debit_note_id: int,
) -> Response:
    """
    Issue a draft company supplier debit note.
    """
    try:
        company = get_request_company(request)
        user = get_request_user(request)

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

        debit_note = issue_supplier_debit_note(
            debit_note=debit_note,
            user=user,
        )

        data = serialize_supplier_debit_note(
            debit_note,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Supplier debit note issued successfully."
                ),
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Supplier debit note could not be issued."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_supplier_debit_note_issue.required_company_permissions = [
    "company.purchases.debit_notes.issue",
]
