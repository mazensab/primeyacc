# ============================================================
# 📂 api/company/business_controls/audit_events/list.py
# 🧠 PrimeyAcc | Company Audit Events List API V1.0
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET

from api.company.business_controls.helpers import (
    audit_event_to_dict,
    error_response,
    get_request_company,
    success_response,
)
from business_controls.models import BusinessAuditEvent


@login_required
@require_GET
def company_audit_events_list(request):
    company = get_request_company(request)
    if company is None:
        return error_response("Company context is required.", status=403)

    qs = BusinessAuditEvent.objects.filter(company=company)

    event_type = request.GET.get("event_type")
    severity = request.GET.get("severity")
    source_app = request.GET.get("source_app")
    source_model = request.GET.get("source_model")
    object_reference = request.GET.get("object_reference")

    if event_type:
        qs = qs.filter(event_type=event_type)
    if severity:
        qs = qs.filter(severity=severity)
    if source_app:
        qs = qs.filter(source_app=source_app)
    if source_model:
        qs = qs.filter(source_model=source_model)
    if object_reference:
        qs = qs.filter(object_reference__icontains=object_reference)

    try:
        limit = min(max(int(request.GET.get("limit", "50")), 1), 200)
    except ValueError:
        limit = 50

    return success_response(
        {
            "count": qs.count(),
            "results": [audit_event_to_dict(event) for event in qs[:limit]],
        }
    )
