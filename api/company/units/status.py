# ============================================================
# 📂 api/company/units/status.py
# 🧠 PrimeyAcc | Company Catalog Units Status API V1.1
# ------------------------------------------------------------
# ✅ Change company-scoped catalog unit status
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Prevent access to another company's unit
# ✅ Explicit serialization through catalog.services
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يمكن تغيير حالة وحدة تابعة لشركة أخرى
# - هذا الملف مسؤول فقط عن تغيير حالة الوحدة
# - صلاحية التعديل المطلوبة: company.units.update
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    get_company_unit_or_raise,
    serialize_catalog_unit,
    set_catalog_unit_status,
)


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise CatalogServiceError("Current company context was not resolved.")

    return company


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def company_unit_status(request: Request, unit_id: int) -> Response:
    """
    Change one catalog unit status for the current company only.

    Body:
    - status: ACTIVE | INACTIVE | ARCHIVED
    """
    try:
        company = _get_request_company(request)

        unit = get_company_unit_or_raise(
            company=company,
            unit_id=unit_id,
        )

        status_value = request.data.get("status")

        unit = set_catalog_unit_status(
            unit=unit,
            status=status_value,
            user=request.user if request.user.is_authenticated else None,
        )

        item = serialize_catalog_unit(unit)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog unit status updated successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "item": item,
                "data": item,
            },
            status=200,
        )

    except CatalogServiceError as exc:
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


company_unit_status.required_company_permissions = [
    "company.units.update",
]