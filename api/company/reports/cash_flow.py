# ============================================================
# api/company/reports/cash_flow.py
# PrimeyAcc | Company Cash Flow API - Phase 16.6
# ------------------------------------------------------------
# Cash flow report endpoint
# Company tenant isolation via CompanyMembership
# Permission protected
# Uses posted journal entries only
# No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from reports.financial import FinancialReportError, build_cash_flow_report


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def cash_flow_report(request):
    """
    GET /api/company/reports/cash-flow/

    Query params:
    - date_from=YYYY-MM-DD
    - date_to=YYYY-MM-DD
    """
    try:
        company = getattr(request, "company", None)

        payload = build_cash_flow_report(
            company,
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
        )

        return Response(
            {
                "success": True,
                "company": {
                    "id": company.pk,
                    "name": getattr(company, "display_name", str(company)),
                },
                **payload,
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "success": False,
                "message": exc.message_dict if hasattr(exc, "message_dict") else str(exc),
            },
            status=400,
        )

    except FinancialReportError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


cash_flow_report.required_company_permissions = [
    "company.reports.view",
]
