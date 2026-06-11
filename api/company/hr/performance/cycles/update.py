from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.models import PerformanceCycle
from hr.services import update_performance_cycle

from .serializers import serialize_performance_cycle


@api_view(["POST", "PATCH"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycle_update(request, cycle_id: int):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        cycle = PerformanceCycle.objects.get(id=cycle_id, company=company)
    except PerformanceCycle.DoesNotExist:
        return Response(
            {"ok": False, "success": False, "message": "Performance cycle not found."},
            status=404,
        )

    try:
        cycle = update_performance_cycle(
            cycle=cycle,
            updated_by=request.user,
            data=request.data,
        )
    except ValidationError as exc:
        return Response(
            {"ok": False, "success": False, "message": "Validation error.", "errors": exc.message_dict if hasattr(exc, "message_dict") else exc.messages},
            status=400,
        )

    return Response(
        {
            "ok": True,
            "success": True,
            "message": "Performance cycle updated successfully.",
            "cycle": serialize_performance_cycle(cycle),
        }
    )


performance_cycle_update.required_company_permissions = [
    "company.hr.performance.cycles.update",
]
