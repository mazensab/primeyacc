# ============================================================
# 📂 api/company/documents/thermal.py
# 🧠 Mhamcloud | Company Thermal Document API V1.0
# ------------------------------------------------------------
# ✅ Thermal receipt HTML response
# ✅ 58mm / 80mm support
# ✅ POS receipt-ready foundation
# ✅ Company-scoped source resolution
# ============================================================

from __future__ import annotations

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
def company_document_thermal(request: Request):
    """
    Return thermal print-ready HTML.
    """
    try:
        company = get_request_company(request)
        payload = get_request_payload(request)
        payload["output_format"] = "THERMAL"

        render_request = normalize_document_render_request(payload)
        result = build_document_response_payload(
            company=company,
            request_data=render_request,
        )

        if str(payload.get("as_json") or "").lower() in ["1", "true", "yes"]:
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Thermal document HTML built successfully.",
                    "html": result["html"],
                    "filename": result["filename"],
                    "render": result["render"],
                },
                status=200,
            )

        response = HttpResponse(
            result["html"],
            content_type="text/html; charset=utf-8",
        )
        response["X-Mhamcloud-Document-Filename"] = result["filename"]
        return response

    except CompanyDocumentsAPIError as exc:
        return error_response(str(exc))

    except ValidationError as exc:
        return validation_error_response(exc)


company_document_thermal.required_company_permissions = [
    "company.documents.templates.view",
]
