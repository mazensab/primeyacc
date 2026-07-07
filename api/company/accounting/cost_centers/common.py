# ============================================================
# 📂 api/company/accounting/cost_centers/common.py
# 🧠 Mhamcloud | Company Accounting Cost Centers API Common
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ No frontend company_id trust
# ✅ Shared serializer + validation helpers
# ============================================================
from __future__ import annotations
import json
from typing import Any
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.http import JsonResponse
from accounts.models import CompanyMembership, MembershipStatus
from accounting.models import CostCenter, CostCenterStatus
def resolve_company(request):
    company = getattr(request, "company", None) or getattr(request, "current_company", None)
    if company is not None:
        return company
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None
    active_status = getattr(MembershipStatus, "ACTIVE", "ACTIVE")
    memberships = (
        CompanyMembership.objects.select_related("company")
        .filter(user=user, status=active_status)
        .order_by("-is_primary", "-id")
    )
    session_company_id = (
        request.session.get("current_company_id")
        or request.session.get("company_id")
        or request.session.get("active_company_id")
        or request.headers.get("X-Company-Id")
        or request.headers.get("X-Company-ID")
    )
    if session_company_id:
        scoped = memberships.filter(company_id=session_company_id).first()
        if scoped:
            return scoped.company
    membership = memberships.first()
    return membership.company if membership else None
def json_error(message: str, *, status: int = 400, field_errors: dict[str, Any] | None = None):
    payload = {
        "ok": False,
        "success": False,
        "message": message,
    }
    if field_errors:
        payload["errors"] = field_errors
    return JsonResponse(payload, status=status)
def read_json_payload(request) -> dict[str, Any]:
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except json.JSONDecodeError:
        raise ValidationError("صيغة JSON غير صحيحة.")
    if not isinstance(payload, dict):
        raise ValidationError("صيغة الطلب غير صحيحة.")
    return payload
def validation_errors(error: Exception) -> dict[str, Any]:
    if isinstance(error, ValidationError):
        if hasattr(error, "message_dict"):
            return error.message_dict
        return {"detail": error.messages}
    return {"detail": [str(error)]}
def parse_bool(value: Any, *, default: bool = False) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    raw = str(value).strip().lower()
    if raw in {"1", "true", "yes", "y", "on", "نشط", "نعم"}:
        return True
    if raw in {"0", "false", "no", "n", "off", "لا"}:
        return False
    return default
def normalize_status(value: Any, *, default: str = CostCenterStatus.ACTIVE) -> str:
    raw = str(value or default).strip().upper()
    if raw in {CostCenterStatus.ACTIVE, "ACTIVE", "نشط"}:
        return CostCenterStatus.ACTIVE
    if raw in {CostCenterStatus.INACTIVE, "INACTIVE", "غير نشط", "غير_نشط"}:
        return CostCenterStatus.INACTIVE
    raise ValidationError({"status": "حالة مركز التكلفة غير صحيحة."})
def resolve_parent(company, raw_parent_id: Any, *, current_id: int | None = None) -> CostCenter | None:
    if raw_parent_id in [None, "", 0, "0"]:
        return None
    try:
        parent_id = int(raw_parent_id)
    except (TypeError, ValueError):
        raise ValidationError({"parent_id": "مركز التكلفة الأب غير صحيح."})
    if current_id and parent_id == current_id:
        raise ValidationError({"parent_id": "لا يمكن أن يكون مركز التكلفة أبًا لنفسه."})
    parent = CostCenter.objects.filter(
        company=company,
        pk=parent_id,
    ).first()
    if not parent:
        raise ValidationError({"parent_id": "مركز التكلفة الأب غير موجود."})
    if not parent.is_group:
        raise ValidationError({"parent_id": "مركز التكلفة الأب يجب أن يكون تجميعيًا."})
    return parent
