# ============================================================
# reports/test_exporters.py
# Mhamcloud | Reports Export Tests - Phase 16.7
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import CompanyRole
from accounting.services import (
    EntryLinePayload,
    create_manual_journal_entry,
    get_account_by_code,
    post_journal_entry,
    seed_company_chart_of_accounts,
)
from reports.exporters import (
    build_csv_content,
    build_report_export_result,
    normalize_export_format,
    normalize_report_type,
)
from reports.tests import (
    _create_active_membership,
    _create_test_company,
)


class ReportsExportFoundationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.owner = User.objects.create_user(
            username="reports_export_owner",
            email="reports-export-owner@Mhamcloud.test",
            password="test-pass-12345",
        )

        cls.company = _create_test_company(
            suffix="EXP001",
            user=cls.owner,
        )

        _create_active_membership(
            user=cls.owner,
            company=cls.company,
            role=CompanyRole.OWNER,
            is_primary=True,
        )

    def test_export_helpers_normalize_supported_values(self):
        self.assertEqual(normalize_export_format("xlsx"), "excel")
        self.assertEqual(normalize_export_format("xls"), "excel")
        self.assertEqual(normalize_export_format("CSV"), "csv")
        self.assertEqual(normalize_report_type("trial-balance"), "trial_balance")
        self.assertEqual(normalize_report_type("cash_flow"), "cash_flow")

    def test_build_report_export_result_returns_json_envelope(self):
        payload = {
            "report": {
                "key": "overview",
            },
            "available_reports": [
                {
                    "key": "trial_balance",
                    "name": "Trial Balance",
                }
            ],
        }

        result = build_report_export_result(
            company=self.company,
            report_type="overview",
            export_format="json",
            report_payload=payload,
        )

        self.assertEqual(result.report_type, "overview")
        self.assertEqual(result.export_format, "json")
        self.assertEqual(result.content_type, "application/json")
        self.assertEqual(result.payload, payload)
        self.assertTrue(result.filename.endswith(".json"))

    def test_build_csv_content_from_report_rows(self):
        payload = {
            "rows": [
                {
                    "account_code": "110101",
                    "account_name": "Cash",
                    "debit": "100.00",
                    "credit": "0.00",
                },
                {
                    "account_code": "3201",
                    "account_name": "Equity",
                    "debit": "0.00",
                    "credit": "100.00",
                },
            ]
        }

        csv_content = build_csv_content(payload)

        self.assertIn("account_code", csv_content)
        self.assertIn("110101", csv_content)
        self.assertIn("3201", csv_content)

    def test_reports_export_api_returns_json_payload(self):
        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get(
            "/api/company/reports/export/",
            {
                "report": "overview",
                "export_format": "json",
            },
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()

        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company.pk)
        self.assertEqual(body["export"]["report"], "overview")
        self.assertEqual(body["export"]["format"], "json")
        self.assertEqual(body["export"]["content_type"], "application/json")
        self.assertEqual(body["payload"]["module"], "reports")

    def test_reports_export_api_returns_csv_response(self):
        client = APIClient()
        client.force_authenticate(user=self.owner)

        response = client.get(
            "/api/company/reports/export/",
            {
                "report": "overview",
                "export_format": "csv",
            },
        )

        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment;", response["Content-Disposition"])

        csv_content = response.content.decode("utf-8")

        self.assertIn("key", csv_content)
        self.assertIn("trial_balance", csv_content)
        self.assertIn("cash_flow", csv_content)
