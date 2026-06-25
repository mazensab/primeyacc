# ============================================================
# 📂 api/system/notifications/views.py
# 🧠 PrimeyAcc | System Notifications API V1.0
# ------------------------------------------------------------
# ✅ GET  /api/system/notifications/
# ✅ GET  /api/system/notifications/unread-count/
# ✅ POST /api/system/notifications/mark-all-read/
# ✅ GET  /api/system/notifications/<id>/
# ✅ POST /api/system/notifications/<id>/read/
# ✅ POST /api/system/notifications/<id>/unread/
# ✅ Uses existing CompanyNotification model
# ✅ System aggregation across companies
# ✅ company_id is filter only after system permission passes
# ✅ No frontend company_id trust for access control
# ============================================================
from __future__ import annotations
from typing import Any
from django.db.models import Q
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response
from notifications.models import CompanyNotification
from notifications.services import serialize_notification
def _safe_has_system_permission(user, permission_code: str) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    try:
        from api.permissions import user_has_system_permission
    except Exception:
        return False
    try:
        return bool(user_has_system_permission(user, permission_code))
    except TypeError:
        try:
            return bool(user_has_system_permission(user=user, permission_code=permission_code))
        except TypeError:
            try:
                return bool(user_has_system_permission(user=user, codename=permission_code))
            except TypeError:
                return False
def _user_is_system_member(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    profile = getattr(user, "primeyacc_profile", None)
    if not profile:
        return bool(getattr(user, "is_staff", False))
    role = (
        getattr(profile, "system_role", "")
        or getattr(profile, "role", "")
        or getattr(profile, "account_type", "")
        or ""
    )
    role = str(role).upper()
    if role in {"SUPER_ADMIN", "SYSTEM_ADMIN", "SUPPORT", "BILLING_MANAGER"}:
        return True
    for flag in ["is_system_user", "is_system_admin", "is_platform_user", "is_staff_user"]:
        if bool(getattr(profile, flag, False)):
            return True
    return bool(getattr(user, "is_staff", False))
def _can_view(user) -> bool:
    return (
        _safe_has_system_permission(user, "system.notifications.view")
        or _safe_has_system_permission(user, "system.notifications.manage")
        or _safe_has_system_permission(user, "system.companies.view")
        or _safe_has_system_permission(user, "system.users.view")
        or _user_is_system_member(user)
    )
def _can_read(user) -> bool:
    return (
        _safe_has_system_permission(user, "system.notifications.read")
        or _safe_has_system_permission(user, "system.notifications.manage")
        or _can_view(user)
    )
def _can_manage(user) -> bool:
    return (
        _safe_has_system_permission(user, "system.notifications.manage")
        or _safe_has_system_permission(user, "system.settings.manage")
        or _safe_has_system_permission(user, "system.users.manage")
        or getattr(user, "is_superuser", False)
    )
def _query(request, key: str, default: Any = "") -> Any:
    query_params = getattr(request, "query_params", None)
    if query_params is not None:
        value = query_params.get(key)
        if value not in [None, ""]:
            return value
    get_params = getattr(request, "GET", None)
    if get_params is not None:
        value = get_params.get(key)
        if value not in [None, ""]:
            return value
    return default
def _bool_value(value: Any) -> bool | None:
    if value in [None, "", "all"]:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "read"}:
        return True
    if normalized in {"0", "false", "no", "unread"}:
        return False
    return None
def _limit_offset(request) -> tuple[int, int]:
    try:
        limit = int(_query(request, "limit", 50))
    except (TypeError, ValueError):
        limit = 50
    try:
        offset = int(_query(request, "offset", 0))
    except (TypeError, ValueError):
        offset = 0
    return max(1, min(limit, 100)), max(0, offset)
def _base_queryset():
    return CompanyNotification.objects.select_related(
        "company",
        "recipient",
        "created_by",
    ).order_by("-created_at", "-id")
