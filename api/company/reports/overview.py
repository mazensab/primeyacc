# ============================================================
# 📂 api/company/reports/overview.py
# 🧠 PrimeyAcc | Company Reports Overview API - Phase 16.1
# ------------------------------------------------------------
# ✅ Reports module readiness endpoint
# ✅ Company tenant isolation via CompanyMembership
# ✅ Permission protected
# ✅ No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from reports.services import ReportsServiceError, get_reports_overview


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def reports_overview(request):
    """
    GET /api/company/reports/

    Returns Reports module readiness and planned financial reports.
    """
    try:
        company = getattr(request, "company", None)

        overview = get_reports_overview(company)

        return Response(
            {
                "success": True,
                "company": {
                    "id": company.pk,
                    "name": getattr(company, "display_name", str(company)),
                },
                "overview": overview,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    except ReportsServiceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


reports_overview.required_company_permissions = [
    "company.reports.view",
]