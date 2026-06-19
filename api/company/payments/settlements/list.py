# ============================================================
# 📂 api/company/payments/settlements/list.py
# 🧠 PrimeyAcc | Company Payment Settlements List/Create API V1.0
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

from api.company.payments.gateways.detail import get_payment_gateway_or_raise
from api.company.payments.methods.detail import get_payment_method_or_raise
from api.permissions import HasAnyCompanyPermission
from payments.models import PaymentSettlementBatch
from payments.services import create_settlement_batch, serialize_settlement_batch


class PaymentSettlementListAPIError(Exception):
    pass


def _get_request_company(request: Request):
    company = getattr(request, "company", None)
    if not company:
        raise PaymentSettlementListAPIError("Current company context was not resolved.")
    return company


def _clean_text(value: Any) -> str:
    return str(value or "").strip()


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


def get_settlement_batch_or_raise(company, batch_id: int) -> PaymentSettlementBatch:
    batch = PaymentSettlementBatch.objects.select_related("gateway", "payment_method").filter(company=company, id=batch_id).first()
    if not batch:
        raise PaymentSettlementListAPIError("Payment settlement batch was not found.")
    return batch


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_settlements_list(request: Request) -> Response:
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            data = request.data or {}
            gateway = get_payment_gateway_or_raise(company, int(data.get("gateway_id") or data.get("gateway")))
            payment_method = None
            if data.get("payment_method_id") or data.get("payment_method"):
                payment_method = get_payment_method_or_raise(company, int(data.get("payment_method_id") or data.get("payment_method")))

            batch = create_settlement_batch(
                company,
                {
                    "gateway": gateway,
                    "payment_method": payment_method,
                    "settlement_reference": data.get("settlement_reference") or "",
                    "currency_code": data.get("currency_code") or getattr(company, "currency_code", "SAR") or "SAR",
                    "settlement_date": data.get("settlement_date"),
                    "notes": data.get("notes") or "",
                    "metadata": data.get("metadata") or {},
                },
            )

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment settlement batch created successfully.",
                    "item": serialize_settlement_batch(batch),
                    "result": serialize_settlement_batch(batch),
                },
                status=201,
            )

        page = _clean_positive_int(request.query_params.get("page"), 1)
        page_size = _clean_positive_int(request.query_params.get("page_size") or request.query_params.get("per_page"), 25, 100)
        search = _clean_text(request.query_params.get("search") or request.query_params.get("q") or "")
        status = _clean_text(request.query_params.get("status") or "").upper()
        gateway_id = request.query_params.get("gateway_id") or ""

        queryset = PaymentSettlementBatch.objects.filter(company=company).select_related("gateway", "payment_method")

        if search:
            queryset = queryset.filter(Q(settlement_reference__icontains=search) | Q(notes__icontains=search))

        if status:
            queryset = queryset.filter(status=status)

        if gateway_id:
            queryset = queryset.filter(gateway_id=gateway_id)

        queryset = queryset.order_by("-created_at", "-id")
        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        items = [serialize_settlement_batch(batch) for batch in page_obj.object_list]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment settlement batches loaded successfully.",
                "summary": {
                    "total_batches": queryset.count(),
                    "draft_batches": queryset.filter(status=PaymentSettlementBatch.Status.DRAFT).count(),
                    "posted_batches": queryset.filter(status=PaymentSettlementBatch.Status.POSTED).count(),
                    "cancelled_batches": queryset.filter(status=PaymentSettlementBatch.Status.CANCELLED).count(),
                },
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": items,
                "results": items,
            },
            status=200,
        )

    except (PaymentSettlementListAPIError, ValueError, TypeError) as exc:
        return Response({"ok": False, "success": False, "message": str(exc), "errors": {"detail": str(exc)}}, status=400)
    except ValidationError as exc:
        return Response({"ok": False, "success": False, "message": "Payment settlement validation failed.", "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages}}, status=400)
    except IntegrityError:
        return Response({"ok": False, "success": False, "message": "Payment settlement already exists.", "errors": {"detail": "Settlement reference already exists for this company."}}, status=400)


payment_settlements_list.required_company_permissions = [
    "company.payments.settlements.view",
    "company.payments.settlements.create",
]
