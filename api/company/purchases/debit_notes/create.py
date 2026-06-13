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
    create_supplier_debit_note,
    serialize_supplier_debit_note,
)

from ._shared import (
    SupplierDebitNoteAPIError,
    company_payload,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_supplier_debit_note_create(
    request: Request,
) -> Response:
    """
    Create a draft supplier debit note from a purchase return.
    """
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        debit_note = create_supplier_debit_note(
            company=company,
            payload=payload,
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
                    "Supplier debit note created successfully."
                ),
                "company": company_payload(company),
                "debit_note": data,
                "data": data,
            },
            status=201,
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
                    "Supplier debit note could not be created."
                ),
                "errors": validation_error_payload(exc),
            },
            status=400,
        )


company_supplier_debit_note_create.required_company_permissions = [
    "company.purchases.debit_notes.create",
]
