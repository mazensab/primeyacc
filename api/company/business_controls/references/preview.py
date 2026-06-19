# ============================================================
# 📂 api/company/business_controls/references/preview.py
# 🧠 PrimeyAcc | Company Reference Preview API V1.0
# ============================================================

from __future__ import annotations

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.views.decorators.http import require_GET

from api.company.business_controls.helpers import (
    error_response,
    get_request_company,
    reference_sequence_to_dict,
    success_response,
)
from business_controls.services import get_or_create_reference_sequence


@login_required
@require_GET
def company_reference_sequence_preview(request):
    company = get_request_company(request)
    if company is None:
        return error_response("Company context is required.", status=403)

    scope = request.GET.get("scope", "").strip()
    prefix = request.GET.get("prefix", "").strip()
    padding_raw = request.GET.get("padding", "6").strip()

    try:
        padding = int(padding_raw)
    except ValueError:
        padding = 6

    try:
        sequence = get_or_create_reference_sequence(
            company=company,
            scope=scope,
            prefix=prefix,
            padding=padding,
        )
    except ValidationError as exc:
        return error_response(str(exc), status=400)

    return success_response(reference_sequence_to_dict(sequence))
