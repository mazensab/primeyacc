# ============================================================
# 📂 api/company/pos/registers/detail.py
# 🧠 Mhamcloud | Company POS Registers Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve POS register details for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe register lookup inside current company
# ✅ Includes serialized register payload
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم عرض أي Register خارج شركة المستخدم الحالية
# - لا يتم تنفيذ فتح جلسة أو بيع أو تحصيل من detail API
# - صلاحية العرض المطلوبة: company.pos.registers.view
# ============================================================

from __future__ import annotations

from typing import Any

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSRegister

from .list import serialize_pos_register


class POSRegisterDetailAPIError(Exception):
    """
    Small API-level error for POS register detail endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSRegisterDetailAPIError("Current company context was not resolved.")

    return company


def _clean_positive_int(value: Any, field_name: str = "id") -> int:
    """
    Safely parse positive integer path params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise POSRegisterDetailAPIError(f"Invalid {field_name}.")

    if number < 1:
        raise POSRegisterDetailAPIError(f"Invalid {field_name}.")

    return number


def get_pos_register_for_company(company, register_id: Any) -> POSRegister:
    """
    Return POS register scoped to the current company only.
    """
    parsed_id = _clean_positive_int(register_id, "register id")

    register = (
        POSRegister.objects.select_related(
            "company",
            "branch",
            "warehouse",
            "treasury_account",
            "default_payment_method",
            "default_payment_terminal",
            "created_by",
            "updated_by",
        )
        .filter(
            company=company,
            id=parsed_id,
        )
        .first()
    )

    if not register:
        raise POSRegisterDetailAPIError("POS register was not found.")

    return register


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_register_detail(request: Request, register_id: int) -> Response:
    """
    GET /api/company/pos/registers/<register_id>/
    """
    try:
        company = _get_request_company(request)
        register = get_pos_register_for_company(company, register_id)
        serialized_register = serialize_pos_register(register)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS register loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_register,
                "result": serialized_register,
            },
            status=200,
        )

    except POSRegisterDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=404 if "not found" in str(exc).lower() else 400,
        )


pos_register_detail.required_company_permissions = [
    "company.pos.registers.view",
]