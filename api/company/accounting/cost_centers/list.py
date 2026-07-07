# ============================================================
# 📂 api/company/accounting/cost_centers/list.py
# 🧠 Mhamcloud | Company Accounting Cost Centers List API
# ------------------------------------------------------------
# ✅ Real API only
# ✅ Tenant scoped by backend session/company membership
# ✅ Used by journal entries line cost-center select
# ============================================================
from __future__ import annotations
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from accounts.models import CompanyMembership, MembershipStatus
from accounting.models import CostCenter, CostCenterStatus
def _resolve_company(request):
    company = getattr(request, "company", None) or getattr(request, "current_company", None)
    if company is not None:
        return company
    user = getattr(request, "user", None)
    if not user or not user.is_authenticated:
        return None
    active_status = getattr(MembershipStatus, "ACTIVE", "ACTIVE")
    queryset = (
        CompanyMembership.objects.select_related("company")
        .filter(user=user, status=active_status)
        .order_by("-id")
    )
    session_company_id = (
        request.session.get("current_company_id")
        or request.session.get("company_id")
        or request.headers.get("X-Company-Id")
        or request.headers.get("X-Company-ID")
    )
    if session_company_id:
        scoped = queryset.filter(company_id=session_company_id).first()
        if scoped:
            return scoped.company
    membership = queryset.first()
    return membership.company if membership else None
def _serialize_cost_center(cost_center):
    return {
        "id": cost_center.id,
        "code": cost_center.code,
        "name": cost_center.name,
        "name_ar": cost_center.name,
        "name_en": cost_center.name_en,
        "display_name": cost_center.name,
        "level": cost_center.level,
        "is_group": cost_center.is_group,
        "status": cost_center.status,
        "is_active": cost_center.status == CostCenterStatus.ACTIVE,
        "can_post": cost_center.can_post,
        "parent_id": cost_center.parent_id,
        "parent_code": cost_center.parent.code if cost_center.parent_id else "",
        "parent_name": cost_center.parent.name if cost_center.parent_id else "",
        "description": cost_center.description,
    }
@require_GET
def accounting_cost_centers_list(request):
    """
    GET /api/company/accounting/cost-centers/
    """
    company = _resolve_company(request)
    if company is None:
        return JsonResponse(
            {
                "ok": False,
                "message": "لا توجد شركة نشطة للمستخدم الحالي.",
                "results": [],
            },
            status=401,
        )
    queryset = CostCenter.objects.filter(company=company).select_related("parent")
    status = (request.GET.get("status") or "active").strip().lower()
    postable = (request.GET.get("postable") or "").strip().lower()
    search = (request.GET.get("search") or request.GET.get("q") or "").strip()
    if status in {"active", "نشط"}:
        queryset = queryset.filter(status=CostCenterStatus.ACTIVE)
    elif status in {"inactive", "غير_نشط", "غير نشط"}:
        queryset = queryset.exclude(status=CostCenterStatus.ACTIVE)
    if postable in {"1", "true", "yes", "postable"}:
        queryset = queryset.filter(status=CostCenterStatus.ACTIVE, is_group=False)
    if search:
        queryset = queryset.filter(code__icontains=search) | queryset.filter(name__icontains=search) | queryset.filter(name_en__icontains=search)
    queryset = queryset.order_by("code", "id")
    results = [_serialize_cost_center(cost_center) for cost_center in queryset[:500]]
    return JsonResponse(
        {
            "ok": True,
            "message": "Cost centers loaded successfully.",
            "results": results,
            "items": results,
            "cost_centers": results,
            "summary": {
                "total_cost_centers": queryset.count(),
                "active_cost_centers": queryset.filter(status=CostCenterStatus.ACTIVE).count(),
                "postable_cost_centers": queryset.filter(
                    status=CostCenterStatus.ACTIVE,
                    is_group=False,
                ).count(),
            },
        }
    )
accounting_cost_centers_list.required_company_permissions = [
    "company.accounting.journal_entries.view",
]
