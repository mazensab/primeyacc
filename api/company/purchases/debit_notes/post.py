# ============================================================
# ?? api/company/purchases/debit_notes/post.py
# ?? PrimeyAcc | Supplier Debit Note Post API
# ------------------------------------------------------------
# ? Company-scoped tenant isolation
# ? Uses purchases service layer as source of truth
# ? Atomic bill, inventory, supplier credit and accounting posting
# ? Protected by company.purchases.debit_notes.post
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
from purchases.models import SupplierDebitNote
from purchases.services import (
    post_supplier_debit_note,
    serialize_supplier_debit_note,
)


class SupplierDebitNotePostAPIError(Exception):
    """
    API-level error for supplier debit note posting.
    """


def _get_request_company(request: Request):
    """
    Return the current company context.
    """
    company = getattr(
        request,
        "company",
        None,
    )

    if not company:
        raise SupplierDebitNotePostAPIError(
            "Current company context was not resolved."
        )

    return company


def _validation_error_payload(
    exc: ValidationError,
):
    """
    Convert Django validation errors to a stable payload.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_supplier_debit_note_post(
    request: Request,
    debit_note_id: int,
) -> Response:
    """
    Post an issued supplier debit note for
    the current company.
    """
    try:
        company = _get_request_company(
            request
        )

        try:
            debit_note = (
                SupplierDebitNote.objects
                .select_related(
                    "company",
                    "branch",
                    "supplier",
                    "bill",
                    "purchase_return",
                )
                .get(
                    id=debit_note_id,
                    company=company,
                )
            )
        except SupplierDebitNote.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Supplier debit note "
                        "was not found."
                    ),
                },
                status=404,
            )

        debit_note = post_supplier_debit_note(
            debit_note=debit_note,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Supplier debit note "
                    "posted successfully."
                ),
                "debit_note": (
                    serialize_supplier_debit_note(
                        debit_note,
                        include_items=True,
                    )
                ),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Supplier debit note "
                    "could not be posted."
                ),
                "errors": (
                    _validation_error_payload(
                        exc
                    )
                ),
            },
            status=400,
        )

    except SupplierDebitNotePostAPIError as exc:
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


company_supplier_debit_note_post.required_company_permissions = [
    "company.purchases.debit_notes.post",
]
