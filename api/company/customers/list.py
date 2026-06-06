# ============================================================
# 📂 api/company/customers/list.py
# 🧠 PrimeyAcc | Company Customers List API V1.0
# ------------------------------------------------------------
# ✅ Customers alias over BusinessParty
# ✅ Company-scoped customer list
# ✅ Includes parties with type CUSTOMER or BOTH
# ✅ Tenant isolation through request.company
# ✅ Permission: company.customers.view
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - العملاء ليسوا موديل مستقل الآن
# - العملاء هم BusinessParty بنوع CUSTOMER أو BOTH
# - الشركة الحالية تأتي من CompanyMembership عبر request.company
# - لا نقرأ company_id من الفرونت كمصدر ثقة
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasCompanyPermission
from parties.models import BusinessPartyType
from parties.services import (
    PartyServiceError,
    filter_parties_queryset,
    get_company_parties_queryset,
    serialize_business_party,
    serialize_party_choices,
)


class CustomerPagination(PageNumberPagination):
    """
    Standard company customers pagination.
    """

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


@api_view(["GET"])
@permission_classes([HasCompanyPermission])
def company_customers_list(request: Request) -> Response:
    """
    Return customers for the current company only.

    This endpoint is an alias over BusinessParty:
    - CUSTOMER
    - BOTH
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

    try:
        queryset = get_company_parties_queryset(company=company)
        queryset = filter_parties_queryset(
            queryset,
            search=request.query_params.get("q")
            or request.query_params.get("search")
            or "",
            party_type=BusinessPartyType.CUSTOMER,
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

    paginator = CustomerPagination()
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
                "status": request.query_params.get("status") or "",
                "party_kind": request.query_params.get("party_kind") or "",
                "branch_id": request.query_params.get("branch_id") or "",
                "city": request.query_params.get("city") or "",
            },
            "choices": serialize_party_choices(),
            "results": items,
        }
    )


company_customers_list.required_company_permission = "company.customers.view"