# ============================================================
# 📂 api/company/products/detail.py
# 🧠 Mhamcloud | Company Catalog Products Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve company-scoped catalog product/service details
# ✅ Update company-scoped catalog product/service
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Validates category/unit ownership
# ✅ Explicit serialization through catalog.services
# ✅ Protected by HasAnyCompanyPermission
# ✅ Method-aware permission validation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - أي category_id أو unit_id يجب أن يكون تابعًا لنفس الشركة الحالية
# - لا يمكن الوصول لمنتج/خدمة تابعة لشركة أخرى
# - GET يحتاج company.products.view
# - PATCH/PUT يحتاج company.products.update
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
    update_catalog_item,
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


def _has_required_method_permission(request: Request) -> bool:
    """
    Check method-specific catalog product permission.

    HasAnyCompanyPermission resolves company and membership context first.
    This function enforces read vs update action permission.
    """
    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if request.method == "GET":
        return membership.has_company_permission("company.products.view")

    if request.method in ["PATCH", "PUT"]:
        return membership.has_company_permission("company.products.update")

    return False


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def company_product_detail(request: Request, product_id: int) -> Response:
    """
    Retrieve or update one catalog product/service for the current company only.
    """
    if not _has_required_method_permission(request):
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "You do not have permission to access this catalog product.",
                "errors": {
                    "detail": "Missing required catalog product permission.",
                },
            },
            status=403,
        )

    try:
        company = _get_request_company(request)

        item = get_company_item_or_raise(
            company=company,
            item_id=product_id,
        )

        if request.method == "GET":
            serialized_item = serialize_catalog_item(item)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Catalog product loaded successfully.",
                    "company": {
                        "id": company.id,
                        "name": company.display_name,
                    },
                    "item": serialized_item,
                    "data": serialized_item,
                },
                status=200,
            )

        item = update_catalog_item(
            item=item,
            data=request.data,
            user=request.user if request.user.is_authenticated else None,
        )

        serialized_item = serialize_catalog_item(item)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog product updated successfully.",
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


company_product_detail.required_company_permissions = [
    "company.products.view",
    "company.products.update",
]