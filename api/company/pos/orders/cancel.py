# ============================================================
# 📂 api/company/pos/orders/cancel.py
# 🧠 Mhamcloud | Company POS Orders Cancel API V1.0
# ------------------------------------------------------------
# ✅ Cancel POS order for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe order lookup inside current company
# ✅ Uses pos.services.cancel_pos_order when available
# ✅ Safe service signature handling
# ✅ Optional cancellation reason/notes support
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إلغاء Order إلا إذا كان داخل نفس الشركة
# - منطق الإلغاء الأساسي يبقى داخل pos/services.py إن كان موجودًا
# - لا يتم حذف الطلب من قاعدة البيانات
# - صلاحية الإلغاء المطلوبة: company.pos.orders.cancel
# ============================================================

from __future__ import annotations

import inspect
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSOrderStatus

try:
    from pos.services import cancel_pos_order
except ImportError:  # pragma: no cover
    cancel_pos_order = None

from .detail import get_pos_order_for_company
from .list import serialize_pos_order


class POSOrderCancelAPIError(Exception):
    """
    Small API-level error for POS order cancel endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderCancelAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _service_accepts_parameter(function, parameter_name: str) -> bool:
    """
    Check whether a service function accepts a given keyword parameter.
    """
    if function is None:
        return False

    try:
        signature = inspect.signature(function)
    except (TypeError, ValueError):
        return False

    return parameter_name in signature.parameters


def _validate_order_allows_cancellation(order) -> None:
    """
    Validate whether POS order can be cancelled.
    """
    if getattr(order, "status", "") == POSOrderStatus.CANCELLED:
        raise ValidationError(
            {
                "status": "POS order is already cancelled.",
            }
        )


def _call_cancel_pos_order_service(*, company, order, cancellation_reason: str, user):
    """
    Call cancel_pos_order safely when the service exists.

    If Phase 13.1 service does not provide cancel_pos_order yet, fallback to a
    minimal safe model update while preserving tenant isolation and validation.
    """
    if cancel_pos_order is None:
        return _fallback_cancel_order(
            order=order,
            cancellation_reason=cancellation_reason,
            user=user,
        )

    kwargs = {
        "company": company,
        "order": order,
    }

    if _service_accepts_parameter(cancel_pos_order, "user"):
        kwargs["user"] = user

    if _service_accepts_parameter(cancel_pos_order, "cancelled_by"):
        kwargs["cancelled_by"] = user

    if _service_accepts_parameter(cancel_pos_order, "cancellation_reason"):
        kwargs["cancellation_reason"] = cancellation_reason
    elif _service_accepts_parameter(cancel_pos_order, "reason"):
        kwargs["reason"] = cancellation_reason
    elif _service_accepts_parameter(cancel_pos_order, "cancel_reason"):
        kwargs["cancel_reason"] = cancellation_reason
    elif _service_accepts_parameter(cancel_pos_order, "notes"):
        kwargs["notes"] = cancellation_reason

    return cancel_pos_order(**kwargs)


def _fallback_cancel_order(*, order, cancellation_reason: str, user):
    """
    Minimal safe fallback if pos.services.cancel_pos_order does not exist.

    This fallback does not delete order, does not reverse inventory, and does not
    touch accounting. It only marks the order as cancelled.
    """
    _validate_order_allows_cancellation(order)

    update_fields = ["status"]
    order.status = POSOrderStatus.CANCELLED

    if hasattr(order, "cancelled_at"):
        order.cancelled_at = timezone.now()
        update_fields.append("cancelled_at")

    if hasattr(order, "cancelled_by"):
        order.cancelled_by = user if getattr(user, "is_authenticated", False) else None
        update_fields.append("cancelled_by")

    if cancellation_reason and hasattr(order, "cancellation_reason"):
        order.cancellation_reason = cancellation_reason
        update_fields.append("cancellation_reason")

    if cancellation_reason and hasattr(order, "cancel_reason"):
        order.cancel_reason = cancellation_reason
        update_fields.append("cancel_reason")

    if hasattr(order, "updated_by"):
        order.updated_by = user if getattr(user, "is_authenticated", False) else None
        update_fields.append("updated_by")

    if hasattr(order, "updated_at"):
        update_fields.append("updated_at")

    order.full_clean()
    order.save(update_fields=update_fields)

    return order


def _apply_optional_cancellation_fields(order, data: dict[str, Any], user):
    """
    Apply optional cancellation metadata only when matching model fields exist.
    """
    update_fields: list[str] = []

    cancellation_reason = _clean_text(
        data.get("cancellation_reason")
        or data.get("reason")
        or data.get("cancel_reason")
        or ""
    )
    notes = _clean_text(data.get("notes"))

    if cancellation_reason and hasattr(order, "cancellation_reason"):
        order.cancellation_reason = cancellation_reason
        update_fields.append("cancellation_reason")

    if cancellation_reason and hasattr(order, "cancel_reason"):
        order.cancel_reason = cancellation_reason
        update_fields.append("cancel_reason")

    if notes and hasattr(order, "notes"):
        order.notes = notes
        update_fields.append("notes")

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
def pos_order_cancel(request: Request, order_id: int) -> Response:
    """
    POST /api/company/pos/orders/<order_id>/cancel/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        order = get_pos_order_for_company(company, order_id)
        _validate_order_allows_cancellation(order)

        cancellation_reason = _clean_text(
            data.get("cancellation_reason")
            or data.get("reason")
            or data.get("cancel_reason")
            or ""
        )

        order = _call_cancel_pos_order_service(
            company=company,
            order=order,
            cancellation_reason=cancellation_reason,
            user=request.user,
        )

        order = _apply_optional_cancellation_fields(
            order=order,
            data=data,
            user=request.user,
        )

        order = get_pos_order_for_company(company, order.id)
        serialized_order = serialize_pos_order(order, include_lines=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order cancelled successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "item": serialized_order,
                "result": serialized_order,
            },
            status=200,
        )

    except POSOrderCancelAPIError as exc:
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
                "message": "POS order cancellation failed.",
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
                "message": "POS order cancellation failed.",
                "errors": {
                    "detail": "POS order cancellation failed because of a database integrity error.",
                },
            },
            status=400,
        )


pos_order_cancel.required_company_permissions = [
    "company.pos.orders.cancel",
    "company.pos.orders.update",
]