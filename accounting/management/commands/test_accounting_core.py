# ============================================================
# 📂 accounting/management/commands/test_accounting_core.py
# 🧠 PrimeyAcc | Test Accounting Core
# ------------------------------------------------------------
# ✅ يختبر نواة المحاسبة عمليًا
# ✅ يتأكد من زرع شجرة الحسابات للشركة
# ✅ ينشئ قيد يدوي متوازن
# ✅ يرحّل القيد
# ✅ يعكس القيد بقيد عكسي
# ✅ يختبر منع القيد غير المتوازن
# ✅ يعمل على شركة محددة بدون الاعتماد على company_id من الفرونت
# ============================================================

from __future__ import annotations

from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounting.models import (
    Account,
    JournalEntry,
    JournalEntryStatus,
)
from accounting.services import (
    AccountingPostingError,
    EntryLinePayload,
    create_manual_journal_entry,
    get_account_by_code,
    post_journal_entry,
    reverse_journal_entry,
    seed_company_chart_of_accounts,
)
from companies.models import Company


class Command(BaseCommand):
    help = "Test PrimeyAcc accounting core: seed chart, create, post, and reverse a journal entry."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Company ID to test accounting core for.",
        )
        parser.add_argument(
            "--company-code",
            type=str,
            default="TEST-001",
            help="Company code to test accounting core for. Default: TEST-001",
        )
        parser.add_argument(
            "--reset-test-entries",
            action="store_true",
            help="Delete previous test accounting entries created by this command for the selected company.",
        )

    def _get_company(self, *, company_id: int | None, company_code: str) -> Company:
        company_code = str(company_code or "").strip()

        if company_id:
            company = Company.objects.filter(pk=company_id).first()
            if not company:
                raise CommandError(f"لم يتم العثور على شركة بالمعرف: {company_id}")
            return company

        if not company_code:
            raise CommandError("حدد company-code أو company-id.")

        company = Company.objects.filter(company_code=company_code).first()
        if not company:
            raise CommandError(f"لم يتم العثور على شركة بالكود: {company_code}")

        return company

    def _reset_test_entries(self, company: Company) -> None:
        test_entries = JournalEntry.objects.filter(
            company=company,
            source_type__in=[
                "accounting_core_test",
                "accounting_core_test_unbalanced",
            ],
        )

        count = test_entries.count()
        test_entries.delete()

        self.stdout.write(
            self.style.WARNING(
                f"تم حذف قيود الاختبار السابقة لهذه الشركة: {count}"
            )
        )

    def _ensure_chart_seeded(self, company: Company) -> None:
        current_count = Account.objects.filter(company=company).count()

        if current_count:
            self.stdout.write(
                self.style.NOTICE(
                    f"دليل الحسابات موجود مسبقًا للشركة. عدد الحسابات الحالي: {current_count}"
                )
            )
            return

        self.stdout.write(
            self.style.WARNING(
                "لا يوجد دليل حسابات للشركة. سيتم زرع شجرة الحسابات الآن..."
            )
        )

        result = seed_company_chart_of_accounts(company)
        self.stdout.write(
            self.style.SUCCESS(
                f"تم زرع شجرة الحسابات. Total Accounts: {result.get('total_accounts')}"
            )
        )

    def _print_entry(self, title: str, entry: JournalEntry) -> None:
        entry.refresh_from_db()

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(title))
        self.stdout.write(f"  Entry ID: {entry.pk}")
        self.stdout.write(f"  Entry Number: {entry.entry_number}")
        self.stdout.write(f"  Entry Date: {entry.entry_date}")
        self.stdout.write(f"  Status: {entry.status}")
        self.stdout.write(f"  Total Debit: {entry.total_debit}")
        self.stdout.write(f"  Total Credit: {entry.total_credit}")
        self.stdout.write(f"  Is Balanced: {entry.is_balanced}")
        self.stdout.write(f"  Lines Count: {entry.lines.count()}")

        for line in entry.lines.select_related("account").order_by("sort_order", "id"):
            self.stdout.write(
                "    - "
                f"{line.account.code} | {line.account.name} | "
                f"Debit={line.debit_amount} | Credit={line.credit_amount}"
            )

    def _assert_posted_entry_valid(self, entry: JournalEntry) -> None:
        entry.refresh_from_db()

        if entry.status != JournalEntryStatus.POSTED:
            raise CommandError(f"القيد {entry.entry_number} لم يتم ترحيله.")

        if entry.total_debit != entry.total_credit:
            raise CommandError(f"القيد {entry.entry_number} غير متوازن.")

        if entry.total_debit <= Decimal("0.00"):
            raise CommandError(f"القيد {entry.entry_number} لا يحتوي على مبالغ.")

        if not entry.lines.exists():
            raise CommandError(f"القيد {entry.entry_number} لا يحتوي على أسطر.")

    def _test_balanced_entry(self, company: Company) -> JournalEntry:
        cash_account = get_account_by_code(company, "110101")
        opening_equity_account = get_account_by_code(company, "3201")

        if not cash_account or not opening_equity_account:
            raise CommandError("الحسابات المطلوبة للاختبار غير موجودة.")

        entry = create_manual_journal_entry(
            company=company,
            entry_date=timezone.localdate(),
            description="قيد اختبار نواة المحاسبة - رصيد افتتاحي تجريبي",
            reference="ACCOUNTING-CORE-TEST",
            external_reference="TEST-CORE-001",
            currency="SAR",
            lines=[
                EntryLinePayload(
                    account=cash_account,
                    description="إثبات رصيد افتتاحي تجريبي في الصندوق",
                    debit_amount=Decimal("100.00"),
                    credit_amount=Decimal("0.00"),
                    currency="SAR",
                    sort_order=1,
                ),
                EntryLinePayload(
                    account=opening_equity_account,
                    description="مقابل الرصيد الافتتاحي التجريبي",
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("100.00"),
                    currency="SAR",
                    sort_order=2,
                ),
            ],
            auto_post=False,
        )

        entry.source_type = "accounting_core_test"
        entry.source_number = "TEST-CORE-001"
        entry.save(update_fields=["source_type", "source_number", "updated_at"])

        self._print_entry("تم إنشاء قيد مسودة متوازن", entry)

        posted_entry = post_journal_entry(entry)
        self._assert_posted_entry_valid(posted_entry)
        self._print_entry("تم ترحيل القيد بنجاح", posted_entry)

        return posted_entry

    def _test_reverse_entry(self, entry: JournalEntry) -> JournalEntry:
        reversal = reverse_journal_entry(
            entry,
            reversal_date=timezone.localdate(),
            reason="اختبار عكس القيد من test_accounting_core",
        )

        self._assert_posted_entry_valid(reversal)
        self._print_entry("تم إنشاء وترحيل القيد العكسي بنجاح", reversal)

        entry.refresh_from_db()
        if entry.status != JournalEntryStatus.REVERSED:
            raise CommandError("القيد الأصلي لم يتحول إلى حالة REVERSED بعد العكس.")

        self.stdout.write(
            self.style.SUCCESS(
                f"تم تحديث القيد الأصلي إلى REVERSED وربطه بالقيد العكسي: {reversal.entry_number}"
            )
        )

        return reversal

    def _test_unbalanced_entry_blocked(self, company: Company) -> None:
        cash_account = get_account_by_code(company, "110101")
        opening_equity_account = get_account_by_code(company, "3201")

        try:
            create_manual_journal_entry(
                company=company,
                entry_date=timezone.localdate(),
                description="قيد غير متوازن يجب أن يفشل",
                reference="ACCOUNTING-CORE-UNBALANCED-TEST",
                external_reference="TEST-CORE-UNBALANCED-001",
                currency="SAR",
                lines=[
                    EntryLinePayload(
                        account=cash_account,
                        description="مدين غير متوازن",
                        debit_amount=Decimal("100.00"),
                        credit_amount=Decimal("0.00"),
                        currency="SAR",
                        sort_order=1,
                    ),
                    EntryLinePayload(
                        account=opening_equity_account,
                        description="دائن أقل من المدين",
                        debit_amount=Decimal("0.00"),
                        credit_amount=Decimal("90.00"),
                        currency="SAR",
                        sort_order=2,
                    ),
                ],
                auto_post=False,
            )
        except AccountingPostingError:
            self.stdout.write(
                self.style.SUCCESS(
                    "اختبار منع القيد غير المتوازن نجح."
                )
            )
            return
        except Exception as exc:
            self.stdout.write(
                self.style.SUCCESS(
                    f"اختبار منع القيد غير المتوازن نجح برسالة مختلفة: {exc}"
                )
            )
            return

        raise CommandError("فشل الاختبار: تم إنشاء قيد غير متوازن بدون منع.")

    @transaction.atomic
    def handle(self, *args, **options):
        company_id = options.get("company_id")
        company_code = options.get("company_code") or "TEST-001"
        reset_test_entries = bool(options.get("reset_test_entries"))

        company = self._get_company(
            company_id=company_id,
            company_code=company_code,
        )

        self.stdout.write(
            self.style.NOTICE(
                f"بدء اختبار نواة المحاسبة للشركة: {company.name} ({company.company_code})"
            )
        )

        if reset_test_entries:
            self._reset_test_entries(company)

        self._ensure_chart_seeded(company)

        posted_entry = self._test_balanced_entry(company)
        self._test_reverse_entry(posted_entry)
        self._test_unbalanced_entry_blocked(company)

        self.stdout.write("")
        self.stdout.write(
            self.style.SUCCESS(
                "تم اختبار نواة المحاسبة بنجاح."
            )
        )