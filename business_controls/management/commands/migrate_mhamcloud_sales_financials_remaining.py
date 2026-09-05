from __future__ import annotations

import hashlib
import json
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import connections, transaction
from django.utils import timezone

from business_controls.models import LegacyObjectMap, MigrationRun
from catalog.models import CatalogItem
from companies.models import Branch, Company
from parties.models import BusinessParty
from sales.models import (
    SalesInvoice,
    SalesInvoiceItem,
    SalesInvoicePaymentStatus,
    SalesInvoiceSource,
    SalesInvoiceStatus,
)
from sales.services import (
    create_sales_invoice,
    create_sales_invoice_item,
    issue_sales_invoice,
)
from treasury.models import (
    CustomerPayment,
    PaymentCounterpartyType,
    PaymentMethod,
    PaymentStatus,
    TreasuryAccount,
)
from treasury.services import create_customer_payment


SOURCE_SYSTEM = "mhamcloud_v1"
MIGRATION_NAME = "sales_financial_import_batch11_remaining_sale"
LEGACY_ALIAS = "legacy"

SOURCE_COMPANY_TABLE = "business"
SOURCE_BRANCH_TABLE = "business_locations"
SOURCE_CONTACT_TABLE = "contacts"
SOURCE_VARIATION_TABLE = "variations"
SOURCE_ACCOUNT_TABLE = "accounts"
SOURCE_TRANSACTION_TABLE = "transactions"
SOURCE_LINE_TABLE = "transaction_sell_lines"
SOURCE_PAYMENT_TABLE = "transaction_payments"

APPLY_CONFIRMATION = "APPLY-MHAMCLOUD-BATCH11-INV2026-0008"

EXPECTED_COMPANY_ID = "645"
EXPECTED_BRANCH_ID = "824"
EXPECTED_CUSTOMER_ID = "129112"
EXPECTED_ACCOUNT_ID = "1450"

EXPECTED_TRANSACTION_ID = "3484084"
EXPECTED_LINE_ID = "5181514"
EXPECTED_PAYMENT_ID = "3459235"
EXPECTED_PRODUCT_ID = "1370500"
EXPECTED_VARIATION_ID = "1374336"
EXPECTED_INVOICE_NO = "INV2026-0008"
EXPECTED_PAYMENT_NO = "SP2026/0008"
EXPECTED_TOTAL = Decimal("350.00")

MONEY = Decimal("0.01")
VAT_RATE = Decimal("15.00")


def money(value: Any) -> Decimal:
    return Decimal(str(value or "0")).quantize(MONEY, rounding=ROUND_HALF_UP)


def text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


