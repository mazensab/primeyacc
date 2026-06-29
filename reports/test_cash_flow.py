# ============================================================
# reports/test_cash_flow.py
# Mhamcloud | Cash Flow Report Tests - Phase 16.6
# ============================================================

from __future__ import annotations

from decimal import Decimal
from datetime import timedelta

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


class CashFlowReportTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.owner = User.objects.create_user(
            username="cash_flow_owner",
            email="cash-flow-owner@Mhamcloud.test",
            password="test-pass-12345",
        )

        cls.company = _create_test_company(
            suffix="CF001",
            user=cls.owner,
        )

        _create_active_membership(
            user=cls.owner,
            company=cls.company,
            role=CompanyRole.OWNER,
            is_primary=True,
        )

    def test_cash_flow_report_api_returns_cash_movement(self):
        seed_company_chart_of_accounts(self.company)

        cash_account = get_account_by_code(self.company, "110101")
        equity_account = get_account_by_code(self.company, "3201")

        posted_entry = create_manual_journal_entry(
            company=self.company,
            entry_date=timezone.localdate(),
            description="Posted cash flow entry",
            reference="REPORTS-CF-POSTED",
            lines=[
                EntryLinePayload(
                    account=cash_account,
                    debit_amount=Decimal("700.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=equity_account,
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("700.00"),
                ),
            ],
        )
        posted_entry = post_journal_entry(posted_entry)

        self.assertEqual(posted_entry.status, JournalEntryStatus.POSTED)

        draft_entry = create_manual_journal_entry(
            company=self.company,
            entry_date=timezone.localdate(),
            description="Draft cash flow entry",
            reference="REPORTS-CF-DRAFT",
            lines=[
                EntryLinePayload(
                    account=cash_account,
                    debit_amount=Decimal("300.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=equity_account,
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("300.00"),
                ),
            ],
        )

        self.assertEqual(draft_entry.status, JournalEntryStatus.DRAFT)

        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get("/api/company/reports/cash-flow/")

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()

        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company.pk)
        self.assertEqual(body["report"]["key"], "cash_flow")
        self.assertEqual(body["report"]["phase"], "16.6")
        self.assertEqual(body["summary"]["opening_cash"], "0.00")
        self.assertEqual(body["summary"]["cash_inflows"], "700.00")
        self.assertEqual(body["summary"]["cash_outflows"], "0.00")
        self.assertEqual(body["summary"]["net_cash_flow"], "700.00")
        self.assertEqual(body["summary"]["closing_cash"], "700.00")
        self.assertTrue(body["summary"]["is_positive_flow"])
        self.assertGreaterEqual(body["summary"]["cash_accounts_count"], 1)

    def test_cash_flow_report_api_calculates_opening_cash_with_date_filter(self):
        seed_company_chart_of_accounts(self.company)

        cash_account = get_account_by_code(self.company, "110101")
        equity_account = get_account_by_code(self.company, "3201")

        today = timezone.localdate()
        yesterday = today - timedelta(days=1)

        opening_entry = create_manual_journal_entry(
            company=self.company,
            entry_date=yesterday,
            description="Opening cash entry",
            reference="REPORTS-CF-OPENING",
            lines=[
                EntryLinePayload(
                    account=cash_account,
                    debit_amount=Decimal("400.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=equity_account,
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("400.00"),
                ),
            ],
        )
        post_journal_entry(opening_entry)

        period_entry = create_manual_journal_entry(
            company=self.company,
            entry_date=today,
            description="Period cash outflow entry",
            reference="REPORTS-CF-PERIOD",
            lines=[
                EntryLinePayload(
                    account=equity_account,
                    debit_amount=Decimal("100.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=cash_account,
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("100.00"),
                ),
            ],
        )
        post_journal_entry(period_entry)

        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get(
            "/api/company/reports/cash-flow/",
            {
                "date_from": today.isoformat(),
                "date_to": today.isoformat(),
            },
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()

        self.assertTrue(body["success"])
        self.assertEqual(body["summary"]["opening_cash"], "400.00")
        self.assertEqual(body["summary"]["cash_inflows"], "0.00")
        self.assertEqual(body["summary"]["cash_outflows"], "100.00")
        self.assertEqual(body["summary"]["net_cash_flow"], "-100.00")
        self.assertEqual(body["summary"]["closing_cash"], "300.00")
        self.assertFalse(body["summary"]["is_positive_flow"])
