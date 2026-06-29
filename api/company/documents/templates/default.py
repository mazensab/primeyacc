# ============================================================
# 📂 api/company/documents/templates/default.py
# 🧠 Mhamcloud | Company Default Document Template API V1.0
# ============================================================

from __future__ import annotations

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from documents.models import DocumentType
from documents.services import get_default_document_template

from .serializers import serialize_document_template


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_default_document_template(request):
    document_type = request.query_params.get("document_type")

    allowed_types = {choice.value for choice in DocumentType}

    if not document_type:
        return Response(
            {"detail": "document_type is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if document_type not in allowed_types:
        return Response(
            {"detail": "Invalid document_type."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    template = get_default_document_template(
        company=request.company,
        document_type=document_type,
    )

    if not template:
        return Response(
            {"detail": "Default document template was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(serialize_document_template(template))


company_default_document_template.required_company_permissions = [
    "company.documents.templates.view",
]
