# ============================================================
# 📂 api/company/inventory/locations/status.py
# 🧠 Mhamcloud | Company Inventory Location Status API V1.0
# ------------------------------------------------------------
# ✅ Activate inventory location
# ✅ Deactivate inventory location
# ✅ Archive inventory location
# ✅ Tenant-isolated lookup
# ✅ Service-layer status transition
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - الشركة تؤخذ من request.company فقط
# - الموقع يجب أن يتبع الشركة الحالية
# - تغيير الحالة يتم من خلال inventory.services
# - الصلاحية: company.inventory.locations.status
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.inventory.locations.serializers import (
    serialize_inventory_location,
)
from api.permissions import HasAnyCompanyPermission
from inventory.models import (
    InventoryLocation,
    InventoryLocationStatus,
)
from inventory.services import set_inventory_location_status


class InventoryLocationStatusAPIError(Exception):
    """
    Small API-level error for inventory location status endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise InventoryLocationStatusAPIError(
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


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def inventory_location_status(
    request: Request,
    location_id,
) -> Response:
    """
    Change lifecycle status for one inventory location.
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

        requested_status = str(
            request.data.get("status")
            or request.data.get("action")
            or ""
        ).strip().upper()

        action_map = {
            "ACTIVATE": InventoryLocationStatus.ACTIVE,
            "DEACTIVATE": InventoryLocationStatus.INACTIVE,
            "ARCHIVE": InventoryLocationStatus.ARCHIVED,
        }

        requested_status = action_map.get(
            requested_status,
            requested_status,
        )

        allowed_statuses = {
            InventoryLocationStatus.ACTIVE,
            InventoryLocationStatus.INACTIVE,
            InventoryLocationStatus.ARCHIVED,
        }

        if requested_status not in allowed_statuses:
            return Response(
                {
                    "ok": False,
                    "success": False,
                    "message": "Unsupported inventory location status.",
                    "errors": {
                        "status": [
                            (
                                "Status must be ACTIVE, INACTIVE, "
                                "or ARCHIVED."
                            )
                        ],
                    },
                    "choices": [
                        {
                            "value": value,
                            "label": label,
                        }
                        for value, label
                        in InventoryLocationStatus.choices
                    ],
                },
                status=400,
            )

        location = set_inventory_location_status(
            company=company,
            location=location,
            status=requested_status,
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
                "message": (
                    "Inventory location status updated successfully."
                ),
                "location": serialize_inventory_location(
                    location,
                    include_children_count=True,
                ),
            },
            status=200,
        )

    except InventoryLocationStatusAPIError as exc:
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
                "message": (
                    "Inventory location status validation failed."
                ),
                "errors": errors,
            },
            status=400,
        )


inventory_location_status.required_company_permissions = [
    "company.inventory.locations.status",
]
