# ============================================================
# reports/services.py
# Mhamcloud | Reports Services - Phase 16.8
# ------------------------------------------------------------
# Reports foundation overview
# Tenant-safe company input
# No frontend company_id trust
# Financial reports registry
# Export foundation registry
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone


class ReportsServiceError(Exception):
    """Base reports service error."""


def _validate_company(company: Any) -> None:
    if not company:
        raise ValidationError("Company is required.")


def get_reports_overview(company: Any) -> dict[str, Any]:
    """
    Return reports module overview for the current company.

    This endpoint is tenant-safe and does not trust frontend company_id.
    """
    _validate_company(company)

    available_reports = [
        {
            "key": "trial_balance",
            "name": "Trial Balance",
            "name_ar": "ميزان المراجعة",
            "endpoint": "/api/company/reports/trial-balance/",
            "export_endpoint": "/api/company/reports/export/?report=trial_balance",
            "status": "ready",
            "phase": "16.2",
        },
        {
            "key": "general_ledger",
            "name": "General Ledger",
            "name_ar": "دفتر الأستاذ",
            "endpoint": "/api/company/reports/general-ledger/",
            "export_endpoint": "/api/company/reports/export/?report=general_ledger",
            "status": "ready",
            "phase": "16.3",
        },
        {
            "key": "profit_loss",
            "name": "Profit & Loss",
            "name_ar": "قائمة الدخل",
            "endpoint": "/api/company/reports/profit-loss/",
            "export_endpoint": "/api/company/reports/export/?report=profit_loss",
            "status": "ready",
            "phase": "16.4",
        },
        {
            "key": "balance_sheet",
            "name": "Balance Sheet",
            "name_ar": "الميزانية العمومية",
            "endpoint": "/api/company/reports/balance-sheet/",
            "export_endpoint": "/api/company/reports/export/?report=balance_sheet",
            "status": "ready",
            "phase": "16.5",
        },
        {
            "key": "cash_flow",
            "name": "Cash Flow",
            "name_ar": "قائمة التدفقات النقدية",
            "endpoint": "/api/company/reports/cash-flow/",
            "export_endpoint": "/api/company/reports/export/?report=cash_flow",
            "status": "ready",
            "phase": "16.6",
        },
    ]

    return {
        "module": "reports",
        "phase": "16.1",
        "current_phase": "16.8",
        "status": "ready",
        "company_id": company.pk,
        "generated_at": timezone.now().isoformat(),
        "available_reports": available_reports,
        "export": {
            "endpoint": "/api/company/reports/export/",
            "supported_formats": ["json", "csv"],
            "registered_future_formats": ["pdf", "excel"],
            "format_query_param": "export_format",
            "supported_reports": [report["key"] for report in available_reports],
        },
    }
