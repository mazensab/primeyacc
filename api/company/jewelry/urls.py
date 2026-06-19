# ============================================================
# 📂 api/company/jewelry/urls.py
# 🧠 PrimeyAcc | Company Jewelry API Routes — Phase 25.1
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
]

