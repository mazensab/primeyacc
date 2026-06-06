# ============================================================
# 📂 api/company/customers/create.py
# 🧠 PrimeyAcc | Company Customers Create API V1.0
# ------------------------------------------------------------
# ✅ Create customer alias over BusinessParty
# ✅ Forces party_type CUSTOMER unless explicitly BOTH is allowed later
# ✅ Tenant isolation through request.company
# ✅ Permission: company.customers.create
# ✅ Branch ownership validation through parties.services
# ✅ Ignores frontend company_id completely
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - العميل هو BusinessParty بنوع CUSTOMER
# - الشركة الحالية تأتي من CompanyMembership عبر request.company
# - لا نقبل company_id من الفرونت كمصدر ثقة
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasCompanyPermission
from parties.models import BusinessPartyType
from parties.services import (
    PartyServiceError,
    create_business_party,
    serialize_business_party,
)


@api_view(["POST"])
@permission_classes([HasCompanyPermission])
def company_customer_create(request: Request) -> Response:
    """
    Create a customer inside the current company only.

    This endpoint always creates a BusinessParty with party_type CUSTOMER.
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

    payload = request.data.copy()
    payload["party_type"] = BusinessPartyType.CUSTOMER

    try:
        customer = create_business_party(
            company=company,
            data=payload,
            user=request.user,
        )
    except PartyServiceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )

    return Response(
        {
            "success": True,
            "message": "Customer created successfully.",
            "customer": serialize_business_party(customer),
        },
        status=201,
    )


company_customer_create.required_company_permission = "company.customers.create"