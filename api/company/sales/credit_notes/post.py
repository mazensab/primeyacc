# ============================================================
# api/company/sales/credit_notes/post.py
# Mhamcloud | Company Sales Credit Note Posting API
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
    post_sales_credit_note,
    serialize_sales_credit_note,
)

from ._shared import (
    SalesCreditNoteAPIError,
    get_company_credit_note,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_credit_note_post(
    request: Request,
    credit_note_id: int,
) -> Response:
    """
    Post an issued company-scoped sales credit note.

    Posting creates the accounting journal entry and marks
    both the credit note and linked sales return as posted.
    """
    try:
        company = get_request_company(request)
        user = get_request_user(request)

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

        credit_note = post_sales_credit_note(
            company=company,
            credit_note=credit_note,
            user=user,
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
                    "Sales credit note posted "
                    "successfully."
                ),
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

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Sales credit note could not "
                    "be posted."
                ),
                "errors": validation_error_payload(
                    exc
                ),
            },
            status=400,
        )


company_sales_credit_note_post.required_company_permissions = [
    "company.sales.credit_notes.post",
]
