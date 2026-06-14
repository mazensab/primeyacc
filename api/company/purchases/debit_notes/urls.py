from __future__ import annotations

from django.urls import path

from .cancel import (
    company_supplier_debit_note_cancel,
)
from .create import (
    company_supplier_debit_note_create,
)
from .detail import (
    company_supplier_debit_note_detail,
)
from .issue import (
    company_supplier_debit_note_issue,
)
from .list import (
    company_supplier_debit_notes_list,
)
from .post import (
    company_supplier_debit_note_post,
)
from .update import (
    company_supplier_debit_note_update,
)


urlpatterns = [
    path(
        "",
        company_supplier_debit_notes_list,
        name="company-supplier-debit-notes-list",
    ),
    path(
        "create/",
        company_supplier_debit_note_create,
        name="company-supplier-debit-note-create",
    ),
    path(
        "<int:debit_note_id>/",
        company_supplier_debit_note_detail,
        name="company-supplier-debit-note-detail",
    ),
    path(
        "<int:debit_note_id>/update/",
        company_supplier_debit_note_update,
        name="company-supplier-debit-note-update",
    ),
    path(
        "<int:debit_note_id>/issue/",
        company_supplier_debit_note_issue,
        name="company-supplier-debit-note-issue",
    ),
    path(
        "<int:debit_note_id>/post/",
        company_supplier_debit_note_post,
        name="company-supplier-debit-note-post",
    ),
    path(
        "<int:debit_note_id>/cancel/",
        company_supplier_debit_note_cancel,
        name="company-supplier-debit-note-cancel",
    ),
]
