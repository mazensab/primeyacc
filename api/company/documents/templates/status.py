# ============================================================
# 📂 api/company/documents/templates/status.py
# 🧠 Mhamcloud | Company Document Templates Status API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from documents.services import (
    activate_document_template,
    deactivate_document_template,
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


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_document_template_activate(request, template_id: int):
    try:
        template = activate_document_template(
            company=request.company,
            template_id=template_id,
            user=request.user,
        )
    except ValidationError as exc:
        return _validation_error_response(exc)

    return Response(serialize_document_template(template))


company_document_template_activate.required_company_permissions = [
    "company.documents.templates.update",
]


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_document_template_deactivate(request, template_id: int):
    try:
        template = deactivate_document_template(
            company=request.company,
            template_id=template_id,
            user=request.user,
        )
    except ValidationError as exc:
        return _validation_error_response(exc)

    return Response(serialize_document_template(template))


company_document_template_deactivate.required_company_permissions = [
    "company.documents.templates.update",
]
