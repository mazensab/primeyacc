# ============================================================
# 📂 api/company/suppliers/detail.py
# 🧠 Mhamcloud | Company Suppliers Detail API V1.0
# ------------------------------------------------------------
# ✅ Supplier detail alias over BusinessParty
# ✅ Update supplier inside current company only
# ✅ Allows SUPPLIER and BOTH records
# ✅ Tenant isolation through request.company
# ✅ Permissions: company.suppliers.view / update
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - المورد هو BusinessParty بنوع SUPPLIER أو BOTH
# - لا يمكن قراءة أو تعديل مورد خارج الشركة الحالية
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
def company_supplier_detail(
    request: Request,
    supplier_id: int,
) -> Response:
    """
    Retrieve or update a supplier inside the current company only.

    This endpoint accepts BusinessParty records where is_supplier=True.
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

    membership = getattr(request, "company_membership", None)

    if request.method == "GET":
        if not membership or not membership.has_company_permission(
            "company.suppliers.view"
        ):
            return Response(
                {
                    "success": False,
                    "message": "You do not have permission to view this supplier.",
                },
                status=403,
            )

        return Response(
            {
                "success": True,
                "supplier": serialize_business_party(supplier),
            }
        )

    if not membership or not membership.has_company_permission(
        "company.suppliers.update"
    ):
        return Response(
            {
                "success": False,
                "message": "You do not have permission to update this supplier.",
            },
            status=403,
        )

    payload = request.data.copy()

    try:
        supplier = update_business_party(
            party=supplier,
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

    if not supplier.is_supplier:
        return Response(
            {
                "success": False,
                "message": "Updated party is no longer a supplier.",
            },
            status=400,
        )

    return Response(
        {
            "success": True,
            "message": "Supplier updated successfully.",
            "supplier": serialize_business_party(supplier),
        }
    )


company_supplier_detail.required_company_permissions = [
    "company.suppliers.view",
    "company.suppliers.update",
]