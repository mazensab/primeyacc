# ============================================================
# 📂 api/company/accounting/urls.py
# 🧠 Mhamcloud | Company Accounting API URLs
# ------------------------------------------------------------
# ✅ مسارات محاسبة الشركة
# ✅ دليل الحسابات
# ✅ قيود اليومية
# ✅ تقارير المحاسبة
# ✅ عزل الشركة يتم داخل Views عبر api/permissions.py
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.accounting.accounts.detail import accounting_account_detail
from api.company.accounting.accounts.list import accounting_accounts_list
from api.company.accounting.journal_entries.create import accounting_journal_entry_create
from api.company.accounting.journal_entries.detail import accounting_journal_entry_detail
from api.company.accounting.journal_entries.list import accounting_journal_entries_list
from api.company.accounting.journal_entries.post import accounting_journal_entry_post
from api.company.accounting.journal_entries.reverse import accounting_journal_entry_reverse
from api.company.accounting.reports.trial_balance import accounting_trial_balance


app_name = "company_accounting"


urlpatterns = [
    # Chart of Accounts
    path("accounts/", accounting_accounts_list, name="accounts-list"),
    path("accounts/<int:account_id>/", accounting_account_detail, name="accounts-detail"),

    # Journal Entries
    path("journal-entries/", accounting_journal_entries_list, name="journal-entries-list"),
    path("journal-entries/create/", accounting_journal_entry_create, name="journal-entries-create"),
    path("journal-entries/<int:entry_id>/", accounting_journal_entry_detail, name="journal-entries-detail"),
    path("journal-entries/<int:entry_id>/post/", accounting_journal_entry_post, name="journal-entries-post"),
    path("journal-entries/<int:entry_id>/reverse/", accounting_journal_entry_reverse, name="journal-entries-reverse"),

    # Reports
    path("reports/trial-balance/", accounting_trial_balance, name="reports-trial-balance"),
]