def _apply_filters(request, queryset):
    is_read = _bool_value(_query(request, "is_read", ""))
    channel = str(_query(request, "channel", "") or "").strip().upper()
    notification_type = str(_query(request, "notification_type", "") or "").strip().upper()
    priority = str(_query(request, "priority", "") or "").strip().upper()
    source_type = str(_query(request, "source_type", "") or "").strip()
    company_id = str(_query(request, "company_id", "") or "").strip()
    recipient_id = str(_query(request, "recipient_id", "") or "").strip()
    search = str(_query(request, "q", "") or _query(request, "search", "") or "").strip()
    if is_read is not None:
        queryset = queryset.filter(is_read=is_read)
    if channel:
        queryset = queryset.filter(channel=channel)
    if notification_type:
        queryset = queryset.filter(notification_type=notification_type)
    if priority:
        queryset = queryset.filter(priority=priority)
    if source_type:
        queryset = queryset.filter(source_type=source_type)
    if company_id:
        queryset = queryset.filter(company_id=company_id)
    if recipient_id:
        if recipient_id.lower() in {"company", "wide", "null", "none"}:
            queryset = queryset.filter(recipient__isnull=True)
        else:
            queryset = queryset.filter(recipient_id=recipient_id)
    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(message__icontains=search)
            | Q(source_type__icontains=search)
            | Q(source_id__icontains=search)
            | Q(action_url__icontains=search)
            | Q(company__name__icontains=search)
            | Q(company__company_code__icontains=search)
            | Q(recipient__username__icontains=search)
            | Q(recipient__email__icontains=search)
        )
    return queryset
def _user_payload(user):
    if not user:
        return None
    try:
        name = user.get_full_name()
    except Exception:
        name = ""
    return {
        "id": user.id,
        "username": getattr(user, "username", ""),
        "email": getattr(user, "email", ""),
        "name": name or getattr(user, "username", "") or getattr(user, "email", ""),
    }
def _company_payload(company):
    return {
        "id": company.id,
        "name": getattr(company, "display_name", None) or getattr(company, "name", "") or "",
        "code": getattr(company, "company_code", "") or "",
        "status": getattr(company, "status", ""),
        "is_active": getattr(company, "is_active", True),
    }
def _serialize(notification: CompanyNotification) -> dict[str, Any]:
    payload = serialize_notification(notification)
    payload["company"] = _company_payload(notification.company)
    payload["recipient"] = _user_payload(notification.recipient)
    payload["created_by"] = _user_payload(notification.created_by)
    payload["is_company_wide"] = notification.recipient_id is None
    return payload
def _stats(queryset):
    total = queryset.count()
    unread = queryset.filter(is_read=False).count()
    return {
        "total": total,
        "read": total - unread,
        "unread": unread,
        "company_wide": queryset.filter(recipient__isnull=True).count(),
        "user_specific": queryset.filter(recipient__isnull=False).count(),
        "channels": {
            "IN_APP": queryset.filter(channel="IN_APP").count(),
            "EMAIL": queryset.filter(channel="EMAIL").count(),
            "WHATSAPP": queryset.filter(channel="WHATSAPP").count(),
            "SYSTEM": queryset.filter(channel="SYSTEM").count(),
        },
        "types": {
            "INFO": queryset.filter(notification_type="INFO").count(),
            "SUCCESS": queryset.filter(notification_type="SUCCESS").count(),
            "WARNING": queryset.filter(notification_type="WARNING").count(),
            "ERROR": queryset.filter(notification_type="ERROR").count(),
        },
        "priorities": {
            "LOW": queryset.filter(priority="LOW").count(),
            "NORMAL": queryset.filter(priority="NORMAL").count(),
            "HIGH": queryset.filter(priority="HIGH").count(),
            "URGENT": queryset.filter(priority="URGENT").count(),
        },
    }
def _not_allowed(message: str, code: str):
    return Response(
        {
            "success": False,
            "message": message,
            "code": code,
        },
        status=403,
    )
