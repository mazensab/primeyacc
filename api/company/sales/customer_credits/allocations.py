# ============================================================
# api/company/sales/customer_credits/allocations.py
# PrimeyAcc | Customer Credit Allocations List API
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
from sales.models import (
    CustomerCreditAllocation,
    CustomerCreditAllocationStatus,
)
from sales.services import (
    serialize_customer_credit_allocation,
)

from ._shared import (
    CustomerCreditAPIError,
    company_payload,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_customer_credit_allocations(
    request: Request,
) -> Response:
    """
    List customer credit allocations for the current company.
    """
    try:
        company = get_request_company(request)

        queryset = (
            CustomerCreditAllocation.objects
            .select_related(
                "company",
                "customer",
                "credit_note",
                "invoice",
                "created_by",
                "reversed_by",
            )
            .filter(company=company)
            .order_by(
                "-allocated_at",
                "-id",
            )
        )

        search = str(
            request.query_params.get("q", "")
            or ""
        ).strip()

        status_value = str(
            request.query_params.get("status", "")
            or ""
        ).strip().upper()

        customer_id = request.query_params.get(
            "customer_id"
        )
        credit_note_id = request.query_params.get(
            "credit_note_id"
        )
        invoice_id = request.query_params.get(
            "invoice_id"
        )

        if search:
            queryset = queryset.filter(
                Q(
                    credit_note__credit_note_number__icontains=(
                        search
                    )
                )
                | Q(
                    invoice__invoice_number__icontains=(
                        search
                    )
                )
                | Q(
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

        valid_statuses = {
            choice[0]
            for choice in (
                CustomerCreditAllocationStatus.choices
            )
        }

        if status_value:
            if status_value not in valid_statuses:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Invalid allocation status."
                        ),
                        "errors": {
                            "status": (
                                "Invalid allocation status."
                            ),
                        },
                    },
                    status=400,
                )

            queryset = queryset.filter(
                status=status_value
            )

        if customer_id:
            queryset = queryset.filter(
                customer_id=customer_id
            )

        if credit_note_id:
            queryset = queryset.filter(
                credit_note_id=credit_note_id
            )

        if invoice_id:
            queryset = queryset.filter(
                invoice_id=invoice_id
            )

        results = [
            serialize_customer_credit_allocation(
                allocation
            )
            for allocation in queryset
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


company_customer_credit_allocations.required_company_permissions = [
    "company.sales.customer_credits.allocations.view",
]
