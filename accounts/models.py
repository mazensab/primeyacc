# ============================================================
# 📂 accounts/models.py
# 🧠 PrimeyAcc | Accounts Models V3.1
# ------------------------------------------------------------
# ✅ User Profile
# ✅ Workspace Type Foundation
# ✅ Company Membership
# ✅ Company Role Basics
# ✅ System / Company Access Separation
# ✅ Multi-company User Support
# ✅ Fixed Company Access Resolver
# ✅ Role-based Permissions Foundation
# ✅ Platform Billing Documents System Permissions
# ✅ Company Settings Permissions
# ✅ Company Branches Permissions
# ✅ Company Catalog Permissions
# ✅ Company Sales Invoices Permissions
# ✅ Company Purchases Bills Permissions
# ✅ Company Inventory & Warehouses Permissions
# ✅ Company Accounting Permissions
# ✅ Company Treasury & Payments Permissions
# ✅ Company Customer Payments Permissions
# ✅ Company Supplier Payments Permissions
# ✅ Company Payment Methods / Gateways / Terminals Permissions
# ✅ Company Notifications Permissions
# ✅ Company WhatsApp Permissions
# ✅ Company HR Employees Permissions
# ✅ Company HR Attendance Permissions
# ✅ Safe Default Company Membership Resolver
# ✅ Audit Fields
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - User هو حساب الدخول فقط
# - UserProfile هو ملف المستخدم العام داخل PrimeyAcc
# - CompanyMembership هي علاقة المستخدم بالشركة ودوره داخلها
# - /system لا يفتح إلا لمستخدم نظام مصرح
# - /company لا يفتح إلا بعضوية شركة فعالة
# - لا يتم الوصول إلى بيانات شركة إلا عبر CompanyMembership فعال
# - whoami هو مصدر الحقيقة للواجهة والصلاحيات
# - صلاحيات النظام ثابتة حاليًا داخل SYSTEM_ROLE_PERMISSIONS
# - صلاحيات مستندات فوترة المنصة مستقلة داخل system.billing_documents.*
# - كتالوج الشركة له صلاحيات منفصلة للتصنيفات والوحدات والمنتجات
# - فواتير المبيعات لها صلاحيات دقيقة داخل company.sales.invoices.*
# - فواتير الموردين لها صلاحيات دقيقة داخل company.purchases.bills.*
# - المخزون والمستودعات لهما صلاحيات دقيقة داخل company.inventory.*
# - المحاسبة لها صلاحيات دقيقة داخل company.accounting.*
# - الخزينة والمدفوعات لها صلاحيات دقيقة داخل company.treasury.*
# - طرق وبوابات وأجهزة الدفع لها صلاحيات دقيقة داخل company.payments.*
# - الإشعارات وواتساب لهما صلاحيات دقيقة داخل company.notifications.* و company.whatsapp.*
# - الموارد البشرية والموظفون لهم صلاحيات دقيقة داخل company.hr.employees.*
# - الحضور والانصراف له صلاحيات دقيقة داخل company.hr.attendance.*
# ============================================================

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils import timezone

from companies.models import Company, CompanyStatus


class WorkspaceType(models.TextChoices):
    SYSTEM = "SYSTEM", "System"
    COMPANY = "COMPANY", "Company"


class UserProfileStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INVITED = "INVITED", "Invited"
    SUSPENDED = "SUSPENDED", "Suspended"
    INACTIVE = "INACTIVE", "Inactive"


class SystemRole(models.TextChoices):
    NONE = "NONE", "None"
    SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
    SYSTEM_ADMIN = "SYSTEM_ADMIN", "System Admin"
    SUPPORT = "SUPPORT", "Support"
    BILLING_MANAGER = "BILLING_MANAGER", "Billing Manager"


class CompanyRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    ADMIN = "ADMIN", "Admin"
    MANAGER = "MANAGER", "Manager"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"
    CASHIER = "CASHIER", "Cashier"
    SALES = "SALES", "Sales"
    INVENTORY = "INVENTORY", "Inventory"
    HR = "HR", "HR"
    EMPLOYEE = "EMPLOYEE", "Employee"
    VIEWER = "VIEWER", "Viewer"


class MembershipStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INVITED = "INVITED", "Invited"
    SUSPENDED = "SUSPENDED", "Suspended"
    INACTIVE = "INACTIVE", "Inactive"


# ============================================================
# Permissions Foundation
# ------------------------------------------------------------
# ملاحظة:
# هذه الصلاحيات ثابتة حاليًا لتثبيت المراحل دون تعقيد زائد.
# يمكن لاحقًا نقلها إلى جداول Role / Permission عند الحاجة
# إلى إدارة مرنة للصلاحيات من الواجهة.
# ============================================================

SYSTEM_PERMISSION_ALL = "*"

