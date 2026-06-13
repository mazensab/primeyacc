from __future__ import annotations

from django.core.paginator import (
    EmptyPage,
    PageNotAnInteger,
    Paginator,
)
from django.db.models import Q
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from sales.models import (
    SalesReturn,
    SalesReturnReason,
    SalesReturnStatus,
)
from sales.services import serialize_sales_return

from .common import (
    SalesReturnAPIError,
    clean_positive_int,
    clean_text,
    error_response,
    get_request_company,
)


def apply_filters(
    queryset,
    request: Request,
):
    """
    Apply safe return-list filters.
    """
    search = clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
    )
    status = clean_text(
        request.query_params.get("status")
    ).upper()
    reason = clean_text(
        request.query_params.get("reason")
    ).upper()
    invoice_id = clean_text(
        request.query_params.get("invoice_id")
    )
    customer_id = clean_text(
        request.query_params.get("customer_id")
    )
    branch_id = clean_text(
        request.query_params.get("branch_id")
    )
    date_from = clean_text(
        request.query_params.get("date_from")
    )
    date_to = clean_text(
        request.query_params.get("date_to")
    )

    if search:
        queryset = queryset.filter(
            Q(return_number__icontains=search)
            | Q(
                invoice__invoice_number__icontains=search
            )
            | Q(
                customer__display_name__icontains=search
            )
            | Q(customer__code__icontains=search)
            | Q(reason_details__icontains=search)
            | Q(public_notes__icontains=search)
            | Q(internal_notes__icontains=search)
        )

    if status:
        queryset = queryset.filter(
            status=status
        )

    if reason:
        queryset = queryset.filter(
            reason=reason
        )

    if invoice_id:
        queryset = queryset.filter(
            invoice_id=invoice_id
        )

    if customer_id:
        queryset = queryset.filter(
            customer_id=customer_id
        )

    if branch_id:
        queryset = queryset.filter(
            branch_id=branch_id
        )

    if date_from:
        queryset = queryset.filter(
            return_date__gte=date_from
        )

    if date_to:
        queryset = queryset.filter(
            return_date__lte=date_to
        )

    return queryset


def apply_ordering(
    queryset,
    ordering: str,
):
    """
    Apply only whitelisted ordering fields.
    """
    allowed = {
        "-return_date": "-return_date",
        "return_date": "return_date",
        "-created_at": "-created_at",
        "created_at": "created_at",
        "-total_amount": "-total_amount",
        "total_amount": "total_amount",
        "return_number": "return_number",
        "-return_number": "-return_number",
        "status": "status",
        "-status": "-status",
    }

    selected = allowed.get(
        ordering,
        "-return_date",
    )

    return queryset.order_by(
        selected,
        "-id",
    )


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_returns_list(
    request: Request,
) -> Response:
    """
    List company-scoped sales returns.
    """
    try:
        company = get_request_company(
            request
        )

        page = clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get(
                "per_page"
            ),
            default=25,
            maximum=100,
        )
        ordering = clean_text(
            request.query_params.get("ordering")
            or "-return_date"
        )

        queryset = (
            SalesReturn.objects
            .select_related(
                "company",
                "branch",
                "customer",
                "invoice",
                "return_warehouse",
            )
            .filter(
                company=company
            )
        )

        queryset = apply_filters(
            queryset,
            request,
        )
        queryset = apply_ordering(
            queryset,
            ordering,
        )

        paginator = Paginator(
            queryset,
            page_size,
        )

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(
                paginator.num_pages or 1
            )

        results = [
            serialize_sales_return(
                sales_return,
                include_items=False,
            )
            for sales_return
            in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Sales returns loaded "
                    "successfully."
                ),
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": (
                    page_obj.has_previous()
                ),
                "items": results,
                "results": results,
                "choices": {
                    "statuses": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in SalesReturnStatus.choices
                    ],
                    "reasons": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in SalesReturnReason.choices
                    ],
                },
            },
            status=200,
        )

    except SalesReturnAPIError as exc:
        return error_response(
            str(exc)
        )


company_sales_returns_list.required_company_permissions = [
    "company.sales.returns.view",
]
