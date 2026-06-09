# ============================================================
# 📂 api/company/payments/terminals/list.py
# 🧠 PrimeyAcc | Company Payment Terminals List/Create API V1.0
# ------------------------------------------------------------
# ✅ List payment terminals for current company only
# ✅ Create payment terminals for current company only
# ✅ Tenant isolation through request.company
# ✅ Safe branch/gateway/method company validation
# ✅ Search, branch, gateway, method, status, active and default filters
# ✅ Safe pagination and ordering
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي branch/gateway/payment_method يجب أن يكون داخل نفس الشركة
# - منطق الإنشاء والتحديث يبقى داخل payments/services.py
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
from companies.models import Branch
from payments.models import (
    CompanyPaymentGateway,
    CompanyPaymentMethod,
    CompanyPaymentTerminal,
)
from payments.services import (
    create_payment_terminal,
    serialize_payment_terminal,
)


class PaymentTerminalListAPIError(Exception):
    """
    Small API-level error for payment terminal list/create endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.
    """
    company = getattr(request, "company", None)

    if not company:
        raise PaymentTerminalListAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize query/body text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like text.
    """
    return _clean_text(value).upper()


def _clean_positive_int(value: Any, default: int, maximum: int | None = None) -> int:
    """
    Safely parse positive integer query params.
    """
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = default

    if number < 1:
        number = default

    if maximum is not None:
        number = min(number, maximum)

    return number


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean query/body values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


def _get_branch_for_company(company, branch_id: Any):
    """
    Resolve branch safely for current company only.
    """
    if branch_id in [None, ""]:
        return None

    try:
        branch_id = int(branch_id)
    except (TypeError, ValueError):
        raise ValidationError({"branch_id": "Invalid branch id."})

    branch = Branch.objects.filter(
        company=company,
        id=branch_id,
    ).first()

    if not branch:
        raise ValidationError({"branch_id": "Branch was not found."})

    return branch


def _get_gateway_for_company(company, gateway_id: Any):
    """
    Resolve gateway safely for current company only.
    """
    if gateway_id in [None, ""]:
        return None

    try:
        gateway_id = int(gateway_id)
    except (TypeError, ValueError):
        raise ValidationError({"gateway_id": "Invalid gateway id."})

    gateway = CompanyPaymentGateway.objects.filter(
        company=company,
        id=gateway_id,
    ).first()

    if not gateway:
        raise ValidationError({"gateway_id": "Payment gateway was not found."})

    return gateway


def _get_method_for_company(company, method_id: Any):
    """
    Resolve payment method safely for current company only.
    """
    if method_id in [None, ""]:
        return None

    try:
        method_id = int(method_id)
    except (TypeError, ValueError):
        raise ValidationError({"payment_method_id": "Invalid payment method id."})

    method = CompanyPaymentMethod.objects.filter(
        company=company,
        id=method_id,
    ).first()

    if not method:
        raise ValidationError({"payment_method_id": "Payment method was not found."})

    return method


def get_payment_terminals_queryset(company):
    """
    Return company-scoped payment terminals queryset.
    """
    return CompanyPaymentTerminal.objects.filter(company=company)


def serialize_branch_snapshot(branch: Branch | None) -> dict[str, Any] | None:
    """
    Small branch snapshot for terminal payloads.
    """
    if not branch:
        return None

    return {
        "id": branch.id,
        "name": branch.display_name,
        "display_name": branch.display_name,
        "branch_code": branch.branch_code,
        "branch_type": branch.branch_type,
        "status": branch.status,
        "is_active": branch.is_active,
        "city": branch.city,
    }


def serialize_payment_terminal_full(terminal: CompanyPaymentTerminal) -> dict[str, Any]:
    """
    Serialize terminal and add safe relation snapshots for frontend.
    """
    payload = serialize_payment_terminal(terminal)

    payload["branch"] = serialize_branch_snapshot(terminal.branch)
    payload["gateway"] = (
        {
            "id": terminal.gateway_id,
            "name": terminal.gateway.name,
            "code": terminal.gateway.code,
            "gateway_type": terminal.gateway.gateway_type,
            "environment": terminal.gateway.environment,
            "is_active": terminal.gateway.is_active,
        }
        if terminal.gateway_id and terminal.gateway
        else None
    )
    payload["payment_method"] = (
        {
            "id": terminal.payment_method_id,
            "name": terminal.payment_method.name,
            "code": terminal.payment_method.code,
            "method_type": terminal.payment_method.method_type,
            "is_active": terminal.payment_method.is_active,
            "allow_pos": terminal.payment_method.allow_pos,
        }
        if terminal.payment_method_id and terminal.payment_method
        else None
    )

    return payload


def serialize_payment_terminal_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in CompanyPaymentTerminal.TerminalStatus.choices
        ],
        "ordering": [
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "terminal_code", "label": "Code A-Z"},
            {"value": "-terminal_code", "label": "Code Z-A"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
        ],
    }


def _apply_terminal_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to payment terminals queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_upper(request.query_params.get("status") or "")
    is_active = _to_bool(request.query_params.get("is_active"))
    is_default_for_branch = _to_bool(request.query_params.get("is_default_for_branch"))
    branch_id = request.query_params.get("branch_id") or ""
    gateway_id = request.query_params.get("gateway_id") or ""
    payment_method_id = (
        request.query_params.get("payment_method_id")
        or request.query_params.get("method_id")
        or ""
    )
    provider_name = _clean_text(request.query_params.get("provider_name") or "")

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(terminal_code__icontains=search)
            | Q(terminal_id__icontains=search)
            | Q(serial_number__icontains=search)
            | Q(provider_name__icontains=search)
            | Q(location_note__icontains=search)
            | Q(notes__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__name_ar__icontains=search)
            | Q(branch__name_en__icontains=search)
            | Q(branch__branch_code__icontains=search)
            | Q(gateway__name__icontains=search)
            | Q(payment_method__name__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if is_default_for_branch is not None:
        queryset = queryset.filter(is_default_for_branch=is_default_for_branch)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    if gateway_id:
        queryset = queryset.filter(gateway_id=gateway_id)

    if payment_method_id:
        queryset = queryset.filter(payment_method_id=payment_method_id)

    if provider_name:
        queryset = queryset.filter(provider_name__icontains=provider_name)

    return queryset


def _apply_terminal_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "name": "name",
        "-name": "-name",
        "terminal_code": "terminal_code",
        "-terminal_code": "-terminal_code",
        "status": "status",
        "-status": "-status",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "name")

    if selected_ordering == "name":
        return queryset.order_by("-is_default_for_branch", "branch_id", "name", "id")

    return queryset.order_by(selected_ordering, "-id")


def _build_terminal_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered payment terminals queryset.
    """
    return {
        "total_terminals": queryset.count(),
        "active_terminals": queryset.filter(is_active=True).count(),
        "inactive_terminals": queryset.filter(is_active=False).count(),
        "default_for_branch_terminals": queryset.filter(is_default_for_branch=True).count(),
        "maintenance_terminals": queryset.filter(
            status=CompanyPaymentTerminal.TerminalStatus.MAINTENANCE
        ).count(),
        "retired_terminals": queryset.filter(
            status=CompanyPaymentTerminal.TerminalStatus.RETIRED
        ).count(),
    }


