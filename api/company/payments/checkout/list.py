# ============================================================
# 📂 api/company/payments/checkout/list.py
# 🧠 Mhamcloud | Company Payment Checkout List/Create API V1.0
# ------------------------------------------------------------
# ✅ Company-scoped checkout sessions
# ✅ Generic real gateway checkout foundation
# ✅ Safe gateway/method/terminal resolution
# ✅ Search, status, source and gateway filters
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.exceptions import ValidationError
from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db import IntegrityError
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from payments.models import (
    CompanyPaymentGateway,
    CompanyPaymentMethod,
    CompanyPaymentTerminal,
    PaymentCheckoutSession,
)
from payments.services import create_checkout_session, serialize_checkout_session


class PaymentCheckoutListAPIError(Exception):
    pass


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentCheckoutListAPIError("Current company context was not resolved.")
    return company


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    return _clean_text(value).upper()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default
    if number < 1:
        number = default
    if maximum is not None:
        number = min(number, maximum)
    return number


def _get_gateway_for_company(company, gateway_id: Any):
    if gateway_id in [None, ""]:
        return None
    try:
        gateway_id = int(gateway_id)
    except (TypeError, ValueError):
        raise ValidationError({"gateway_id": "Invalid gateway id."})
    gateway = CompanyPaymentGateway.objects.filter(company=company, id=gateway_id).first()
    if not gateway:
        raise ValidationError({"gateway_id": "Payment gateway was not found."})
    return gateway


def _get_method_for_company(company, method_id: Any):
    if method_id in [None, ""]:
        return None
    try:
        method_id = int(method_id)
    except (TypeError, ValueError):
        raise ValidationError({"payment_method_id": "Invalid payment method id."})
    method = CompanyPaymentMethod.objects.select_related("gateway").filter(company=company, id=method_id).first()
    if not method:
        raise ValidationError({"payment_method_id": "Payment method was not found."})
    return method


def _get_terminal_for_company(company, terminal_id: Any):
    if terminal_id in [None, ""]:
        return None
    try:
        terminal_id = int(terminal_id)
    except (TypeError, ValueError):
        raise ValidationError({"terminal_id": "Invalid terminal id."})
    terminal = CompanyPaymentTerminal.objects.filter(company=company, id=terminal_id).first()
    if not terminal:
        raise ValidationError({"terminal_id": "Payment terminal was not found."})
    return terminal


def get_checkout_queryset(company):
    return PaymentCheckoutSession.objects.filter(company=company)


def serialize_checkout_choices() -> dict[str, Any]:
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in PaymentCheckoutSession.Status.choices
        ],
        "source_types": [
            {"value": value, "label": label}
            for value, label in PaymentCheckoutSession.SourceType.choices
        ],
        "ordering": [
            {"value": "-created_at", "label": "Newest"},
            {"value": "created_at", "label": "Oldest"},
            {"value": "-amount", "label": "Highest amount"},
            {"value": "amount", "label": "Lowest amount"},
            {"value": "status", "label": "Status A-Z"},
        ],
    }


def _apply_filters(queryset, request: Request):
    search = _clean_text(request.query_params.get("search") or request.query_params.get("q") or "")
    status = _clean_upper(request.query_params.get("status") or "")
    source_type = _clean_upper(request.query_params.get("source_type") or "")
    gateway_id = request.query_params.get("gateway_id") or ""
    payment_method_id = request.query_params.get("payment_method_id") or ""

    if search:
        queryset = queryset.filter(
            Q(description__icontains=search)
            | Q(customer_email__icontains=search)
            | Q(customer_phone__icontains=search)
            | Q(external_checkout_id__icontains=search)
            | Q(external_payment_id__icontains=search)
            | Q(idempotency_key__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if source_type:
        queryset = queryset.filter(source_type=source_type)

    if gateway_id:
        queryset = queryset.filter(gateway_id=gateway_id)

    if payment_method_id:
        queryset = queryset.filter(payment_method_id=payment_method_id)

    return queryset


def _apply_ordering(queryset, ordering: str):
    allowed = {
        "-created_at": "-created_at",
        "created_at": "created_at",
        "-amount": "-amount",
        "amount": "amount",
        "status": "status",
    }
    return queryset.order_by(allowed.get(ordering, "-created_at"), "-id")


def _build_summary(queryset):
    return {
        "total_sessions": queryset.count(),
        "pending_sessions": queryset.filter(status=PaymentCheckoutSession.Status.PENDING).count(),
        "processing_sessions": queryset.filter(status=PaymentCheckoutSession.Status.PROCESSING).count(),
        "paid_sessions": queryset.filter(status=PaymentCheckoutSession.Status.PAID).count(),
        "failed_sessions": queryset.filter(status=PaymentCheckoutSession.Status.FAILED).count(),
    }


def _create_from_request(request: Request, company):
    data = request.data or {}
    method = _get_method_for_company(company, data.get("payment_method_id") or data.get("payment_method"))
    gateway = _get_gateway_for_company(company, data.get("gateway_id") or data.get("gateway")) or getattr(method, "gateway", None)
    terminal = _get_terminal_for_company(company, data.get("terminal_id") or data.get("terminal"))

    return create_checkout_session(
        company,
        {
            "payment_method": method,
            "gateway": gateway,
            "terminal": terminal,
            "source_type": data.get("source_type") or PaymentCheckoutSession.SourceType.MANUAL,
            "source_id": data.get("source_id"),
            "amount": data.get("amount"),
            "currency_code": data.get("currency_code") or getattr(company, "currency_code", "SAR") or "SAR",
            "description": data.get("description") or "",
            "customer_email": data.get("customer_email") or "",
            "customer_phone": data.get("customer_phone") or "",
            "external_checkout_id": data.get("external_checkout_id") or "",
            "external_payment_id": data.get("external_payment_id") or "",
            "checkout_url": data.get("checkout_url") or "",
            "idempotency_key": data.get("idempotency_key") or "",
            "metadata": data.get("metadata") or {},
            "expires_at": data.get("expires_at"),
        },
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_checkout_list(request: Request) -> Response:
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            session = _create_from_request(request, company)
            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment checkout session created successfully.",
                    "item": serialize_checkout_session(session),
                    "result": serialize_checkout_session(session),
                },
                status=201,
            )

        page = _clean_positive_int(request.query_params.get("page"), 1)
        page_size = _clean_positive_int(
            request.query_params.get("page_size") or request.query_params.get("per_page"),
            25,
            100,
        )
        ordering = _clean_text(request.query_params.get("ordering") or "-created_at")

        queryset = get_checkout_queryset(company).select_related(
            "company",
            "gateway",
            "payment_method",
            "terminal",
        )
        queryset = _apply_filters(queryset, request)
        queryset = _apply_ordering(queryset, ordering)

        summary = _build_summary(queryset)
        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        items = [serialize_checkout_session(session) for session in page_obj.object_list]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment checkout sessions loaded successfully.",
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": items,
                "results": items,
                "choices": serialize_checkout_choices(),
            },
            status=200,
        )

    except PaymentCheckoutListAPIError as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=400)
    except ValidationError as exc:
        return Response({"ok": False, "success": False, "message": "Payment checkout validation failed.", "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages}}, status=400)
    except IntegrityError:
        return Response({"ok": False, "success": False, "message": "Payment checkout already exists.", "errors": {"detail": "Checkout idempotency key already exists."}}, status=400)


payment_checkout_list.required_company_permissions = [
    "company.payments.checkout.view",
    "company.payments.checkout.create",
]
