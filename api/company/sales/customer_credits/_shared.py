# ============================================================
# api/company/sales/customer_credits/_shared.py
# Mhamcloud | Customer Credit API Shared Helpers
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from sales.models import (
    CustomerCreditAllocation,
    SalesCreditNote,
    SalesInvoice,
)


class CustomerCreditAPIError(Exception):
    """
    Small API-level error for customer credit endpoints.
    """


def get_request_company(request: Request):
    """
    Return the company resolved by the company workspace layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise CustomerCreditAPIError(
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


def company_payload(company) -> dict:
    """
    Serialize minimal company context.
    """
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }


def get_company_credit_note(
    *,
    company,
    credit_note_id,
):
    """
    Resolve one posted credit note inside the company.
    """
    return (
        SalesCreditNote.objects
        .select_related(
            "company",
            "customer",
            "invoice",
        )
        .filter(
            company=company,
            id=credit_note_id,
        )
        .first()
    )


def get_company_invoice(
    *,
    company,
    invoice_id,
):
    """
    Resolve one sales invoice inside the company.
    """
    return (
        SalesInvoice.objects
        .select_related(
            "company",
            "customer",
        )
        .filter(
            company=company,
            id=invoice_id,
        )
        .first()
    )


def get_company_allocation(
    *,
    company,
    allocation_id,
):
    """
    Resolve one customer credit allocation inside the company.
    """
    return (
        CustomerCreditAllocation.objects
        .select_related(
            "company",
            "customer",
            "credit_note",
            "invoice",
            "created_by",
            "reversed_by",
        )
        .filter(
            company=company,
            id=allocation_id,
        )
        .first()
    )
