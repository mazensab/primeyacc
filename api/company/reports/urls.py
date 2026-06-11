# ============================================================
# 📂 api/company/reports/urls.py
# 🧠 PrimeyAcc | Company Reports URLs
# ============================================================

from django.urls import path

from .general_ledger import general_ledger_report
from .overview import reports_overview
from .profit_loss import profit_loss_report
from .trial_balance import trial_balance_report


app_name = "company_reports"


urlpatterns = [
    path("", reports_overview, name="overview"),
    path("trial-balance/", trial_balance_report, name="trial-balance"),
    path("general-ledger/", general_ledger_report, name="general-ledger"),
    path("profit-loss/", profit_loss_report, name="profit-loss"),
]
