# ============================================================
# 📂 api/company/jewelry/urls.py
# 🧠 Mhamcloud | Company Jewelry API Routes — Phase 25.1
# ============================================================

from django.urls import path

from . import views

app_name = "company_jewelry"

urlpatterns = [
    path("", views.summary_view, name="summary"),
    path("summary/", views.summary_view, name="summary"),
    path("seed/", views.seed_view, name="seed"),
    path("metals/", views.metals_view, name="metals"),
    path("karats/", views.karats_view, name="karats"),
    path("gold-rates/", views.gold_rates_view, name="gold-rates"),
    path("items/", views.items_view, name="items"),
    path("items/<int:item_id>/", views.item_detail_view, name="item-detail"),
    path("items/<int:item_id>/price/", views.price_item_view, name="item-price"),
    path("pricing/estimate/", views.estimate_view, name="pricing-estimate"),
    path("items/<int:item_id>/integration/", views.item_integration_view, name="item-integration"),
    path("items/<int:item_id>/sync-catalog/", views.sync_catalog_view, name="item-sync-catalog"),
    path("items/<int:item_id>/receive-stock/", views.receive_stock_view, name="item-receive-stock"),
    path("items/<int:item_id>/sales-line/", views.sales_line_view, name="item-sales-line"),
    path("items/<int:item_id>/purchase-line/", views.purchase_line_view, name="item-purchase-line"),
    path("items/<int:item_id>/sales-invoice/", views.create_sales_invoice_view, name="item-sales-invoice"),
    path("items/<int:item_id>/purchase-bill/", views.create_purchase_bill_view, name="item-purchase-bill"),
]
