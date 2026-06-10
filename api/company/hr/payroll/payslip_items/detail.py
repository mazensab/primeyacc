# ============================================================
# ?? api/company/hr/payroll/payslip_items/detail.py
# ?? PrimeyAcc | Payroll Payslip Item Detail API
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayslipItem

from .serializers import serialize_payslip_item


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def payslip_item_detail(request, item_id: int):
    company = getattr(request, "company", None)

    if not company:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Active company context is required.",
            },
            status=401,
        )

    item = PayslipItem.objects.select_related(
        "payslip",
        "payslip__employee",
        "payslip__payroll_run",
        "payslip__period",
        "component",
    ).filter(
        company=company,
        id=item_id,
    ).first()

    if not item:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payslip item not found.",
            },
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip item loaded successfully.",
            "item": serialize_payslip_item(item),
        }
    )


payslip_item_detail.required_company_permissions = [
    "company.hr.payroll.payslip_items.view",
]
