# ============================================================
# ًں“‚ api/company/urls.py
# ًں§  PrimeyAcc | Company Workspace API URLs V2.8
# ------------------------------------------------------------
# âœ… Central routes for company workspace APIs
# âœ… Current company endpoint /api/company/me/
# âœ… Company profile endpoint /api/company/profile/
# âœ… Company setup endpoint /api/company/setup/
# âœ… Company permissions endpoint /api/company/permissions/
# âœ… Company settings endpoint /api/company/settings/
# âœ… Company branches endpoint /api/company/branches/
# âœ… Company users endpoint /api/company/users/
# âœ… Business parties endpoint /api/company/parties/
# âœ… Customers alias endpoint /api/company/customers/
# âœ… Suppliers alias endpoint /api/company/suppliers/
# âœ… Catalog categories endpoint /api/company/categories/
# âœ… Catalog units endpoint /api/company/units/
# âœ… Catalog products/services endpoint /api/company/products/
# âœ… Sales module endpoint /api/company/sales/
# âœ… Sales invoices endpoint /api/company/sales/invoices/
# âœ… Purchases module endpoint /api/company/purchases/
# âœ… Purchase bills endpoint /api/company/purchases/bills/
# âœ… Inventory module endpoint /api/company/inventory/
# âœ… Accounting module endpoint /api/company/accounting/
# âœ… Treasury module endpoint /api/company/treasury/
# âœ… Company payments endpoint /api/company/payments/
# âœ… Company context comes from active CompanyMembership
# âœ… Views protected by central api/permissions.py guards
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ‡ط°ط§ ط§ظ„ظ…ظ„ظپ ظ‡ظˆ ظ†ظ‚ط·ط© طھط¬ظ…ظٹط¹ APIs ط§ظ„ط®ط§طµط© ط¨ظ…ط³ط§ط­ط© ط§ظ„ط´ط±ظƒط©
# - ظ„ط§ ظ†ط¶ط¹ ظ…ظ†ط·ظ‚ business ط¯ط§ط®ظ„ urls.py
# - ظƒظ„ ظˆط­ط¯ط© ط¯ط§ط®ظ„ /api/company/ ظٹظƒظˆظ† ظ„ظ‡ط§ urls.py ظ…ط³طھظ‚ظ„ ط¹ظ†ط¯ ط¥ظ†ط´ط§ط¦ظ‡ط§
# - ط¬ظ…ظٹط¹ Views ط¯ط§ط®ظ„ /api/company/ ظٹط¬ط¨ ط£ظ† طھط³طھط®ط¯ظ… api/permissions.py
# - ط§ظ„ط´ط±ظƒط© ط§ظ„ط­ط§ظ„ظٹط© ظ„ط§ طھط¤ط®ط° ظ…ظ† ط§ظ„ظپط±ظˆظ†طھ ظƒظ…طµط¯ط± ط«ظ‚ط©
# - CompanyMembership ظ‡ظˆ ط­ط¯ ط§ظ„ط¹ط²ظ„ ط§ظ„ط±ط³ظ…ظٹ ظ„ظ„ط´ط±ظƒط§طھ
# - ظƒطھط§ظ„ظˆط¬ ط§ظ„ط´ط±ظƒط© ط¯ط§ط®ظ„ /company ظ…ط¹ط²ظˆظ„ ط­ط³ط¨ ط§ظ„ط´ط±ظƒط© ط§ظ„ط­ط§ظ„ظٹط© ظپظ‚ط·
# - CatalogItem ظ‡ظˆ ط§ظ„ط£ط³ط§ط³ ط§ظ„ظ…ظˆط­ط¯ ظ„ظ„ظ…ظ†طھط¬ط§طھ ظˆط§ظ„ط®ط¯ظ…ط§طھ
# - ظ…ط¨ظٹط¹ط§طھ ط§ظ„ط´ط±ظƒط© ط¯ط§ط®ظ„ /company/sales ظˆطھط¹طھظ…ط¯ ط¹ظ„ظ‰ SalesInvoice/SalesInvoiceItem
# - ظ…ط´طھط±ظٹط§طھ ط§ظ„ط´ط±ظƒط© ط¯ط§ط®ظ„ /company/purchases ظˆطھط¹طھظ…ط¯ ط¹ظ„ظ‰ PurchaseBill/PurchaseBillItem
# - ط·ط±ظ‚ ط§ظ„ط¯ظپط¹ ط¯ط§ط®ظ„ /company/payments ظˆطھط¹طھظ…ط¯ ط¹ظ„ظ‰ CompanyPaymentMethod/Gateway/Terminal
# - ط¯ظپط¹ ط§ط´طھط±ط§ظƒط§طھ PrimeyAcc ظ„ظ„ظ…ظ†طµط© ظ…ظ†ظپطµظ„ ط¹ظ† ط·ط±ظ‚ ط¯ظپط¹ ط§ظ„ط´ط±ظƒط§طھ ظ„ط¹ظ…ظ„ط§ط¦ظ‡ط§
# ============================================================

from __future__ import annotations

from django.urls import include, path

from .me import company_me
from .profile import company_profile


app_name = "company"


urlpatterns = [
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
