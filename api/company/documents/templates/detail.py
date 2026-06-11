# ============================================================
# 📂 api/company/documents/templates/detail.py
# 🧠 PrimeyAcc | Company Document Templates Detail/Update API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission, require_company_permission
from documents.services import (
    get_company_document_template_or_raise,
    update_document_template,
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


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def company_document_template_detail(request, template_id: int):
    company = request.company

    if request.method == "GET":
        try:
            template = get_company_document_template_or_raise(
                company=company,
                template_id=template_id,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(serialize_document_template(template))

    if not require_company_permission(
        request,
        "company.documents.templates.update",
    ):
        return Response(
            {"detail": "You do not have permission to update document templates."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        template = update_document_template(
            company=company,
            template_id=template_id,
            user=request.user,
            data=request.data,
        )
    except ValidationError as exc:
        return _validation_error_response(exc)

    return Response(serialize_document_template(template))


company_document_template_detail.required_company_permissions = [
    "company.documents.templates.view",
    "company.documents.templates.update",
]
