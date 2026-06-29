# ============================================================
# 📂 accounting/management/commands/seed_company_chart_of_accounts.py
# 🧠 Mhamcloud | Seed Company Chart of Accounts
# ------------------------------------------------------------
# ✅ يزرع شجرة الحسابات الافتراضية لشركة محددة
# ✅ يستخدم نفس شجرة PrimeyCare المعتمدة
# ✅ يعمل لكل شركة بشكل مستقل
# ✅ آمن: لا يحذف حسابات عليها قيود إلا إذا لم توجد حركات
# ============================================================

from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounting.services import (
    AccountingConfigurationError,
    seed_company_chart_of_accounts,
)
from companies.models import Company


class Command(BaseCommand):
    help = "Seed the default Saudi chart of accounts for a single company."

    def add_arguments(self, parser):
        parser.add_argument(
            "--company-id",
            type=int,
            default=None,
            help="Company ID to seed chart of accounts for.",
        )
        parser.add_argument(
            "--company-code",
            type=str,
            default="",
            help="Company code to seed chart of accounts for.",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Reset the company chart of accounts before seeding. Fails if journal lines exist.",
        )

    def _get_company(self, *, company_id: int | None, company_code: str):
        company_code = str(company_code or "").strip()

        if not company_id and not company_code:
            raise CommandError(
                "حدد الشركة باستخدام واحد من الخيارين:\n"
                "python manage.py seed_company_chart_of_accounts --company-id 1\n"
                "أو:\n"
                "python manage.py seed_company_chart_of_accounts --company-code TEST-001"
            )

        qs = Company.objects.all()

        if company_id:
            company = qs.filter(pk=company_id).first()
            if not company:
                raise CommandError(f"لم يتم العثور على شركة بالمعرف: {company_id}")
            return company

        company = qs.filter(company_code=company_code).first()
        if not company:
            raise CommandError(f"لم يتم العثور على شركة بالكود: {company_code}")

        return company

    @transaction.atomic
    def handle(self, *args, **options):
        company_id = options.get("company_id")
        company_code = options.get("company_code") or ""
        reset = bool(options.get("reset"))

        company = self._get_company(
            company_id=company_id,
            company_code=company_code,
        )

        display_code = getattr(company, "company_code", "") or company.pk

        self.stdout.write(
            self.style.NOTICE(
                f"بدء زرع شجرة الحسابات للشركة: {company.name} ({display_code})"
            )
        )

        if reset:
            self.stdout.write(
                self.style.WARNING(
                    "تم تفعيل reset. سيتم حذف دليل حسابات هذه الشركة فقط إذا لم توجد قيود محاسبية مرتبطة."
                )
            )

        try:
            result = seed_company_chart_of_accounts(
                company,
                reset=reset,
            )
        except AccountingConfigurationError as exc:
            raise CommandError(str(exc)) from exc
        except Exception as exc:
            raise CommandError(f"فشل زرع شجرة الحسابات: {exc}") from exc

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("تم زرع/تحديث شجرة الحسابات بنجاح."))
        self.stdout.write(f"Company ID: {result.get('company_id')}")
        self.stdout.write(f"Company Name: {result.get('company_name')}")
        self.stdout.write(f"Accounts Created: {result.get('accounts_created')}")
        self.stdout.write(f"Accounts Updated: {result.get('accounts_updated')}")
        self.stdout.write(f"Parents Updated: {result.get('parents_updated')}")
        self.stdout.write(f"Tax Rate ID: {result.get('tax_rate_id')}")
        self.stdout.write(f"Settings ID: {result.get('settings_id')}")
        self.stdout.write(f"Routing Rules Created: {result.get('routing_rules_created')}")
        self.stdout.write(f"Routing Rules Updated: {result.get('routing_rules_updated')}")
        self.stdout.write(f"Total Accounts: {result.get('total_accounts')}")