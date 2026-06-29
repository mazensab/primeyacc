# ============================================================
# api/company/sales/customer_credits/detail.py
# Mhamcloud | Customer Credit Allocation Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.services import (
    serialize_customer_credit_allocation,
)

from ._shared import (
    CustomerCreditAPIError,
    company_payload,
    get_company_allocation,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_customer_credit_allocation_detail(
    request: Request,
    allocation_id: int,
) -> Response:
    """
    Return one company-scoped customer credit allocation.
    """
    try:
        company = get_request_company(request)

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

        data = serialize_customer_credit_allocation(
            allocation
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
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


company_customer_credit_allocation_detail.required_company_permissions = [
    "company.sales.customer_credits.allocations.view",
]
