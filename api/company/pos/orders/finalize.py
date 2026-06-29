# ============================================================
# 📂 api/company/pos/orders/finalize.py
# 🧠 Mhamcloud | Company POS Orders Finalize API V1.0
# ------------------------------------------------------------
# ✅ Finalize POS order for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe order lookup inside current company
# ✅ Prevent finalizing cancelled orders
# ✅ Prevent finalizing orders without items
# ✅ Prevent finalizing unpaid orders
# ✅ Uses pos.services finalization function if available
# ✅ Safe fallback to COMPLETED status when service is not available
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - لا يتم إنهاء Order إلا إذا كان داخل نفس الشركة
# - لا يتم حذف الطلب
# - لا يتم ترحيل محاسبي أو خصم مخزون إضافي من هذا الملف
# - أي منطق أعمق لاحقًا يكون داخل pos/services.py
# - صلاحية الإنهاء المطلوبة: company.pos.orders.finalize
# ============================================================

from __future__ import annotations

import inspect
from decimal import Decimal
from typing import Any

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSOrderStatus, POSPaymentStatus

try:
    from pos.services import complete_pos_order
except ImportError:  # pragma: no cover
    complete_pos_order = None

try:
    from pos.services import finalize_pos_order
except ImportError:  # pragma: no cover
    finalize_pos_order = None

from .detail import get_pos_order_for_company
from .list import serialize_pos_order


class POSOrderFinalizeAPIError(Exception):
    """
    Small API-level error for POS order finalize endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSOrderFinalizeAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize request text.
    """
    return str(value or "").strip()


def _decimal(value: Any) -> Decimal:
    """
    Safely convert value to Decimal.
    """
    try:
        return Decimal(str(value or "0.00"))
    except Exception:
        return Decimal("0.00")


def _enum_value(enum_class, name: str, fallback: str) -> str:
    """
    Return enum value safely when a choice attribute may not exist.
    """
    return getattr(enum_class, name, fallback)


def _choice_exists(enum_class, value: str) -> bool:
    """
    Check whether a value exists in TextChoices choices.
    """
    return value in [choice_value for choice_value, _label in enum_class.choices]


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


def _get_items_count(order) -> int:
    """
    Return POS order items count safely.
    """
    manager = getattr(order, "items", None) or getattr(order, "lines", None)

    if manager is None:
        return 0

    try:
        return manager.count()
    except Exception:
        return 0


def _calculate_remaining_amount(order) -> Decimal:
    """
    Calculate remaining amount from actual POSOrder fields.
    """
    total_amount = _decimal(getattr(order, "total_amount", Decimal("0.00")))
    paid_amount = _decimal(getattr(order, "paid_amount", Decimal("0.00")))
    remaining = total_amount - paid_amount

    if remaining < Decimal("0.00"):
        return Decimal("0.00")

    return remaining


def _validate_order_allows_finalization(order) -> None:
    """
    Validate whether POS order can be finalized.
    """
    cancelled_status = _enum_value(POSOrderStatus, "CANCELLED", "CANCELLED")
    completed_status = _enum_value(POSOrderStatus, "COMPLETED", "COMPLETED")
    paid_status = _enum_value(POSPaymentStatus, "PAID", "PAID")

    if getattr(order, "status", "") == cancelled_status:
        raise ValidationError(
            {
                "status": "Cancelled POS orders cannot be finalized.",
            }
        )

    if getattr(order, "status", "") == completed_status:
        raise ValidationError(
            {
                "status": "POS order is already finalized.",
            }
        )

    if _get_items_count(order) < 1:
        raise ValidationError(
            {
                "items": "POS order cannot be finalized without items.",
            }
        )

    payment_status = getattr(order, "payment_status", "")
    remaining_amount = _calculate_remaining_amount(order)

    if payment_status != paid_status and remaining_amount > Decimal("0.00"):
        raise ValidationError(
            {
                "payment_status": "POS order cannot be finalized before full payment.",
            }
        )


def _select_finalize_service():
    """
    Return available POS finalization service if any.
    """
    if finalize_pos_order is not None:
        return finalize_pos_order

    if complete_pos_order is not None:
        return complete_pos_order

    return None


def _call_finalize_service(*, company, order, user, notes: str):
    """
    Call available finalization service safely based on actual signature.
    """
    service = _select_finalize_service()

    if service is None:
        return _fallback_finalize_order(
            order=order,
            user=user,
            notes=notes,
        )

    kwargs = {
        "company": company,
        "order": order,
    }

    if _service_accepts_parameter(service, "user"):
        kwargs["user"] = user

    if _service_accepts_parameter(service, "completed_by"):
        kwargs["completed_by"] = user

    if _service_accepts_parameter(service, "finalized_by"):
        kwargs["finalized_by"] = user

    if _service_accepts_parameter(service, "notes"):
        kwargs["notes"] = notes

    return service(**kwargs)


def _fallback_finalize_order(*, order, user, notes: str):
    """
    Minimal safe fallback if no service finalization function exists.

    This fallback only changes the order status to COMPLETED when supported.
    It does not post accounting, does not update inventory, and does not create
    extra financial records.
    """
    _validate_order_allows_finalization(order)

    completed_status = _enum_value(POSOrderStatus, "COMPLETED", "COMPLETED")

    if not _choice_exists(POSOrderStatus, completed_status):
        raise ValidationError(
            {
                "status": "POS completed status is not configured.",
            }
        )

    update_fields = ["status"]
    order.status = completed_status

    if hasattr(order, "completed_at"):
        order.completed_at = timezone.now()
        update_fields.append("completed_at")

    if hasattr(order, "completed_by"):
        order.completed_by = user if getattr(user, "is_authenticated", False) else None
        update_fields.append("completed_by")

    if notes and hasattr(order, "notes"):
        current_notes = _clean_text(getattr(order, "notes", ""))
        order.notes = f"{current_notes}\n{notes}".strip() if current_notes else notes
        update_fields.append("notes")

    if hasattr(order, "updated_by"):
        order.updated_by = user if getattr(user, "is_authenticated", False) else None
        update_fields.append("updated_by")

    if hasattr(order, "updated_at"):
        update_fields.append("updated_at")

    order.full_clean()
    order.save(update_fields=update_fields)

    return order


@api_view(["POST"])
@permission_classes([HasAnyCompanyPermission])
def pos_order_finalize(request: Request, order_id: int) -> Response:
    """
    POST /api/company/pos/orders/<order_id>/finalize/
    """
    try:
        company = _get_request_company(request)
        data = request.data or {}

        order = get_pos_order_for_company(company, order_id)
        _validate_order_allows_finalization(order)

        notes = _clean_text(data.get("notes") or data.get("finalization_notes"))

        order = _call_finalize_service(
            company=company,
            order=order,
            user=request.user,
            notes=notes,
        )

        order = get_pos_order_for_company(company, order.id)
        serialized_order = serialize_pos_order(order, include_lines=True)

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS order finalized successfully.",
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

    except POSOrderFinalizeAPIError as exc:
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
                "message": "POS order finalization failed.",
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
                "message": "POS order finalization failed.",
                "errors": {
                    "detail": "POS order finalization failed because of a database integrity error.",
                },
            },
            status=400,
        )


pos_order_finalize.required_company_permissions = [
    "company.pos.orders.finalize",
    "company.pos.orders.update",
]