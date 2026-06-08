# ============================================================
# 📂 api/company/treasury/summary.py
# 🧠 PrimeyAcc | Company Treasury Summary API V1.1
# ------------------------------------------------------------
# ✅ Treasury summary for current company only
# ✅ Tenant isolation through request.company
# ✅ Uses treasury/services.py summary layer
# ✅ Stable 2-decimal money formatting for frontend/API tests
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - الملخص يعرض أرقام الشركة الحالية فقط
# - منطق حساب الملخص يبقى داخل treasury/services.py
# - القيم المالية ترجع كنص بخانتين عشريتين مثل 150.00
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from treasury.services import get_treasury_summary


class TreasurySummaryAPIError(Exception):
    """
    Small API-level error for treasury summary endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise TreasurySummaryAPIError("Current company context was not resolved.")

    return company


def _decimal_dict_to_strings(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Convert Decimal values to fixed 2-decimal strings for stable JSON/frontend handling.
    """
    result: dict[str, Any] = {}

    for key, value in payload.items():
        if isinstance(value, Decimal):
            result[key] = str(value.quantize(Decimal("0.01")))
        elif hasattr(value, "quantize"):
            result[key] = str(Decimal(str(value)).quantize(Decimal("0.01")))
        else:
            result[key] = value

    return result


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def treasury_summary(request: Request) -> Response:
    """
    GET /api/company/treasury/summary/
    """
    try:
        company = _get_request_company(request)
        summary = get_treasury_summary(company)
        summary_payload = _decimal_dict_to_strings(summary.as_dict())

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Treasury summary loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                    "company_code": getattr(company, "company_code", ""),
                },
                "summary": summary_payload,
                "result": summary_payload,
            },
            status=200,
        )

    except TreasurySummaryAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )


treasury_summary.required_company_permissions = [
    "company.treasury.summary.view",
]