# ============================================================
# 📂 api/company/pos/registers/list.py
# 🧠 PrimeyAcc | Company POS Registers List API V1.0
# ------------------------------------------------------------
# ✅ List POS registers for current company only
# ✅ Tenant isolation through request.company
# ✅ Search, status, active, branch, warehouse and treasury filters
# ✅ Safe pagination and ordering
# ✅ Summary payload for dashboard/list pages
# ✅ Choices payload for frontend filters/forms
# ✅ Protected by HasAnyCompanyPermission
# ✅ No frontend company_id trust
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم قبول company_id من الواجهة
# - الشركة تؤخذ من request.company فقط
# - أي نتيجة يجب أن تكون داخل نفس شركة العضوية الحالية
# - لا يتم تنفيذ فتح جلسة أو بيع أو تحصيل من list API
# - صلاحية العرض المطلوبة: company.pos.registers.view
# ============================================================

from __future__ import annotations

from typing import Any

from django.core.paginator import EmptyPage, PageNotAnInteger, Paginator
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.request import Request
from rest_framework.response import Response

from api.permissions import HasAnyCompanyPermission
from pos.models import POSRegister, POSRegisterStatus


class POSRegisterListAPIError(Exception):
    """
    Small API-level error for POS registers list endpoint.
    """


def _get_request_company(request: Request):
    """
    Return company resolved by the company workspace/auth layer.

    /company APIs must never accept company_id from frontend as tenant source.
    """
    company = getattr(request, "company", None)

    if not company:
        raise POSRegisterListAPIError("Current company context was not resolved.")

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


def _to_bool(value: Any) -> bool | None:
    """
    Parse optional boolean query values.
    """
    if value in [None, ""]:
        return None

    text = str(value).strip().lower()

    if text in {"1", "true", "yes", "y", "on"}:
        return True

    if text in {"0", "false", "no", "n", "off"}:
        return False

    return None


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


def serialize_pos_register(register: POSRegister) -> dict[str, Any]:
    """
    Serialize POS register for company APIs.
    """
    branch = register.branch
    warehouse = register.warehouse
    treasury_account = register.treasury_account
    default_payment_method = register.default_payment_method
    default_payment_terminal = register.default_payment_terminal

    return {
        "id": register.id,
        "name": register.name,
        "display_name": register.display_name,
        "code": register.code,
        "status": register.status,
        "status_label": register.get_status_display(),
        "is_active": register.is_active,
        "is_available": register.is_available,
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
            "account_type": getattr(treasury_account, "account_type", "") if treasury_account else "",
            "currency": getattr(treasury_account, "currency", "") if treasury_account else "",
        }
        if treasury_account
        else None,
        "default_payment_method": {
            "id": default_payment_method.id if default_payment_method else None,
            "name": _safe_display_name(default_payment_method),
            "code": getattr(default_payment_method, "code", "") if default_payment_method else "",
            "method_type": getattr(default_payment_method, "method_type", "")
            if default_payment_method
            else "",
        }
        if default_payment_method
        else None,
        "default_payment_terminal": {
            "id": default_payment_terminal.id if default_payment_terminal else None,
            "name": _safe_display_name(default_payment_terminal),
            "code": getattr(default_payment_terminal, "code", "") if default_payment_terminal else "",
        }
        if default_payment_terminal
        else None,
        "receipt_header": register.receipt_header,
        "receipt_footer": register.receipt_footer,
        "settings_data": register.settings_data or {},
        "extra_data": register.extra_data or {},
        "notes": register.notes,
        "created_by": {
            "id": register.created_by_id,
            "username": getattr(register.created_by, "username", ""),
            "email": getattr(register.created_by, "email", ""),
        }
        if register.created_by_id
        else None,
        "updated_by": {
            "id": register.updated_by_id,
            "username": getattr(register.updated_by, "username", ""),
            "email": getattr(register.updated_by, "email", ""),
        }
        if register.updated_by_id
        else None,
        "created_at": register.created_at.isoformat() if register.created_at else None,
        "updated_at": register.updated_at.isoformat() if register.updated_at else None,
        "allowed_actions": {
            "view": True,
            "update": True,
            "activate": register.status != POSRegisterStatus.ACTIVE,
            "deactivate": register.status == POSRegisterStatus.ACTIVE,
        },
    }


def serialize_pos_register_choices() -> dict[str, Any]:
    """
    Return choices payload for frontend filters/forms.
    """
    return {
        "statuses": [
            {"value": value, "label": label}
            for value, label in POSRegisterStatus.choices
        ],
        "ordering": [
            {"value": "name", "label": "Name A-Z"},
            {"value": "-name", "label": "Name Z-A"},
            {"value": "code", "label": "Code A-Z"},
            {"value": "-code", "label": "Code Z-A"},
            {"value": "status", "label": "Status A-Z"},
            {"value": "-status", "label": "Status Z-A"},
            {"value": "-created_at", "label": "Newest created"},
            {"value": "created_at", "label": "Oldest created"},
            {"value": "-updated_at", "label": "Recently updated"},
        ],
    }


def get_pos_registers_queryset(company):
    """
    Return company-scoped POS registers queryset.
    """
    return POSRegister.objects.filter(company=company)


