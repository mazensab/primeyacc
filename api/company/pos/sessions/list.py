# ============================================================
# 📂 api/company/pos/sessions/list.py
# 🧠 Mhamcloud | Company POS Sessions List API V1.1
# ------------------------------------------------------------
# ✅ List POS sessions for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, status, register, branch and date filters
# ✅ Safe pagination and ordering
# ✅ Summary payload for dashboard/list pages
# ✅ Choices payload for frontend filters/forms
# ✅ Uses actual POSSession relations only
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - لا يتم فتح أو إغلاق أو إلغاء Session من list API
# - صلاحية العرض المطلوبة: company.pos.sessions.view
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q, Sum
from django.utils.dateparse import parse_date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSSession, POSSessionStatus


class POSSessionListAPIError(Exception):
    """
    Small API-level error for POS sessions list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSSessionListAPIError("Current company context was not resolved.")

    return company


def _clean_text(value: Any) -> str:
    """
    Normalize query text.
    """
    return str(value or "").strip()


def _clean_upper(value: Any) -> str:
    """
    Normalize enum-like query text.
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


def _decimal_to_string(value: Any) -> str:
    """
    Serialize decimal-like values safely.
    """
    if value is None:
        value = Decimal("0.00")

    return str(value)


def _safe_display_name(obj) -> str:
    """
    Return a safe display name for related models.
    """
    if not obj:
        return ""

    return (
        getattr(obj, "display_name", None)
        or getattr(obj, "name_ar", "")
        or getattr(obj, "name_en", "")
        or getattr(obj, "name", "")
        or str(obj)
    )


def _safe_iso(value: Any):
    """
    Return ISO formatted date/datetime safely.
    """
    if not value:
        return None

    if hasattr(value, "isoformat"):
        return value.isoformat()

    return str(value)


def serialize_pos_session(session: POSSession) -> dict[str, Any]:
    """
    Serialize POS session for company APIs.
    """
    register = getattr(session, "register", None)
    branch = getattr(session, "branch", None) or getattr(register, "branch", None)
    warehouse = getattr(session, "warehouse", None)
    treasury_account = getattr(session, "treasury_account", None)

    opened_by = getattr(session, "opened_by", None)
    closed_by = getattr(session, "closed_by", None)
    cancelled_by = getattr(session, "cancelled_by", None)

    return {
        "id": session.id,
        "session_number": getattr(session, "session_number", ""),
        "status": session.status,
        "status_label": session.get_status_display(),
        "is_open": session.status == POSSessionStatus.OPEN,
        "is_closed": session.status == POSSessionStatus.CLOSED,
        "is_cancelled": session.status == POSSessionStatus.CANCELLED,
        "register": {
            "id": register.id if register else None,
            "name": _safe_display_name(register),
            "display_name": getattr(register, "display_name", "") if register else "",
            "code": getattr(register, "code", "") if register else "",
            "status": getattr(register, "status", "") if register else "",
        }
        if register
        else None,
        "branch": {
            "id": branch.id if branch else None,
            "name": _safe_display_name(branch),
            "code": getattr(branch, "branch_code", "") if branch else "",
            "city": getattr(branch, "city", "") if branch else "",
        }
        if branch
        else None,
        "warehouse": {
            "id": warehouse.id if warehouse else None,
            "name": _safe_display_name(warehouse),
            "code": getattr(warehouse, "code", "") if warehouse else "",
        }
        if warehouse
        else None,
        "treasury_account": {
            "id": treasury_account.id if treasury_account else None,
            "name": _safe_display_name(treasury_account),
            "code": getattr(treasury_account, "code", "") if treasury_account else "",
            "account_type": getattr(treasury_account, "account_type", "")
            if treasury_account
            else "",
        }
        if treasury_account
        else None,
        "opening_cash_amount": _decimal_to_string(
            getattr(session, "opening_cash_amount", Decimal("0.00"))
        ),
        "closing_cash_amount": _decimal_to_string(
            getattr(session, "closing_cash_amount", Decimal("0.00"))
        ),
        "expected_cash_amount": _decimal_to_string(
            getattr(session, "expected_cash_amount", Decimal("0.00"))
        ),
        "difference_amount": _decimal_to_string(
            getattr(session, "difference_amount", Decimal("0.00"))
        ),
        "opened_at": _safe_iso(getattr(session, "opened_at", None)),
        "closed_at": _safe_iso(getattr(session, "closed_at", None)),
        "cancelled_at": _safe_iso(getattr(session, "cancelled_at", None)),
        "opening_notes": getattr(session, "opening_notes", ""),
        "closing_notes": getattr(session, "closing_notes", ""),
        "cancellation_reason": getattr(session, "cancellation_reason", ""),
        "notes": getattr(session, "notes", ""),
        "opened_by": {
            "id": opened_by.id,
            "username": getattr(opened_by, "username", ""),
            "email": getattr(opened_by, "email", ""),
        }
        if opened_by
        else None,
        "closed_by": {
            "id": closed_by.id,
            "username": getattr(closed_by, "username", ""),
            "email": getattr(closed_by, "email", ""),
        }
        if closed_by
        else None,
        "cancelled_by": {
            "id": cancelled_by.id,
            "username": getattr(cancelled_by, "username", ""),
            "email": getattr(cancelled_by, "email", ""),
        }
        if cancelled_by
        else None,
        "created_at": _safe_iso(getattr(session, "created_at", None)),
        "updated_at": _safe_iso(getattr(session, "updated_at", None)),
        "allowed_actions": {
            "view": True,
            "close": session.status == POSSessionStatus.OPEN,
            "cancel": session.status == POSSessionStatus.OPEN,
        },
    }


