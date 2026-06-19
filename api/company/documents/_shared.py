# ============================================================
# 📂 api/company/documents/_shared.py
# 🧠 PrimeyAcc | Company Documents API Shared Helpers V1.0
# ------------------------------------------------------------
# ✅ Shared company context helper
# ✅ Shared payload normalization
# ✅ Shared validation response builder
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response


class CompanyDocumentsAPIError(Exception):
    """
    Small API-level error for company documents endpoints.
    """


def get_request_company(request: Request):
    """
    Return company resolved by /api/company guard.
    """
    company = getattr(request, "company", None)

    if not company:
        raise CompanyDocumentsAPIError("Current company context was not resolved.")

    return company


def get_request_payload(request: Request) -> dict[str, Any]:
    """
    Merge query params and JSON body safely.
    """
    payload: dict[str, Any] = {}

    query_params = getattr(request, "query_params", None)
    if query_params is not None:
        payload.update(query_params.dict())

    try:
        data = request.data
    except Exception:
        data = {}

    if isinstance(data, dict):
        payload.update(data)

    return payload


def validation_error_payload(exc: ValidationError) -> dict[str, Any]:
    """
    Convert Django ValidationError into a safe API payload.
    """
    if hasattr(exc, "message_dict"):
        return exc.message_dict

    if hasattr(exc, "messages"):
        return {"detail": exc.messages}

    return {"detail": str(exc)}


def error_response(message: str, *, status_code: int = status.HTTP_400_BAD_REQUEST) -> Response:
    """
    Return consistent error response.
    """
    return Response(
        {
            "ok": False,
            "success": False,
            "message": message,
            "errors": {"detail": message},
        },
        status=status_code,
    )


def validation_error_response(exc: ValidationError) -> Response:
    """
    Return consistent validation error response.
    """
    return Response(
        {
            "ok": False,
            "success": False,
            "message": "Document request is invalid.",
            "errors": validation_error_payload(exc),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )
