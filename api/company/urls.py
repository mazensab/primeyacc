# ============================================================
# ظ‹ع؛â€œâ€ڑ api/company/urls.py
# ظ‹ع؛آ§آ  Mhamcloud | Company Workspace API URLs V2.8
# ------------------------------------------------------------
# أ¢إ“â€¦ Central routes for company workspace APIs
# أ¢إ“â€¦ Current company endpoint /api/company/me/
# أ¢إ“â€¦ Company profile endpoint /api/company/profile/
# أ¢إ“â€¦ Company setup endpoint /api/company/setup/
# أ¢إ“â€¦ Company permissions endpoint /api/company/permissions/
# أ¢إ“â€¦ Company settings endpoint /api/company/settings/
# أ¢إ“â€¦ Company branches endpoint /api/company/branches/
# أ¢إ“â€¦ Company users endpoint /api/company/users/
# أ¢إ“â€¦ Business parties endpoint /api/company/parties/
# أ¢إ“â€¦ Customers alias endpoint /api/company/customers/
# أ¢إ“â€¦ Suppliers alias endpoint /api/company/suppliers/
# أ¢إ“â€¦ Catalog categories endpoint /api/company/categories/
# أ¢إ“â€¦ Catalog units endpoint /api/company/units/
# أ¢إ“â€¦ Catalog products/services endpoint /api/company/products/
# أ¢إ“â€¦ Sales module endpoint /api/company/sales/
# أ¢إ“â€¦ Sales invoices endpoint /api/company/sales/invoices/
# أ¢إ“â€¦ Purchases module endpoint /api/company/purchases/
# أ¢إ“â€¦ Purchase bills endpoint /api/company/purchases/bills/
# أ¢إ“â€¦ Inventory module endpoint /api/company/inventory/
# أ¢إ“â€¦ Accounting module endpoint /api/company/accounting/
# أ¢إ“â€¦ Treasury module endpoint /api/company/treasury/
# أ¢إ“â€¦ Company payments endpoint /api/company/payments/
# أ¢إ“â€¦ Company context comes from active CompanyMembership
# أ¢إ“â€¦ Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# ط·آ§ط¸â€‍ط¸â€ڑط·آ§ط·آ¹ط·آ¯ط·آ© ط·آ§ط¸â€‍ط¸â€¦ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ط·آ©:
# - ط¸â€،ط·آ°ط·آ§ ط·آ§ط¸â€‍ط¸â€¦ط¸â€‍ط¸ظ¾ ط¸â€،ط¸ث† ط¸â€ ط¸â€ڑط·آ·ط·آ© ط·ع¾ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ APIs ط·آ§ط¸â€‍ط·آ®ط·آ§ط·آµط·آ© ط·آ¨ط¸â€¦ط·آ³ط·آ§ط·آ­ط·آ© ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ©
# - ط¸â€‍ط·آ§ ط¸â€ ط·آ¶ط·آ¹ ط¸â€¦ط¸â€ ط·آ·ط¸â€ڑ business ط·آ¯ط·آ§ط·آ®ط¸â€‍ urls.py
# - ط¸ئ’ط¸â€‍ ط¸ث†ط·آ­ط·آ¯ط·آ© ط·آ¯ط·آ§ط·آ®ط¸â€‍ /api/company/ ط¸ظ¹ط¸ئ’ط¸ث†ط¸â€  ط¸â€‍ط¸â€،ط·آ§ urls.py ط¸â€¦ط·آ³ط·ع¾ط¸â€ڑط¸â€‍ ط·آ¹ط¸â€ ط·آ¯ ط·آ¥ط¸â€ ط·آ´ط·آ§ط·آ¦ط¸â€،ط·آ§
# - ط·آ¬ط¸â€¦ط¸ظ¹ط·آ¹ Views ط·آ¯ط·آ§ط·آ®ط¸â€‍ /api/company/ ط¸ظ¹ط·آ¬ط·آ¨ ط·آ£ط¸â€  ط·ع¾ط·آ³ط·ع¾ط·آ®ط·آ¯ط¸â€¦ api/permissions.py
# - ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© ط¸â€‍ط·آ§ ط·ع¾ط·آ¤ط·آ®ط·آ° ط¸â€¦ط¸â€  ط·آ§ط¸â€‍ط¸ظ¾ط·آ±ط¸ث†ط¸â€ ط·ع¾ ط¸ئ’ط¸â€¦ط·آµط·آ¯ط·آ± ط·آ«ط¸â€ڑط·آ©
# - CompanyMembership ط¸â€،ط¸ث† ط·آ­ط·آ¯ ط·آ§ط¸â€‍ط·آ¹ط·آ²ط¸â€‍ ط·آ§ط¸â€‍ط·آ±ط·آ³ط¸â€¦ط¸ظ¹ ط¸â€‍ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ§ط·ع¾
# - ط¸ئ’ط·ع¾ط·آ§ط¸â€‍ط¸ث†ط·آ¬ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ© ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company ط¸â€¦ط·آ¹ط·آ²ط¸ث†ط¸â€‍ ط·آ­ط·آ³ط·آ¨ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ© ط·آ§ط¸â€‍ط·آ­ط·آ§ط¸â€‍ط¸ظ¹ط·آ© ط¸ظ¾ط¸â€ڑط·آ·
# - CatalogItem ط¸â€،ط¸ث† ط·آ§ط¸â€‍ط·آ£ط·آ³ط·آ§ط·آ³ ط·آ§ط¸â€‍ط¸â€¦ط¸ث†ط·آ­ط·آ¯ ط¸â€‍ط¸â€‍ط¸â€¦ط¸â€ ط·ع¾ط·آ¬ط·آ§ط·ع¾ ط¸ث†ط·آ§ط¸â€‍ط·آ®ط·آ¯ط¸â€¦ط·آ§ط·ع¾
# - ط¸â€¦ط·آ¨ط¸ظ¹ط·آ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ© ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company/sales ط¸ث†ط·ع¾ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ ط·آ¹ط¸â€‍ط¸â€° SalesInvoice/SalesInvoiceItem
# - ط¸â€¦ط·آ´ط·ع¾ط·آ±ط¸ظ¹ط·آ§ط·ع¾ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ© ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company/purchases ط¸ث†ط·ع¾ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ ط·آ¹ط¸â€‍ط¸â€° PurchaseBill/PurchaseBillItem
# - ط·آ·ط·آ±ط¸â€ڑ ط·آ§ط¸â€‍ط·آ¯ط¸ظ¾ط·آ¹ ط·آ¯ط·آ§ط·آ®ط¸â€‍ /company/payments ط¸ث†ط·ع¾ط·آ¹ط·ع¾ط¸â€¦ط·آ¯ ط·آ¹ط¸â€‍ط¸â€° CompanyPaymentMethod/Gateway/Terminal
# - ط·آ¯ط¸ظ¾ط·آ¹ ط·آ§ط·آ´ط·ع¾ط·آ±ط·آ§ط¸ئ’ط·آ§ط·ع¾ Mhamcloud ط¸â€‍ط¸â€‍ط¸â€¦ط¸â€ ط·آµط·آ© ط¸â€¦ط¸â€ ط¸ظ¾ط·آµط¸â€‍ ط·آ¹ط¸â€  ط·آ·ط·آ±ط¸â€ڑ ط·آ¯ط¸ظ¾ط·آ¹ ط·آ§ط¸â€‍ط·آ´ط·آ±ط¸ئ’ط·آ§ط·ع¾ ط¸â€‍ط·آ¹ط¸â€¦ط¸â€‍ط·آ§ط·آ¦ط¸â€،ط·آ§
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .me import company_me
from .profile import company_profile

app_name = "company"

urlpatterns = [

    path("business-controls/", include("api.company.business_controls.urls")),
    path('jewelry/', include('api.company.jewelry.urls')),
    path("activity-backends/", include("api.company.activity_backends.urls")),
    path("me/", company_me, name="me"),
    path("profile/", company_profile, name="profile"),
    path("setup/", include("api.company.setup.urls")),
    path("permissions/", include("api.company.permissions.urls")),
    path("settings/", include("api.company.settings.urls")),
    path("activity-profiles/", include("api.company.activity_profiles.urls")),
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
    path("payments/", include("api.company.payments.urls")),
    path("pos/", include("api.company.pos.urls")),
    path("notifications/", include("api.company.notifications.urls")),
    path("whatsapp/", include("api.company.whatsapp.urls")),
    path("hr/", include("api.company.hr.urls")),
    path("reports/", include("api.company.reports.urls")),
    path("documents/", include("api.company.documents.urls")),
]
