from __future__ import annotations

from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from sales.models import SalesQuotation
from sales.services import serialize_sales_quotation

from .common import (
    api_error,
    require_company_permission,
)


@require_GET
def sales_quotations_list(request):
    membership, error = require_company_permission(
        request,
        "company.sales.quotations.view",
    )

    if error:
        return error

    queryset = (
        SalesQuotation.objects
        .select_related(
            "branch",
            "customer",
        )
        .filter(
            company=membership.company,
        )
    )

    status_value = request.GET.get(
        "status",
        "",
    ).strip()

    branch_id = request.GET.get(
        "branch_id",
        "",
    ).strip()

    customer_id = request.GET.get(
        "customer_id",
        "",
    ).strip()

    date_from = request.GET.get(
        "date_from",
        "",
    ).strip()

    date_to = request.GET.get(
        "date_to",
        "",
    ).strip()

    search = request.GET.get(
        "q",
        "",
    ).strip()

    if status_value:
        queryset = queryset.filter(
            status=status_value,
        )

    if branch_id:
        queryset = queryset.filter(
            branch_id=branch_id,
        )

    if customer_id:
        queryset = queryset.filter(
            customer_id=customer_id,
        )

    if date_from:
        queryset = queryset.filter(
            quotation_date__gte=date_from,
        )

    if date_to:
        queryset = queryset.filter(
            quotation_date__lte=date_to,
        )

    if search:
        queryset = queryset.filter(
            Q(
                quotation_number__icontains=search
            )
            | Q(
                customer__display_name__icontains=search
            )
            | Q(
                customer__code__icontains=search
            )
            | Q(
                public_notes__icontains=search
            )
        )

    try:
        limit = min(
            max(
                int(request.GET.get("limit", 100)),
                1,
            ),
            500,
        )
        offset = max(
            int(request.GET.get("offset", 0)),
            0,
        )
    except ValueError:
        return api_error(
            "limit and offset must be integers.",
            status=400,
        )

    count = queryset.count()

    quotations = queryset.order_by(
        "-quotation_date",
        "-id",
    )[offset:offset + limit]

    results = [
        serialize_sales_quotation(
            quotation,
            include_items=False,
        )
        for quotation in quotations
    ]

    return JsonResponse(
        {
            "success": True,
            "company": {
                "id": membership.company_id,
                "name": membership.company.display_name,
            },
            "count": count,
            "limit": limit,
            "offset": offset,
            "results": results,
        }
    )
