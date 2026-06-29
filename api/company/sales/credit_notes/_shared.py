# ============================================================
# ?? api/company/sales/credit_notes/_shared.py
# ?? Mhamcloud | Sales Credit Notes API Shared Helpers
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from sales.models import SalesCreditNote


class SalesCreditNoteAPIError(Exception):
    """
    Small API-level error for company credit note endpoints.
    """


def get_request_company(request: Request):
    """
    Return the company resolved by the company workspace layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise SalesCreditNoteAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
    """
    Return the authenticated request user when available.
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
    Convert Django ValidationError into an API-safe payload.
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


def get_company_credit_note(
    *,
    company,
    credit_note_id: int | str,
) -> SalesCreditNote | None:
    """
    Return a credit note only when it belongs to the company.
    """
    return (
        SalesCreditNote.objects
        .select_related(
            "company",
            "branch",
            "customer",
            "invoice",
            "sales_return",
            "created_by",
            "updated_by",
            "issued_by",
            "posted_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__sales_return_item",
            "items__invoice_item",
            "items__catalog_item",
        )
        .filter(
            company=company,
            id=credit_note_id,
        )
        .first()
    )


def company_payload(company) -> dict:
    """
    Serialize minimal company context.
    """
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }
