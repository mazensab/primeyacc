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
    SupplierDebitNote,
    SupplierDebitNoteStatus,
)
from purchases.services import (
    serialize_supplier_debit_note,
)

from ._shared import (
    SupplierDebitNoteAPIError,
    company_payload,
    get_request_company,
)


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_supplier_debit_notes_list(
    request: Request,
) -> Response:
    """
    List company-scoped supplier debit notes.
    """
    try:
        company = get_request_company(request)

        queryset = (
            SupplierDebitNote.objects
            .select_related(
                "company",
                "branch",
                "supplier",
                "bill",
                "purchase_return",
            )
            .filter(company=company)
            .order_by(
                "-debit_note_date",
                "-created_at",
                "-id",
            )
        )

        search = str(
            request.query_params.get("search")
            or request.query_params.get("q")
            or ""
        ).strip()

        status_value = str(
            request.query_params.get("status")
            or ""
        ).strip().upper()

        supplier_id = (
            request.query_params.get("supplier_id")
        )
        bill_id = request.query_params.get("bill_id")
        purchase_return_id = (
            request.query_params.get(
                "purchase_return_id"
            )
        )
        date_from = request.query_params.get(
            "date_from"
        )
        date_to = request.query_params.get(
            "date_to"
        )

        if search:
            queryset = queryset.filter(
                Q(
                    debit_note_number__icontains=search
                )
                | Q(
                    supplier_reference__icontains=search
                )
                | Q(
                    supplier__display_name__icontains=search
                )
                | Q(
                    supplier__legal_name__icontains=search
                )
                | Q(
                    bill__bill_number__icontains=search
                )
                | Q(
                    bill__supplier_bill_number__icontains=search
                )
                | Q(
                    purchase_return__return_number__icontains=search
                )
            )

        if status_value:
            valid_statuses = {
                value
                for value, _label
                in SupplierDebitNoteStatus.choices
            }

            if status_value not in valid_statuses:
                return Response(
                    {
                        "ok": False,
                        "success": False,
                        "message": (
                            "Invalid supplier debit note status."
                        ),
                        "errors": {
                            "status": (
                                "Invalid supplier debit note status."
                            ),
                        },
                    },
                    status=400,
                )

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

        if purchase_return_id:
            queryset = queryset.filter(
                purchase_return_id=purchase_return_id
            )

        if date_from:
            queryset = queryset.filter(
                debit_note_date__gte=date_from
            )

        if date_to:
            queryset = queryset.filter(
                debit_note_date__lte=date_to
            )

        results = [
            serialize_supplier_debit_note(
                debit_note,
                include_items=False,
            )
            for debit_note in queryset
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

    except SupplierDebitNoteAPIError as exc:
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


company_supplier_debit_notes_list.required_company_permissions = [
    "company.purchases.debit_notes.view",
]
