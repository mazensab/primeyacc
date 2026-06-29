# ============================================================
# 📂 api/company/inventory/warehouses/create.py
# 🧠 Mhamcloud | Company Warehouse Create API V1.0
# ------------------------------------------------------------
# ✅ Create warehouse for current company only
# ✅ Tenant isolation through request.company
# ✅ Uses inventory/services.py as source of truth
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe validation errors
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إنشاء المستودع يتم عبر service layer وليس داخل view مباشرة
# - صلاحية الإنشاء المطلوبة: company.inventory.warehouses.create
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.warehouses.serializers import serialize_warehouse
from api.permissions import HasAnyCompanyPermission
from inventory.services import create_warehouse


class WarehouseCreateAPIError(Exception):
    """
    Small API-level error for warehouse create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise WarehouseCreateAPIError("Current company context was not resolved.")

    return company


def _validation_error_payload(exc: ValidationError):
    """
    Convert Django ValidationError to a stable API response.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return exc.messages

    return str(exc)


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def warehouse_create(request: Request) -> Response:
    """
    Create a warehouse for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)
        payload = request.data if isinstance(request.data, dict) else {}

        warehouse = create_warehouse(
            company=company,
            data=payload,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Warehouse created successfully.",
                "warehouse": serialize_warehouse(
                    warehouse,
                    include_summary=True,
                ),
            },
            status=201,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Warehouse could not be created.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )

    except WarehouseCreateAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": str(exc),
                },
            },
            status=400,
        )


warehouse_create.required_company_permissions = [
    "company.inventory.warehouses.create",
]