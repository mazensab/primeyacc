# ============================================================
# 📂 api/company/categories/create.py
# 🧠 Mhamcloud | Company Catalog Categories Create API V1.1
# ------------------------------------------------------------
# ✅ Create company-scoped catalog category
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Validates parent category ownership
# ✅ Explicit serialization through catalog.services
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - أي parent_id يجب أن يكون تابعًا لنفس الشركة الحالية
# - هذا الملف مسؤول عن إنشاء تصنيف كتالوج فقط
# - صلاحية الإنشاء المطلوبة: company.categories.create
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    create_catalog_category,
    serialize_catalog_category,
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
def company_category_create(request: Request) -> Response:
    """
    Create catalog category for the current company only.

    Body fields:
    - parent_id optional
    - status optional
    - code optional
    - name required unless name_ar/name_en provided
    - name_ar optional
    - name_en optional
    - description optional
    - sort_order optional
    - notes optional
    - extra_data optional object
    """
    try:
        company = _get_request_company(request)

        category = create_catalog_category(
            company=company,
            data=request.data,
            user=request.user if request.user.is_authenticated else None,
        )

        item = serialize_catalog_category(category)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog category created successfully.",
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


company_category_create.required_company_permissions = [
    "company.categories.create",
]