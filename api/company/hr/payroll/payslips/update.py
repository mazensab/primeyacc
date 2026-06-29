# ============================================================
# ?? api/company/hr/payroll/payslips/update.py
# ?? Mhamcloud | Payroll Payslip Update API
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Payslip

from .serializers import (
    build_payslip_update_data_from_request,
    serialize_payslip,
)


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def payslip_update(request, payslip_id: int):
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

    payslip = Payslip.objects.select_related(
        "payroll_run",
        "period",
        "employee",
        "salary_profile",
    ).filter(
        company=company,
        id=payslip_id,
    ).first()

    if not payslip:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payslip not found.",
            },
            status=404,
        )

    try:
        data = build_payslip_update_data_from_request(request)

        for field, value in data.items():
            setattr(payslip, field, value)

        payslip.updated_by = request.user
        payslip.full_clean()
        payslip.save()

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Invalid payslip data.",
                "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
            },
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Payslip updated successfully.",
            "payslip": serialize_payslip(payslip),
        }
    )


payslip_update.required_company_permissions = [
    "company.hr.payroll.payslips.update",
]
