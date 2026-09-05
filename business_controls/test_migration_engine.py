from __future__ import annotations

from decimal import Decimal

from django.test import TestCase, TransactionTestCase

from business_controls.migration_engine import (
    MigrationSafetyError,
    SourceObjectKey,
    atomic_migration_scope,
    build_financial_line,
    canonical_checksum,
    finalize_migration_run,
    iter_cursor_pages,
    money,
    reconcile_count,
    start_migration_run,
)
from business_controls.models import LegacyObjectMap, MigrationRun


class MigrationEnginePureTests(TestCase):
    def test_checksum_is_deterministic(self):
        left = canonical_checksum({"b": 2, "a": 1})
        right = canonical_checksum({"a": 1, "b": 2})
        self.assertEqual(left, right)

    def test_money_rounds_to_two_decimals(self):
        self.assertEqual(money("115.005"), Decimal("115.01"))

    def test_financial_line_uses_exclusive_price_without_double_tax(self):
        line = build_financial_line(
            quantity="1",
            unit_price_exclusive="100",
            unit_tax="15",
            expected_total="115",
        )
        self.assertEqual(line.subtotal, Decimal("100.00"))
        self.assertEqual(line.tax_total, Decimal("15.00"))
        self.assertEqual(line.total, Decimal("115.00"))

    def test_financial_line_rejects_inconsistent_source_total(self):
        with self.assertRaises(MigrationSafetyError):
            build_financial_line(
                quantity="1",
                unit_price_exclusive="115",
                unit_tax="15",
                expected_total="115",
            )

    def test_reconcile_count_requires_exact_match(self):
        result = reconcile_count(expected=8, actual=8, label="sales")
        self.assertTrue(result.matched)
        with self.assertRaises(MigrationSafetyError):
            reconcile_count(expected=8, actual=7, label="sales")

    def test_cursor_pagination_exhausts_multiple_pages(self):
        source = [{"id": value} for value in range(1, 8)]

        def fetch(after_id, limit):
            return [row for row in source if row["id"] > after_id][:limit]

        rows = list(iter_cursor_pages(fetch, limit=3))
        self.assertEqual([row["id"] for row in rows], list(range(1, 8)))

    def test_cursor_rejects_non_monotonic_ids(self):
        calls = 0

        def fetch(after_id, limit):
            nonlocal calls
            calls += 1
            if calls == 1:
                return [{"id": 2}, {"id": 1}]
            return []

        with self.assertRaises(MigrationSafetyError):
            list(iter_cursor_pages(fetch, limit=10))

    def test_source_key_requires_company_scope(self):
        with self.assertRaises(MigrationSafetyError):
            SourceObjectKey(
                source_table="transactions",
                legacy_id="1",
                legacy_company_id="",
            ).validate()


class MigrationEngineDatabaseTests(TransactionTestCase):
    reset_sequences = True

    def test_atomic_scope_rolls_back_on_failure(self):
        before = MigrationRun.objects.count()
        with self.assertRaises(RuntimeError):
            with atomic_migration_scope():
                MigrationRun.objects.create(
                    source_system="mhamcloud_v1",
                    migration_name="rollback_test",
                )
                raise RuntimeError("force rollback")
        self.assertEqual(MigrationRun.objects.count(), before)

    def test_finalize_run_requires_counter_integrity(self):
        run = start_migration_run(
            migration_name="counter_test",
            legacy_company_id="999999",
            source_count=2,
        )
        with self.assertRaises(MigrationSafetyError):
            finalize_migration_run(
                run=run,
                processed_count=2,
                created_count=1,
                updated_count=0,
                skipped_count=0,
            )
        run.refresh_from_db()
        self.assertNotEqual(run.status, MigrationRun.Status.APPLIED)

    def test_finalize_run_reconciles_mapping_count(self):
        run = start_migration_run(
            migration_name="mapping_test",
            legacy_company_id="999998",
            source_count=1,
        )
        LegacyObjectMap.objects.create(
            run=run,
            source_system="mhamcloud_v1",
            source_table="synthetic",
            legacy_id="synthetic-1",
            legacy_company_id="999998",
        )
        finalize_migration_run(
            run=run,
            processed_count=1,
            created_count=0,
            skipped_count=1,
            expected_mapping_count=1,
        )
        run.refresh_from_db()
        self.assertEqual(run.status, MigrationRun.Status.APPLIED)
        self.assertEqual(run.reconciliation["actual_mapping_count"], 1)
