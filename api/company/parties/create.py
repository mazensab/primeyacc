# ============================================================
# 📂 api/company/parties/create.py
# 🧠 Mhamcloud | Company Business Parties Create API V1.0
# ------------------------------------------------------------
# ✅ Create company-scoped business party
# ✅ Supports customers, suppliers, both and other parties
# ✅ Tenant isolation through request.company
# ✅ Permission-aware create access
# ✅ Branch ownership validation through parties.services
# ✅ Ignores frontend company_id completely
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - إنشاء العميل يتطلب company.customers.create
# - إنشاء المورد يتطلب company.suppliers.create
# - أي branch_id يجب أن يكون تابعًا لنفس request.company
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from parties.models import BusinessPartyType
from parties.services import (
    PartyServiceError,
    create_business_party,
    serialize_business_party,
)


def _required_create_permission_for_type(party_type: str) -> list[str]:
    """
    Return required permissions for creating the requested party type.
    """
    party_type = (party_type or BusinessPartyType.CUSTOMER).upper()

    if party_type == BusinessPartyType.CUSTOMER:
        return ["company.customers.create"]

    if party_type == BusinessPartyType.SUPPLIER:
        return ["company.suppliers.create"]

    if party_type == BusinessPartyType.BOTH:
        return [
            "company.customers.create",
            "company.suppliers.create",
        ]

    if party_type == BusinessPartyType.OTHER:
        return [
            "company.customers.create",
            "company.suppliers.create",
        ]

    return []


def _can_create_party_type(
    *,
    request: Request,
    party_type: str,
) -> bool:
    """
    Check create permission based on party_type.

    For BOTH and OTHER, one of customer/supplier create permissions is enough.
    OWNER with '*' is handled by membership.has_company_permission.
    """
    membership = getattr(request, "company_membership", None)
    if not membership:
        return False

    required_permissions = _required_create_permission_for_type(party_type)
    if not required_permissions:
        return False

    return any(
        membership.has_company_permission(permission)
        for permission in required_permissions
    )


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_party_create(request: Request) -> Response:
    """
    Create a business party inside the current company only.

    The company is always taken from request.company.
    Any incoming company_id is ignored by parties.services.
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

    party_type = (
        request.data.get("party_type")
        or request.data.get("type")
        or BusinessPartyType.CUSTOMER
    ).upper()

    if not _can_create_party_type(
        request=request,
        party_type=party_type,
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to create this party.",
            },
            status=403,
        )

    payload = request.data.copy()
    payload["party_type"] = party_type

    try:
        party = create_business_party(
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
            "message": "Business party created successfully.",
            "party": serialize_business_party(party),
        },
        status=201,
    )


company_party_create.required_company_permissions = [
    "company.customers.create",
    "company.suppliers.create",
]