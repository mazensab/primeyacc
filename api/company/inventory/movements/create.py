# ============================================================
# 📂 api/company/inventory/movements/create.py
# 🧠 Mhamcloud | Company Stock Movement Create API V1.0
# ------------------------------------------------------------
# ✅ Create and post stock movement for current company only
# ✅ Tenant isolation through request.company
# ✅ Uses inventory/services.py as source of truth
# ✅ Protected by HasAnyCompanyPermission
# ✅ Safe validation errors
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - إنشاء الحركة وتطبيقها على الرصيد يتم عبر service layer
# - صلاحية الإنشاء المطلوبة: company.inventory.movements.create
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.movements.serializers import serialize_stock_movement
from api.permissions import HasAnyCompanyPermission
from catalog.models import CatalogItem
from inventory.models import Warehouse
from inventory.services import create_stock_movement


class StockMovementCreateAPIError(Exception):
    """
    Small API-level error for stock movement create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise StockMovementCreateAPIError("Current company context was not resolved.")

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
def stock_movement_create(request: Request) -> Response:
    """
    Create and post a stock movement for the authenticated user's current company.
    """
    try:
        company = _get_request_company(request)
        payload = request.data if isinstance(request.data, dict) else {}

        warehouse_id = payload.get("warehouse_id") or payload.get("warehouse")
        item_id = payload.get("item_id") or payload.get("item")

        if not warehouse_id:
            raise ValidationError({"warehouse_id": "Warehouse is required."})

        if not item_id:
            raise ValidationError({"item_id": "Catalog item is required."})

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

        try:
            item = CatalogItem.objects.get(
                id=item_id,
                company=company,
            )
        except CatalogItem.DoesNotExist:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Catalog item was not found.",
                },
                status=404,
            )

        movement = create_stock_movement(
            company=company,
            warehouse=warehouse,
            item=item,
            movement_type=str(payload.get("movement_type") or "").strip().upper(),
            direction=str(payload.get("direction") or "").strip().upper() or None,
            quantity=payload.get("quantity"),
            unit_cost=payload.get("unit_cost"),
            movement_date=payload.get("movement_date") or None,
            movement_number=payload.get("movement_number") or None,
            reference_type=payload.get("reference_type") or "",
            reference_id=payload.get("reference_id") or None,
            reference_number=payload.get("reference_number") or "",
            notes=payload.get("notes") or "",
            extra_data=payload.get("extra_data")
            if isinstance(payload.get("extra_data"), dict)
            else {},
            user=request.user,
            post_immediately=True,
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Stock movement created successfully.",
                "movement": serialize_stock_movement(movement),
            },
            status=201,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Stock movement could not be created.",
                "errors": _validation_error_payload(exc),
            },
            status=400,
        )

    except StockMovementCreateAPIError as exc:
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


stock_movement_create.required_company_permissions = [
    "company.inventory.movements.create",
]