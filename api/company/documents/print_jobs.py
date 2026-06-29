# ============================================================
# 📂 api/company/documents/print_jobs.py
# 🧠 Mhamcloud | Company Print Jobs Foundation API V1.0
# ------------------------------------------------------------
# ✅ Print options endpoint
# ✅ Foundation for future stored print jobs
# ✅ No database writes in Phase 24
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from documents.rendering import supported_document_rendering_options

from ._shared import CompanyDocumentsAPIError, error_response, get_request_company


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_document_print_jobs(request: Request) -> Response:
    """
    Return supported document printing options.

    Future phases can turn this into persisted print jobs.
    """
    try:
        company = get_request_company(request)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Document print options loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "options": supported_document_rendering_options(),
                "results": [],
            },
            status=200,
        )

    except CompanyDocumentsAPIError as exc:
        return error_response(str(exc))


company_document_print_jobs.required_company_permissions = [
    "company.documents.templates.view",
]
