from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from purchases.models import SupplierDebitNote


class SupplierDebitNoteAPIError(Exception):
    """
    API-level supplier debit note error.
    """


def get_request_company(request: Request):
    """
    Return company resolved by the company workspace layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SupplierDebitNoteAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
    """
    Return authenticated user when available.
    """
    user = getattr(request, "user", None)

    if user and getattr(
        user,
        "is_authenticated",
        False,
    ):
        return user

    return None


def validation_error_payload(
    exc: ValidationError,
) -> dict:
    """
    Convert Django ValidationError into API-safe data.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {
            "detail": exc.messages,
        }

    return {
        "detail": str(exc),
    }


def company_payload(company) -> dict:
    """
    Serialize minimal company context.
    """
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }


def get_company_supplier_debit_note(
    *,
    company,
    debit_note_id: int | str,
) -> SupplierDebitNote | None:
    """
    Return a supplier debit note only inside its company.
    """
    return (
        SupplierDebitNote.objects
        .select_related(
            "company",
            "branch",
            "supplier",
            "bill",
            "purchase_return",
            "created_by",
            "updated_by",
            "issued_by",
            "posted_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__purchase_return_item",
            "items__bill_item",
            "items__item",
        )
        .filter(
            company=company,
            id=debit_note_id,
        )
        .first()
    )
