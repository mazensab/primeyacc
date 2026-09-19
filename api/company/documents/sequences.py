from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.company.branch_enforcement import scope_operational_queryset
from api.permissions import HasAnyCompanyPermission
from documents.models import DocumentSequence


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_document_sequences(request):
    queryset = DocumentSequence.objects.filter(company=request.company).select_related(
        "branch", "register"
    )
    queryset = scope_operational_queryset(
        queryset, request, branch_lookup="branch_id", include_unscoped=True
    )
    results = [
        {
            "id": sequence.id,
            "key": sequence.key,
            "scope": sequence.scope,
            "scope_key": sequence.scope_key,
            "branch_id": sequence.branch_id,
            "register_id": sequence.register_id,
            "prefix": sequence.prefix,
            "suffix": sequence.suffix,
            "padding": sequence.padding,
            "next_value": sequence.next_value,
            "is_active": sequence.is_active,
        }
        for sequence in queryset.order_by("key", "scope_key")
    ]
    return Response({"ok": True, "results": results})


company_document_sequences.required_company_permissions = [
    "company.documents.templates.view",
]