def _apply_pos_register_filters(queryset, request: Request):
    """
    Apply safe company-scoped filters to POS registers queryset.
    """
    search = _clean_text(
        request.query_params.get("search")
        or request.query_params.get("q")
        or ""
    )
    status = _clean_upper(request.query_params.get("status") or "")
    branch_id = _clean_text(request.query_params.get("branch_id") or "")
    warehouse_id = _clean_text(request.query_params.get("warehouse_id") or "")
    treasury_account_id = _clean_text(
        request.query_params.get("treasury_account_id")
        or request.query_params.get("account_id")
        or ""
    )
    default_payment_method_id = _clean_text(
        request.query_params.get("default_payment_method_id")
        or request.query_params.get("payment_method_id")
        or ""
    )
    is_active = _to_bool(request.query_params.get("is_active"))
    is_available = _to_bool(request.query_params.get("is_available"))

    if search:
        queryset = queryset.filter(
            Q(name__icontains=search)
            | Q(code__icontains=search)
            | Q(status__icontains=search)
            | Q(branch__name__icontains=search)
            | Q(branch__name_ar__icontains=search)
            | Q(branch__name_en__icontains=search)
            | Q(branch__branch_code__icontains=search)
            | Q(warehouse__name__icontains=search)
            | Q(warehouse__code__icontains=search)
            | Q(treasury_account__name__icontains=search)
            | Q(treasury_account__code__icontains=search)
            | Q(default_payment_method__name__icontains=search)
            | Q(default_payment_method__code__icontains=search)
            | Q(notes__icontains=search)
        )

    if status:
        queryset = queryset.filter(status=status)

    if branch_id:
        queryset = queryset.filter(branch_id=branch_id)

    if warehouse_id:
        queryset = queryset.filter(warehouse_id=warehouse_id)

    if treasury_account_id:
        queryset = queryset.filter(treasury_account_id=treasury_account_id)

    if default_payment_method_id:
        queryset = queryset.filter(default_payment_method_id=default_payment_method_id)

    if is_active is not None:
        queryset = queryset.filter(is_active=is_active)

    if is_available is True:
        queryset = queryset.filter(
            status=POSRegisterStatus.ACTIVE,
            is_active=True,
        )

    if is_available is False:
        queryset = queryset.exclude(
            status=POSRegisterStatus.ACTIVE,
            is_active=True,
        )

    return queryset


def _apply_pos_register_ordering(queryset, ordering: str):
    """
    Apply safe ordering without allowing arbitrary model fields.
    """
    allowed_ordering = {
        "name": "name",
        "-name": "-name",
        "code": "code",
        "-code": "-code",
        "status": "status",
        "-status": "-status",
        "created_at": "created_at",
        "-created_at": "-created_at",
        "updated_at": "updated_at",
        "-updated_at": "-updated_at",
    }

    selected_ordering = allowed_ordering.get(ordering, "name")

    if selected_ordering == "name":
        return queryset.order_by("name", "id")

    return queryset.order_by(selected_ordering, "-id")


def _build_pos_register_summary(queryset) -> dict[str, Any]:
    """
    Build quick summary for the filtered POS registers queryset.
    """
    return {
        "total_registers": queryset.count(),
        "active_registers": queryset.filter(
            status=POSRegisterStatus.ACTIVE,
            is_active=True,
        ).count(),
        "inactive_registers": queryset.filter(
            status=POSRegisterStatus.INACTIVE,
        ).count(),
        "maintenance_registers": queryset.filter(
            status=POSRegisterStatus.MAINTENANCE,
        ).count(),
        "with_warehouse": queryset.filter(warehouse_id__isnull=False).count(),
        "with_treasury_account": queryset.filter(treasury_account_id__isnull=False).count(),
        "with_default_payment_method": queryset.filter(
            default_payment_method_id__isnull=False
        ).count(),
    }


@api_view(["GET"])
@permission_classes([HasAnyCompanyPermission])
def pos_registers_list(request: Request) -> Response:
    """
    GET /api/company/pos/registers/
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
            or "name"
        )

        queryset = (
            get_pos_registers_queryset(company)
            .select_related(
                "company",
                "branch",
                "warehouse",
                "treasury_account",
                "default_payment_method",
                "default_payment_terminal",
                "created_by",
                "updated_by",
            )
        )

        queryset = _apply_pos_register_filters(queryset, request)
        queryset = _apply_pos_register_ordering(queryset, ordering)

        summary = _build_pos_register_summary(queryset)

        paginator = Paginator(queryset, page_size)

        try:
            page_obj = paginator.page(page)
        except PageNotAnInteger:
            page_obj = paginator.page(1)
        except EmptyPage:
            page_obj = paginator.page(paginator.num_pages or 1)

        registers = [
            serialize_pos_register(register)
            for register in page_obj.object_list
        ]

        return Response(
            {
                "ok": True,
                "success": True,
                "message": "POS registers loaded successfully.",
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
                    "branch_id": request.query_params.get("branch_id") or "",
                    "warehouse_id": request.query_params.get("warehouse_id") or "",
                    "treasury_account_id": request.query_params.get("treasury_account_id")
                    or request.query_params.get("account_id")
                    or "",
                    "default_payment_method_id": request.query_params.get(
                        "default_payment_method_id"
                    )
                    or request.query_params.get("payment_method_id")
                    or "",
                    "is_active": request.query_params.get("is_active") or "",
                    "is_available": request.query_params.get("is_available") or "",
                    "ordering": ordering,
                },
                "summary": summary,
                "count": paginator.count,
                "page": page_obj.number,
                "page_size": page_size,
                "num_pages": paginator.num_pages,
                "has_next": page_obj.has_next(),
                "has_previous": page_obj.has_previous(),
                "items": registers,
                "results": registers,
                "choices": serialize_pos_register_choices(),
            },
            status=200,
        )

    except POSRegisterListAPIError as exc:
        return Response(
            {
                "ok": False,
                "success": False,
                "message": str(exc),
                "errors": {"detail": str(exc)},
            },
            status=400,
        )


pos_registers_list.required_company_permissions = [
    "company.pos.registers.view",
]