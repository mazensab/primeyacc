# ============================================================
# 📂 api/company/documents/pdf.py
# 🧠 PrimeyAcc | Company Document PDF API V1.0
# ------------------------------------------------------------
# ✅ Minimal PDF document response
# ✅ Dependency-free foundation
# ✅ Company-scoped source resolution
# ============================================================

from __future__ import annotations

import base64

from django.core.exceptions import ValidationError
from django.http import HttpResponse
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
def company_document_pdf(request: Request):
    """
    Return a PDF file for a company document.
    """
    try:
        company = get_request_company(request)
        payload = get_request_payload(request)
        payload["output_format"] = "PDF"

        render_request = normalize_document_render_request(payload)
        result = build_document_response_payload(
            company=company,
            request_data=render_request,
        )

        pdf_bytes = base64.b64decode(result["pdf_base64"])

        if str(payload.get("as_json") or "").lower() in ["1", "true", "yes"]:
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "PDF document built successfully.",
                    "pdf_base64": result["pdf_base64"],
                    "filename": result["filename"],
                    "render": result["render"],
                },
                status=200,
            )

        response = HttpResponse(
            pdf_bytes,
            content_type="application/pdf",
        )
        response["Content-Disposition"] = f'inline; filename="{result["filename"]}"'
        response["X-PrimeyAcc-Document-Filename"] = result["filename"]
        return response

    except CompanyDocumentsAPIError as exc:
        return error_response(str(exc))

    except ValidationError as exc:
        return validation_error_response(exc)


company_document_pdf.required_company_permissions = [
    "company.documents.templates.view",
]