@api_view(["GET"])
def system_notifications_list(request):
    if not _can_view(request.user):
        return _not_allowed(
            "غير مصرح لك بالوصول إلى إشعارات النظام.",
            "SYSTEM_NOTIFICATIONS_VIEW_PERMISSION_REQUIRED",
        )
    queryset = _apply_filters(request, _base_queryset())
    total_count = queryset.count()
    unread_count = queryset.filter(is_read=False).count()
    limit, offset = _limit_offset(request)
    results = [_serialize(item) for item in queryset[offset : offset + limit]]
    stats = _stats(queryset)
    return Response(
        {
            "success": True,
            "message": "تم جلب إشعارات النظام بنجاح.",
            "count": total_count,
            "unread_count": unread_count,
            "limit": limit,
            "offset": offset,
            "results": results,
            "notifications": results,
            "stats": stats,
            "data": {
                "items": results,
                "results": results,
                "count": total_count,
                "unread_count": unread_count,
                "stats": stats,
                "limit": limit,
                "offset": offset,
            },
        }
    )
@api_view(["GET"])
def system_notifications_unread_count(request):
    if not _can_view(request.user):
        return _not_allowed(
            "غير مصرح لك بالوصول إلى عداد إشعارات النظام.",
            "SYSTEM_NOTIFICATIONS_VIEW_PERMISSION_REQUIRED",
        )
    queryset = _apply_filters(request, _base_queryset())
    return Response(
        {
            "success": True,
            "unread_count": queryset.filter(is_read=False).count(),
        }
    )
@api_view(["GET"])
def system_notification_detail(request, notification_id: int):
    if not _can_view(request.user):
        return _not_allowed(
            "غير مصرح لك بالوصول إلى تفاصيل الإشعار.",
            "SYSTEM_NOTIFICATIONS_VIEW_PERMISSION_REQUIRED",
        )
    notification = _base_queryset().filter(id=notification_id).first()
    if not notification:
        return Response(
            {
                "success": False,
                "message": "الإشعار غير موجود.",
            },
            status=404,
        )
    item = _serialize(notification)
    return Response(
        {
            "success": True,
            "notification": item,
            "data": {
                "notification": item,
            },
        }
    )
@api_view(["POST"])
def system_notification_mark_read(request, notification_id: int):
    if not _can_read(request.user):
        return _not_allowed(
            "غير مصرح لك بتحديث حالة الإشعار.",
            "SYSTEM_NOTIFICATIONS_READ_PERMISSION_REQUIRED",
        )
    notification = _base_queryset().filter(id=notification_id).first()
    if not notification:
        return Response(
            {
                "success": False,
                "message": "الإشعار غير موجود.",
            },
            status=404,
        )
    notification.mark_as_read()
    item = _serialize(notification)
    return Response(
        {
            "success": True,
            "message": "تم تعليم الإشعار كمقروء.",
            "notification": item,
        }
    )
@api_view(["POST"])
def system_notification_mark_unread(request, notification_id: int):
    if not _can_read(request.user):
        return _not_allowed(
            "غير مصرح لك بتحديث حالة الإشعار.",
            "SYSTEM_NOTIFICATIONS_READ_PERMISSION_REQUIRED",
        )
    notification = _base_queryset().filter(id=notification_id).first()
    if not notification:
        return Response(
            {
                "success": False,
                "message": "الإشعار غير موجود.",
            },
            status=404,
        )
    notification.mark_as_unread()
    item = _serialize(notification)
    return Response(
        {
            "success": True,
            "message": "تم تعليم الإشعار كغير مقروء.",
            "notification": item,
        }
    )
@api_view(["POST"])
def system_notifications_mark_all_read(request):
    if not _can_manage(request.user):
        return _not_allowed(
            "غير مصرح لك بتعليم كل إشعارات النظام كمقروءة.",
            "SYSTEM_NOTIFICATIONS_MANAGE_PERMISSION_REQUIRED",
        )
    queryset = _apply_filters(request, _base_queryset())
    now = timezone.now()
    updated_count = queryset.filter(is_read=False).update(
        is_read=True,
        read_at=now,
        updated_at=now,
    )
    return Response(
        {
            "success": True,
            "message": "تم تعليم الإشعارات كمقروءة.",
            "updated_count": updated_count,
            "unread_count": queryset.filter(is_read=False).count(),
        }
    )
