# ============================================================
# 📂 api/company/customers/detail.py
# 🧠 Mhamcloud | Company Customers Detail API V1.0
# ------------------------------------------------------------
# ✅ Customer detail alias over BusinessParty
# ✅ Update customer inside current company only
# ✅ Allows CUSTOMER and BOTH records
# ✅ Tenant isolation through request.company
# ✅ Permissions: company.customers.view / update
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - العميل هو BusinessParty بنوع CUSTOMER أو BOTH
# - لا يمكن قراءة أو تعديل عميل خارج الشركة الحالية
# - الشركة الحالية تأتي من CompanyMembership عبر request.company
# - لا نقبل company_id من الفرونت كمصدر ثقة
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from parties.services import (
    PartyServiceError,
    get_company_party_or_raise,
    serialize_business_party,
    update_business_party,
)


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def company_customer_detail(
    request: Request,
    customer_id: int,
) -> Response:
    """
    Retrieve or update a customer inside the current company only.

    This endpoint accepts BusinessParty records where is_customer=True.
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
        customer = get_company_party_or_raise(
            company=company,
            party_id=customer_id,
        )
    except PartyServiceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=404,
        )

    if not customer.is_customer:
        return Response(
            {
                "success": False,
                "message": "Customer was not found.",
            },
            status=404,
        )

    membership = getattr(request, "company_membership", None)

    if request.method == "GET":
        if not membership or not membership.has_company_permission(
            "company.customers.view"
        ):
            return Response(
                {
                    "success": False,
                    "message": "You do not have permission to view this customer.",
                },
                status=403,
            )

        return Response(
            {
                "success": True,
                "customer": serialize_business_party(customer),
            }
        )

    if not membership or not membership.has_company_permission(
        "company.customers.update"
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to update this customer.",
            },
            status=403,
        )

    payload = request.data.copy()

    try:
        customer = update_business_party(
            party=customer,
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

    if not customer.is_customer:
        return Response(
            {
                "success": False,
                "message": "Updated party is no longer a customer.",
            },
            status=400,
        )

    return Response(
        {
            "success": True,
            "message": "Customer updated successfully.",
            "customer": serialize_business_party(customer),
        }
    )


company_customer_detail.required_company_permissions = [
    "company.customers.view",
    "company.customers.update",
]