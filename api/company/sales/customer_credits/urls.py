# ============================================================
# api/company/sales/customer_credits/urls.py
# Mhamcloud | Customer Credit URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .allocate import (
    company_customer_credit_allocate,
)
from .allocations import (
    company_customer_credit_allocations,
)
from .balances import (
    company_customer_credit_balances,
)
from .detail import (
    company_customer_credit_allocation_detail,
)
from .reverse import (
    company_customer_credit_allocation_reverse,
)


urlpatterns = [
    path(
        "balances/",
        company_customer_credit_balances,
        name="company_customer_credit_balances",
    ),
    path(
        "allocations/",
        company_customer_credit_allocations,
        name="company_customer_credit_allocations",
    ),
    path(
        "allocations/<int:allocation_id>/",
        company_customer_credit_allocation_detail,
        name=(
            "company_customer_credit_"
            "allocation_detail"
        ),
    ),
    path(
        "allocate/",
        company_customer_credit_allocate,
        name="company_customer_credit_allocate",
    ),
    path(
        "allocations/<int:allocation_id>/reverse/",
        company_customer_credit_allocation_reverse,
        name=(
            "company_customer_credit_"
            "allocation_reverse"
        ),
    ),
]
