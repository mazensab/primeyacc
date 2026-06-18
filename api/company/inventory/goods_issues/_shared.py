from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.request import Request

from inventory.models import GoodsIssue


class GoodsIssueAPIError(Exception):
    """
    Goods issue API context error.
    """


def get_request_company(request: Request):
    company = getattr(request, "company", None)

    if not company:
        raise GoodsIssueAPIError(
            "Current company context was not resolved."
        )

    return company


def get_request_user(request: Request):
    user = getattr(request, "user", None)

    if (
        user
        and getattr(user, "is_authenticated", False)
    ):
        return user

    return None


def validation_error_payload(
    exc: ValidationError,
) -> dict:
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
    return {
        "id": company.id,
        "name": company.display_name,
        "code": company.company_code,
    }


def get_company_goods_issue(
    *,
    company,
    goods_issue_id: int | str,
) -> GoodsIssue | None:
    return (
        GoodsIssue.objects
        .select_related(
            "company",
            "sales_order",
            "warehouse",
            "location",
            "created_by",
            "updated_by",
            "posted_by",
            "cancelled_by",
        )
        .prefetch_related(
            "items",
            "items__sales_order_item",
            "items__reservation_allocation",
            "items__warehouse",
            "items__location",
            "items__stock_item",
            "items__item",
            "items__batch",
            "items__serial_number",
            "items__stock_movement",
        )
        .filter(
            company=company,
            id=goods_issue_id,
        )
        .first()
    )
