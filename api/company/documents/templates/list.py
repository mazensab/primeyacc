# ============================================================
# 📂 api/company/documents/templates/list.py
# 🧠 Mhamcloud | Company Document Templates List/Create API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission, require_company_permission
from documents.services import (
    create_document_template,
    get_company_document_templates,
)

from .serializers import serialize_document_template


def _validation_error_response(exc: ValidationError) -> Response:
    return Response(
        {
            "detail": "Validation error.",
            "errors": getattr(exc, "message_dict", None) or exc.messages,
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_document_templates(request):
    company = request.company

    if request.method == "GET":
        document_type = request.query_params.get("document_type")
        is_active_raw = request.query_params.get("is_active")

        is_active = None
        if is_active_raw in ["true", "True", "1"]:
            is_active = True
        elif is_active_raw in ["false", "False", "0"]:
            is_active = False

        templates = get_company_document_templates(
            company=company,
            document_type=document_type,
            is_active=is_active,
        )

        return Response(
            {
                "results": [
                    serialize_document_template(template)
                    for template in templates
                ]
            }
        )

    if not require_company_permission(
        request,
        "company.documents.templates.create",
    ):
        return Response(
            {"detail": "You do not have permission to create document templates."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        template = create_document_template(
            company=company,
            user=request.user,
            data=request.data,
        )
    except ValidationError as exc:
        return _validation_error_response(exc)

    return Response(
        serialize_document_template(template),
        status=status.HTTP_201_CREATED,
    )


company_document_templates.required_company_permissions = [
    "company.documents.templates.view",
    "company.documents.templates.create",
]
