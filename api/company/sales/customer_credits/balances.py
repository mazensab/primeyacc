# ============================================================
# api/company/sales/customer_credits/balances.py
# Mhamcloud | Customer Credit Balances API
# ============================================================

from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from parties.models import BusinessParty
from sales.models import CustomerCreditBalance
from sales.services import (
    refresh_customer_credit_balance,
    serialize_customer_credit_balance,
)

from ._shared import (
    CustomerCreditAPIError,
    company_payload,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_customer_credit_balances(
    request: Request,
) -> Response:
    """
    List customer credit balances for the current company.
    """
    try:
        company = get_request_company(request)

        customer_id = request.query_params.get(
            "customer_id"
        )

        currency_code = str(
            request.query_params.get(
                "currency_code",
                "",
            )
            or ""
        ).strip().upper()

        search = str(
            request.query_params.get("q", "")
            or ""
        ).strip()

        if customer_id:
            customer = (
                BusinessParty.objects
                .filter(
                    company=company,
                    id=customer_id,
                )
                .first()
            )

            if not customer:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Customer was not found."
                        ),
                        "errors": {
                            "customer": (
                                "Customer was not found."
                            ),
                        },
                    },
                    status=404,
                )

            refresh_customer_credit_balance(
                company=company,
                customer=customer,
                currency_code=(
                    currency_code
                    or company.currency_code
                    or "SAR"
                ),
            )

        queryset = (
            CustomerCreditBalance.objects
            .select_related(
                "customer",
                "company",
            )
            .filter(company=company)
            .order_by(
                "customer__display_name",
                "currency_code",
                "id",
            )
        )

        if customer_id:
            queryset = queryset.filter(
                customer_id=customer_id
            )

        if currency_code:
            queryset = queryset.filter(
                currency_code=currency_code
            )

        if search:
            queryset = queryset.filter(
                Q(
                    customer__display_name__icontains=(
                        search
                    )
                )
                | Q(
                    customer__legal_name__icontains=(
                        search
                    )
                )
                | Q(
                    customer__code__icontains=search
                )
            )

        results = [
            serialize_customer_credit_balance(
                balance
            )
            for balance in queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "count": len(results),
                "results": results,
                "data": results,
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


company_customer_credit_balances.required_company_permissions = [
    "company.sales.customer_credits.view",
]
