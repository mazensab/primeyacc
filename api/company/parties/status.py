# ============================================================
# 📂 api/company/parties/status.py
# 🧠 Mhamcloud | Company Business Party Status API V1.0
# ------------------------------------------------------------
# ✅ Activate company-scoped business party
# ✅ Deactivate company-scoped business party
# ✅ Block company-scoped business party
# ✅ Archive company-scoped business party
# ✅ Tenant isolation through request.company
# ✅ Permission-aware status changes
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت كمصدر ثقة
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن تغيير حالة طرف خارج request.company
# - تغيير حالة العميل يتطلب company.customers.update
# - تغيير حالة المورد يتطلب company.suppliers.update
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from parties.models import BusinessParty, BusinessPartyType
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


def _party_status_permissions(party: BusinessParty) -> list[str]:
    """
    Return allowed status-update permissions for the party.
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


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_party_status(
    request: Request,
    party_id: int,
    action: str,
) -> Response:
    """
    Change business party status inside the current company only.

    Supported actions:
    - activate
    - deactivate
    - block
    - archive
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

    if not _membership_has_any(
        request=request,
        permissions=_party_status_permissions(party),
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to change this party status.",
            },
            status=403,
        )

    try:
        if action == "activate":
            party = activate_business_party(
                party=party,
                user=request.user,
            )
            message = "Business party activated successfully."

        elif action == "deactivate":
            party = deactivate_business_party(
                party=party,
                user=request.user,
            )
            message = "Business party deactivated successfully."

        elif action == "block":
            party = block_business_party(
                party=party,
                reason=request.data.get("reason") or "",
                user=request.user,
            )
            message = "Business party blocked successfully."

        else:
            party = archive_business_party(
                party=party,
                user=request.user,
            )
            message = "Business party archived successfully."

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
            "party": serialize_business_party(party),
        }
    )


company_party_status.required_company_permissions = [
    "company.customers.update",
    "company.suppliers.update",
]