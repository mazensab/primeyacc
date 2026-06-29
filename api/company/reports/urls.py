# ============================================================
# 📂 api/company/reports/urls.py
# 🧠 Mhamcloud | Company Reports URLs
# ============================================================

from django.urls import path

from .balance_sheet import balance_sheet_report
from .cash_flow import cash_flow_report
from .export import export_report
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
    path("balance-sheet/", balance_sheet_report, name="balance-sheet"),
    path("cash-flow/", cash_flow_report, name="cash-flow"),
    path("export/", export_report, name="export"),
]
