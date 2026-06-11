# ============================================================
# 📂 reports/services.py
# 🧠 PrimeyAcc | Reports Services - Phase 16.1
# ------------------------------------------------------------
# ✅ Reports foundation overview
# ✅ Tenant-safe company input
# ✅ No frontend company_id trust
# ✅ No database models in this step
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.utils import timezone


class ReportsServiceError(Exception):
    """Base reports service error."""


def _validate_company(company: Any) -> None:
    if not company:
        raise ValidationError("الشركة مطلوبة.")


def get_reports_overview(company: Any) -> dict[str, Any]:
    """
    Return basic reports module overview for the current company.

    This is the first stable endpoint for Phase 16.
    It does not calculate financial statements yet.
    Financial reports will be added gradually in the next parts.
    """
    _validate_company(company)

    return {
        "module": "reports",
        "phase": "16.1",
        "status": "ready",
        "company_id": company.pk,
        "generated_at": timezone.now().isoformat(),
        "available_reports": [
            {
                "key": "trial_balance",
                "name": "ميزان المراجعة",
                "endpoint": "/api/company/reports/trial-balance/",
                "status": "planned",
            },
            {
                "key": "general_ledger",
                "name": "دفتر الأستاذ",
                "endpoint": "/api/company/reports/general-ledger/",
                "status": "planned",
            },
            {
                "key": "profit_and_loss",
                "name": "قائمة الدخل",
                "endpoint": "/api/company/reports/profit-and-loss/",
                "status": "planned",
            },
            {
                "key": "balance_sheet",
                "name": "قائمة المركز المالي",
                "endpoint": "/api/company/reports/balance-sheet/",
                "status": "planned",
            },
            {
                "key": "cash_flow",
                "name": "قائمة التدفقات النقدية",
                "endpoint": "/api/company/reports/cash-flow/",
                "status": "planned",
            },
        ],
    }