SYSTEM_ROLE_PERMISSIONS: dict[str, list[str]] = {
    SystemRole.NONE: [],
    SystemRole.SUPER_ADMIN: [SYSTEM_PERMISSION_ALL],
    SystemRole.SYSTEM_ADMIN: [
        "system.dashboard.view",
        "system.companies.view",
        "system.companies.create",
        "system.companies.update",
        "system.companies.status",
        "system.plans.view",
        "system.plans.create",
        "system.plans.update",
        "system.subscriptions.view",
        "system.subscriptions.create",
        "system.subscriptions.update",
        "system.subscriptions.renew",
        "system.subscriptions.cancel",
        "system.billing_documents.view",
        "system.billing_documents.create_invoice",
        "system.billing_documents.create_receipt",
        "system.users.view",
        "system.users.create",
        "system.users.update",
        "system.reports.view",
    ],
    SystemRole.SUPPORT: [
        "system.dashboard.view",
        "system.companies.view",
        "system.subscriptions.view",
        "system.billing_documents.view",
        "system.users.view",
    ],
    SystemRole.BILLING_MANAGER: [
        "system.dashboard.view",
        "system.companies.view",
        "system.plans.view",
        "system.subscriptions.view",
        "system.subscriptions.create",
        "system.subscriptions.update",
        "system.subscriptions.renew",
        "system.subscriptions.cancel",
        "system.billing_documents.view",
        "system.billing_documents.create_invoice",
        "system.billing_documents.create_receipt",
        "system.reports.view",
    ],
}

COMPANY_PERMISSION_ALL = "*"

