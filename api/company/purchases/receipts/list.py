from __future__ import annotations

from django.db.models import Q
from rest_framework.decorators import (
    api_view,
    permission_classes,
)
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from purchases.models import (
    PurchaseReceipt,
    PurchaseReceiptStatus,
)
from purchases.services import (
    serialize_purchase_receipt,
)

from ._shared import (
    PurchaseReceiptAPIError,
    company_payload,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_purchase_receipts_list(
    request: Request,
) -> Response:
    try:
        company = get_request_company(request)

        queryset = (
            PurchaseReceipt.objects
            .select_related(
                "company",
                "branch",
                "supplier",
                "bill",
                "warehouse",
            )
            .filter(company=company)
            .order_by(
                "-receipt_date",
                "-id",
            )
        )

        search = str(
            request.query_params.get("q")
            or request.query_params.get("search")
            or ""
        ).strip()

        status_value = str(
            request.query_params.get("status")
            or ""
        ).strip().upper()

        supplier_id = request.query_params.get(
            "supplier_id"
        )
        bill_id = request.query_params.get(
            "bill_id"
        )
        branch_id = request.query_params.get(
            "branch_id"
        )
        warehouse_id = request.query_params.get(
            "warehouse_id"
        )
        date_from = request.query_params.get(
            "date_from"
        )
        date_to = request.query_params.get(
            "date_to"
        )

        if search:
            queryset = queryset.filter(
                Q(receipt_number__icontains=search)
                | Q(
                    bill__bill_number__icontains=search
                )
                | Q(
                    bill__supplier_bill_number__icontains=(
                        search
                    )
                )
                | Q(
                    supplier__display_name__icontains=(
                        search
                    )
                )
                | Q(
                    warehouse__name__icontains=search
                )
                | Q(
                    warehouse__code__icontains=search
                )
                | Q(notes__icontains=search)
            )

        if status_value:
            queryset = queryset.filter(
                status=status_value
            )

        if supplier_id:
            queryset = queryset.filter(
                supplier_id=supplier_id
            )

        if bill_id:
            queryset = queryset.filter(
                bill_id=bill_id
            )

        if branch_id:
            queryset = queryset.filter(
                branch_id=branch_id
            )

        if warehouse_id:
            queryset = queryset.filter(
                warehouse_id=warehouse_id
            )

        if date_from:
            queryset = queryset.filter(
                receipt_date__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                receipt_date__lte=date_to
            )

        results = [
            serialize_purchase_receipt(
                receipt,
                include_items=False,
            )
            for receipt in queryset
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "company": company_payload(company),
                "count": len(results),
                "results": results,
                "items": results,
                "choices": {
                    "statuses": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in PurchaseReceiptStatus.choices
                    ],
                },
            },
            status=200,
        )

    except PurchaseReceiptAPIError as exc:
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


company_purchase_receipts_list.required_company_permissions = [
    "company.purchases.receipts.view",
]