class Command(BaseCommand):
    help = (
        "Safely migrate only the verified remaining MhamCloud V1 sale "
        "INV2026-0008 for legacy company 645. Default mode is read-only dry-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--legacy-company-id",
            required=True,
            help="Legacy MhamCloud business.id.",
        )
        parser.add_argument(
            "--report",
            default="",
            help="Optional JSON report path.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply Batch 11 if validation passes.",
        )
        parser.add_argument(
            "--confirm",
            default="",
            help=f"Required with --apply. Must equal {APPLY_CONFIRMATION}.",
        )

    def handle(self, *args, **options):
        legacy_company_id = text(options["legacy_company_id"])
        report_raw = text(options.get("report"))
        apply_mode = bool(options.get("apply"))
        confirmation = text(options.get("confirm"))

        if legacy_company_id != EXPECTED_COMPANY_ID:
            raise CommandError(
                f"This Batch 11 command is restricted to legacy company {EXPECTED_COMPANY_ID}."
            )

        if apply_mode and confirmation != APPLY_CONFIRMATION:
            raise CommandError(
                "Apply blocked. Use both --apply and "
                f"--confirm {APPLY_CONFIRMATION}"
            )

        self._ensure_legacy_connection()
        source = self._read_source(legacy_company_id=legacy_company_id)
        checksum = self._checksum(source)
        target = self._resolve_target(legacy_company_id=legacy_company_id)
        validation = self._validate(source=source, target=target)

        report = {
            "source_system": SOURCE_SYSTEM,
            "migration_name": MIGRATION_NAME,
            "mode": "APPLY" if apply_mode else "DRY_RUN",
            "legacy_company_id": legacy_company_id,
            "checksum": checksum,
            "source": self._json_safe(source),
            "target": {
                "company_id": getattr(target.get("company"), "pk", None),
                "branch_id": getattr(target.get("branch"), "pk", None),
                "customer_id": getattr(target.get("customer"), "pk", None),
                "catalog_item_id": getattr(target.get("catalog_item"), "pk", None),
                "treasury_account_id": getattr(target.get("treasury_account"), "pk", None),
            },
            "validation": validation,
            "result": {
                "status": (
                    "ALREADY_APPLIED_VALID"
                    if validation.get("already_applied")
                    else "NOT_APPLIED"
                ),
                "migration_run_id": validation.get("existing_run_id"),
                "invoice_id": validation.get("existing_invoice_id"),
                "invoice_item_id": validation.get("existing_invoice_item_id"),
                "customer_payment_id": validation.get("existing_payment_id"),
                "legacy_map_ids": validation.get("existing_map_ids", []),
                "reconciliation": validation.get("existing_reconciliation", {}),
            },
        }

        report_path = (
            Path(report_raw).resolve()
            if report_raw
            else Path(
                "_audit/migration_snapshots/"
                "mhamcloud_company_645_batch11_inv2026_0008.json"
            ).resolve()
        )

        self._write_report(report_path, report)
        self._print_summary(report)
        self.stdout.write(f"Report: {report_path}")

        if not validation["valid"]:
            raise CommandError("Validation failed. Nothing was written.")

        if validation.get("already_applied"):
            self.stdout.write(
                self.style.SUCCESS(
                    "BATCH11 IDEMPOTENCY PASS - ALREADY APPLIED AND VERIFIED. "
                    "NO DATABASE WRITES PERFORMED."
                )
            )
            return

        if not apply_mode:
            self.stdout.write(
                self.style.SUCCESS(
                    "DRY-RUN COMPLETE - NO DATABASE WRITES PERFORMED."
                )
            )
            return

        result = self._apply(
            source=source,
            target=target,
            legacy_company_id=legacy_company_id,
            checksum=checksum,
        )
        report["result"] = result
        self._write_report(report_path, report)
        self.stdout.write(self.style.SUCCESS("BATCH11 APPLY COMPLETE."))

    # ============================================================
    # Legacy source
    # ============================================================

    def _ensure_legacy_connection(self) -> None:
        default_connection = connections["default"]

        if default_connection.vendor != "postgresql":
            raise CommandError(
                "Safety stop: Django default database must remain PostgreSQL, "
                f"found {default_connection.vendor!r}."
            )

        if LEGACY_ALIAS not in connections.databases:
            connections.databases[LEGACY_ALIAS] = {
                "ENGINE": "django.db.backends.mysql",
                "NAME": "mhamcloud_legacy",
                "USER": "root",
                "PASSWORD": "root",
                "HOST": "127.0.0.1",
                "PORT": "3306",
                "OPTIONS": {"charset": "utf8mb4"},
                "CONN_MAX_AGE": 0,
                "CONN_HEALTH_CHECKS": False,
                "AUTOCOMMIT": True,
                "ATOMIC_REQUESTS": False,
                "TIME_ZONE": None,
                "TEST": {
                    "CHARSET": None,
                    "COLLATION": None,
                    "MIGRATE": True,
                    "MIRROR": None,
                    "NAME": None,
                },
            }

        legacy_connection = connections[LEGACY_ALIAS]

        try:
            with legacy_connection.cursor() as cursor:
                cursor.execute("SELECT DATABASE(), @@version")
                database_name, _server_version = cursor.fetchone()
        except Exception as exc:
            raise CommandError(
                "Unable to connect to local legacy MariaDB database "
                "'mhamcloud_legacy'."
            ) from exc

        if str(database_name) != "mhamcloud_legacy":
            raise CommandError(
                f"Safety stop: unexpected legacy database name: {database_name!r}."
            )

        self.stdout.write("DATABASE_DEFAULT_VENDOR=postgresql")
        self.stdout.write("LEGACY_DATABASE=mhamcloud_legacy")
        self.stdout.write("LEGACY_VENDOR=mysql")
        self.stdout.write("LEGACY_CONNECTION=PASS")

    def _fetchall(
        self,
        sql: str,
        params: list[Any] | tuple[Any, ...],
    ) -> list[dict[str, Any]]:
        with connections[LEGACY_ALIAS].cursor() as cursor:
            cursor.execute(sql, params)
            columns = [column[0] for column in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def _read_source(self, *, legacy_company_id: str) -> dict[str, Any]:
        transactions = self._fetchall(
            """
            SELECT
                id,
                invoice_no,
                transaction_date,
                status,
                payment_status,
                contact_id,
                location_id,
                total_before_tax,
                tax_amount,
                final_total,
                created_by,
                created_at,
                updated_at
            FROM transactions
            WHERE business_id = %s
              AND type = 'sell'
              AND id = %s
            """,
            [legacy_company_id, EXPECTED_TRANSACTION_ID],
        )

        lines = self._fetchall(
            """
            SELECT
                id,
                transaction_id,
                product_id,
                variation_id,
                quantity,
                quantity_returned,
                unit_price_before_discount,
                unit_price,
                line_discount_type,
                line_discount_amount,
                unit_price_inc_tax,
                item_tax,
                tax_id,
                sell_line_note,
                created_at,
                updated_at
            FROM transaction_sell_lines
            WHERE transaction_id = %s
            ORDER BY id
            """,
            [EXPECTED_TRANSACTION_ID],
        )

        payments = self._fetchall(
            """
            SELECT
                id,
                transaction_id,
                amount,
                method,
                is_return,
                payment_for,
                payment_ref_no,
                account_id,
                paid_on,
                created_by,
                note,
                created_at,
                updated_at
            FROM transaction_payments
            WHERE transaction_id = %s
            ORDER BY id
            """,
            [EXPECTED_TRANSACTION_ID],
        )

        accounts = self._fetchall(
            """
            SELECT
                id,
                business_id,
                name,
                account_number,
                account_type_id,
                is_closed,
                created_at,
                updated_at
            FROM accounts
            WHERE id = %s
              AND business_id = %s
            """,
            [EXPECTED_ACCOUNT_ID, legacy_company_id],
        )

        return {
            "transactions": transactions,
            "lines": lines,
            "payments": payments,
            "accounts": accounts,
        }

    # ============================================================
    # Target mappings
    # ============================================================

    def _get_map(self, *, source_table: str, legacy_id: str):
        return (
            LegacyObjectMap.objects
            .select_related("target_content_type", "company", "run")
            .filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=EXPECTED_COMPANY_ID,
                source_table=source_table,
                legacy_id=str(legacy_id),
            )
            .first()
        )

    def _mapped_object(self, *, source_table: str, legacy_id: str, model):
        mapping = self._get_map(source_table=source_table, legacy_id=legacy_id)

        if not mapping or not mapping.target_object_id:
            return None

        expected_ct = ContentType.objects.get_for_model(model)
        if mapping.target_content_type_id != expected_ct.id:
            return None

        try:
            return model.objects.get(pk=int(mapping.target_object_id))
        except (model.DoesNotExist, TypeError, ValueError):
            return None

    def _resolve_target(self, *, legacy_company_id: str) -> dict[str, Any]:
        return {
            "company": self._mapped_object(
                source_table=SOURCE_COMPANY_TABLE,
                legacy_id=legacy_company_id,
                model=Company,
            ),
            "branch": self._mapped_object(
                source_table=SOURCE_BRANCH_TABLE,
                legacy_id=EXPECTED_BRANCH_ID,
                model=Branch,
            ),
            "customer": self._mapped_object(
                source_table=SOURCE_CONTACT_TABLE,
                legacy_id=EXPECTED_CUSTOMER_ID,
                model=BusinessParty,
            ),
            "catalog_item": self._mapped_object(
                source_table=SOURCE_VARIATION_TABLE,
                legacy_id=EXPECTED_VARIATION_ID,
                model=CatalogItem,
            ),
            "treasury_account": self._mapped_object(
                source_table=SOURCE_ACCOUNT_TABLE,
                legacy_id=EXPECTED_ACCOUNT_ID,
                model=TreasuryAccount,
            ),
        }

    # ============================================================
    # Validation / idempotency
    # ============================================================

    def _validate(
        self,
        *,
        source: dict[str, Any],
        target: dict[str, Any],
    ) -> dict[str, Any]:
        errors: list[str] = []
        warnings: list[str] = []

        company = target.get("company")
        branch = target.get("branch")
        customer = target.get("customer")
        catalog_item = target.get("catalog_item")
        treasury_account = target.get("treasury_account")

        for label, obj in (
            ("company", company),
            ("branch", branch),
            ("customer", customer),
            ("catalog_item", catalog_item),
            ("treasury_account", treasury_account),
        ):
            if not obj:
                errors.append(f"Mapped target {label} was not found.")

        if company and branch and branch.company_id != company.id:
            errors.append("Mapped branch belongs to another company.")

        if company and customer and customer.company_id != company.id:
            errors.append("Mapped customer belongs to another company.")

        if company and catalog_item and catalog_item.company_id != company.id:
            errors.append("Mapped catalog item belongs to another company.")

        if company and treasury_account and treasury_account.company_id != company.id:
            errors.append("Mapped treasury account belongs to another company.")

        transactions = source["transactions"]
        lines = source["lines"]
        payments = source["payments"]
        accounts = source["accounts"]

        if len(transactions) != 1:
            errors.append("Expected exactly one legacy transaction 3484084.")
        if len(lines) != 1:
            errors.append("Expected exactly one legacy sell line 5181514.")
        if len(payments) != 1:
            errors.append("Expected exactly one legacy payment 3459235.")
        if len(accounts) != 1:
            errors.append("Expected legacy account 1450 exactly once.")

        if errors:
            return {
                "valid": False,
                "errors": errors,
                "warnings": warnings,
                "already_applied": False,
                "expected_source_objects": 3,
                "expected_created_targets": 3,
            }

        tx = transactions[0]
        line = lines[0]
        payment = payments[0]

        checks = [
            (text(tx["id"]) == EXPECTED_TRANSACTION_ID, "Unexpected transaction ID."),
            (text(tx["invoice_no"]) == EXPECTED_INVOICE_NO, "Unexpected invoice number."),
            (text(tx["status"]).lower() == "final", "Legacy invoice is not final."),
            (text(tx["payment_status"]).lower() == "paid", "Legacy invoice is not paid."),
            (text(tx["contact_id"]) == EXPECTED_CUSTOMER_ID, "Unexpected invoice customer."),
            (text(tx["location_id"]) == EXPECTED_BRANCH_ID, "Unexpected invoice branch."),
            (money(tx["final_total"]) == EXPECTED_TOTAL, "Unexpected invoice total."),
            (text(line["id"]) == EXPECTED_LINE_ID, "Unexpected sell line ID."),
            (
                text(line["transaction_id"]) == EXPECTED_TRANSACTION_ID,
                "Sell line transaction mismatch.",
            ),
            (text(line["product_id"]) == EXPECTED_PRODUCT_ID, "Unexpected product ID."),
            (
                text(line["variation_id"]) == EXPECTED_VARIATION_ID,
                "Unexpected variation ID.",
            ),
            (Decimal(str(line["quantity"])) == Decimal("1.0000"), "Unexpected line quantity."),
            (money(line["quantity_returned"]) == Decimal("0.00"), "Unexpected returned quantity."),
            (text(payment["id"]) == EXPECTED_PAYMENT_ID, "Unexpected payment ID."),
            (
                text(payment["transaction_id"]) == EXPECTED_TRANSACTION_ID,
                "Payment transaction mismatch.",
            ),
            (money(payment["amount"]) == EXPECTED_TOTAL, "Unexpected payment amount."),
            (text(payment["method"]).lower() == "cash", "Unexpected payment method."),
            (not bool(payment["is_return"]), "Payment is unexpectedly marked as return."),
            (text(payment["account_id"]) == EXPECTED_ACCOUNT_ID, "Unexpected payment account."),
            (
                text(payment["payment_ref_no"]) == EXPECTED_PAYMENT_NO,
                "Unexpected payment reference number.",
            ),
            (
                text(accounts[0]["business_id"]) == EXPECTED_COMPANY_ID,
                "Legacy account belongs to another company.",
            ),
        ]

        for passed, message in checks:
            if not passed:
                errors.append(message)

        qty = Decimal(str(line["quantity"]))
        source_subtotal = money(qty * Decimal(str(line["unit_price"])))
        source_tax = money(qty * Decimal(str(line["item_tax"])))
        source_total = money(qty * Decimal(str(line["unit_price_inc_tax"])))

        if source_total != EXPECTED_TOTAL:
            errors.append(
                f"Legacy line total mismatch: {source_total} != {EXPECTED_TOTAL}."
            )

        if source_subtotal + source_tax != source_total:
            errors.append(
                "Legacy subtotal/tax/total reconciliation failed: "
                f"{source_subtotal} + {source_tax} != {source_total}."
            )

        if money(tx["final_total"]) != money(payment["amount"]):
            errors.append("Legacy invoice/payment reconciliation failed.")

        batch_keys = {
            SOURCE_TRANSACTION_TABLE: EXPECTED_TRANSACTION_ID,
            SOURCE_LINE_TABLE: EXPECTED_LINE_ID,
            SOURCE_PAYMENT_TABLE: EXPECTED_PAYMENT_ID,
        }

        maps = {
            table: self._get_map(source_table=table, legacy_id=legacy_id)
            for table, legacy_id in batch_keys.items()
        }

        present_count = sum(1 for value in maps.values() if value is not None)

        if present_count not in (0, 3):
            errors.append(
                "Partial Batch 11 legacy mappings detected. "
                f"Expected 0 or 3 mappings, found {present_count}."
            )

        already_applied = present_count == 3
        existing_data: dict[str, Any] = {}

        if already_applied and not errors:
            existing_data = self._verify_existing_applied(
                company=company,
                customer=customer,
                catalog_item=catalog_item,
                treasury_account=treasury_account,
                maps=maps,
            )
            errors.extend(existing_data["errors"])

        if not already_applied and company:
            if SalesInvoice.objects.filter(
                company=company,
                invoice_number=EXPECTED_INVOICE_NO,
            ).exists():
                errors.append(
                    f"Target invoice number already exists without Batch 11 mapping: "
                    f"{EXPECTED_INVOICE_NO}."
                )

            if CustomerPayment.objects.filter(
                company=company,
                payment_number=EXPECTED_PAYMENT_NO,
            ).exists():
                errors.append(
                    f"Target payment number already exists without Batch 11 mapping: "
                    f"{EXPECTED_PAYMENT_NO}."
                )

        return {
            "valid": not errors,
            "errors": errors,
            "warnings": warnings,
            "already_applied": already_applied and not errors,
            "invoice_total": str(EXPECTED_TOTAL),
            "payment_total": str(EXPECTED_TOTAL),
            "expected_source_objects": 3,
            "expected_created_targets": 3,
            **{
                key: value
                for key, value in existing_data.items()
                if key != "errors"
            },
        }

    def _verify_existing_applied(
        self,
        *,
        company: Company,
        customer: BusinessParty,
        catalog_item: CatalogItem,
        treasury_account: TreasuryAccount,
        maps: dict[str, LegacyObjectMap],
    ) -> dict[str, Any]:
        errors: list[str] = []

        tx_map = maps[SOURCE_TRANSACTION_TABLE]
        line_map = maps[SOURCE_LINE_TABLE]
        payment_map = maps[SOURCE_PAYMENT_TABLE]

        expected_models = {
            SOURCE_TRANSACTION_TABLE: SalesInvoice,
            SOURCE_LINE_TABLE: SalesInvoiceItem,
            SOURCE_PAYMENT_TABLE: CustomerPayment,
        }

        for table, mapping in maps.items():
            expected_ct = ContentType.objects.get_for_model(expected_models[table])
            if mapping.target_content_type_id != expected_ct.id:
                errors.append(f"Existing {table} mapping has wrong ContentType.")
            if not mapping.target_object_id:
                errors.append(f"Existing {table} mapping has no target.")

        if errors:
            return {"errors": errors}

        try:
            invoice = SalesInvoice.objects.get(pk=int(tx_map.target_object_id))
            item = SalesInvoiceItem.objects.get(pk=int(line_map.target_object_id))
            payment = CustomerPayment.objects.get(pk=int(payment_map.target_object_id))
        except (ValueError, TypeError, SalesInvoice.DoesNotExist,
                SalesInvoiceItem.DoesNotExist, CustomerPayment.DoesNotExist):
            return {"errors": ["One or more existing Batch 11 targets are missing."]}

        if invoice.company_id != company.id:
            errors.append("Existing invoice belongs to another company.")
        if invoice.customer_id != customer.id:
            errors.append("Existing invoice belongs to another customer.")
        if invoice.invoice_number != EXPECTED_INVOICE_NO:
            errors.append("Existing invoice number does not match Batch 11.")
        if money(invoice.total_amount) != EXPECTED_TOTAL:
            errors.append("Existing invoice total does not match Batch 11.")
        if invoice.status != SalesInvoiceStatus.ISSUED:
            errors.append("Existing invoice is not ISSUED.")
        if invoice.payment_status != SalesInvoicePaymentStatus.PAID:
            errors.append("Existing invoice is not PAID.")
        if money(invoice.balance_due) != Decimal("0.00"):
            errors.append("Existing invoice balance is not zero.")

        if item.invoice_id != invoice.id:
            errors.append("Existing invoice item is not attached to Batch 11 invoice.")
        if item.catalog_item_id != catalog_item.id:
            errors.append("Existing invoice item points to another catalog item.")
        if money(item.line_total) != EXPECTED_TOTAL:
            errors.append("Existing invoice item total does not match Batch 11.")

        if payment.company_id != company.id:
            errors.append("Existing payment belongs to another company.")
        if payment.sales_invoice_id != invoice.id:
            errors.append("Existing payment is not allocated to Batch 11 invoice.")
        if payment.treasury_account_id != treasury_account.id:
            errors.append("Existing payment uses another treasury account.")
        if payment.payment_number != EXPECTED_PAYMENT_NO:
            errors.append("Existing payment number does not match Batch 11.")
        if money(payment.amount) != EXPECTED_TOTAL:
            errors.append("Existing payment amount does not match Batch 11.")
        if payment.status != PaymentStatus.CONFIRMED:
            errors.append("Existing payment is not CONFIRMED.")
        if payment.treasury_transaction_id is None:
            errors.append("Existing payment has no treasury transaction.")
        if payment.accounting_entry_id is None or not payment.is_accounting_posted:
            errors.append("Existing payment is not accounting-posted.")

        run_ids = {m.run_id for m in maps.values()}
        existing_run_id = next(iter(run_ids)) if len(run_ids) == 1 else None

        if len(run_ids) != 1:
            errors.append("Existing Batch 11 mappings do not share one MigrationRun.")

        reconciliation = {
            "invoice_total": str(money(invoice.total_amount)),
            "payment_total": str(money(payment.amount)),
            "difference_invoice_payment": str(
                money(invoice.total_amount - payment.amount)
            ),
            "invoice_paid": (
                invoice.payment_status == SalesInvoicePaymentStatus.PAID
                and money(invoice.balance_due) == Decimal("0.00")
            ),
            "payment_confirmed": payment.status == PaymentStatus.CONFIRMED,
            "payment_accounting_posted": bool(payment.is_accounting_posted),
        }

        return {
            "errors": errors,
            "existing_run_id": existing_run_id,
            "existing_invoice_id": invoice.id,
            "existing_invoice_item_id": item.id,
            "existing_payment_id": payment.id,
            "existing_map_ids": [m.id for m in maps.values()],
            "existing_reconciliation": reconciliation,
        }

    # ============================================================
    # Apply
    # ============================================================

    @transaction.atomic
    def _apply(
        self,
        *,
        source: dict[str, Any],
        target: dict[str, Any],
        legacy_company_id: str,
        checksum: str,
    ) -> dict[str, Any]:
        company = Company.objects.select_for_update().get(pk=target["company"].pk)
        branch = target["branch"]
        customer = target["customer"]
        catalog_item = target["catalog_item"]
        treasury_account = TreasuryAccount.objects.select_for_update().get(
            pk=target["treasury_account"].pk
        )

        batch_keys = {
            SOURCE_TRANSACTION_TABLE: EXPECTED_TRANSACTION_ID,
            SOURCE_LINE_TABLE: EXPECTED_LINE_ID,
            SOURCE_PAYMENT_TABLE: EXPECTED_PAYMENT_ID,
        }

        existing_maps = list(
            LegacyObjectMap.objects.select_for_update().filter(
                source_system=SOURCE_SYSTEM,
                legacy_company_id=legacy_company_id,
                source_table__in=list(batch_keys.keys()),
                legacy_id__in=list(batch_keys.values()),
            )
        )

        if existing_maps:
            raise CommandError(
                "Apply blocked: Batch 11 legacy mappings appeared after validation."
            )

        if SalesInvoice.objects.filter(
            company=company,
            invoice_number=EXPECTED_INVOICE_NO,
        ).exists():
            raise CommandError(
                f"Apply blocked: invoice {EXPECTED_INVOICE_NO} already exists."
            )

        if CustomerPayment.objects.filter(
            company=company,
            payment_number=EXPECTED_PAYMENT_NO,
        ).exists():
            raise CommandError(
                f"Apply blocked: payment {EXPECTED_PAYMENT_NO} already exists."
            )

        legacy_invoice = source["transactions"][0]
        legacy_line = source["lines"][0]
        legacy_payment = source["payments"][0]

        treasury_before = money(treasury_account.current_balance)

        run = MigrationRun.objects.create(
            source_system=SOURCE_SYSTEM,
            migration_name=MIGRATION_NAME,
            status=MigrationRun.Status.DRY_RUN,
            company=company,
            source_count=3,
            source_snapshot={
                "checksum": checksum,
                "legacy_company_id": legacy_company_id,
                "transaction_id": EXPECTED_TRANSACTION_ID,
                "line_id": EXPECTED_LINE_ID,
                "payment_id": EXPECTED_PAYMENT_ID,
            },
            metadata={
                "scope": [
                    SOURCE_TRANSACTION_TABLE,
                    SOURCE_LINE_TABLE,
                    SOURCE_PAYMENT_TABLE,
                ],
                "apply_confirmation": APPLY_CONFIRMATION,
                "policy": "verified_financial_batch_11_remaining_sale",
                "historical_rounding_policy": "preserve_legacy_line_amounts",
                "treasury_account_policy": "reuse_existing_legacy_cash_1450",
            },
        )

        invoice = create_sales_invoice(
            company=company,
            user=None,
            branch_id=branch.pk,
            customer_id=customer.pk,
            invoice_date=self._as_date(legacy_invoice["transaction_date"]),
            due_date=None,
            source=SalesInvoiceSource.IMPORT,
            public_notes="",
            internal_notes=(
                "Migrated from MhamCloud V1 Batch 11. "
                f"Legacy transaction {EXPECTED_TRANSACTION_ID}."
            ),
            items=[],
            extra_data={
                "migration": {
                    "source_system": SOURCE_SYSTEM,
                    "source_table": SOURCE_TRANSACTION_TABLE,
                    "legacy_id": EXPECTED_TRANSACTION_ID,
                    "legacy_invoice_no": EXPECTED_INVOICE_NO,
                    "legacy_created_by": text(legacy_invoice["created_by"]),
                    "legacy_created_at": self._json_value(legacy_invoice["created_at"]),
                    "legacy_updated_at": self._json_value(legacy_invoice["updated_at"]),
                    "batch": "11",
                }
            },
        )

        if SalesInvoice.objects.filter(
            company=company,
            invoice_number=EXPECTED_INVOICE_NO,
        ).exclude(pk=invoice.pk).exists():
            raise CommandError(
                f"Invoice number collision during apply: {EXPECTED_INVOICE_NO}."
            )

        invoice.invoice_number = EXPECTED_INVOICE_NO
        invoice.full_clean()
        invoice.save(update_fields=["invoice_number", "updated_at"])

        qty = Decimal(str(legacy_line["quantity"]))
        legacy_unit_price = Decimal(str(legacy_line["unit_price"]))
        line_subtotal = money(qty * legacy_unit_price)
        line_tax = money(qty * Decimal(str(legacy_line["item_tax"])))
        line_total = money(qty * Decimal(str(legacy_line["unit_price_inc_tax"])))

        item = create_sales_invoice_item(
            invoice=invoice,
            company=company,
            payload={
                "catalog_item_id": catalog_item.pk,
                "quantity": qty,
                "unit_price": money(legacy_unit_price),
                "discount_amount": Decimal("0.00"),
                "taxable": True,
                "tax_rate": VAT_RATE,
                "item_name": (
                    getattr(catalog_item, "name", "")
                    or getattr(catalog_item, "name_ar", "")
                ),
                "description": text(legacy_line.get("sell_line_note")),
            },
            line_number=1,
        )

        item_metadata = dict(item.extra_data or {})
        item_metadata["migration"] = {
            "source_system": SOURCE_SYSTEM,
            "source_table": SOURCE_LINE_TABLE,
            "legacy_id": EXPECTED_LINE_ID,
            "legacy_transaction_id": EXPECTED_TRANSACTION_ID,
            "legacy_product_id": EXPECTED_PRODUCT_ID,
            "legacy_variation_id": EXPECTED_VARIATION_ID,
            "legacy_unit_price": str(legacy_line["unit_price"]),
            "legacy_unit_price_inc_tax": str(legacy_line["unit_price_inc_tax"]),
            "legacy_item_tax_per_unit": str(legacy_line["item_tax"]),
            "historical_rounding_override": True,
            "batch": "11",
        }

        SalesInvoiceItem.objects.filter(pk=item.pk).update(
            line_subtotal=line_subtotal,
            discount_amount=Decimal("0.00"),
            taxable=True,
            tax_rate=VAT_RATE,
            taxable_amount=line_subtotal,
            tax_amount=line_tax,
            line_total=line_total,
            extra_data=item_metadata,
        )
        item.refresh_from_db()

        invoice.recalculate_totals(save=True)
        invoice.refresh_from_db()

        if money(invoice.total_amount) != EXPECTED_TOTAL:
            raise CommandError(
                "Historical invoice reconciliation failed: "
                f"target={invoice.total_amount}, legacy={EXPECTED_TOTAL}."
            )

        if money(
            invoice.subtotal + invoice.tax_amount - invoice.discount_amount
        ) != money(invoice.total_amount):
            raise CommandError("Invoice subtotal/tax reconciliation failed.")

        invoice = issue_sales_invoice(company=company, invoice=invoice, user=None)
        invoice.refresh_from_db()

        if invoice.status != SalesInvoiceStatus.ISSUED:
            raise CommandError("Batch 11 invoice did not reach ISSUED.")

        invoice_map = self._create_map(
            run=run,
            company=company,
            source_table=SOURCE_TRANSACTION_TABLE,
            legacy_id=EXPECTED_TRANSACTION_ID,
            target=invoice,
            source_reference=EXPECTED_INVOICE_NO,
            checksum=self._checksum(legacy_invoice),
            metadata={
                "legacy_contact_id": EXPECTED_CUSTOMER_ID,
                "legacy_location_id": EXPECTED_BRANCH_ID,
                "legacy_final_total": str(legacy_invoice["final_total"]),
                "batch": "11",
            },
        )

        line_map = self._create_map(
            run=run,
            company=company,
            source_table=SOURCE_LINE_TABLE,
            legacy_id=EXPECTED_LINE_ID,
            target=item,
            source_reference=EXPECTED_LINE_ID,
            checksum=self._checksum(legacy_line),
            metadata={
                "legacy_transaction_id": EXPECTED_TRANSACTION_ID,
                "legacy_variation_id": EXPECTED_VARIATION_ID,
                "historical_rounding_override": True,
                "batch": "11",
            },
        )

        customer_name = (
            getattr(customer, "display_name", "")
            or getattr(customer, "legal_name", "")
            or "Legacy Customer"
        )
        customer_phone = (
            getattr(customer, "mobile", "")
            or getattr(customer, "phone", "")
            or ""
        )

        payment = create_customer_payment(
            company=company,
            treasury_account=treasury_account,
            user=None,
            amount=EXPECTED_TOTAL,
            payment_method=PaymentMethod.CASH,
            payment_date=self._as_date(legacy_payment["paid_on"]),
            customer_id=customer.pk,
            customer_name=customer_name,
            customer_phone=customer_phone,
            counterparty_type=PaymentCounterpartyType.CUSTOMER,
            counterparty_id=customer.pk,
            counterparty_name=customer_name,
            counterparty_phone=customer_phone,
            sales_invoice=invoice,
            currency="SAR",
            payment_number=EXPECTED_PAYMENT_NO,
            reference=f"LEGACY-TP-{EXPECTED_PAYMENT_ID}",
            description=f"Migrated legacy customer payment {EXPECTED_PAYMENT_NO}",
            notes=(
                f"MhamCloud V1 Batch 11 legacy payment {EXPECTED_PAYMENT_ID} "
                f"for {EXPECTED_INVOICE_NO}."
            ),
            status=PaymentStatus.CONFIRMED,
        )

        payment.refresh_from_db()
        invoice.refresh_from_db()
        treasury_account.refresh_from_db()

        if payment.status != PaymentStatus.CONFIRMED:
            raise CommandError("Batch 11 payment did not reach CONFIRMED.")

        if payment.treasury_transaction_id is None:
            raise CommandError("Batch 11 confirmed payment has no treasury transaction.")

        if payment.accounting_entry_id is None or not payment.is_accounting_posted:
            raise CommandError(
                "Batch 11 confirmed payment has no posted accounting entry."
            )

        if (
            invoice.payment_status != SalesInvoicePaymentStatus.PAID
            or money(invoice.balance_due) != Decimal("0.00")
            or money(invoice.paid_amount) != money(invoice.total_amount)
        ):
            raise CommandError("Batch 11 invoice payment allocation failed.")

        payment_map = self._create_map(
            run=run,
            company=company,
            source_table=SOURCE_PAYMENT_TABLE,
            legacy_id=EXPECTED_PAYMENT_ID,
            target=payment,
            source_reference=EXPECTED_PAYMENT_NO,
            checksum=self._checksum(legacy_payment),
            metadata={
                "legacy_transaction_id": EXPECTED_TRANSACTION_ID,
                "legacy_account_id": EXPECTED_ACCOUNT_ID,
                "legacy_method": text(legacy_payment["method"]),
                "legacy_paid_on": self._json_value(legacy_payment["paid_on"]),
                "batch": "11",
            },
        )

        treasury_after = money(treasury_account.current_balance)
        treasury_delta = money(treasury_after - treasury_before)

        if treasury_delta != EXPECTED_TOTAL:
            raise CommandError(
                "Treasury delta mismatch: "
                f"{treasury_after} - {treasury_before} = {treasury_delta}, "
                f"expected {EXPECTED_TOTAL}."
            )

        mapped_count = LegacyObjectMap.objects.filter(run=run).count()
        if mapped_count != 3:
            raise CommandError(
                f"Final Batch 11 reconciliation expected 3 mappings, got {mapped_count}."
            )

        reconciliation = {
            "expected_source_objects": 3,
            "mapped_source_objects": mapped_count,
            "created_target_business_objects": 3,
            "sales_invoices_created": 1,
            "sales_invoice_items_created": 1,
            "customer_payments_created": 1,
            "invoice_total": str(money(invoice.total_amount)),
            "payment_total": str(money(payment.amount)),
            "difference_invoice_payment": str(
                money(invoice.total_amount - payment.amount)
            ),
            "treasury_balance_before": str(treasury_before),
            "treasury_balance_after": str(treasury_after),
            "treasury_delta": str(treasury_delta),
            "invoice_paid": (
                invoice.payment_status == SalesInvoicePaymentStatus.PAID
                and money(invoice.balance_due) == Decimal("0.00")
            ),
            "payment_confirmed": payment.status == PaymentStatus.CONFIRMED,
            "payment_accounting_posted": bool(payment.is_accounting_posted),
        }

        if reconciliation["difference_invoice_payment"] != "0.00":
            raise CommandError("Batch 11 invoice/payment difference is not zero.")

        run.processed_count = 3
        run.created_count = 3
        run.updated_count = 0
        run.skipped_count = 0
        run.failed_count = 0
        run.reconciliation = reconciliation
        run.status = MigrationRun.Status.APPLIED
        run.completed_at = timezone.now()
        run.save(
            update_fields=[
                "processed_count",
                "created_count",
                "updated_count",
                "skipped_count",
                "failed_count",
                "reconciliation",
                "status",
                "completed_at",
                "updated_at",
            ]
        )

        return {
            "status": "APPLIED",
            "migration_run_id": run.pk,
            "invoice_id": invoice.pk,
            "invoice_item_id": item.pk,
            "customer_payment_id": payment.pk,
            "legacy_map_ids": [
                invoice_map.pk,
                line_map.pk,
                payment_map.pk,
            ],
            "reconciliation": reconciliation,
        }

    # ============================================================
    # Helpers
    # ============================================================

    def _create_map(
        self,
        *,
        run: MigrationRun,
        company: Company,
        source_table: str,
        legacy_id: str,
        target,
        source_reference: str = "",
        checksum: str = "",
        metadata: dict[str, Any] | None = None,
    ) -> LegacyObjectMap:
        content_type = ContentType.objects.get_for_model(target.__class__)

        return LegacyObjectMap.objects.create(
            run=run,
            source_system=SOURCE_SYSTEM,
            source_table=source_table,
            legacy_id=str(legacy_id),
            legacy_company_id=EXPECTED_COMPANY_ID,
            company=company,
            target_content_type=content_type,
            target_object_id=str(target.pk),
            checksum=checksum,
            source_reference=source_reference,
            metadata=metadata or {},
        )

    def _as_date(self, value: Any):
        if value is None:
            raise CommandError("Legacy date is empty.")

        if hasattr(value, "date"):
            return value.date()

        raw = text(value)
        if not raw:
            raise CommandError("Legacy date is empty.")

        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).date()
        except ValueError:
            try:
                return datetime.strptime(raw[:10], "%Y-%m-%d").date()
            except ValueError as exc:
                raise CommandError(f"Invalid legacy date: {raw}") from exc

    def _checksum(self, value: Any) -> str:
        payload = json.dumps(
            self._json_safe(value),
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
            default=str,
        ).encode("utf-8")
        return hashlib.sha256(payload).hexdigest()

    def _json_value(self, value: Any) -> Any:
        if isinstance(value, Decimal):
            return str(value)

        if isinstance(value, datetime):
            return value.isoformat()

        if hasattr(value, "isoformat"):
            try:
                return value.isoformat()
            except Exception:
                pass

        return value

    def _json_safe(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {
                str(key): self._json_safe(item)
                for key, item in value.items()
            }

        if isinstance(value, (list, tuple)):
            return [self._json_safe(item) for item in value]

        return self._json_value(value)

    def _write_report(self, path: Path, report: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temp = path.with_suffix(path.suffix + ".tmp")
        temp.write_text(
            json.dumps(
                report,
                ensure_ascii=False,
                indent=2,
                default=str,
            ),
            encoding="utf-8",
        )
        temp.replace(path)

    def _print_summary(self, report: dict[str, Any]) -> None:
        validation = report["validation"]

        self.stdout.write("=" * 76)
        self.stdout.write(
            "MHAMCLOUD V1 -> PRIMEYACC SALES FINANCIAL MIGRATION | BATCH 11"
        )
        self.stdout.write("=" * 76)
        self.stdout.write(f"Mode: {report['mode']}")
        self.stdout.write(f"Legacy company ID: {report['legacy_company_id']}")
        self.stdout.write(f"Transaction: {EXPECTED_TRANSACTION_ID}")
        self.stdout.write(f"Invoice: {EXPECTED_INVOICE_NO}")
        self.stdout.write(f"Line: {EXPECTED_LINE_ID}")
        self.stdout.write(f"Payment: {EXPECTED_PAYMENT_ID}")
        self.stdout.write(f"Expected total: {EXPECTED_TOTAL}")
        self.stdout.write(
            f"Already applied: {validation.get('already_applied', False)}"
        )
        self.stdout.write(
            f"Validation: {'PASS' if validation['valid'] else 'FAIL'}"
        )

        for warning in validation["warnings"]:
            self.stdout.write(self.style.WARNING(f"WARNING: {warning}"))

        for error in validation["errors"]:
            self.stdout.write(self.style.ERROR(f"ERROR: {error}"))

        self.stdout.write("=" * 76)
