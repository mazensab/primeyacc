# ============================================================
# api/company/reports/export.py
# Mhamcloud | Company Reports Export API - Phase 16.7
# ------------------------------------------------------------
# Unified report export endpoint
# JSON/CSV foundation
# PDF/Excel registered placeholders
# Company tenant isolation via CompanyMembership
# Permission protected
# No frontend company_id trust
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from reports.exporters import ReportExportError, build_report_export_result
from reports.financial import (
    FinancialReportError,
    build_balance_sheet_report,
    build_cash_flow_report,
    build_general_ledger_report,
    build_profit_loss_report,
    build_trial_balance_report,
)
from reports.services import get_reports_overview


def _build_report_payload(company, report_type: str, params):
    if report_type == "overview":
        return get_reports_overview(company)

    if report_type == "trial_balance":
        return build_trial_balance_report(
            company,
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
            include_zero=params.get("include_zero", "false"),
        )

    if report_type == "general_ledger":
        return build_general_ledger_report(
            company,
            account_id=params.get("account_id"),
            account_code=params.get("account_code"),
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
            include_opening=params.get("include_opening", "true"),
        )

    if report_type == "profit_loss":
        return build_profit_loss_report(
            company,
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
            include_zero=params.get("include_zero", "false"),
        )

    if report_type == "balance_sheet":
        return build_balance_sheet_report(
            company,
            date_to=params.get("date_to"),
            include_zero=params.get("include_zero", "false"),
        )

    if report_type == "cash_flow":
        return build_cash_flow_report(
            company,
            date_from=params.get("date_from"),
            date_to=params.get("date_to"),
        )

    raise ValidationError(
        {
            "report": "Unsupported report type.",
        }
    )


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def export_report(request):
    """
    GET /api/company/reports/export/

    Query params:
    - report=overview|trial_balance|general_ledger|profit_loss|balance_sheet|cash_flow
    - export_format=json|csv|pdf|excel
    - plus each report filter, such as date_from/date_to/account_code/include_zero
    """
    try:
        company = getattr(request, "company", None)

        report_type = str(request.query_params.get("report", "")).strip().lower().replace("-", "_")
        export_format = request.query_params.get("export_format") or request.query_params.get("format", "json")

        report_payload = _build_report_payload(
            company,
            report_type,
            request.query_params,
        )

        result = build_report_export_result(
            company=company,
            report_type=report_type,
            export_format=export_format,
            report_payload=report_payload,
        )

        if result.export_format == "csv":
            response = HttpResponse(
                result.payload,
                content_type=result.content_type,
                status=200,
            )
            response["Content-Disposition"] = f'attachment; filename="{result.filename}"'
            return response

        return Response(
            {
                "success": True,
                "company": {
                    "id": company.pk,
                    "name": getattr(company, "display_name", str(company)),
                },
                "export": {
                    "report": result.report_type,
                    "format": result.export_format,
                    "filename": result.filename,
                    "content_type": result.content_type,
                    "generated_at": result.generated_at,
                },
                "payload": result.payload,
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

    except (FinancialReportError, ReportExportError) as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )


export_report.required_company_permissions = [
    "company.reports.view",
]
