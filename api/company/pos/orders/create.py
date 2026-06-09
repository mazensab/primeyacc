# ============================================================
# 📂 api/company/pos/orders/create.py
# 🧠 PrimeyAcc | Company POS Orders Create API V1.1
# ------------------------------------------------------------
# ✅ Create POS order for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe session lookup inside current company
# ✅ Catches session lookup errors safely
# ✅ Requires open POS session through service layer
# ✅ Uses pos.services.create_pos_order
# ✅ Optional notes/customer fields when supported
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إنشاء Order إلا داخل Session من نفس الشركة
# - منطق إنشاء الطلب يبقى داخل pos/services.py
# - لا يتم إضافة بنود أو دفع من create API
# - صلاحية الإنشاء المطلوبة: company.pos.orders.create
# ============================================================

from __future__ import annotations

import inspect
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.company.pos.sessions.detail import (
    POSSessionDetailAPIError,
    get_pos_session_for_company,
)
from api.permissions import HasAnyCompanyPermission
from pos.services import create_pos_order

from .list import serialize_pos_order


class POSOrderCreateAPIError(Exception):
    """
    Small API-level error for POS order create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderCreateAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _clean_id(value: Any, field_name: str) -> int:
    """
    Safely parse required integer ids.
    """
    if value in [None, ""]:
        raise ValidationError({field_name: f"{field_name} is required."})

    try:
        parsed_id = int(value)
    except (TypeError, ValueError):
        raise ValidationError({field_name: f"Invalid {field_name}."})

    if parsed_id < 1:
        raise ValidationError({field_name: f"Invalid {field_name}."})

    return parsed_id


def _service_accepts_parameter(function, parameter_name: str) -> bool:
    """
    Check whether a service function accepts a given keyword parameter.
    """
    try:
        signature = inspect.signature(function)
    except (TypeError, ValueError):
        return False

    return parameter_name in signature.parameters


def _resolve_session(company, data: dict[str, Any]):
    """
    Resolve POS session safely for current company only.
    """
    session_id = _clean_id(
        data.get("session_id") or data.get("session"),
        "session_id",
    )

    return get_pos_session_for_company(company, session_id)


def _call_create_pos_order_service(*, company, session, user):
    """
    Call create_pos_order safely based on its actual service signature.
    """
    kwargs = {
        "company": company,
        "session": session,
    }

    if _service_accepts_parameter(create_pos_order, "user"):
        kwargs["user"] = user

    if _service_accepts_parameter(create_pos_order, "cashier"):
        kwargs["cashier"] = user

    return create_pos_order(**kwargs)


def _apply_optional_order_fields(order, data: dict[str, Any], user):
    """
    Apply optional payload fields only when matching model fields exist.

    This keeps business rules inside pos/services.py while allowing the API
    to persist light metadata safely.
    """
    update_fields: list[str] = []

    notes = _clean_text(data.get("notes"))
    customer_name = _clean_text(data.get("customer_name"))
    customer_phone = _clean_text(data.get("customer_phone"))
    reference = _clean_text(data.get("reference") or data.get("external_reference"))

    if notes and hasattr(order, "notes"):
        order.notes = notes
        update_fields.append("notes")

    if customer_name and hasattr(order, "customer_name"):
        order.customer_name = customer_name
        update_fields.append("customer_name")

    if customer_phone and hasattr(order, "customer_phone"):
        order.customer_phone = customer_phone
        update_fields.append("customer_phone")

    if reference and hasattr(order, "reference"):
        order.reference = reference
        update_fields.append("reference")

    if reference and hasattr(order, "external_reference"):
        order.external_reference = reference
        update_fields.append("external_reference")

    if hasattr(order, "updated_by"):
        order.updated_by = user if getattr(user, "is_authenticated", False) else None
        update_fields.append("updated_by")

    if update_fields:
        if hasattr(order, "updated_at"):
            update_fields.append("updated_at")

        order.full_clean()
        order.save(update_fields=update_fields)

    return order


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_create(request: Request) -> Response:
    """
    POST /api/company/pos/orders/create/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        session = _resolve_session(company, data)

        order = _call_create_pos_order_service(
            company=company,
            session=session,
            user=request.user,
        )

        order = _apply_optional_order_fields(
            order=order,
            data=data,
            user=request.user,
        )

        serialized_order = serialize_pos_order(order, include_lines=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order created successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_order,
                "result": serialized_order,
            },
            status=201,
        )

    except POSSessionDetailAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except POSOrderCreateAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )

    except ValidationError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS order creation failed.",
                "errors": getattr(exc, "message_dict", None)
                or {"detail": getattr(exc, "messages", [str(exc)])},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "POS order already exists.",
                "errors": {
                    "detail": "POS order could not be created because of a duplicate value.",
                },
            },
            status=400,
        )


pos_order_create.required_company_permissions = [
    "company.pos.orders.create",
]