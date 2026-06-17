# ============================================================
# 📂 api/company/inventory/locations/update.py
# 🧠 PrimeyAcc | Company Inventory Location Update API V1.0
# ------------------------------------------------------------
# ✅ Update current-company inventory location
# ✅ Tenant-isolated lookup
# ✅ Service-layer update
# ✅ Prevent warehouse reassignment
# ✅ Clear validation errors
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة تؤخذ من request.company فقط
# - الموقع يجب أن يتبع الشركة الحالية
# - لا يمكن نقل الموقع إلى مستودع آخر
# - التحديث يتم من خلال inventory.services
# - الصلاحية: company.inventory.locations.update
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
from inventory.models import InventoryLocation
from inventory.services import update_inventory_location


class InventoryLocationUpdateAPIError(Exception):
    """
    Small API-level error for inventory location update.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise InventoryLocationUpdateAPIError(
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


@api_view(["PUT", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def inventory_location_update(
    request: Request,
    location_id,
) -> Response:
    """
    Update one inventory location for the current company.
    """
    try:
        company = _get_request_company(request)

        location = (
            InventoryLocation.objects.select_related(
                "company",
                "warehouse",
                "warehouse__branch",
                "parent",
                "created_by",
                "updated_by",
            )
            .filter(
                id=location_id,
                company=company,
            )
            .first()
        )

        if not location:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Inventory location was not found.",
                },
                status=404,
            )

        if location.status == "ARCHIVED":
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": (
                        "Archived inventory locations cannot be updated."
                    ),
                    "errors": {
                        "status": [
                            (
                                "Activate or create another location instead "
                                "of updating an archived location."
                            )
                        ],
                    },
                },
                status=409,
            )

        location = update_inventory_location(
            company=company,
            location=location,
            data=request.data.copy(),
            user=request.user,
        )

        location = (
            InventoryLocation.objects.select_related(
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
                "message": "Inventory location updated successfully.",
                "location": serialize_inventory_location(
                    location,
                    include_children_count=True,
                ),
            },
            status=200,
        )

    except InventoryLocationUpdateAPIError as exc:
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


inventory_location_update.required_company_permissions = [
    "company.inventory.locations.update",
]
