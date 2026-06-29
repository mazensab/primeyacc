# ============================================================
# 📂 api/company/documents/render.py
# 🧠 Mhamcloud | Company Document Render API V1.0
# ------------------------------------------------------------
# ✅ Render normalized document payload
# ✅ Supports preview and real source documents
# ✅ Company-scoped source resolution
# ✅ Protected by company document view permission
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from documents.rendering import (
    build_document_response_payload,
    normalize_document_render_request,
)

from ._shared import (
    CompanyDocumentsAPIError,
    error_response,
    get_request_company,
    get_request_payload,
    validation_error_response,
)


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_document_render(request: Request) -> Response:
    """
    Render a document payload for the current company.
    """
    try:
        company = get_request_company(request)
        payload = get_request_payload(request)
        payload["output_format"] = "PAYLOAD"

        render_request = normalize_document_render_request(payload)
        result = build_document_response_payload(
            company=company,
            request_data=render_request,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Document render payload built successfully.",
                "result": result["render"],
                "render": result["render"],
                "filename": result["filename"],
            },
            status=200,
        )

    except CompanyDocumentsAPIError as exc:
        return error_response(str(exc))

    except ValidationError as exc:
        return validation_error_response(exc)


company_document_render.required_company_permissions = [
    "company.documents.templates.view",
]
