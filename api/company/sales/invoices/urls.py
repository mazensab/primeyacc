# ============================================================
# 📂 api/company/sales/invoices/urls.py
# 🧠 Mhamcloud | Company Sales Invoices URLs V1.1
# ------------------------------------------------------------
# ✅ Sales invoices list
# ✅ Sales invoices summary
# ✅ Sales invoice create
# ✅ Sales invoice detail
# ✅ Sales invoice update
# ✅ Sales invoice issue
# ✅ Sales invoice cancel
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه المسارات تعمل داخل /api/company/sales/invoices/
# - العزل والصلاحيات داخل كل view
# - summary يجب أن يأتي قبل <int:invoice_id>/ حتى لا يفسر كمعرف
# ============================================================

from __future__ import annotations

from django.urls import path

from api.company.sales.invoices.cancel import company_sales_invoice_cancel
from api.company.sales.invoices.create import company_sales_invoice_create
from api.company.sales.invoices.detail import company_sales_invoice_detail
from api.company.sales.invoices.issue import company_sales_invoice_issue
from api.company.sales.invoices.list import company_sales_invoices_list
from api.company.sales.invoices.summary import company_sales_invoices_summary
from api.company.sales.invoices.update import company_sales_invoice_update


urlpatterns = [
    path("", company_sales_invoices_list, name="company_sales_invoices_list"),
    path("summary/", company_sales_invoices_summary, name="company_sales_invoices_summary"),
    path("create/", company_sales_invoice_create, name="company_sales_invoice_create"),
    path("<int:invoice_id>/", company_sales_invoice_detail, name="company_sales_invoice_detail"),
    path("<int:invoice_id>/update/", company_sales_invoice_update, name="company_sales_invoice_update"),
    path("<int:invoice_id>/issue/", company_sales_invoice_issue, name="company_sales_invoice_issue"),
    path("<int:invoice_id>/cancel/", company_sales_invoice_cancel, name="company_sales_invoice_cancel"),
]