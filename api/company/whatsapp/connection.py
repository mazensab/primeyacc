# ============================================================
# ?? api/company/whatsapp/connection.py
# ?? Mhamcloud | Company WhatsApp Connection API V1.0
# ------------------------------------------------------------
# ? Company-scoped WhatsApp Gateway connection
# ? Uses request.company only
# ? No frontend company_id/session_name trust
# ? QR / Pairing / Status / Disconnect / Test message
# ============================================================
from __future__ import annotations
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from api.permissions import HasAnyCompanyPermission, require_company_permission
from whatsapp.services import (
    company_whatsapp_create_pairing_code,
    company_whatsapp_create_qr,
    company_whatsapp_disconnect,
    company_whatsapp_send_test_message,
    company_whatsapp_session_status,
    get_or_create_company_whatsapp_connection,
    serialize_company_whatsapp_connection,
    update_company_whatsapp_connection,
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
def _require_manage(request):
    if require_company_permission(request, "company.whatsapp.manage"):
        return None
    return Response(
        {
            "success": False,
            "message": "You do not have permission to manage WhatsApp connection.",
        },
        status=403,
    )
@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_connection(request):
    company, error = _company_or_403(request)
    if error:
        return error
    if request.method == "POST":
        permission_error = _require_manage(request)
        if permission_error:
            return permission_error
        setting = update_company_whatsapp_connection(
            company=company,
            data=request.data or {},
            user=request.user,
        )
        message = "Company WhatsApp connection updated successfully."
    else:
        setting = get_or_create_company_whatsapp_connection(
            company=company,
            user=request.user,
        )
        message = "Company WhatsApp connection loaded successfully."
    return Response(
        {
            "success": True,
            "message": message,
            "connection": serialize_company_whatsapp_connection(setting),
        }
    )
company_whatsapp_connection.required_company_permissions = [
    "company.whatsapp.view",
    "company.whatsapp.manage",
]
@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_connection_status(request):
    company, error = _company_or_403(request)
    if error:
        return error
    payload = company_whatsapp_session_status(
        company=company,
        user=request.user,
    )
    return Response(payload)
company_whatsapp_connection_status.required_company_permissions = [
    "company.whatsapp.view",
    "company.whatsapp.manage",
]
@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_connection_qr(request):
    company, error = _company_or_403(request)
    if error:
        return error
    permission_error = _require_manage(request)
    if permission_error:
        return permission_error
    payload = company_whatsapp_create_qr(
        company=company,
        user=request.user,
    )
    return Response(payload)
company_whatsapp_connection_qr.required_company_permissions = [
    "company.whatsapp.manage",
]
@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_connection_pairing(request):
    company, error = _company_or_403(request)
    if error:
        return error
    permission_error = _require_manage(request)
    if permission_error:
        return permission_error
    phone_number = str(request.data.get("phone_number", "") or "").strip()
    payload = company_whatsapp_create_pairing_code(
        company=company,
        phone_number=phone_number,
        user=request.user,
    )
    return Response(payload)
company_whatsapp_connection_pairing.required_company_permissions = [
    "company.whatsapp.manage",
]
@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_connection_disconnect(request):
    company, error = _company_or_403(request)
    if error:
        return error
    permission_error = _require_manage(request)
    if permission_error:
        return permission_error
    payload = company_whatsapp_disconnect(
        company=company,
        user=request.user,
    )
    return Response(payload)
company_whatsapp_connection_disconnect.required_company_permissions = [
    "company.whatsapp.manage",
]
@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def company_whatsapp_connection_test(request):
    company, error = _company_or_403(request)
    if error:
        return error
    permission_error = _require_manage(request)
    if permission_error:
        return permission_error
    recipient_phone = str(request.data.get("recipient_phone", "") or "").strip()
    message_body = str(request.data.get("message_body", "") or "").strip()
    try:
        payload = company_whatsapp_send_test_message(
            company=company,
            recipient_phone=recipient_phone,
            message_body=message_body,
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
    return Response(payload)
company_whatsapp_connection_test.required_company_permissions = [
    "company.whatsapp.manage",
]
