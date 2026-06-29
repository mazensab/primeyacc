# ============================================================
# ?? api/company/sales/credit_notes/create.py
# ?? Mhamcloud | Company Sales Credit Note Create API
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
    create_sales_credit_note_from_return,
    serialize_sales_credit_note,
)

from ._shared import (
    SalesCreditNoteAPIError,
    company_payload,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_credit_note_create(
    request: Request,
) -> Response:
    """
    Create a credit note from a confirmed or posted sales return.
    """
    try:
        company = get_request_company(request)
        user = get_request_user(request)
        payload = request.data or {}

        sales_return_id = (
            payload.get("sales_return_id")
            or payload.get("return_id")
        )

        credit_note = (
            create_sales_credit_note_from_return(
                company=company,
                sales_return_id=sales_return_id,
                user=user,
                credit_note_date=payload.get(
                    "credit_note_date"
                ),
                public_notes=payload.get(
                    "public_notes"
                ),
                internal_notes=payload.get(
                    "internal_notes"
                ),
                extra_data=(
                    payload.get("extra_data")
                    if isinstance(
                        payload.get("extra_data"),
                        dict,
                    )
                    else {}
                ),
                issue_now=bool(
                    payload.get("issue_now", False)
                ),
            )
        )

        data = serialize_sales_credit_note(
            credit_note,
            include_items=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Sales credit note created "
                    "successfully."
                ),
                "company": company_payload(company),
                "credit_note": data,
                "data": data,
            },
            status=201,
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Sales credit note could not "
                    "be created."
                ),
                "errors": validation_error_payload(
                    exc
                ),
            },
            status=400,
        )


company_sales_credit_note_create.required_company_permissions = [
    "company.sales.credit_notes.create",
]
