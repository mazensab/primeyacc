from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request):
    """
    Public health check endpoint.

    This endpoint is intentionally public so frontend, uptime checks,
    and deployment tools can verify that the API is running.
    """
    return Response(
        {
            "status": "ok",
            "project": "Mhamcloud",
            "service": "api",
            "timestamp": timezone.now().isoformat(),
        }
    )