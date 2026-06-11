from __future__ import annotations

from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from hr.services import create_performance_cycle

from .serializers import serialize_performance_cycle


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def performance_cycle_create(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {"ok": False, "success": False, "message": "Active company context is required."},
            status=401,
        )

    try:
        cycle = create_performance_cycle(
            company=company,
            created_by=request.user,
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
            "message": "Performance cycle created successfully.",
            "cycle": serialize_performance_cycle(cycle),
        },
        status=201,
    )


performance_cycle_create.required_company_permissions = [
    "company.hr.performance.cycles.create",
]