def serialize_cost_center(cost_center: CostCenter) -> dict[str, Any]:
    return {
        "id": cost_center.id,
        "company_id": cost_center.company_id,
        "code": cost_center.code,
        "name": cost_center.name,
        "name_ar": cost_center.name,
        "name_en": cost_center.name_en,
        "display_name": cost_center.name,
        "parent_id": cost_center.parent_id,
        "parent_code": cost_center.parent.code if cost_center.parent_id else "",
        "parent_name": cost_center.parent.name if cost_center.parent_id else "",
        "level": cost_center.level,
        "is_group": cost_center.is_group,
        "status": cost_center.status,
        "is_active": cost_center.status == CostCenterStatus.ACTIVE,
        "can_post": cost_center.can_post,
        "description": cost_center.description,
        "created_at": cost_center.created_at.isoformat() if cost_center.created_at else None,
        "updated_at": cost_center.updated_at.isoformat() if cost_center.updated_at else None,
    }

def generate_cost_center_code(company) -> str:
    """
    Generate the next company-scoped cost center code.
    UI-created cost centers should not trust a frontend code.
    Existing admin/import workflows may still provide explicit codes.
    """
    prefix = "CC-"
    next_number = 1
    for code in CostCenter.objects.filter(
        company=company,
        code__startswith=prefix,
    ).values_list("code", flat=True):
        try:
            next_number = max(next_number, int(str(code).split("-")[-1]) + 1)
        except (TypeError, ValueError):
            continue
    while True:
        candidate = f"{prefix}{next_number:06d}"
        if not CostCenter.objects.filter(company=company, code=candidate).exists():
            return candidate
        next_number += 1
def save_cost_center_from_payload(
    *,
    company,
    payload: dict[str, Any],
    cost_center: CostCenter | None = None,
    partial: bool = False,
) -> CostCenter:
    obj = cost_center or CostCenter(company=company)
    if cost_center is None:
        requested_code = str(payload.get("code") or "").strip().upper()
        obj.code = requested_code or generate_cost_center_code(company)
    elif "code" in payload:
        requested_code = str(payload.get("code") or "").strip().upper()
        if requested_code:
            obj.code = requested_code
    if not partial or "name" in payload:
        obj.name = str(payload.get("name") or "").strip()
    if not partial or "name_en" in payload:
        obj.name_en = str(payload.get("name_en") or "").strip()
    if not partial or "description" in payload:
        obj.description = str(payload.get("description") or "").strip()
    if not partial or "status" in payload:
        obj.status = normalize_status(payload.get("status"), default=obj.status or CostCenterStatus.ACTIVE)
    if not partial or "is_group" in payload:
        new_is_group = parse_bool(payload.get("is_group"), default=bool(obj.is_group))
        if obj.pk and obj.is_group and not new_is_group and obj.children.exists():
            raise ValidationError({"is_group": "لا يمكن تحويل مركز تكلفة لديه فروع إلى مركز غير تجميعي."})
        obj.is_group = new_is_group
    if not partial or "parent_id" in payload:
        obj.parent = resolve_parent(
            company,
            payload.get("parent_id"),
            current_id=obj.pk,
        )
    try:
        obj.full_clean()
        obj.save()
    except (ValidationError, IntegrityError) as error:
        if isinstance(error, IntegrityError):
            raise ValidationError({"code": "كود مركز التكلفة مستخدم مسبقًا داخل الشركة."}) from error
        raise
    return obj
def cost_center_summary(company) -> dict[str, int]:
    base = CostCenter.objects.filter(company=company)
    return {
        "total_cost_centers": base.count(),
        "active_cost_centers": base.filter(status=CostCenterStatus.ACTIVE).count(),
        "inactive_cost_centers": base.exclude(status=CostCenterStatus.ACTIVE).count(),
        "group_cost_centers": base.filter(is_group=True).count(),
        "postable_cost_centers": base.filter(
            status=CostCenterStatus.ACTIVE,
            is_group=False,
        ).count(),
    }
