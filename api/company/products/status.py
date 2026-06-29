# ============================================================
# 📂 api/company/products/status.py
# 🧠 Mhamcloud | Company Catalog Products Status API V1.1
# ------------------------------------------------------------
# ✅ Change company-scoped catalog product/service status
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Prevent access to another company's product/service
# ✅ Explicit serialization through catalog.services
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يمكن تغيير حالة منتج/خدمة تابعة لشركة أخرى
# - هذا الملف مسؤول فقط عن تغيير حالة المنتج/الخدمة
# - صلاحية التعديل المطلوبة: company.products.update
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    get_company_item_or_raise,
    serialize_catalog_item,
    set_catalog_item_status,
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
def company_product_status(request: Request, product_id: int) -> Response:
    """
    Change one catalog product/service status for the current company only.

    Body:
    - status: ACTIVE | INACTIVE | ARCHIVED
    """
    try:
        company = _get_request_company(request)

        item = get_company_item_or_raise(
            company=company,
            item_id=product_id,
        )

        status_value = request.data.get("status")

        item = set_catalog_item_status(
            item=item,
            status=status_value,
            user=request.user if request.user.is_authenticated else None,
        )

        serialized_item = serialize_catalog_item(item)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog product status updated successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "item": serialized_item,
                "data": serialized_item,
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


company_product_status.required_company_permissions = [
    "company.products.update",
]