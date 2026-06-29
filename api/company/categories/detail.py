# ============================================================
# 📂 api/company/categories/detail.py
# 🧠 Mhamcloud | Company Catalog Categories Detail API V1.1
# ------------------------------------------------------------
# ✅ Retrieve company-scoped catalog category details
# ✅ Update company-scoped catalog category
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Validates parent category ownership
# ✅ Explicit serialization through catalog.services
# ✅ Protected by HasAnyCompanyPermission
# ✅ Method-aware permission validation
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - أي parent_id يجب أن يكون تابعًا لنفس الشركة الحالية
# - لا يمكن الوصول لتصنيف شركة أخرى
# - GET يحتاج company.categories.view
# - PATCH/PUT يحتاج company.categories.update
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    get_company_category_or_raise,
    serialize_catalog_category,
    update_catalog_category,
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
    Check method-specific catalog category permission.

    HasAnyCompanyPermission resolves company and membership context first.
    This function enforces read vs update action permission.
    """
    membership = getattr(request, "company_membership", None)

    if not membership:
        return False

    if request.method == "GET":
        return membership.has_company_permission("company.categories.view")

    if request.method in ["PATCH", "PUT"]:
        return membership.has_company_permission("company.categories.update")

    return False


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def company_category_detail(request: Request, category_id: int) -> Response:
    """
    Retrieve or update one catalog category for the current company only.
    """
    if not _has_required_method_permission(request):
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "You do not have permission to access this catalog category.",
                "errors": {
                    "detail": "Missing required catalog category permission.",
                },
            },
            status=403,
        )

    try:
        company = _get_request_company(request)

        category = get_company_category_or_raise(
            company=company,
            category_id=category_id,
        )

        if request.method == "GET":
            item = serialize_catalog_category(category)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Catalog category loaded successfully.",
                    "company": {
                        "id": company.id,
                        "name": company.display_name,
                    },
                    "item": item,
                    "data": item,
                },
                status=200,
            )

        category = update_catalog_category(
            category=category,
            data=request.data,
            user=request.user if request.user.is_authenticated else None,
        )

        item = serialize_catalog_category(category)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog category updated successfully.",
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


company_category_detail.required_company_permissions = [
    "company.categories.view",
    "company.categories.update",
]