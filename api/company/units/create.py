# ============================================================
# 📂 api/company/units/create.py
# 🧠 PrimeyAcc | Company Catalog Units Create API V1.1
# ------------------------------------------------------------
# ✅ Create company-scoped catalog unit
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Explicit serialization through catalog.services
# ✅ Safe unit validation through services
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - هذا الملف مسؤول عن إنشاء وحدة كتالوج فقط
# - كل وحدة تكون داخل نطاق الشركة الحالية فقط
# - صلاحية الإنشاء المطلوبة: company.units.create
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    create_catalog_unit,
    serialize_catalog_unit,
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


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_unit_create(request: Request) -> Response:
    """
    Create catalog unit for the current company only.

    Body fields:
    - status optional
    - code optional
    - name required unless name_ar/name_en/symbol provided
    - name_ar optional
    - name_en optional
    - symbol optional
    - decimal_places optional
    - is_default optional
    - notes optional
    - extra_data optional object
    """
    try:
        company = _get_request_company(request)

        unit = create_catalog_unit(
            company=company,
            data=request.data,
            user=request.user if request.user.is_authenticated else None,
        )

        item = serialize_catalog_unit(unit)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog unit created successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "item": item,
                "data": item,
            },
            status=201,
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


company_unit_create.required_company_permissions = [
    "company.units.create",
]