def serialize_pos_session_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in POSSessionStatus.choices
        ],
        "ordering": [
            {"value": "-opened_at", "label": "Newest opened"},
            {"value": "opened_at", "label": "Oldest opened"},
            {"value": "-closed_at", "label": "Newest closed"},
            {"value": "closed_at", "label": "Oldest closed"},
            {"value": "session_number", "label": "Session number A-Z"},
            {"value": "-session_number", "label": "Session number Z-A"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
        ],
    }


def get_pos_sessions_queryset(company):
    """
    Return company-scoped POS sessions queryset.
    """
    return POSSession.objects.filter(company=company)


def _apply_pos_session_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to POS sessions queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_upper(request.query_params.get("status") or "")
    register_id = _clean_text(request.query_params.get("register_id") or "")
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    warehouse_id = _clean_text(request.query_params.get("warehouse_id") or "")
    treasury_account_id = _clean_text(
        request.query_params.get("treasury_account_id")
        or request.query_params.get("account_id")
        or ""
    )
    date_from = _clean_text(request.query_params.get("date_from") or "")
    date_to = _clean_text(request.query_params.get("date_to") or "")

    if search:
        queryset = queryset.filter(
            Q(session_number__icontains=search)
            | Q(status__icontains=search)
            | Q(register__name__icontains=search)
            | Q(register__code__icontains=search)
            | Q(register__branch__name__icontains=search)
            | Q(register__branch__name_ar__icontains=search)
            | Q(register__branch__name_en__icontains=search)
            | Q(register__branch__branch_code__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__name_ar__icontains=search)
            | Q(branch__name_en__icontains=search)
            | Q(branch__branch_code__icontains=search)
            | Q(warehouse__name__icontains=search)
            | Q(warehouse__code__icontains=search)
            | Q(treasury_account__name__icontains=search)
            | Q(treasury_account__code__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if register_id:
        queryset = queryset.filter(register_id=register_id)

    if branch_id:
        queryset = queryset.filter(
            Q(branch_id=branch_id) | Q(register__branch_id=branch_id)
        )

    if warehouse_id:
        queryset = queryset.filter(warehouse_id=warehouse_id)

    if treasury_account_id:
        queryset = queryset.filter(treasury_account_id=treasury_account_id)

    parsed_date_from = parse_date(date_from) if date_from else None
    parsed_date_to = parse_date(date_to) if date_to else None

    if parsed_date_from:
        queryset = queryset.filter(opened_at__date__gte=parsed_date_from)

    if parsed_date_to:
        queryset = queryset.filter(opened_at__date__lte=parsed_date_to)

    return queryset


def _apply_pos_session_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "-opened_at": "-opened_at",
        "opened_at": "opened_at",
        "-closed_at": "-closed_at",
        "closed_at": "closed_at",
        "session_number": "session_number",
        "-session_number": "-session_number",
        "status": "status",
        "-status": "-status",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "-opened_at")
    return queryset.order_by(selected_ordering, "-id")


def _build_pos_session_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered POS sessions queryset.
    """
    totals = queryset.aggregate(
        opening_cash_total=Sum("opening_cash_amount"),
        closing_cash_total=Sum("closing_cash_amount"),
        expected_cash_total=Sum("expected_cash_amount"),
        difference_total=Sum("difference_amount"),
    )

    return {
        "total_sessions": queryset.count(),
        "open_sessions": queryset.filter(status=POSSessionStatus.OPEN).count(),
        "closed_sessions": queryset.filter(status=POSSessionStatus.CLOSED).count(),
        "cancelled_sessions": queryset.filter(status=POSSessionStatus.CANCELLED).count(),
        "opening_cash_total": _decimal_to_string(totals.get("opening_cash_total")),
        "closing_cash_total": _decimal_to_string(totals.get("closing_cash_total")),
        "expected_cash_total": _decimal_to_string(totals.get("expected_cash_total")),
        "difference_total": _decimal_to_string(totals.get("difference_total")),
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_sessions_list(request: Request) -> Response:
    """
    GET /api/company/pos/sessions/
    """
    try:
        company = _get_request_company(request)

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
            or "-opened_at"
        )

        queryset = (
            get_pos_sessions_queryset(company)
            .select_related(
                "company",
                "register",
                "register__branch",
                "branch",
                "warehouse",
                "treasury_account",
                "opened_by",
                "closed_by",
                "cancelled_by",
            )
        )

        queryset = _apply_pos_session_filters(queryset, request)
        queryset = _apply_pos_session_ordering(queryset, ordering)

        summary = _build_pos_session_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        sessions = [
            serialize_pos_session(session)
            for session in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS sessions loaded successfully.",
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
                    "register_id": request.query_params.get("register_id") or "",
                    "branch_id": request.query_params.get("branch_id") or "",
                    "warehouse_id": request.query_params.get("warehouse_id") or "",
                    "treasury_account_id": request.query_params.get("treasury_account_id")
                    or request.query_params.get("account_id")
                    or "",
                    "date_from": request.query_params.get("date_from") or "",
                    "date_to": request.query_params.get("date_to") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": sessions,
                "results": sessions,
                "choices": serialize_pos_session_choices(),
            },
            status=200,
        )

    except POSSessionListAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )


pos_sessions_list.required_company_permissions = [
    "company.pos.sessions.view",
]