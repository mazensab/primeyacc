# ============================================================
# 📂 api/company/inventory/locations/create.py
# 🧠 Mhamcloud | Company Inventory Location Create API V1.0
# ------------------------------------------------------------
# ✅ Create inventory location for current company
# ✅ Resolve warehouse inside request.company only
# ✅ Service-layer creation
# ✅ Tenant isolation
# ✅ Clear validation errors
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة تؤخذ من request.company فقط
# - warehouse_id يستخدم لاختيار مستودع داخل الشركة الحالية فقط
# - company_id القادم من الواجهة يتم تجاهله
# - الإنشاء يتم من خلال inventory.services
# - الصلاحية: company.inventory.locations.create
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.locations.serializers import (
    serialize_inventory_location,
)
from api.permissions import HasAnyCompanyPermission
from inventory.models import Warehouse
from inventory.services import create_inventory_location


class InventoryLocationCreateAPIError(Exception):
    """
    Small API-level error for inventory location creation.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise InventoryLocationCreateAPIError(
            "Current company context was not resolved."
        )

    return company


def _validation_errors(exc: ValidationError) -> dict[str, Any]:
    """
    Normalize Django validation errors for API responses.
    """
    if hasattr(exc, "message_dict"):
        return {
            field: [
                str(message)
                for message in messages
            ]
            for field, messages in exc.message_dict.items()
        }

    if hasattr(exc, "messages"):
        return {
            "detail": [
                str(message)
                for message in exc.messages
            ]
        }

    return {
        "detail": [str(exc)],
    }


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def inventory_location_create(request: Request) -> Response:
    """
    Create an inventory location in a company warehouse.
    """
    try:
        company = _get_request_company(request)
        payload = request.data.copy()

        warehouse_id = (
            payload.get("warehouse_id")
            or payload.get("warehouse")
        )

        if not warehouse_id:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Warehouse is required.",
                    "errors": {
                        "warehouse_id": [
                            "Warehouse is required."
                        ],
                    },
                },
                status=400,
            )

        warehouse = (
            Warehouse.objects.select_related(
                "company",
                "branch",
            )
            .filter(
                id=warehouse_id,
                company=company,
            )
            .first()
        )

        if not warehouse:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Warehouse was not found for the current company."
                    ),
                    "errors": {
                        "warehouse_id": [
                            "Warehouse was not found for the current company."
                        ],
                    },
                },
                status=404,
            )

        location = create_inventory_location(
            company=company,
            warehouse=warehouse,
            data=payload,
            user=request.user,
        )

        location = (
            location.__class__.objects.select_related(
                "company",
                "warehouse",
                "warehouse__branch",
                "parent",
                "created_by",
                "updated_by",
            )
            .get(pk=location.pk)
        )

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Inventory location created successfully.",
                "location": serialize_inventory_location(
                    location,
                    include_children_count=True,
                ),
            },
            status=201,
        )

    except InventoryLocationCreateAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {
                    "detail": [str(exc)],
                },
            },
            status=400,
        )

    except ValidationError as exc:
        errors = _validation_errors(exc)

        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Inventory location validation failed.",
                "errors": errors,
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": (
                    "Inventory location conflicts with an existing location."
                ),
                "errors": {
                    "detail": [
                        (
                            "Location code, barcode, or operational purpose "
                            "must be unique inside the warehouse."
                        )
                    ],
                },
            },
            status=409,
        )


inventory_location_create.required_company_permissions = [
    "company.inventory.locations.create",
]
