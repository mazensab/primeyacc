# ============================================================
# 📂 api/company/urls.py
# 🧠 PrimeyAcc | Company Workspace API URLs V2.7
# ------------------------------------------------------------
# ✅ Central routes for company workspace APIs
# ✅ Current company endpoint /api/company/me/
# ✅ Company profile endpoint /api/company/profile/
# ✅ Company setup endpoint /api/company/setup/
# ✅ Company permissions endpoint /api/company/permissions/
# ✅ Company settings endpoint /api/company/settings/
# ✅ Company branches endpoint /api/company/branches/
# ✅ Company users endpoint /api/company/users/
# ✅ Business parties endpoint /api/company/parties/
# ✅ Customers alias endpoint /api/company/customers/
# ✅ Suppliers alias endpoint /api/company/suppliers/
# ✅ Catalog categories endpoint /api/company/categories/
# ✅ Catalog units endpoint /api/company/units/
# ✅ Catalog products/services endpoint /api/company/products/
# ✅ Sales module endpoint /api/company/sales/
# ✅ Sales invoices endpoint /api/company/sales/invoices/
# ✅ Purchases module endpoint /api/company/purchases/
# ✅ Purchase bills endpoint /api/company/purchases/bills/
# ✅ Company context comes from active CompanyMembership
# ✅ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذا الملف هو نقطة تجميع APIs الخاصة بمساحة الشركة
# - لا نضع منطق business داخل urls.py
# - كل وحدة داخل /api/company/ يكون لها urls.py مستقل عند إنشائها
# - جميع Views داخل /api/company/ يجب أن تستخدم api/permissions.py
# - الشركة الحالية لا تؤخذ من الفرونت كمصدر ثقة
# - CompanyMembership هو حد العزل الرسمي للشركات
# - كتالوج الشركة داخل /company معزول حسب الشركة الحالية فقط
# - CatalogItem هو الأساس الموحد للمنتجات والخدمات
# - مبيعات الشركة داخل /company/sales وتعتمد على SalesInvoice/SalesInvoiceItem
# - مشتريات الشركة داخل /company/purchases وتعتمد على PurchaseBill/PurchaseBillItem
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .me import company_me
from .profile import company_profile


app_name = "company"


urlpatterns = [
    path("me/", company_me, name="me"),
    path("profile/", company_profile, name="profile"),
    path("setup/", include("api.company.setup.urls")),
    path("permissions/", include("api.company.permissions.urls")),
    path("settings/", include("api.company.settings.urls")),
    path("branches/", include("api.company.branches.urls")),
    path("users/", include("api.company.users.urls")),
    path("parties/", include("api.company.parties.urls")),
    path("customers/", include("api.company.customers.urls")),
    path("suppliers/", include("api.company.suppliers.urls")),
    path("categories/", include("api.company.categories.urls")),
    path("units/", include("api.company.units.urls")),
    path("products/", include("api.company.products.urls")),
    path("sales/", include("api.company.sales.urls")),
    path("purchases/", include("api.company.purchases.urls")),
    path("inventory/", include("api.company.inventory.urls")),
    path("accounting/", include("api.company.accounting.urls")),
    path("treasury/", include("api.company.treasury.urls")),
]