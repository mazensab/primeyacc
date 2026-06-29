# ============================================================
# 📂 api/company/inventory/warehouses/status.py
# 🧠 Mhamcloud | Company Warehouse Status API V1.0
# ------------------------------------------------------------
# ✅ Change warehouse status for current company only
# ✅ Tenant isolation through request.company
# ✅ Uses inventory/services.py as source of truth
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe validation errors
# ✅ Safe 404 for cross-company access
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي مستودع خارج شركة العضوية الحالية يرجع 404
# - تغيير الحالة يتم عبر service layer
# - صلاحية تغيير الحالة المطلوبة: company.inventory.warehouses.status
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.warehouses.serializers import serialize_warehouse
from api.permissions import HasAnyCompanyPermission
from inventory.models import Warehouse
from inventory.services import set_warehouse_status


class WarehouseStatusAPIError(Exception):
    """
    Small API-level error for warehouse status endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise WarehouseStatusAPIError("Current company context was not resolved.")

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
def warehouse_status(request: Request, warehouse_id) -> Response:
    """
    Change one warehouse status for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)
        payload = request.data if isinstance(request.data, dict) else {}
        status = str(payload.get("status") or "").strip().upper()

        try:
            warehouse = Warehouse.objects.get(
                id=warehouse_id,
                company=company,
            )
        except Warehouse.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Warehouse was not found.",
                },
                status=404,
            )

        warehouse = set_warehouse_status(
            company=company,
            warehouse=warehouse,
            status=status,
            user=request.user,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Warehouse status updated successfully.",
                "warehouse": serialize_warehouse(
                    warehouse,
                    include_summary=True,
                ),
            },
            status=200,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Warehouse status could not be updated.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )

    except WarehouseStatusAPIError as exc:
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


warehouse_status.required_company_permissions = [
    "company.inventory.warehouses.status",
]