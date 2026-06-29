# ============================================================
# 📂 api/company/business_controls/audit_events/detail.py
# 🧠 Mhamcloud | Company Audit Event Detail API V1.0
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
def company_audit_event_detail(request, event_id: int):
    company = get_request_company(request)
    if company is None:
        return error_response("Company context is required.", status=403)

    event = BusinessAuditEvent.objects.filter(
        company=company,
        id=event_id,
    ).first()

    if event is None:
        return error_response("Audit event not found.", status=404)

    return success_response(audit_event_to_dict(event))
