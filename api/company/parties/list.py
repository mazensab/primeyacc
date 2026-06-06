# ============================================================
# 📂 api/company/parties/list.py
# 🧠 PrimeyAcc | Company Business Parties List API V1.1
# ------------------------------------------------------------
# ✅ List company-scoped business parties
# ✅ Search and filter customers / suppliers / both
# ✅ Tenant isolation through request.company
# ✅ Permission-aware access for customers and suppliers
# ✅ Safe pagination response
# ✅ Choices payload for frontend forms
# ✅ Fixed DRF permission attribute placement
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقرأ company_id من الفرونت كمصدر ثقة
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - كل Query يجب أن يكون محصورًا في request.company
# - العملاء والموردون من نفس BusinessParty model
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from parties.models import BusinessPartyType
from parties.services import (
    PartyServiceError,
    filter_parties_queryset,
    get_company_parties_queryset,
    serialize_business_party,
    serialize_party_choices,
)


class BusinessPartyPagination(PageNumberPagination):
    """
    Standard company parties pagination.
    """

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


def _can_view_requested_party_type(
    *,
    request: Request,
    requested_type: str,
) -> bool:
    """
    Check whether the current membership can view the requested type.

    OWNER/admin with '*' is handled by membership.has_company_permission.
    """
    membership = getattr(request, "company_membership", None)
    if not membership:
        return False

    if not requested_type:
        return (
            membership.has_company_permission("company.customers.view")
            or membership.has_company_permission("company.suppliers.view")
        )

    requested_type = requested_type.upper()

    if requested_type == BusinessPartyType.CUSTOMER:
        return membership.has_company_permission("company.customers.view")

    if requested_type == BusinessPartyType.SUPPLIER:
        return membership.has_company_permission("company.suppliers.view")

    if requested_type in [
        BusinessPartyType.BOTH,
        BusinessPartyType.OTHER,
    ]:
        return (
            membership.has_company_permission("company.customers.view")
            or membership.has_company_permission("company.suppliers.view")
        )

    return False


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_parties_list(request: Request) -> Response:
    """
    Return business parties for the current company only.

    Supported filters:
    - q / search
    - party_type: CUSTOMER / SUPPLIER / BOTH / OTHER
    - status: ACTIVE / INACTIVE / BLOCKED / ARCHIVED
    - party_kind: INDIVIDUAL / ORGANIZATION
    - branch_id
    - city
    """
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {
                "success": False,
                "message": "Active company context is required.",
            },
            status=401,
        )

    requested_type = (
        request.query_params.get("party_type")
        or request.query_params.get("type")
        or ""
    ).upper()

    if not _can_view_requested_party_type(
        request=request,
        requested_type=requested_type,
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to view these parties.",
            },
            status=403,
        )

    try:
        queryset = get_company_parties_queryset(company=company)
        queryset = filter_parties_queryset(
            queryset,
            search=request.query_params.get("q")
            or request.query_params.get("search")
            or "",
            party_type=requested_type,
            status=request.query_params.get("status") or "",
            party_kind=request.query_params.get("party_kind") or "",
            branch_id=request.query_params.get("branch_id"),
            city=request.query_params.get("city") or "",
        )
    except PartyServiceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    paginator = BusinessPartyPagination()
    page = paginator.paginate_queryset(queryset, request)

    items = [
        serialize_business_party(party)
        for party in page
    ]

    return paginator.get_paginated_response(
        {
            "success": True,
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "filters": {
                "q": request.query_params.get("q")
                or request.query_params.get("search")
                or "",
                "party_type": requested_type,
                "status": request.query_params.get("status") or "",
                "party_kind": request.query_params.get("party_kind") or "",
                "branch_id": request.query_params.get("branch_id") or "",
                "city": request.query_params.get("city") or "",
            },
            "choices": serialize_party_choices(),
            "results": items,
        }
    )


company_parties_list.required_company_permissions = [
    "company.customers.view",
    "company.suppliers.view",
]