def _create_terminal_from_request(request: Request, company):
    """
    Create payment terminal from request payload using payments service layer.
    """
    data = request.data or {}

    branch = _get_branch_for_company(company, data.get("branch_id") or data.get("branch"))
    gateway = _get_gateway_for_company(company, data.get("gateway_id") or data.get("gateway"))
    payment_method = _get_method_for_company(
        company,
        data.get("payment_method_id") or data.get("method_id") or data.get("payment_method"),
    )

    parsed_is_active = _to_bool(data.get("is_active"))

    return create_payment_terminal(
        company=company,
        payload={
            "branch": branch,
            "gateway": gateway,
            "payment_method": payment_method,
            "name": data.get("name") or "",
            "terminal_code": data.get("terminal_code") or data.get("code") or "",
            "terminal_id": data.get("terminal_id") or "",
            "serial_number": data.get("serial_number") or "",
            "provider_name": data.get("provider_name") or "",
            "location_note": data.get("location_note") or "",
            "status": data.get("status") or CompanyPaymentTerminal.TerminalStatus.ACTIVE,
            "is_active": True if parsed_is_active is None else bool(parsed_is_active),
            "is_default_for_branch": bool(_to_bool(data.get("is_default_for_branch"))),
            "settings": data.get("settings") or {},
            "notes": data.get("notes") or "",
            "last_seen_at": data.get("last_seen_at"),
        },
    )


@api_view(["GET", "POST"])
@permission_classes([HasAnyCompanyPermission])
def payment_terminals_list(request: Request) -> Response:
    """
    GET /api/company/payments/terminals/
    POST /api/company/payments/terminals/
    """
    try:
        company = _get_request_company(request)

        if request.method == "POST":
            terminal = _create_terminal_from_request(request, company)

            return Response(
                {
                    "ok": True,
                    "success": True,
                    "message": "Payment terminal created successfully.",
                    "company": {
                        "id": company.id,
                        "name": getattr(company, "display_name", None)
                        or getattr(company, "name", ""),
                    },
                    "item": serialize_payment_terminal_full(terminal),
                    "result": serialize_payment_terminal_full(terminal),
                },
                status=201,
            )

        page = _clean_positive_int(
            request.query_params.get("page"),
            default=1,
        )
        page_size = _clean_positive_int(
            request.query_params.get("page_size")
            or request.query_params.get("per_page"),
            default=25,
            maximum=100,
        )
        ordering = _clean_text(
            request.query_params.get("ordering")
            or request.query_params.get("order_by")
            or "name"
        )

        queryset = get_payment_terminals_queryset(company).select_related(
            "company",
            "branch",
            "gateway",
            "payment_method",
        )

        queryset = _apply_terminal_filters(queryset, request)
        queryset = _apply_terminal_ordering(queryset, ordering)

        summary = _build_terminal_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        terminals = [
            serialize_payment_terminal_full(terminal)
            for terminal in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "Payment terminals loaded successfully.",
                "company": {
                    "id": company.id,
                    "name": getattr(company, "display_name", None)
                    or getattr(company, "name", ""),
                },
                "filters": {
                    "search": request.query_params.get("search")
                    or request.query_params.get("q")
                    or "",
                    "status": request.query_params.get("status") or "",
                    "is_active": request.query_params.get("is_active") or "",
                    "is_default_for_branch": request.query_params.get("is_default_for_branch") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "gateway_id": request.query_params.get("gateway_id") or "",
                    "payment_method_id": request.query_params.get("payment_method_id")
                    or request.query_params.get("method_id")
                    or "",
                    "provider_name": request.query_params.get("provider_name") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": terminals,
                "results": terminals,
                "choices": serialize_payment_terminal_choices(),
            },
            status=200,
        )

    except PaymentTerminalListAPIError as exc:
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
                "message": "Payment terminal validation failed.",
                "errors": getattr(exc, "message_dict", None) or {"detail": exc.messages},
            },
            status=400,
        )

    except IntegrityError:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": "Payment terminal already exists.",
                "errors": {
                    "detail": "Payment terminal code already exists for this company.",
                },
            },
            status=400,
        )


payment_terminals_list.required_company_permissions = [
    "company.payments.terminals.view",
    "company.payments.terminals.create",
]