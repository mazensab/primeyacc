# ============================================================
# reports/test_balance_sheet.py
# PrimeyAcc | Balance Sheet Report Tests - Phase 16.5
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CompanyRole
from accounting.models import JournalEntryStatus
from accounting.services import (
    EntryLinePayload,
    create_manual_journal_entry,
    get_account_by_code,
    post_journal_entry,
    seed_company_chart_of_accounts,
)
from reports.tests import (
    _create_active_membership,
    _create_test_company,
)


class BalanceSheetReportTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.owner = User.objects.create_user(
            username="balance_sheet_owner",
            email="balance-sheet-owner@primeyacc.test",
            password="test-pass-12345",
        )

        cls.company = _create_test_company(
            suffix="BS001",
            user=cls.owner,
        )

        _create_active_membership(
            user=cls.owner,
            company=cls.company,
            role=CompanyRole.OWNER,
            is_primary=True,
        )

    def test_balance_sheet_report_api_returns_assets_and_equity(self):
        seed_company_chart_of_accounts(self.company)

        posted_entry = create_manual_journal_entry(
            company=self.company,
            entry_date=timezone.localdate(),
            description="Posted balance sheet entry",
            reference="REPORTS-BS-POSTED",
            lines=[
                EntryLinePayload(
                    account=get_account_by_code(self.company, "110101"),
                    debit_amount=Decimal("500.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=get_account_by_code(self.company, "3201"),
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("500.00"),
                ),
            ],
        )
        posted_entry = post_journal_entry(posted_entry)

        self.assertEqual(posted_entry.status, JournalEntryStatus.POSTED)

        draft_entry = create_manual_journal_entry(
            company=self.company,
            entry_date=timezone.localdate(),
            description="Draft balance sheet entry",
            reference="REPORTS-BS-DRAFT",
            lines=[
                EntryLinePayload(
                    account=get_account_by_code(self.company, "110101"),
                    debit_amount=Decimal("300.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=get_account_by_code(self.company, "3201"),
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("300.00"),
                ),
            ],
        )

        self.assertEqual(draft_entry.status, JournalEntryStatus.DRAFT)

        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get(
            "/api/company/reports/balance-sheet/",
            {
                "include_zero": "false",
            },
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()

        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company.pk)
        self.assertEqual(body["report"]["key"], "balance_sheet")
        self.assertEqual(body["report"]["phase"], "16.5")
        self.assertEqual(body["summary"]["total_assets"], "500.00")
        self.assertEqual(body["summary"]["total_liabilities"], "0.00")
        self.assertEqual(body["summary"]["total_equity"], "500.00")
        self.assertEqual(body["summary"]["liabilities_and_equity"], "500.00")
        self.assertEqual(body["summary"]["difference"], "0.00")
        self.assertTrue(body["summary"]["is_balanced"])

        asset_codes = {
            row["account"]["code"]
            for row in body["sections"]["assets"]
        }
        equity_codes = {
            row["account"]["code"]
            for row in body["sections"]["equity"]
        }

        self.assertIn("110101", asset_codes)
        self.assertIn("3201", equity_codes)
