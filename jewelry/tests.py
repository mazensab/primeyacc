# ============================================================
# 📂 jewelry/tests.py
# 🧠 PrimeyAcc | Jewelry and Gold Tests — Phase 25.1
# ============================================================
# ✅ Service tests for seed, rates, estimate and pricing snapshot
# ✅ API-style tests for summary and pricing estimate
# ✅ Company scoped behavior
# ============================================================

import json
from decimal import Decimal

from django.test import RequestFactory, TestCase

from companies.models import Company
from api.company.jewelry.views import estimate_view, summary_view
from .models import JewelryGoldRate, JewelryItem
from .services import (
    create_gold_rate,
    estimate_jewelry_price,
    price_jewelry_item,
    seed_default_jewelry_foundation,
)


class JewelryPhase251Tests(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Primey Jewelry Co")
        self.foundation = seed_default_jewelry_foundation(self.company)
        self.gold = self.foundation["metal"]
        self.karat_21 = [k for k in self.foundation["karats"] if k.code == "21K"][0]

    def test_seed_default_foundation_creates_gold_and_karats(self):
        self.assertEqual(self.gold.code, "GOLD")
        self.assertEqual(len(self.foundation["karats"]), 4)
        self.assertEqual(str(self.karat_21.karat_value), "21.000")

    def test_estimate_jewelry_price(self):
        estimate = estimate_jewelry_price(
            net_gold_weight=Decimal("10"),
            gold_price_per_gram=Decimal("250"),
            making_charge_value=Decimal("20"),
            stone_value=Decimal("100"),
            other_charges=Decimal("50"),
            vat_rate=Decimal("15"),
        )

        self.assertEqual(estimate["base_amount"], "2500.00")
        self.assertEqual(estimate["making_amount"], "200.00")
        self.assertEqual(estimate["subtotal"], "2850.00")
        self.assertEqual(estimate["vat_amount"], "427.50")
        self.assertEqual(estimate["total"], "3277.50")

    def test_create_rate_and_price_item_snapshot(self):
        rate = create_gold_rate(
            company=self.company,
            metal=self.gold,
            karat=self.karat_21,
            buying_price_per_gram=Decimal("240"),
            selling_price_per_gram=Decimal("250"),
        )

        item = JewelryItem.objects.create(
            company=self.company,
            sku="RING-001",
            name="Gold Ring",
            metal=self.gold,
            karat=self.karat_21,
            gross_weight=Decimal("10.5"),
            stone_weight=Decimal("0.5"),
            net_gold_weight=Decimal("10"),
            making_charge_value=Decimal("20"),
            stone_value=Decimal("100"),
            other_charges=Decimal("50"),
            vat_rate=Decimal("15"),
        )

        estimate = price_jewelry_item(item)
        item.refresh_from_db()

        self.assertEqual(JewelryGoldRate.objects.count(), 1)
        self.assertEqual(item.last_gold_rate_id, rate.id)
        self.assertEqual(str(item.last_total), "3277.500000")
        self.assertEqual(estimate["total"], "3277.50")

    def test_summary_api(self):
        factory = RequestFactory()
        request = factory.get(f"/api/company/jewelry/summary/?company_id={self.company.id}")
        response = summary_view(request)

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content.decode("utf-8"))
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["summary"]["metals_count"], 1)
        self.assertEqual(payload["summary"]["karats_count"], 4)

    def test_estimate_api(self):
        factory = RequestFactory()
        request = factory.post(
            "/api/company/jewelry/pricing/estimate/",
            data=json.dumps(
                {
                    "net_gold_weight": "10",
                    "gold_price_per_gram": "250",
                    "making_charge_value": "20",
                    "stone_value": "100",
                    "other_charges": "50",
                    "vat_rate": "15",
                }
            ),
            content_type="application/json",
        )
        response = estimate_view(request)

        self.assertEqual(response.status_code, 200)
        payload = json.loads(response.content.decode("utf-8"))
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["estimate"]["total"], "3277.50")

