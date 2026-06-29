# ============================================================
# ?? api/company/inventory/reservations/list.py
# ?? Mhamcloud | Stock Reservations List API V1.0
# ------------------------------------------------------------
# ? Current-company reservation list
# ? Search, status, source, and sales order filters
# ? Pagination and safe ordering
# ? Tenant isolation
# ============================================================

from __future__ import annotations

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from inventory.models import (
    StockReservation,
    StockReservationSource,
    StockReservationStatus,
)

from .common import (
    StockReservationAPIError,
    clean_positive_int,
    clean_text,
    get_request_company,
)
from .serializers import serialize_stock_reservation


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def stock_reservations_list(request):
    try:
        company = get_request_company(request)

        page = clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = clean_positive_int(
            request.query_params.get("page_size"),
            default=25,
            maximum=100,
        )

        search = clean_text(
            request.query_params.get("search")
            or request.query_params.get("q")
        )
        status = clean_text(
            request.query_params.get("status")
        ).upper()
        source = clean_text(
            request.query_params.get("source")
        ).upper()
        sales_order_id = clean_text(
            request.query_params.get("sales_order_id")
        )
        ordering = clean_text(
            request.query_params.get("ordering")
            or "-created_at"
        )

        queryset = (
            StockReservation.objects
            .filter(company=company)
            .select_related(
                "company",
                "sales_order",
                "sales_order__branch",
                "created_by",
                "updated_by",
                "allocated_by",
                "cancelled_by",
            )
        )

        if search:
            queryset = queryset.filter(
                Q(reservation_number__icontains=search)
                | Q(
                    sales_order__order_number__icontains=search
                )
                | Q(notes__icontains=search)
            )

        if status:
            queryset = queryset.filter(status=status)

        if source:
            queryset = queryset.filter(source=source)

        if sales_order_id:
            queryset = queryset.filter(
                sales_order_id=sales_order_id
            )

        ordering_map = {
            "created_at": "created_at",
            "-created_at": "-created_at",
            "reservation_number": "reservation_number",
            "-reservation_number": "-reservation_number",
            "status": "status",
            "-status": "-status",
            "expires_at": "expires_at",
            "-expires_at": "-expires_at",
        }

        queryset = queryset.order_by(
            ordering_map.get(ordering, "-created_at"),
            "-id",
        )

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(
                paginator.num_pages or 1
            )

        results = [
            serialize_stock_reservation(reservation)
            for reservation in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": (
                    "Stock reservations loaded successfully."
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
                "has_previous": page_obj.has_previous(),
                "items": results,
                "results": results,
                "choices": {
                    "statuses": [
                        {"value": value, "label": label}
                        for value, label
                        in StockReservationStatus.choices
                    ],
                    "sources": [
                        {"value": value, "label": label}
                        for value, label
                        in StockReservationSource.choices
                    ],
                },
            },
            status=200,
        )

    except StockReservationAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": [str(exc)]},
            },
            status=400,
        )


stock_reservations_list.required_company_permissions = [
    "company.inventory.reservations.view",
]
