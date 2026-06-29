# ============================================================
# 📂 api/company/categories/status.py
# 🧠 Mhamcloud | Company Catalog Categories Status API V1.1
# ------------------------------------------------------------
# ✅ Change company-scoped catalog category status
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Prevent access to another company's category
# ✅ Explicit serialization through catalog.services
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - لا يمكن تغيير حالة تصنيف تابع لشركة أخرى
# - هذا الملف مسؤول فقط عن تغيير حالة التصنيف
# - صلاحية التعديل المطلوبة: company.categories.update
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
    set_catalog_category_status,
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
def company_category_status(request: Request, category_id: int) -> Response:
    """
    Change one catalog category status for the current company only.

    Body:
    - status: ACTIVE | INACTIVE | ARCHIVED
    """
    try:
        company = _get_request_company(request)

        category = get_company_category_or_raise(
            company=company,
            category_id=category_id,
        )

        status_value = request.data.get("status")

        category = set_catalog_category_status(
            category=category,
            status=status_value,
            user=request.user if request.user.is_authenticated else None,
        )

        item = serialize_catalog_category(category)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog category status updated successfully.",
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


company_category_status.required_company_permissions = [
    "company.categories.update",
]