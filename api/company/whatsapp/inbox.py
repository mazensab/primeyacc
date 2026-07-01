# ============================================================
# ?? api/company/whatsapp/inbox.py
# ?? Mhamcloud | Company WhatsApp Inbox API V1.0
# ------------------------------------------------------------
# ? Company-scoped WhatsApp conversations
# ? Uses request.company only
# ? No frontend company_id/session_name trust
# ? List / detail / messages / reply
# ============================================================
from __future__ import annotations
from django.db.models import Q
from rest_framework import status as drf_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from api.permissions import HasAnyCompanyPermission
from whatsapp.models import WhatsAppConversation, WhatsAppInboxScope
from whatsapp.services import (
    get_or_create_company_whatsapp_connection,
    send_system_whatsapp_inbox_reply,
    serialize_whatsapp_inbox_conversation,
    serialize_whatsapp_inbox_message,
    serialize_whatsapp_inbox_summary,
)
def _company_or_403(request):
    company = getattr(request, "company", None)
    if not company:
        return None, Response(
            {
                "success": False,
                "message": "Company context was not resolved.",
            },
            status=403,
        )
    return company, None
def _company_session_name(company, user=None) -> str:
    setting = get_or_create_company_whatsapp_connection(company=company, user=user)
    config = dict(setting.provider_config or {})
    return str(config.get("session_name") or f"company-{company.id}-whatsapp").strip()
def _company_conversations_queryset(company, user=None):
    session_name = _company_session_name(company, user=user)
    return (
        WhatsAppConversation.objects
        .select_related("contact", "assigned_to")
        .filter(
            scope=WhatsAppInboxScope.COMPANY,
            company=company,
            session_name=session_name,
        )
        .order_by("-is_pinned", "-last_message_at", "-updated_at", "-id")
    )
def _parse_int(value, default: int, minimum: int = 0, maximum: int = 100000) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    if number < minimum:
        number = minimum
    if number > maximum:
        number = maximum
    return number
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_conversations_list(request):
    company, error = _company_or_403(request)
    if error:
        return error
    queryset = _company_conversations_queryset(company, user=request.user)
    status_value = str(request.query_params.get("status") or "").strip().upper()
    if status_value and status_value != "ALL":
        queryset = queryset.filter(status=status_value)
    search = str(
        request.query_params.get("q")
        or request.query_params.get("search")
        or ""
    ).strip()
    if search:
        queryset = queryset.filter(
            Q(contact__display_name__icontains=search)
            | Q(contact__push_name__icontains=search)
            | Q(contact__phone_number__icontains=search)
            | Q(contact__normalized_phone__icontains=search)
            | Q(contact__whatsapp_jid__icontains=search)
            | Q(last_message_preview__icontains=search)
        )
    if str(request.query_params.get("unread") or "").lower() in {"1", "true", "yes"}:
        queryset = queryset.filter(unread_count__gt=0)
    page = _parse_int(request.query_params.get("page"), 1, minimum=1)
    page_size = _parse_int(
        request.query_params.get("page_size") or request.query_params.get("limit"),
        25,
        minimum=1,
        maximum=100,
    )
    offset = _parse_int(request.query_params.get("offset"), (page - 1) * page_size, minimum=0)
    total = queryset.count()
    items = list(queryset[offset: offset + page_size])
    session_name = _company_session_name(company, user=request.user)
    return Response(
        {
            "success": True,
            "message": "Company WhatsApp conversations loaded successfully.",
            "summary": serialize_whatsapp_inbox_summary(
                scope=WhatsAppInboxScope.COMPANY,
                company=company,
                session_name=session_name,
            ),
            "count": total,
            "limit": page_size,
            "offset": offset,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "has_next": offset + page_size < total,
            },
            "conversations": [
                serialize_whatsapp_inbox_conversation(item)
                for item in items
            ],
            "results": [
                serialize_whatsapp_inbox_conversation(item)
                for item in items
            ],
        }
    )
company_whatsapp_conversations_list.required_company_permissions = [
    "company.whatsapp.messages.view",
    "company.whatsapp.messages.manage",
]
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_conversation_detail(request, conversation_id: int):
    company, error = _company_or_403(request)
    if error:
        return error
    conversation = _company_conversations_queryset(company, user=request.user).filter(
        id=conversation_id,
    ).first()
    if not conversation:
        return Response(
            {
                "success": False,
                "message": "Company WhatsApp conversation was not found.",
            },
            status=404,
        )
    return Response(
        {
            "success": True,
            "message": "Company WhatsApp conversation loaded successfully.",
            "conversation": serialize_whatsapp_inbox_conversation(conversation),
        }
    )
company_whatsapp_conversation_detail.required_company_permissions = [
    "company.whatsapp.messages.view",
    "company.whatsapp.messages.manage",
]
@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_conversation_messages(request, conversation_id: int):
    company, error = _company_or_403(request)
    if error:
        return error
    conversation = _company_conversations_queryset(company, user=request.user).filter(
        id=conversation_id,
    ).first()
    if not conversation:
        return Response(
            {
                "success": False,
                "message": "Company WhatsApp conversation was not found.",
            },
            status=404,
        )
    messages = (
        conversation.messages
        .select_related("contact", "sent_by")
        .order_by("created_at", "id")
    )
    if conversation.unread_count:
        conversation.unread_count = 0
        conversation.save(update_fields=["unread_count", "updated_at"])
    return Response(
        {
            "success": True,
            "message": "Company WhatsApp conversation messages loaded successfully.",
            "conversation": serialize_whatsapp_inbox_conversation(conversation),
            "messages": [
                serialize_whatsapp_inbox_message(item)
                for item in messages
            ],
        }
    )
company_whatsapp_conversation_messages.required_company_permissions = [
    "company.whatsapp.messages.view",
    "company.whatsapp.messages.manage",
]
@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_conversation_reply(request, conversation_id: int):
    company, error = _company_or_403(request)
    if error:
        return error
    conversation = _company_conversations_queryset(company, user=request.user).filter(
        id=conversation_id,
    ).first()
    if not conversation:
        return Response(
            {
                "success": False,
                "message": "Company WhatsApp conversation was not found.",
            },
            status=404,
        )
    body = str(
        request.data.get("body")
        or request.data.get("message")
        or request.data.get("text")
        or ""
    ).strip()
    if not body:
        return Response(
            {
                "success": False,
                "message": "Reply body is required.",
                "errors": {"body": "Reply body is required."},
            },
            status=400,
        )
    try:
        payload = send_system_whatsapp_inbox_reply(
            conversation=conversation,
            body=body,
            user=request.user,
        )
    except ValueError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=400,
        )
    return Response(
        payload,
        status=200 if payload.get("success") else drf_status.HTTP_502_BAD_GATEWAY,
    )
company_whatsapp_conversation_reply.required_company_permissions = [
    "company.whatsapp.manage",
    "company.whatsapp.messages.manage",
]