COMPANY_ROLE_PERMISSIONS: dict[str, list[str]] = {
    CompanyRole.OWNER: [COMPANY_PERMISSION_ALL],
    CompanyRole.ADMIN: [
        "company.dashboard.view",
        "company.users.view",
        "company.users.create",
        "company.users.update",
        "company.settings.view",
        "company.settings.update",
        "company.activity_profiles.view",
        "company.activity_profiles.update",
        "company.branches.view",
        "company.branches.create",
        "company.branches.update",
        "company.categories.view",
        "company.categories.create",
        "company.categories.update",
        "company.units.view",
        "company.units.create",
        "company.units.update",
        "company.products.view",
        "company.products.create",
        "company.products.update",
        "company.customers.view",
        "company.customers.create",
        "company.customers.update",
        "company.suppliers.view",
        "company.suppliers.create",
        "company.suppliers.update",
        "company.sales.view",
        "company.sales.create",
        "company.sales.update",
        "company.sales.invoices.view",
        "company.sales.invoices.create",
        "company.sales.invoices.update",
        "company.sales.invoices.issue",
        "company.sales.invoices.cancel",
        "company.purchases.view",
        "company.purchases.create",
        "company.purchases.update",
        "company.purchases.bills.view",
        "company.purchases.bills.create",
        "company.purchases.bills.update",
        "company.purchases.bills.post",
        "company.purchases.bills.cancel",
        "company.purchases.returns.view",
        "company.purchases.returns.create",
        "company.purchases.returns.update",
        "company.purchases.returns.confirm",
        "company.purchases.returns.post",
        "company.purchases.returns.cancel",
        "company.inventory.view",
        "company.inventory.update",
        "company.inventory.warehouses.view",
        "company.inventory.warehouses.create",
        "company.inventory.warehouses.update",
        "company.inventory.warehouses.status",
        "company.inventory.stock.view",
        "company.inventory.movements.view",
        "company.inventory.movements.create",
        "company.accounting.view",
        "company.accounting.create",
        "company.accounting.update",
        "company.accounting.accounts.view",
        "company.accounting.accounts.create",
        "company.accounting.accounts.update",
        "company.accounting.journals.view",
        "company.accounting.journals.create",
        "company.accounting.journals.post",
        "company.accounting.journals.reverse",
        "company.accounting.reports.view",
        "company.treasury.summary.view",
        "company.treasury.accounts.view",
        "company.treasury.accounts.create",
        "company.treasury.accounts.update",
        "company.treasury.transactions.view",
        "company.treasury.transactions.create",
        "company.treasury.transactions.update",
        "company.treasury.transactions.post",
        "company.treasury.transactions.cancel",
        "company.treasury.customer_payments.view",
        "company.treasury.customer_payments.create",
        "company.treasury.customer_payments.update",
        "company.treasury.customer_payments.confirm",
        "company.treasury.customer_payments.cancel",
        "company.treasury.supplier_payments.view",
        "company.treasury.supplier_payments.create",
        "company.treasury.supplier_payments.update",
        "company.treasury.supplier_payments.confirm",
        "company.treasury.supplier_payments.cancel",
        "company.payments.view",
        "company.payments.create",
        "company.payments.update",
        "company.payments.status",
        "company.payments.methods.view",
        "company.payments.methods.create",
        "company.payments.methods.update",
        "company.payments.methods.status",
        "company.payments.gateways.view",
        "company.payments.gateways.create",
        "company.payments.gateways.update",
        "company.payments.gateways.status",
        "company.payments.terminals.view",
        "company.payments.terminals.create",
        "company.payments.terminals.update",
        "company.payments.terminals.status",
        "company.notifications.view",
        "company.notifications.read",
        "company.notifications.manage",
        "company.whatsapp.view",
        "company.whatsapp.manage",
        "company.whatsapp.templates.manage",
        "company.whatsapp.messages.view",
        "company.whatsapp.messages.send",
        "company.hr.employees.view",
        "company.hr.employees.create",
        "company.hr.employees.update",
        "company.hr.employees.activate",
        "company.hr.employees.deactivate",
        "company.hr.attendance.view",
        "company.hr.attendance.create",
        "company.hr.attendance.update",
        "company.hr.attendance.check_in",
        "company.hr.attendance.check_out",
        "company.hr.attendance.cancel",
        "company.hr.leave_types.view",
        "company.hr.leave_types.create",
        "company.hr.leave_types.update",
        "company.hr.leave_types.activate",
        "company.hr.leave_types.deactivate",
        "company.hr.leave_requests.view",
        "company.hr.leave_requests.create",
        "company.hr.leave_requests.update",
        "company.hr.leave_requests.submit",
        "company.hr.leave_requests.approve",
        "company.hr.leave_requests.reject",
        "company.hr.leave_requests.cancel",
        "company.hr.leave_balances.view",
        "company.hr.leave_balances.update",
        "company.hr.payroll.view",
        "company.hr.payroll.components.view",
        "company.hr.payroll.components.create",
        "company.hr.payroll.components.update",
        "company.hr.payroll.components.activate",
        "company.hr.payroll.components.deactivate",
        "company.hr.payroll.profiles.view",
        "company.hr.payroll.profiles.create",
        "company.hr.payroll.profiles.update",
        "company.hr.payroll.profiles.activate",
        "company.hr.payroll.profiles.deactivate",
        "company.hr.payroll.periods.view",
        "company.hr.payroll.periods.create",
        "company.hr.payroll.periods.update",
        "company.hr.payroll.periods.open",
        "company.hr.payroll.periods.close",
        "company.hr.payroll.runs.view",
        "company.hr.payroll.runs.create",
        "company.hr.payroll.runs.update",
        "company.hr.payroll.runs.calculate",
        "company.hr.payroll.runs.approve",
        "company.hr.payroll.runs.post",
        "company.hr.payroll.runs.cancel",
        "company.hr.payroll.payslips.view",
        "company.hr.payroll.payslips.update",
        "company.hr.payroll.payslips.approve",
        "company.hr.payroll.payslips.pay",
        "company.hr.payroll.payslips.cancel",
        "company.hr.payroll.payslip_items.view",
        "company.hr.payroll.payslip_items.update",
        "company.hr.performance.view",
        "company.hr.performance.cycles.view",
        "company.hr.performance.cycles.create",
        "company.hr.performance.cycles.update",
        "company.hr.performance.cycles.open",
        "company.hr.performance.cycles.close",
        "company.hr.performance.cycles.cancel",
        "company.hr.performance.criteria.view",
        "company.hr.performance.criteria.create",
        "company.hr.performance.criteria.update",
        "company.hr.performance.criteria.activate",
        "company.hr.performance.criteria.deactivate",
        "company.hr.performance.reviews.view",
        "company.hr.performance.reviews.create",
        "company.hr.performance.reviews.update",
        "company.hr.performance.reviews.submit",
        "company.hr.performance.reviews.approve",
        "company.hr.performance.reviews.cancel",
        "company.hr.performance.scores.view",
        "company.hr.performance.scores.create",
        "company.hr.performance.scores.update",
        "company.hr.performance.scores.delete",
        "company.hr.performance.goals.view",
        "company.hr.performance.goals.create",
        "company.hr.performance.goals.update",
        "company.hr.performance.goals.activate",
        "company.hr.performance.goals.complete",
        "company.hr.performance.goals.cancel",
        "company.reports.view",
        "company.sales.quotations.view",
        "company.sales.quotations.create",
        "company.sales.quotations.update",
        "company.sales.quotations.send",
        "company.sales.quotations.accept",
        "company.sales.quotations.reject",
        "company.sales.quotations.expire",
        "company.sales.quotations.cancel",
        "company.sales.orders.view",
        "company.sales.orders.create",
        "company.sales.orders.update",
        "company.sales.orders.confirm",
        "company.sales.orders.process",
        "company.sales.orders.complete",
        "company.sales.orders.cancel",
        "company.sales.orders.create_from_quotation",
        "company.sales.orders.create_invoice",
        "company.sales.orders.invoices.view",
            "company.sales.returns.view",
        "company.sales.returns.create",
        "company.sales.returns.confirm",
        "company.sales.returns.cancel",
        "company.sales.credit_notes.view",
        "company.sales.credit_notes.create",
        "company.sales.credit_notes.issue",
        "company.sales.credit_notes.post",
        "company.sales.credit_notes.cancel",
        "company.sales.customer_credits.view",
        "company.sales.customer_credits.allocations.view",
        "company.sales.customer_credits.allocate",
        "company.sales.customer_credits.reverse",
],
    CompanyRole.MANAGER: [
        "company.dashboard.view",
        "company.settings.view",
        "company.activity_profiles.view",
        "company.branches.view",
        "company.categories.view",
        "company.units.view",
        "company.products.view",
        "company.customers.view",
        "company.suppliers.view",
        "company.sales.view",
        "company.sales.create",
        "company.sales.update",
        "company.sales.invoices.view",
        "company.sales.invoices.create",
        "company.sales.invoices.update",
        "company.sales.invoices.issue",
        "company.sales.invoices.cancel",
        "company.purchases.view",
        "company.purchases.create",
        "company.purchases.update",
        "company.purchases.bills.view",
        "company.purchases.bills.create",
        "company.purchases.bills.update",
        "company.purchases.bills.post",
        "company.purchases.bills.cancel",
        "company.purchases.returns.view",
        "company.purchases.returns.create",
        "company.purchases.returns.update",
        "company.purchases.returns.confirm",
        "company.purchases.returns.post",
        "company.purchases.returns.cancel",
        "company.inventory.view",
        "company.inventory.warehouses.view",
        "company.inventory.stock.view",
        "company.inventory.movements.view",
        "company.accounting.view",
        "company.accounting.accounts.view",
        "company.accounting.journals.view",
        "company.accounting.reports.view",
        "company.treasury.summary.view",
        "company.treasury.accounts.view",
        "company.treasury.transactions.view",
        "company.treasury.customer_payments.view",
        "company.treasury.supplier_payments.view",
        "company.payments.view",
        "company.payments.methods.view",
        "company.payments.gateways.view",
        "company.payments.terminals.view",
        "company.notifications.view",
        "company.notifications.read",
        "company.notifications.manage",
        "company.whatsapp.view",
        "company.whatsapp.manage",
        "company.whatsapp.templates.manage",
        "company.whatsapp.messages.view",
        "company.whatsapp.messages.send",
        "company.hr.employees.view",
        "company.hr.employees.create",
        "company.hr.employees.update",
        "company.hr.employees.activate",
        "company.hr.employees.deactivate",
        "company.hr.attendance.view",
        "company.hr.attendance.create",
        "company.hr.attendance.update",
        "company.hr.attendance.check_in",
        "company.hr.attendance.check_out",
        "company.hr.attendance.cancel",
        "company.hr.leave_types.view",
        "company.hr.leave_types.create",
        "company.hr.leave_types.update",
        "company.hr.leave_types.activate",
        "company.hr.leave_types.deactivate",
        "company.hr.leave_requests.view",
        "company.hr.leave_requests.create",
        "company.hr.leave_requests.update",
        "company.hr.leave_requests.submit",
        "company.hr.leave_requests.approve",
        "company.hr.leave_requests.reject",
        "company.hr.leave_requests.cancel",
        "company.hr.leave_balances.view",
        "company.hr.leave_balances.update",
        "company.hr.payroll.view",
        "company.hr.payroll.components.view",
        "company.hr.payroll.components.create",
        "company.hr.payroll.components.update",
        "company.hr.payroll.components.activate",
        "company.hr.payroll.components.deactivate",
        "company.hr.payroll.profiles.view",
        "company.hr.payroll.profiles.create",
        "company.hr.payroll.profiles.update",
        "company.hr.payroll.profiles.activate",
        "company.hr.payroll.profiles.deactivate",
        "company.hr.payroll.periods.view",
        "company.hr.payroll.periods.create",
        "company.hr.payroll.periods.update",
        "company.hr.payroll.periods.open",
        "company.hr.payroll.periods.close",
        "company.hr.payroll.runs.view",
        "company.hr.payroll.runs.create",
        "company.hr.payroll.runs.update",
        "company.hr.payroll.runs.calculate",
        "company.hr.payroll.runs.approve",
        "company.hr.payroll.runs.post",
        "company.hr.payroll.runs.cancel",
        "company.hr.payroll.payslips.view",
        "company.hr.payroll.payslips.update",
        "company.hr.payroll.payslips.approve",
        "company.hr.payroll.payslips.pay",
        "company.hr.payroll.payslips.cancel",
        "company.hr.payroll.payslip_items.view",
        "company.hr.payroll.payslip_items.update",
        "company.hr.performance.view",
        "company.hr.performance.cycles.view",
        "company.hr.performance.cycles.create",
        "company.hr.performance.cycles.update",
        "company.hr.performance.cycles.open",
        "company.hr.performance.cycles.close",
        "company.hr.performance.cycles.cancel",
        "company.hr.performance.criteria.view",
        "company.hr.performance.criteria.create",
        "company.hr.performance.criteria.update",
        "company.hr.performance.criteria.activate",
        "company.hr.performance.criteria.deactivate",
        "company.hr.performance.reviews.view",
        "company.hr.performance.reviews.create",
        "company.hr.performance.reviews.update",
        "company.hr.performance.reviews.submit",
        "company.hr.performance.reviews.approve",
        "company.hr.performance.reviews.cancel",
        "company.hr.performance.scores.view",
        "company.hr.performance.scores.create",
        "company.hr.performance.scores.update",
        "company.hr.performance.scores.delete",
        "company.hr.performance.goals.view",
        "company.hr.performance.goals.create",
        "company.hr.performance.goals.update",
        "company.hr.performance.goals.activate",
        "company.hr.performance.goals.complete",
        "company.hr.performance.goals.cancel",
        "company.reports.view",
        "company.sales.quotations.view",
        "company.sales.quotations.create",
        "company.sales.quotations.update",
        "company.sales.quotations.send",
        "company.sales.quotations.accept",
        "company.sales.quotations.reject",
        "company.sales.quotations.expire",
        "company.sales.quotations.cancel",
        "company.sales.orders.view",
        "company.sales.orders.create",
        "company.sales.orders.update",
        "company.sales.orders.confirm",
        "company.sales.orders.process",
        "company.sales.orders.complete",
        "company.sales.orders.cancel",
        "company.sales.orders.create_from_quotation",
        "company.sales.orders.create_invoice",
        "company.sales.orders.invoices.view",
            "company.sales.returns.view",
        "company.sales.returns.create",
        "company.sales.returns.confirm",
        "company.sales.returns.cancel",
        "company.sales.credit_notes.view",
        "company.sales.credit_notes.create",
        "company.sales.credit_notes.issue",
        "company.sales.credit_notes.post",
        "company.sales.credit_notes.cancel",
        "company.sales.customer_credits.view",
        "company.sales.customer_credits.allocations.view",
        "company.sales.customer_credits.allocate",
        "company.sales.customer_credits.reverse",
],
    CompanyRole.ACCOUNTANT: [
        "company.dashboard.view",
        "company.settings.view",
        "company.branches.view",
        "company.categories.view",
        "company.units.view",
        "company.products.view",
        "company.customers.view",
        "company.suppliers.view",
        "company.sales.view",
        "company.sales.invoices.view",
        "company.sales.invoices.issue",
        "company.sales.invoices.cancel",
        "company.purchases.view",
        "company.purchases.create",
        "company.purchases.update",
        "company.purchases.bills.view",
        "company.purchases.bills.create",
        "company.purchases.bills.update",
        "company.purchases.bills.post",
        "company.purchases.bills.cancel",
        "company.purchases.returns.view",
        "company.purchases.returns.create",
        "company.purchases.returns.update",
        "company.purchases.returns.confirm",
        "company.purchases.returns.post",
        "company.purchases.returns.cancel",
        "company.accounting.view",
        "company.accounting.create",
        "company.accounting.update",
        "company.accounting.accounts.view",
        "company.accounting.accounts.create",
        "company.accounting.accounts.update",
        "company.accounting.journals.view",
        "company.accounting.journals.create",
        "company.accounting.journals.post",
        "company.accounting.journals.reverse",
        "company.accounting.reports.view",
        "company.treasury.summary.view",
        "company.treasury.accounts.view",
        "company.treasury.accounts.create",
        "company.treasury.accounts.update",
        "company.treasury.transactions.view",
        "company.treasury.transactions.create",
        "company.treasury.transactions.update",
        "company.treasury.transactions.post",
        "company.treasury.transactions.cancel",
        "company.treasury.customer_payments.view",
        "company.treasury.customer_payments.create",
        "company.treasury.customer_payments.update",
        "company.treasury.customer_payments.confirm",
        "company.treasury.customer_payments.cancel",
        "company.treasury.supplier_payments.view",
        "company.treasury.supplier_payments.create",
        "company.treasury.supplier_payments.update",
        "company.treasury.supplier_payments.confirm",
        "company.treasury.supplier_payments.cancel",
        "company.payments.view",
        "company.payments.create",
        "company.payments.update",
        "company.payments.status",
        "company.payments.methods.view",
        "company.payments.methods.create",
        "company.payments.methods.update",
        "company.payments.methods.status",
        "company.payments.gateways.view",
        "company.payments.gateways.create",
        "company.payments.gateways.update",
        "company.payments.gateways.status",
        "company.payments.terminals.view",
        "company.payments.terminals.create",
        "company.payments.terminals.update",
        "company.payments.terminals.status",
        "company.notifications.view",
        "company.notifications.read",
        "company.whatsapp.view",
        "company.whatsapp.messages.view",
        "company.reports.view",
        "company.sales.quotations.view",
        "company.sales.orders.view",
        "company.sales.orders.invoices.view",
            "company.sales.returns.view",
        "company.sales.credit_notes.view",
        "company.sales.credit_notes.create",
        "company.sales.credit_notes.issue",
        "company.sales.credit_notes.post",
        "company.sales.credit_notes.cancel",
        "company.sales.customer_credits.view",
        "company.sales.customer_credits.allocations.view",
        "company.sales.customer_credits.allocate",
        "company.sales.customer_credits.reverse",
],
    CompanyRole.CASHIER: [
        "company.dashboard.view",
        "company.branches.view",
        "company.categories.view",
        "company.units.view",
        "company.products.view",
        "company.customers.view",
        "company.customers.create",
        "company.sales.view",
        "company.sales.create",
        "company.sales.invoices.view",
        "company.sales.invoices.create",
        "company.sales.invoices.issue",
        "company.treasury.summary.view",
        "company.treasury.accounts.view",
        "company.treasury.transactions.view",
        "company.treasury.transactions.create",
        "company.treasury.customer_payments.view",
        "company.treasury.customer_payments.create",
        "company.treasury.customer_payments.confirm",
        "company.payments.view",
        "company.payments.methods.view",
        "company.payments.terminals.view",
        "company.notifications.view",
        "company.notifications.read",
        "company.whatsapp.view",
        "company.whatsapp.messages.view",
        "company.whatsapp.messages.send",
        "company.sales.quotations.view",
        "company.sales.orders.view",
        "company.sales.orders.invoices.view",
            "company.sales.returns.view",
        "company.sales.credit_notes.view",
        "company.sales.customer_credits.view",
        "company.sales.customer_credits.allocations.view",
        "company.sales.customer_credits.allocate",
],
    CompanyRole.SALES: [
        "company.dashboard.view",
        "company.branches.view",
        "company.categories.view",
        "company.units.view",
        "company.products.view",
        "company.customers.view",
        "company.customers.create",
        "company.sales.view",
        "company.sales.create",
        "company.sales.update",
        "company.sales.invoices.view",
        "company.sales.invoices.create",
        "company.sales.invoices.update",
        "company.sales.invoices.issue",
        "company.treasury.accounts.view",
        "company.treasury.transactions.view",
        "company.treasury.customer_payments.view",
        "company.treasury.customer_payments.create",
        "company.payments.view",
        "company.payments.methods.view",
        "company.payments.terminals.view",
        "company.notifications.view",
        "company.notifications.read",
        "company.whatsapp.view",
        "company.whatsapp.messages.view",
        "company.whatsapp.messages.send",
        "company.sales.quotations.view",
        "company.sales.quotations.create",
        "company.sales.quotations.update",
        "company.sales.quotations.send",
        "company.sales.quotations.accept",
        "company.sales.quotations.reject",
        "company.sales.quotations.expire",
        "company.sales.quotations.cancel",
        "company.sales.orders.view",
        "company.sales.orders.create",
        "company.sales.orders.update",
        "company.sales.orders.confirm",
        "company.sales.orders.process",
        "company.sales.orders.complete",
        "company.sales.orders.cancel",
        "company.sales.orders.create_from_quotation",
        "company.sales.orders.create_invoice",
        "company.sales.orders.invoices.view",
            "company.sales.returns.view",
        "company.sales.returns.create",
        "company.sales.returns.confirm",
        "company.sales.returns.cancel",
        "company.sales.credit_notes.view",
        "company.sales.credit_notes.create",
        "company.sales.credit_notes.issue",
        "company.sales.credit_notes.post",
        "company.sales.credit_notes.cancel",
        "company.sales.customer_credits.view",
        "company.sales.customer_credits.allocations.view",
        "company.sales.customer_credits.allocate",
],
    CompanyRole.INVENTORY: [
        "company.dashboard.view",
        "company.settings.view",
        "company.branches.view",
        "company.categories.view",
        "company.categories.create",
        "company.categories.update",
        "company.units.view",
        "company.units.create",
        "company.units.update",
        "company.products.view",
        "company.products.create",
        "company.products.update",
        "company.suppliers.view",
        "company.purchases.view",
        "company.purchases.create",
        "company.purchases.update",
        "company.purchases.bills.view",
        "company.purchases.bills.create",
        "company.purchases.bills.update",
        "company.purchases.bills.post",
        "company.purchases.returns.view",
        "company.purchases.returns.create",
        "company.purchases.returns.update",
        "company.purchases.returns.confirm",
        "company.purchases.returns.post",
        "company.purchases.returns.cancel",
        "company.inventory.view",
        "company.inventory.update",
        "company.inventory.warehouses.view",
        "company.inventory.warehouses.create",
        "company.inventory.warehouses.update",
        "company.inventory.warehouses.status",
        "company.inventory.stock.view",
        "company.inventory.movements.view",
        "company.notifications.view",
        "company.notifications.read",
        "company.reports.view",
    ],
    CompanyRole.HR: [
        "company.dashboard.view",
        "company.settings.view",
        "company.branches.view",
        "company.users.view",
        "company.users.create",
        "company.users.update",
        "company.hr.view",
        "company.hr.create",
        "company.hr.update",
        "company.hr.employees.view",
        "company.hr.employees.create",
        "company.hr.employees.update",
        "company.hr.employees.activate",
        "company.hr.employees.deactivate",
        "company.hr.attendance.view",
        "company.hr.attendance.create",
        "company.hr.attendance.update",
        "company.hr.attendance.check_in",
        "company.hr.attendance.check_out",
        "company.hr.attendance.cancel",
        "company.hr.leave_types.view",
        "company.hr.leave_types.create",
        "company.hr.leave_types.update",
        "company.hr.leave_types.activate",
        "company.hr.leave_types.deactivate",
        "company.hr.leave_requests.view",
        "company.hr.leave_requests.create",
        "company.hr.leave_requests.update",
        "company.hr.leave_requests.submit",
        "company.hr.leave_requests.approve",
        "company.hr.leave_requests.reject",
        "company.hr.leave_requests.cancel",
        "company.hr.leave_balances.view",
        "company.hr.leave_balances.update",
        "company.hr.payroll.view",
        "company.hr.payroll.components.view",
        "company.hr.payroll.components.create",
        "company.hr.payroll.components.update",
        "company.hr.payroll.components.activate",
        "company.hr.payroll.components.deactivate",
        "company.hr.payroll.profiles.view",
        "company.hr.payroll.profiles.create",
        "company.hr.payroll.profiles.update",
        "company.hr.payroll.profiles.activate",
        "company.hr.payroll.profiles.deactivate",
        "company.hr.payroll.periods.view",
        "company.hr.payroll.periods.create",
        "company.hr.payroll.periods.update",
        "company.hr.payroll.periods.open",
        "company.hr.payroll.periods.close",
        "company.hr.payroll.runs.view",
        "company.hr.payroll.runs.create",
        "company.hr.payroll.runs.update",
        "company.hr.payroll.runs.calculate",
        "company.hr.payroll.runs.approve",
        "company.hr.payroll.runs.post",
        "company.hr.payroll.runs.cancel",
        "company.hr.payroll.payslips.view",
        "company.hr.payroll.payslips.update",
        "company.hr.payroll.payslips.approve",
        "company.hr.payroll.payslips.pay",
        "company.hr.payroll.payslips.cancel",
        "company.hr.payroll.payslip_items.view",
        "company.hr.payroll.payslip_items.update",
        "company.hr.performance.view",
        "company.hr.performance.cycles.view",
        "company.hr.performance.cycles.create",
        "company.hr.performance.cycles.update",
        "company.hr.performance.cycles.open",
        "company.hr.performance.cycles.close",
        "company.hr.performance.cycles.cancel",
        "company.hr.performance.criteria.view",
        "company.hr.performance.criteria.create",
        "company.hr.performance.criteria.update",
        "company.hr.performance.criteria.activate",
        "company.hr.performance.criteria.deactivate",
        "company.hr.performance.reviews.view",
        "company.hr.performance.reviews.create",
        "company.hr.performance.reviews.update",
        "company.hr.performance.reviews.submit",
        "company.hr.performance.reviews.approve",
        "company.hr.performance.reviews.cancel",
        "company.hr.performance.scores.view",
        "company.hr.performance.scores.create",
        "company.hr.performance.scores.update",
        "company.hr.performance.scores.delete",
        "company.hr.performance.goals.view",
        "company.hr.performance.goals.create",
        "company.hr.performance.goals.update",
        "company.hr.performance.goals.activate",
        "company.hr.performance.goals.complete",
        "company.hr.performance.goals.cancel",
        "company.notifications.view",
        "company.notifications.read",
        "company.whatsapp.view",
        "company.whatsapp.messages.view",
        "company.whatsapp.messages.send",
        "company.reports.view",
    ],
    CompanyRole.EMPLOYEE: [
        "company.dashboard.view",
        "company.notifications.view",
        "company.notifications.read",
    ],
    CompanyRole.VIEWER: [
        "company.dashboard.view",
        "company.settings.view",
        "company.activity_profiles.view",
        "company.branches.view",
        "company.categories.view",
        "company.units.view",
        "company.products.view",
        "company.customers.view",
        "company.suppliers.view",
        "company.sales.view",
        "company.sales.invoices.view",
        "company.purchases.view",
        "company.purchases.bills.view",
        "company.purchases.returns.view",
        "company.inventory.view",
        "company.inventory.warehouses.view",
        "company.inventory.stock.view",
        "company.inventory.movements.view",
        "company.accounting.view",
        "company.accounting.accounts.view",
        "company.accounting.journals.view",
        "company.accounting.reports.view",
        "company.treasury.summary.view",
        "company.treasury.accounts.view",
        "company.treasury.transactions.view",
        "company.treasury.customer_payments.view",
        "company.treasury.supplier_payments.view",
        "company.payments.view",
        "company.payments.methods.view",
        "company.payments.gateways.view",
        "company.payments.terminals.view",
        "company.notifications.view",
        "company.notifications.read",
        "company.whatsapp.view",
        "company.whatsapp.messages.view",
        "company.hr.employees.view",
        "company.hr.attendance.view",
        "company.hr.leave_types.view",
        "company.hr.leave_requests.view",
        "company.hr.leave_balances.view",
        "company.hr.performance.view",
        "company.hr.performance.cycles.view",
        "company.hr.performance.criteria.view",
        "company.hr.performance.reviews.view",
        "company.hr.performance.scores.view",
        "company.hr.performance.goals.view",
        "company.documents.templates.view",
        "company.reports.view",
        "company.sales.quotations.view",
        "company.sales.orders.view",
        "company.sales.orders.invoices.view",
            "company.sales.returns.view",
        "company.sales.credit_notes.view",
        "company.sales.customer_credits.view",
        "company.sales.customer_credits.allocations.view",
],
}


