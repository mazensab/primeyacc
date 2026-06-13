# ============================================================
# ?? api/company/sales/credit_notes/urls.py
# ?? PrimeyAcc | Company Sales Credit Notes URLs
# ============================================================

from __future__ import annotations

from django.urls import path

from .cancel import (
    company_sales_credit_note_cancel,
)
from .create import (
    company_sales_credit_note_create,
)
from .detail import (
    company_sales_credit_note_detail,
)
from .issue import (
    company_sales_credit_note_issue,
)
from .list import (
    company_sales_credit_notes_list,
)
from .post import (
    company_sales_credit_note_post,
)


urlpatterns = [
    path(
        "",
        company_sales_credit_notes_list,
        name="company_sales_credit_notes_list",
    ),
    path(
        "create/",
        company_sales_credit_note_create,
        name="company_sales_credit_note_create",
    ),
    path(
        "<int:credit_note_id>/",
        company_sales_credit_note_detail,
        name="company_sales_credit_note_detail",
    ),
    path(
        "<int:credit_note_id>/issue/",
        company_sales_credit_note_issue,
        name="company_sales_credit_note_issue",
    ),
    path(
        "<int:credit_note_id>/post/",
        company_sales_credit_note_post,
        name="company_sales_credit_note_post",
    ),
    path(
        "<int:credit_note_id>/cancel/",
        company_sales_credit_note_cancel,
        name="company_sales_credit_note_cancel",
    ),
]
