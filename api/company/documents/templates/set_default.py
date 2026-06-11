# ============================================================
# 📂 api/company/documents/templates/set_default.py
# 🧠 PrimeyAcc | Company Document Templates Set Default API V1.0
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from documents.services import set_default_document_template

from .serializers import serialize_document_template


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_document_template_set_default(request, template_id: int):
    try:
        template = set_default_document_template(
            company=request.company,
            template_id=template_id,
            user=request.user,
        )
    except ValidationError as exc:
        return Response(
            {
                "detail": "Validation error.",
                "errors": getattr(exc, "message_dict", None) or exc.messages,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(serialize_document_template(template))


company_document_template_set_default.required_company_permissions = [
    "company.documents.templates.set_default",
]