def _normalize_permissions(permissions: list[str]) -> list[str]:
    """
    Return a sorted unique permissions list.

    Keeping this helper small makes whoami responses stable and predictable.
    """
    return sorted(set(permissions or []))


class UserProfile(models.Model):
    """
    Global PrimeyAcc user profile.

    Django User remains the authentication account.
    UserProfile stores workspace preferences and system-level access.
    Company access is not stored here; it is controlled by CompanyMembership.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="primeyacc_profile",
        verbose_name="User",
    )

    display_name = models.CharField(
        max_length=255,
        blank=True,
        db_index=True,
        verbose_name="Display name",
    )
    phone = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Phone",
    )
    mobile = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="Mobile",
    )
    whatsapp_number = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        verbose_name="WhatsApp number",
    )

    status = models.CharField(
        max_length=30,
        choices=UserProfileStatus.choices,
        default=UserProfileStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    default_workspace = models.CharField(
        max_length=30,
        choices=WorkspaceType.choices,
        default=WorkspaceType.COMPANY,
        db_index=True,
        verbose_name="Default workspace",
    )

    system_role = models.CharField(
        max_length=40,
        choices=SystemRole.choices,
        default=SystemRole.NONE,
        db_index=True,
        verbose_name="System role",
    )

    default_company = models.ForeignKey(
        Company,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="default_users",
        verbose_name="Default company",
    )

    is_system_user = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="System user",
        help_text="Allows access to /system when combined with an allowed system role.",
    )

    language = models.CharField(
        max_length=10,
        default="ar",
        verbose_name="Language",
    )
    timezone = models.CharField(
        max_length=100,
        default="Asia/Riyadh",
        verbose_name="Timezone",
    )

    last_seen_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Last seen at",
    )
    suspended_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Suspended at",
    )
    suspended_reason = models.TextField(
        blank=True,
        verbose_name="Suspended reason",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "User profile"
        verbose_name_plural = "User profiles"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "default_workspace"]),
            models.Index(fields=["is_system_user", "system_role"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["mobile"]),
        ]

    def __str__(self) -> str:
        return self.display_name or self.user.get_username()

    @property
    def can_access_system(self) -> bool:
        return (
            self.status == UserProfileStatus.ACTIVE
            and self.is_system_user
            and self.system_role != SystemRole.NONE
        )

    @property
    def system_permissions(self) -> list[str]:
        """
        System permissions available to this profile.

        The role is ignored unless can_access_system is true.
        This prevents inactive/suspended users from carrying permissions.
        """
        if not self.can_access_system:
            return []

        return _normalize_permissions(
            SYSTEM_ROLE_PERMISSIONS.get(self.system_role, [])
        )

    @property
    def can_access_company(self) -> bool:
        return self.active_company_memberships().exists()

    def active_company_memberships(self):
        """
        Return only memberships that are valid for /company access.

        This is the official company access boundary.
        Any /company API should resolve access through this rule or an equivalent service.
        """
        return (
            self.user.company_memberships.select_related("company")
            .filter(
                status=MembershipStatus.ACTIVE,
                company__is_active=True,
            )
            .exclude(
                company__status__in=[
                    CompanyStatus.SUSPENDED,
                    CompanyStatus.EXPIRED,
                    CompanyStatus.CANCELLED,
                ]
            )
            .order_by("-is_primary", "-created_at")
        )

    def get_default_company_membership(self) -> "CompanyMembership | None":
        """
        Resolve the safest default company membership for whoami.

        Priority:
        1. active membership for default_company
        2. primary active membership
        3. latest active membership
        """
        memberships = self.active_company_memberships()

        if self.default_company_id:
            default_membership = memberships.filter(
                company_id=self.default_company_id
            ).first()
            if default_membership:
                return default_membership

        return memberships.first()

    def touch_last_seen(self) -> None:
        self.last_seen_at = timezone.now()
        self.save(update_fields=["last_seen_at", "updated_at"])

    def suspend(self, reason: str = "") -> None:
        self.status = UserProfileStatus.SUSPENDED
        self.suspended_at = timezone.now()
        self.suspended_reason = reason or ""
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_at",
            ]
        )

    def activate(self) -> None:
        self.status = UserProfileStatus.ACTIVE
        self.suspended_at = None
        self.suspended_reason = ""
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_at",
            ]
        )


class CompanyMembership(models.Model):
    """
    User membership inside a company.

    This is the official access boundary for /company.
    A user can belong to more than one company, but every access must be scoped
    to exactly one active company membership.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="company_memberships",
        verbose_name="User",
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="memberships",
        verbose_name="Company",
    )

    role = models.CharField(
        max_length=40,
        choices=CompanyRole.choices,
        default=CompanyRole.EMPLOYEE,
        db_index=True,
        verbose_name="Company role",
    )
    status = models.CharField(
        max_length=30,
        choices=MembershipStatus.choices,
        default=MembershipStatus.ACTIVE,
        db_index=True,
        verbose_name="Status",
    )

    is_primary = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name="Primary membership",
        help_text="Marks the user's preferred membership when multiple companies exist.",
    )

    job_title = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Job title",
    )
    department = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
        verbose_name="Department",
    )

    invited_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Invited at",
    )
    joined_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Joined at",
    )
    suspended_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Suspended at",
    )
    suspended_reason = models.TextField(
        blank=True,
        verbose_name="Suspended reason",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="created_company_memberships",
        verbose_name="Created by",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="updated_company_memberships",
        verbose_name="Updated by",
    )

    extra_data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Extra data",
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Internal notes",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        verbose_name="Created at",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated at",
    )

    class Meta:
        verbose_name = "Company membership"
        verbose_name_plural = "Company memberships"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "company"],
                name="unique_user_company_membership",
            ),
        ]
        indexes = [
            models.Index(fields=["company", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["company", "role"]),
            models.Index(fields=["is_primary", "status"]),
            models.Index(fields=["department"]),
        ]

    def __str__(self) -> str:
        return f"{self.user.get_username()} - {self.company.display_name} - {self.role}"

    @property
    def is_active_membership(self) -> bool:
        return (
            self.status == MembershipStatus.ACTIVE
            and self.company.is_active
            and self.company.status
            not in [
                CompanyStatus.SUSPENDED,
                CompanyStatus.EXPIRED,
                CompanyStatus.CANCELLED,
            ]
        )

    @property
    def company_permissions(self) -> list[str]:
        """
        Company permissions available through this membership.

        The role is ignored unless the membership is active.
        This protects /company from suspended/inactive memberships.
        """
        if not self.is_active_membership:
            return []

        return _normalize_permissions(
            COMPANY_ROLE_PERMISSIONS.get(self.role, [])
        )

    def has_company_permission(self, permission: str) -> bool:
        """
        Check one company permission safely.

        OWNER can access everything because it receives '*'.
        """
        permissions = self.company_permissions
        return COMPANY_PERMISSION_ALL in permissions or permission in permissions

    def activate(self, user=None) -> None:
        self.status = MembershipStatus.ACTIVE
        self.suspended_at = None
        self.suspended_reason = ""
        if not self.joined_at:
            self.joined_at = timezone.now()
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "joined_at",
                "updated_by",
                "updated_at",
            ]
        )

    def suspend(self, reason: str = "", user=None) -> None:
        self.status = MembershipStatus.SUSPENDED
        self.suspended_at = timezone.now()
        self.suspended_reason = reason or ""
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "suspended_at",
                "suspended_reason",
                "updated_by",
                "updated_at",
            ]
        )

    def mark_inactive(self, user=None) -> None:
        self.status = MembershipStatus.INACTIVE
        if user:
            self.updated_by = user
        self.save(
            update_fields=[
                "status",
                "updated_by",
                "updated_at",
            ]
        )
