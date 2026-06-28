# ============================================================
# 📂 api/system/integration_api_keys/views.py
# 🧠 PrimeyAcc | System Integration API Keys API V1.0
# ------------------------------------------------------------
# ✅ List/create/detail/update Integration API Keys
# ✅ Disable / enable / revoke / rotate
# ✅ Usage logs endpoint
# ✅ System permission checks
# ✅ No raw key exposure except create/rotate response
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.models import IntegrationApiKey, IntegrationApiKeyUsageLog
from integrations.services import (
    IntegrationApiKeyError,
    create_integration_api_key,
    disable_integration_api_key,
    enable_integration_api_key,
    revoke_integration_api_key,
    rotate_integration_api_key,
)

from .serializers import (
    IntegrationApiKeyActionSerializer,
    IntegrationApiKeyCreateSerializer,
    IntegrationApiKeyDetailSerializer,
    IntegrationApiKeyListSerializer,
    IntegrationApiKeyUpdateSerializer,
    IntegrationApiKeyUsageLogSerializer,
)


SYSTEM_API_KEY_PERMISSIONS = {
    "view": "system.integration_api_keys.view",
    "create": "system.integration_api_keys.create",
    "update": "system.integration_api_keys.update",
    "disable": "system.integration_api_keys.disable",
    "rotate": "system.integration_api_keys.rotate",
    "revoke": "system.integration_api_keys.revoke",
    "usage": "system.integration_api_keys.usage",
}


def _user_has_system_permission(user, permission: str) -> bool:
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    profile = getattr(user, "Mhamcloud_profile", None)
    if not profile or not profile.can_access_system:
        return False

    permissions = profile.system_permissions
    return "*" in permissions or permission in permissions


def _require_permission(request, permission: str) -> Response | None:
    if _user_has_system_permission(request.user, permission):
        return None

    return Response(
        {
            "detail": "You do not have permission to access Integration API Keys.",
            "code": "permission_denied",
            "required_permission": permission,
        },
        status=status.HTTP_403_FORBIDDEN,
    )


def _validation_error_response(exc: Exception) -> Response:
    return Response(
        {
            "detail": "Validation error.",
            "errors": getattr(exc, "message_dict", None) or getattr(exc, "messages", None) or str(exc),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


class SystemIntegrationApiKeyPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class SystemIntegrationApiKeyListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get_queryset(self, request):
        queryset = IntegrationApiKey.objects.select_related(
            "company",
            "created_by",
            "disabled_by",
            "revoked_by",
            "rotated_from",
        ).all()

        search = str(request.query_params.get("search", "") or "").strip()
        if search:
            queryset = queryset.filter(
                name__icontains=search
            ) | queryset.filter(
                company__name__icontains=search
            ) | queryset.filter(
                company__name_ar__icontains=search
            ) | queryset.filter(
                company__name_en__icontains=search
            ) | queryset.filter(
                company__company_code__icontains=search
            ) | queryset.filter(
                key_prefix__icontains=search
            )

        company_id = request.query_params.get("company_id")
        if company_id:
            queryset = queryset.filter(company_id=company_id)

        status_filter = str(request.query_params.get("status", "") or "").strip().upper()
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        environment = str(request.query_params.get("environment", "") or "").strip().upper()
        if environment:
            queryset = queryset.filter(environment=environment)

        return queryset.distinct().order_by("-created_at")

    def get(self, request):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["view"])
        if forbidden:
            return forbidden

        queryset = self.get_queryset(request)
        paginator = SystemIntegrationApiKeyPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = IntegrationApiKeyListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["create"])
        if forbidden:
            return forbidden

        serializer = IntegrationApiKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            api_key, raw_key = create_integration_api_key(
                company=serializer.validated_data["company"],
                name=serializer.validated_data["name"],
                description=serializer.validated_data.get("description", ""),
                environment=serializer.validated_data.get("environment"),
                scopes=serializer.validated_data.get("scopes"),
                ip_allowlist=serializer.validated_data.get("ip_allowlist"),
                rate_limit_per_minute=serializer.validated_data.get("rate_limit_per_minute", 60),
                expires_at=serializer.validated_data.get("expires_at"),
                metadata=serializer.validated_data.get("metadata"),
                created_by=request.user,
            )
        except ValidationError as exc:
            return _validation_error_response(exc)

        payload = IntegrationApiKeyDetailSerializer(api_key).data
        payload["secret_key"] = raw_key
        payload["secret_warning"] = (
            "Copy this key now. It will not be shown again."
        )

        return Response(payload, status=status.HTTP_201_CREATED)


class SystemIntegrationApiKeyDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(
            IntegrationApiKey.objects.select_related(
                "company",
                "created_by",
                "disabled_by",
                "revoked_by",
                "rotated_from",
            ),
            pk=pk,
        )

    def get(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["view"])
        if forbidden:
            return forbidden

        api_key = self.get_object(pk)
        return Response(IntegrationApiKeyDetailSerializer(api_key).data)

    def patch(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["update"])
        if forbidden:
            return forbidden

        api_key = self.get_object(pk)
        serializer = IntegrationApiKeyUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        for field in [
            "name",
            "description",
            "scopes",
            "ip_allowlist",
            "rate_limit_per_minute",
            "expires_at",
            "metadata",
        ]:
            if field in serializer.validated_data:
                setattr(api_key, field, serializer.validated_data[field])

        api_key.updated_by = request.user

        try:
            api_key.full_clean()
            api_key.save()
        except ValidationError as exc:
            return _validation_error_response(exc)

        return Response(IntegrationApiKeyDetailSerializer(api_key).data)


class SystemIntegrationApiKeyDisableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["disable"])
        if forbidden:
            return forbidden

        api_key = get_object_or_404(IntegrationApiKey, pk=pk)
        serializer = IntegrationApiKeyActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            api_key = disable_integration_api_key(
                api_key=api_key,
                user=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except (IntegrationApiKeyError, ValidationError) as exc:
            return _validation_error_response(exc)

        return Response(IntegrationApiKeyDetailSerializer(api_key).data)


class SystemIntegrationApiKeyEnableView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["disable"])
        if forbidden:
            return forbidden

        api_key = get_object_or_404(IntegrationApiKey, pk=pk)

        try:
            api_key = enable_integration_api_key(
                api_key=api_key,
                user=request.user,
            )
        except (IntegrationApiKeyError, ValidationError) as exc:
            return _validation_error_response(exc)

        return Response(IntegrationApiKeyDetailSerializer(api_key).data)


class SystemIntegrationApiKeyRevokeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["revoke"])
        if forbidden:
            return forbidden

        api_key = get_object_or_404(IntegrationApiKey, pk=pk)
        serializer = IntegrationApiKeyActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            api_key = revoke_integration_api_key(
                api_key=api_key,
                user=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except (IntegrationApiKeyError, ValidationError) as exc:
            return _validation_error_response(exc)

        return Response(IntegrationApiKeyDetailSerializer(api_key).data)


class SystemIntegrationApiKeyRotateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["rotate"])
        if forbidden:
            return forbidden

        api_key = get_object_or_404(IntegrationApiKey, pk=pk)
        serializer = IntegrationApiKeyActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            new_key, raw_key = rotate_integration_api_key(
                api_key=api_key,
                user=request.user,
                reason=serializer.validated_data.get("reason", ""),
            )
        except (IntegrationApiKeyError, ValidationError) as exc:
            return _validation_error_response(exc)

        payload = IntegrationApiKeyDetailSerializer(new_key).data
        payload["secret_key"] = raw_key
        payload["secret_warning"] = (
            "Copy this rotated key now. It will not be shown again."
        )

        return Response(payload, status=status.HTTP_201_CREATED)


class SystemIntegrationApiKeyUsageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        forbidden = _require_permission(request, SYSTEM_API_KEY_PERMISSIONS["usage"])
        if forbidden:
            return forbidden

        api_key = get_object_or_404(IntegrationApiKey, pk=pk)
        queryset = IntegrationApiKeyUsageLog.objects.filter(
            api_key=api_key,
        ).order_by("-created_at")

        paginator = SystemIntegrationApiKeyPagination()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = IntegrationApiKeyUsageLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)
