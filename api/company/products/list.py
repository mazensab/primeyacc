# ============================================================
# 📂 api/company/products/list.py
# 🧠 Mhamcloud | Company Catalog Products List API V1.1
# ------------------------------------------------------------
# ✅ List company-scoped catalog products/services
# ✅ Search and filter catalog items safely
# ✅ Uses request.company from CompanyMembership context
# ✅ Never trusts company_id from frontend
# ✅ Explicit serialization through catalog.services
# ✅ Pagination-ready response
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة الحالية تؤخذ من request.company بعد CompanyMembership
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - كل Query يجب أن يكون محصورًا داخل الشركة الحالية
# - CatalogItem هو الأساس الموحد للمنتجات والخدمات
# - هذا الملف مسؤول عن عرض قائمة المنتجات والخدمات فقط
# - صلاحية العرض المطلوبة: company.products.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from catalog.services import (
    CatalogServiceError,
    filter_items_queryset,
    get_company_items_queryset,
    serialize_catalog_choices,
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


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_products_list(request: Request) -> Response:
    """
    List catalog products/services for the current company only.

    Query params:
    - search / q
    - item_type: PRODUCT | SERVICE
    - status
    - category_id
    - unit_id
    - is_sellable
    - is_purchasable
    - track_inventory
    - taxable
    - page
    - page_size
    """
    try:
        company = _get_request_company(request)

        search = request.query_params.get("search") or request.query_params.get("q") or ""
        item_type = request.query_params.get("item_type") or ""
        status = request.query_params.get("status") or ""
        category_id = request.query_params.get("category_id") or ""
        unit_id = request.query_params.get("unit_id") or ""
        is_sellable = request.query_params.get("is_sellable")
        is_purchasable = request.query_params.get("is_purchasable")
        track_inventory = request.query_params.get("track_inventory")
        taxable = request.query_params.get("taxable")

        page = _clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = _clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get("per_page"),
            default=25,
            maximum=100,
        )

        queryset = get_company_items_queryset(company=company)
        queryset = filter_items_queryset(
            queryset,
            search=search,
            item_type=item_type,
            status=status,
            category_id=category_id,
            unit_id=unit_id,
            is_sellable=is_sellable,
            is_purchasable=is_purchasable,
            track_inventory=track_inventory,
            taxable=taxable,
        )

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        items = [
            serialize_catalog_item(item)
            for item in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Catalog products loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": company.display_name,
                },
                "filters": {
                    "search": search,
                    "item_type": item_type,
                    "status": status,
                    "category_id": category_id,
                    "unit_id": unit_id,
                    "is_sellable": is_sellable if is_sellable is not None else "",
                    "is_purchasable": is_purchasable if is_purchasable is not None else "",
                    "track_inventory": track_inventory if track_inventory is not None else "",
                    "taxable": taxable if taxable is not None else "",
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": items,
                "results": items,
                "choices": serialize_catalog_choices(),
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


company_products_list.required_company_permissions = [
    "company.products.view",
]