# ============================================================
# 📂 api/company/suppliers/status.py
# 🧠 Mhamcloud | Company Suppliers Status API V1.0
# ------------------------------------------------------------
# ✅ Supplier status actions alias over BusinessParty
# ✅ Activate / deactivate / block / archive supplier
# ✅ Allows SUPPLIER and BOTH records
# ✅ Tenant isolation through request.company
# ✅ Permission: company.suppliers.update
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - المورد هو BusinessParty بنوع SUPPLIER أو BOTH
# - لا يمكن تغيير حالة مورد خارج الشركة الحالية
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
def company_supplier_status(
    request: Request,
    supplier_id: int,
    action: str,
) -> Response:
    """
    Change supplier status inside the current company only.
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
        supplier = get_company_party_or_raise(
            company=company,
            party_id=supplier_id,
        )
    except PartyServiceError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=404,
        )

    if not supplier.is_supplier:
        return Response(
            {
                "success": False,
                "message": "Supplier was not found.",
            },
            status=404,
        )

    try:
        if action == "activate":
            supplier = activate_business_party(
                party=supplier,
                user=request.user,
            )
            message = "Supplier activated successfully."

        elif action == "deactivate":
            supplier = deactivate_business_party(
                party=supplier,
                user=request.user,
            )
            message = "Supplier deactivated successfully."

        elif action == "block":
            supplier = block_business_party(
                party=supplier,
                reason=request.data.get("reason") or "",
                user=request.user,
            )
            message = "Supplier blocked successfully."

        else:
            supplier = archive_business_party(
                party=supplier,
                user=request.user,
            )
            message = "Supplier archived successfully."

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
            "supplier": serialize_business_party(supplier),
        }
    )


company_supplier_status.required_company_permission = "company.suppliers.update"