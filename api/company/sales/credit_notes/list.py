# ============================================================
# ?? api/company/sales/credit_notes/list.py
# ?? PrimeyAcc | Company Sales Credit Notes List API
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
    SalesCreditNote,
    SalesCreditNoteStatus,
)
from sales.services import (
    serialize_sales_credit_note,
)

from ._shared import (
    SalesCreditNoteAPIError,
    company_payload,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_sales_credit_notes_list(
    request: Request,
) -> Response:
    """
    List credit notes for the current company only.
    """
    try:
        company = get_request_company(request)

        queryset = (
            SalesCreditNote.objects
            .select_related(
                "branch",
                "customer",
                "invoice",
                "sales_return",
            )
            .filter(company=company)
            .order_by(
                "-credit_note_date",
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

        date_from = str(
            request.query_params.get(
                "date_from",
                "",
            )
            or ""
        ).strip()

        date_to = str(
            request.query_params.get(
                "date_to",
                "",
            )
            or ""
        ).strip()

        invoice_id = request.query_params.get(
            "invoice_id"
        )

        sales_return_id = (
            request.query_params.get(
                "sales_return_id"
            )
        )

        if search:
            queryset = queryset.filter(
                Q(
                    credit_note_number__icontains=(
                        search
                    )
                )
                | Q(
                    invoice__invoice_number__icontains=(
                        search
                    )
                )
                | Q(
                    sales_return__return_number__icontains=(
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
                SalesCreditNoteStatus.choices
            )
        }

        if status_value:
            if status_value not in valid_statuses:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Invalid credit note status."
                        ),
                        "errors": {
                            "status": (
                                "Invalid credit note status."
                            ),
                        },
                    },
                    status=400,
                )

            queryset = queryset.filter(
                status=status_value
            )

        if date_from:
            queryset = queryset.filter(
                credit_note_date__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                credit_note_date__lte=date_to
            )

        if invoice_id:
            queryset = queryset.filter(
                invoice_id=invoice_id
            )

        if sales_return_id:
            queryset = queryset.filter(
                sales_return_id=sales_return_id
            )

        results = [
            serialize_sales_credit_note(
                credit_note,
                include_items=False,
            )
            for credit_note in queryset
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

    except SalesCreditNoteAPIError as exc:
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


company_sales_credit_notes_list.required_company_permissions = [
    "company.sales.credit_notes.view",
]
