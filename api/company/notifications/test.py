# ============================================================
# 📂 api/company/notifications/test.py
# 🧠 Mhamcloud | Company Notifications Test API V1.1
# ------------------------------------------------------------
# ✅ POST /api/company/notifications/test/
# ✅ Tenant-isolated by request.company
# ✅ Creates one safe test notification for current user/company
# ✅ No company_id is accepted from frontend
# ✅ Uses the same notification model resolved by notifications.services
# ============================================================
from __future__ import annotations
from uuid import uuid4
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from api.permissions import HasAnyCompanyPermission
from notifications.services import (
    get_company_notifications_queryset,
    serialize_notification,
)
def _has_field(model, field_name: str) -> bool:
    return any(field.name == field_name for field in model._meta.fields)
def _set_if_field(payload: dict, model, field_name: str, value) -> None:
    if _has_field(model, field_name):
        payload[field_name] = value
def _clean_text(value, fallback: str, max_length: int = 255) -> str:
    text = str(value or "").strip() or fallback
    return text[:max_length]
def _resolve_notification_model(*, company, user):
    queryset = get_company_notifications_queryset(
        company=company,
        user=user,
        include_company_wide=True,
    )
    return queryset.model
def _create_test_notification(*, company, user, title: str, message: str):
    Notification = _resolve_notification_model(company=company, user=user)
    payload = {}
    _set_if_field(payload, Notification, "company", company)
    _set_if_field(payload, Notification, "tenant", company)
    if _has_field(Notification, "user"):
        payload["user"] = user
    elif _has_field(Notification, "recipient"):
        payload["recipient"] = user
    elif _has_field(Notification, "recipient_user"):
        payload["recipient_user"] = user
    _set_if_field(payload, Notification, "title", title)
    _set_if_field(payload, Notification, "subject", title)
    _set_if_field(payload, Notification, "heading", title)
    _set_if_field(payload, Notification, "message", message)
    _set_if_field(payload, Notification, "body", message)
    _set_if_field(payload, Notification, "description", message)
    _set_if_field(payload, Notification, "content", message)
    _set_if_field(payload, Notification, "channel", "IN_APP")
    _set_if_field(payload, Notification, "notification_type", "INFO")
    _set_if_field(payload, Notification, "type", "INFO")
    _set_if_field(payload, Notification, "severity", "info")
    _set_if_field(payload, Notification, "priority", "NORMAL")
    _set_if_field(payload, Notification, "source_type", "company_notification_test")
    _set_if_field(payload, Notification, "source_id", str(uuid4())[:12])
    _set_if_field(payload, Notification, "reference", "company-notification-test")
    _set_if_field(payload, Notification, "is_read", False)
    _set_if_field(payload, Notification, "read", False)
    _set_if_field(payload, Notification, "is_company_wide", False)
    _set_if_field(payload, Notification, "company_wide", False)
    _set_if_field(payload, Notification, "link", "/company/notifications")
    _set_if_field(payload, Notification, "action_url", "/company/notifications")
    _set_if_field(payload, Notification, "metadata", {"test": True})
    _set_if_field(payload, Notification, "created_by", user)
    _set_if_field(payload, Notification, "updated_by", user)
    with transaction.atomic():
        return Notification.objects.create(**payload)
@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_notifications_create_test(request):
    company = getattr(request, "company", None)
    if not company:
        return Response(
            {
                "success": False,
                "message": "Company context was not resolved.",
            },
            status=403,
        )
    payload = request.data if isinstance(request.data, dict) else {}
    title = _clean_text(
        payload.get("title"),
        "إشعار اختبار من مساحة الشركة",
        max_length=180,
    )
    message = _clean_text(
        payload.get("message"),
        "تم إنشاء هذا الإشعار للتأكد من عمل مركز إشعارات الشركة.",
        max_length=500,
    )
    try:
        notification = _create_test_notification(
            company=company,
            user=request.user,
            title=title,
            message=message,
        )
    except Exception as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    return Response(
        {
            "success": True,
            "message": "Test notification created.",
            "notification": serialize_notification(notification),
        },
        status=201,
    )
company_notifications_create_test.required_company_permissions = [
    "company.notifications.view",
]