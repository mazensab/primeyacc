# ============================================================
# 📂 api/company/products/create.py
# 🧠 Mhamcloud | Company Catalog Products Create API V1.1
# ------------------------------------------------------------
# ✅ Create company-scoped catalog product/service
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Validates category/unit ownership
# ✅ Explicit serialization through catalog.services
# ✅ CatalogItem unified product/service model
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - أي category_id أو unit_id يجب أن يكون تابعًا لنفس الشركة الحالية
# - هذا الملف مسؤول عن إنشاء منتج/خدمة كتالوج فقط
# - صلاحية الإنشاء المطلوبة: company.products.create
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    create_catalog_item,
    serialize_catalog_item,
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
def company_product_create(request: Request) -> Response:
    """
    Create catalog product/service for the current company only.

    Body fields:
    - category_id optional
    - unit_id optional
    - item_type optional PRODUCT | SERVICE
    - status optional
    - code optional
    - sku optional
    - barcode optional
    - name required unless name_ar/name_en provided
    - name_ar optional
    - name_en optional
    - description optional
    - sale_price optional
    - purchase_price optional
    - cost_price optional
    - is_sellable optional
    - is_purchasable optional
    - track_inventory optional
    - taxable optional
    - tax_rate optional
    - sort_order optional
    - notes optional
    - extra_data optional object
    """
    try:
        company = _get_request_company(request)

        item = create_catalog_item(
            company=company,
            data=request.data,
            user=request.user if request.user.is_authenticated else None,
        )

        serialized_item = serialize_catalog_item(item)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog product created successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "item": serialized_item,
                "data": serialized_item,
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


company_product_create.required_company_permissions = [
    "company.products.create",
]