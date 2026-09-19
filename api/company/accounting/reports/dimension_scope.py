from __future__ import annotations
from api.company.branch_enforcement import scope_operational_queryset

def scope_accounting_lines(queryset, request):
    legacy = queryset.filter(branch__isnull=True)
    operational = scope_operational_queryset(
        queryset.filter(branch__isnull=False),
        request,
        branch_lookup="branch_id",
    )
    return (legacy | operational).distinct()
