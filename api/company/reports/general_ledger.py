# ============================================================
# 📂 api/company/reports/general_ledger.py
# 🧠 PrimeyAcc | Company General Ledger API - Phase 16.3
# ------------------------------------------------------------
# ✅ General ledger report endpoint
# ✅ Company tenant isolation via CompanyMembership
# ✅ Permission protected
# ✅ Uses posted journal entries only
# ✅ No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from reports.financial import FinancialReportError, build_general_ledger_report


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def general_ledger_report(request):
    """
    GET /api/company/reports/general-ledger/

    Query params:
    - account_id=<id>
    - account_code=<code>
    - date_from=YYYY-MM-DD
    - date_to=YYYY-MM-DD
    - include_opening=true|false
    """
    try:
        company = getattr(request, "company", None)

        payload = build_general_ledger_report(
            company,
            account_id=request.query_params.get("account_id"),
            account_code=request.query_params.get("account_code"),
            date_from=request.query_params.get("date_from"),
            date_to=request.query_params.get("date_to"),
            include_opening=request.query_params.get("include_opening", "true"),
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


general_ledger_report.required_company_permissions = [
    "company.reports.view",
]