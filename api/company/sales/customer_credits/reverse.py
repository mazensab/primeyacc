# ============================================================
# api/company/sales/customer_credits/reverse.py
# PrimeyAcc | Customer Credit Allocation Reverse API
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
    reverse_customer_credit_allocation,
    serialize_customer_credit_allocation,
)

from ._shared import (
    CustomerCreditAPIError,
    get_company_allocation,
    get_request_company,
    get_request_user,
    validation_error_payload,
)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_customer_credit_allocation_reverse(
    request: Request,
    allocation_id: int,
) -> Response:
    """
    Reverse one active customer credit allocation.
    """
    try:
        company = get_request_company(request)
        user = get_request_user(request)

        allocation = get_company_allocation(
            company=company,
            allocation_id=allocation_id,
        )

        if not allocation:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Customer credit allocation "
                        "was not found."
                    ),
                    "errors": {
                        "detail": (
                            "Customer credit allocation "
                            "was not found."
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

        allocation = (
            reverse_customer_credit_allocation(
                company=company,
                allocation=allocation,
                reason=reason,
                user=user,
            )
        )

        data = serialize_customer_credit_allocation(
            allocation
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Customer credit allocation "
                    "reversed successfully."
                ),
                "allocation": data,
                "data": data,
            },
            status=200,
        )

    except CustomerCreditAPIError as exc:
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
                    "Customer credit allocation "
                    "could not be reversed."
                ),
                "errors": validation_error_payload(
                    exc
                ),
            },
            status=400,
        )


company_customer_credit_allocation_reverse.required_company_permissions = [
    "company.sales.customer_credits.reverse",
]
