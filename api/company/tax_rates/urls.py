# -*- coding: utf-8 -*-
"""
api/company/tax_rates/urls.py
Company Tax Rates API URLs - Phase 1C
"""
from django.urls import path
from .views import (
    company_tax_rate_activate,
    company_tax_rate_deactivate,
    company_tax_rate_detail,
    company_tax_rates,
    company_tax_rates_seed,
)
app_name = "company_tax_rates"
urlpatterns = [
    path("", company_tax_rates, name="list_create"),
    path("seed/", company_tax_rates_seed, name="seed"),
    path("<int:tax_rate_id>/", company_tax_rate_detail, name="detail"),
    path("<int:tax_rate_id>/activate/", company_tax_rate_activate, name="activate"),
    path("<int:tax_rate_id>/deactivate/", company_tax_rate_deactivate, name="deactivate"),
]
