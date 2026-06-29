# ============================================================
# ?? api/company/hr/payroll/payslip_items/update.py
# ?? Mhamcloud | Payroll Payslip Item Update API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PayslipItem

from .serializers import (
    build_payslip_item_update_data_from_request,
    serialize_payslip_item,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payslip_item_update(request, item_id: int):
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

    try:
        data = build_payslip_item_update_data_from_request(request, company)

        for field, value in data.items():
            setattr(item, field, value)

        item.updated_by = request.user
        item.full_clean()
        item.save()

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Invalid payslip item data.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip item updated successfully.",
            "item": serialize_payslip_item(item),
        }
    )


payslip_item_update.required_company_permissions = [
    "company.hr.payroll.payslip_items.update",
]
