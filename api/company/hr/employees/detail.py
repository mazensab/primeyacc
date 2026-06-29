# ============================================================
# 📂 api/company/hr/employees/detail.py
# 🧠 Mhamcloud | Company HR Employee Detail API V1.0
# ------------------------------------------------------------
# ✅ Retrieve company-scoped employee detail
# ✅ Tenant isolation through request.company
# ✅ Ignores frontend company_id
# ✅ Protected by HasAnyCompanyPermission
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا نقبل company_id من الفرونت
# - الشركة الحالية تأتي من CompanyMembership عبر HasAnyCompanyPermission
# - لا يمكن عرض موظف خارج الشركة الحالية
# - صلاحية العرض المطلوبة: company.hr.employees.view
# ============================================================

from __future__ import annotations

from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import Employee

from .serializers import serialize_employee, serialize_employee_choices


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_hr_employee_detail(request: Request, employee_id: int) -> Response:
    """
    GET /api/company/hr/employees/<employee_id>/

    Return one employee from the current company only.
    """

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

    try:
        employee = (
            Employee.objects.select_related("company", "branch", "user")
            .get(
                id=employee_id,
                company=company,
            )
        )
    except Employee.DoesNotExist:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Employee was not found.",
            },
            status=404,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Employee loaded successfully.",
            "company": {
                "id": company.id,
                "name": company.display_name,
            },
            "employee": serialize_employee(employee),
            "data": serialize_employee(employee),
            "choices": serialize_employee_choices(),
        },
        status=200,
    )


company_hr_employee_detail.required_company_permissions = [
    "company.hr.employees.view",
]