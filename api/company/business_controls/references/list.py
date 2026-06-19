# ============================================================
# 📂 api/company/business_controls/references/list.py
# 🧠 PrimeyAcc | Company Reference Sequences List API V1.0
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_GET

from api.company.business_controls.helpers import (
    error_response,
    get_request_company,
    reference_sequence_to_dict,
    success_response,
)
from business_controls.models import BusinessReferenceSequence


@login_required
@require_GET
def company_reference_sequences_list(request):
    company = get_request_company(request)
    if company is None:
        return error_response("Company context is required.", status=403)

    qs = BusinessReferenceSequence.objects.filter(company=company)

    scope = request.GET.get("scope")
    prefix = request.GET.get("prefix")
    is_active = request.GET.get("is_active")

    if scope:
        qs = qs.filter(scope=scope)
    if prefix:
        qs = qs.filter(prefix=prefix)
    if is_active in {"true", "false"}:
        qs = qs.filter(is_active=(is_active == "true"))

    return success_response(
        {
            "count": qs.count(),
            "results": [reference_sequence_to_dict(sequence) for sequence in qs[:200]],
        }
    )
