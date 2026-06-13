# ============================================================
# ?? api/company/sales/credit_notes/cancel.py
# ?? PrimeyAcc | Company Sales Credit Note Cancel API
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
    cancel_sales_credit_note,
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
def company_sales_credit_note_cancel(
    request: Request,
    credit_note_id: int,
) -> Response:
    """
    Cancel a draft or issued company-scoped credit note.
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

        reason = str(
            (request.data or {}).get(
                "reason",
                "",
            )
            or ""
        ).strip()

        credit_note = cancel_sales_credit_note(
            company=company,
            credit_note=credit_note,
            reason=reason,
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
                    "Sales credit note cancelled "
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
                    "be cancelled."
                ),
                "errors": validation_error_payload(
                    exc
                ),
            },
            status=400,
        )


company_sales_credit_note_cancel.required_company_permissions = [
    "company.sales.credit_notes.cancel",
]
