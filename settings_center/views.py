# ============================================================
# 📂 settings_center/views.py
# PrimeyAcc | System Settings Center API Views
# ------------------------------------------------------------
# ✅ Backend only
# ✅ System workspace endpoints
# ✅ Role-aware permission guard
# ✅ List/create/update/seed/reset/bulk/summary
# ============================================================

from __future__ import annotations

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SystemSetting
from .serializers import (
    SystemSettingBulkUpdateItemSerializer,
    SystemSettingSerializer,
)
from .services import (
    get_system_settings_summary,
    reset_setting_to_default,
    seed_default_system_settings,
    set_system_setting_value,
)


SYSTEM_SETTINGS_READ_ROLES = {
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "SUPPORT",
    "BILLING_MANAGER",
}

SYSTEM_SETTINGS_WRITE_ROLES = {
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
}


def _collect_user_role_values(user) -> set[str]:
    role_values: set[str] = set()

    for attr in ("role", "system_role", "user_type", "account_type"):
        value = getattr(user, attr, None)
        if value:
            role_values.add(str(value).upper())

    for rel_name in ("system_memberships", "memberships", "company_memberships", "companymembership_set"):
        rel = getattr(user, rel_name, None)
        if rel is None:
            continue
        try:
            for item in rel.all():
                for attr in ("role", "system_role", "user_type"):
                    value = getattr(item, attr, None)
                    if value:
                        role_values.add(str(value).upper())
        except Exception:
            continue

    return role_values


class IsSystemSettingsUser(permissions.BasePermission):
    """Allow only authenticated platform system users to access system settings."""

    message = "You do not have permission to access system settings."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if getattr(user, "is_superuser", False):
            return True

        role_values = _collect_user_role_values(user)

        if request.method in permissions.SAFE_METHODS:
            return bool(role_values & SYSTEM_SETTINGS_READ_ROLES)

        return bool(role_values & SYSTEM_SETTINGS_WRITE_ROLES)


class SystemSettingQuerysetMixin:
    serializer_class = SystemSettingSerializer
    permission_classes = [IsSystemSettingsUser]

    def get_queryset(self):
        qs = SystemSetting.objects.select_related("updated_by").all()

        group = self.request.query_params.get("group")
        if group:
            qs = qs.filter(group=group)

        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=str(is_active).lower() in {"1", "true", "yes"})

        is_public = self.request.query_params.get("is_public")
        if is_public is not None:
            qs = qs.filter(is_public=str(is_public).lower() in {"1", "true", "yes"})

        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(group__icontains=q)
                | Q(key__icontains=q)
                | Q(label_ar__icontains=q)
                | Q(label_en__icontains=q)
                | Q(description_ar__icontains=q)
                | Q(description_en__icontains=q)
            )

        return qs


class SystemSettingListCreateAPIView(SystemSettingQuerysetMixin, generics.ListCreateAPIView):
    pass


class SystemSettingDetailAPIView(SystemSettingQuerysetMixin, generics.RetrieveUpdateAPIView):
    lookup_field = "pk"


class SystemSettingsSummaryAPIView(APIView):
    permission_classes = [IsSystemSettingsUser]

    def get(self, request):
        return Response(get_system_settings_summary(), status=status.HTTP_200_OK)


class SystemSettingsSeedDefaultsAPIView(APIView):
    permission_classes = [IsSystemSettingsUser]

    def post(self, request):
        result = seed_default_system_settings(actor=request.user)
        return Response(
            {
                "detail": "Default system settings seeded successfully.",
                **result,
                "summary": get_system_settings_summary(),
            },
            status=status.HTTP_200_OK,
        )


class SystemSettingResetAPIView(APIView):
    permission_classes = [IsSystemSettingsUser]

    def post(self, request, pk: int):
        setting = generics.get_object_or_404(SystemSetting, pk=pk)
        setting = reset_setting_to_default(setting, actor=request.user)
        return Response(SystemSettingSerializer(setting, context={"request": request}).data)


class SystemSettingsBulkUpdateAPIView(APIView):
    permission_classes = [IsSystemSettingsUser]

    @transaction.atomic
    def patch(self, request):
        serializer = SystemSettingBulkUpdateItemSerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)

        updated_settings = []

        for item in serializer.validated_data:
            setting = generics.get_object_or_404(
                SystemSetting,
                group=item["group"],
                key=item["key"],
            )
            try:
                updated_settings.append(
                    set_system_setting_value(
                        setting,
                        item["value"],
                        actor=request.user,
                    )
                )
            except DjangoValidationError as exc:
                return Response(
                    {
                        "detail": "Invalid setting value.",
                        "setting": setting.full_key,
                        "errors": exc.messages,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response(
            {
                "detail": "System settings updated successfully.",
                "results": SystemSettingSerializer(
                    updated_settings,
                    many=True,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )