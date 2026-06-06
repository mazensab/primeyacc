# ============================================================
# 📂 api/company/customers/status.py
# 🧠 PrimeyAcc | Company Customers Status API V1.0
# ------------------------------------------------------------
# ✅ Customer status actions alias over BusinessParty
# ✅ Activate / deactivate / block / archive customer
# ✅ Allows CUSTOMER and BOTH records
# ✅ Tenant isolation through request.company
# ✅ Permission: company.customers.update
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - العميل هو BusinessParty بنوع CUSTOMER أو BOTH
# - لا يمكن تغيير حالة عميل خارج الشركة الحالية
# - الشركة الحالية تأتي من CompanyMembership عبر request.company
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasCompanyPermission
from parties.services import (
    PartyServiceError,
    activate_business_party,
    archive_business_party,
    block_business_party,
    deactivate_business_party,
    get_company_party_or_raise,
    serialize_business_party,
)


ALLOWED_ACTIONS = {
    "activate",
    "deactivate",
    "block",
    "archive",
}


@api_view(["POST"])
@permission_classes([HasCompanyPermission])
def company_customer_status(
    request: Request,
    customer_id: int,
    action: str,
) -> Response:
    """
    Change customer status inside the current company only.
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

    action = (action or "").strip().lower()
    if action not in ALLOWED_ACTIONS:
        return Response(
            {
                "success": False,
                "message": "Invalid status action.",
                "allowed_actions": sorted(ALLOWED_ACTIONS),
            },
            status=400,
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

    try:
        if action == "activate":
            customer = activate_business_party(
                party=customer,
                user=request.user,
            )
            message = "Customer activated successfully."

        elif action == "deactivate":
            customer = deactivate_business_party(
                party=customer,
                user=request.user,
            )
            message = "Customer deactivated successfully."

        elif action == "block":
            customer = block_business_party(
                party=customer,
                reason=request.data.get("reason") or "",
                user=request.user,
            )
            message = "Customer blocked successfully."

        else:
            customer = archive_business_party(
                party=customer,
                user=request.user,
            )
            message = "Customer archived successfully."

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
            "message": message,
            "customer": serialize_business_party(customer),
        }
    )


company_customer_status.required_company_permission = "company.customers.update"