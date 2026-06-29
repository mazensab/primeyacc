# ============================================================
# 📂 api/company/parties/detail.py
# 🧠 Mhamcloud | Company Business Party Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve one company-scoped business party
# ✅ Update one company-scoped business party
# ✅ Tenant isolation through request.company
# ✅ Permission-aware detail/update access
# ✅ Branch ownership validation through parties.services
# ✅ Ignores frontend company_id completely
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن قراءة أو تعديل طرف خارج request.company
# - تعديل العميل يتطلب company.customers.update
# - تعديل المورد يتطلب company.suppliers.update
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from parties.models import BusinessParty, BusinessPartyType
from parties.services import (
    PartyServiceError,
    get_company_party_or_raise,
    serialize_business_party,
    update_business_party,
)


def _party_view_permissions(party: BusinessParty) -> list[str]:
    """
    Return allowed view permissions for the party.
    """
    permissions = []

    if party.is_customer:
        permissions.append("company.customers.view")

    if party.is_supplier:
        permissions.append("company.suppliers.view")

    if party.party_type == BusinessPartyType.OTHER:
        permissions.extend(
            [
                "company.customers.view",
                "company.suppliers.view",
            ]
        )

    return permissions


def _party_update_permissions(party: BusinessParty) -> list[str]:
    """
    Return allowed update permissions for the party.
    """
    permissions = []

    if party.is_customer:
        permissions.append("company.customers.update")

    if party.is_supplier:
        permissions.append("company.suppliers.update")

    if party.party_type == BusinessPartyType.OTHER:
        permissions.extend(
            [
                "company.customers.update",
                "company.suppliers.update",
            ]
        )

    return permissions


def _membership_has_any(
    *,
    request: Request,
    permissions: list[str],
) -> bool:
    """
    Check whether the current company membership has any permission.
    """
    membership = getattr(request, "company_membership", None)
    if not membership:
        return False

    return any(
        membership.has_company_permission(permission)
        for permission in permissions
    )


@api_view(["GET", "PATCH", "PUT"])
@permission_classes([HasAnyCompanyPermission])
def company_party_detail(
    request: Request,
    party_id: int,
) -> Response:
    """
    Retrieve or update a business party inside the current company only.
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
        party = get_company_party_or_raise(
            company=company,
            party_id=party_id,
        )
    except PartyServiceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=404,
        )

    if request.method == "GET":
        if not _membership_has_any(
            request=request,
            permissions=_party_view_permissions(party),
        ):
            return Response(
                {
                    "success": False,
                    "message": "You do not have permission to view this party.",
                },
                status=403,
            )

        return Response(
            {
                "success": True,
                "party": serialize_business_party(party),
            }
        )

    if not _membership_has_any(
        request=request,
        permissions=_party_update_permissions(party),
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to update this party.",
            },
            status=403,
        )

    payload = request.data.copy()

    try:
        party = update_business_party(
            party=party,
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
            "message": "Business party updated successfully.",
            "party": serialize_business_party(party),
        }
    )


company_party_detail.required_company_permissions = [
    "company.customers.view",
    "company.customers.update",
    "company.suppliers.view",
    "company.suppliers.update",
]