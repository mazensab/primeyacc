# ============================================================
# 📂 accounting/tests.py
# 🧠 Mhamcloud | Accounting Tests
# ------------------------------------------------------------
# ✅ اختبارات شجرة الحسابات لكل شركة
# ✅ اختبارات عزل الشركات
# ✅ اختبارات القيود اليدوية
# ✅ اختبارات الترحيل والعكس
# ✅ اختبارات منع القيود غير المتوازنة
# ✅ اختبارات منع الترحيل على حساب تجميعي أو غير نشط
# ✅ اختبارات Accounting Company APIs
# ============================================================

from __future__ import annotations

from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import NOT_PROVIDED
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import (
    CompanyMembership,
    CompanyRole,
    MembershipStatus,
)
from accounting.models import (
    Account,
    AccountingSettings,
    JournalEntry,
    JournalEntryStatus,
    TaxRate,
)
from accounting.services import (
    AccountingConfigurationError,
    AccountingPostingError,
    EntryLinePayload,
    create_manual_journal_entry,
    get_account_by_code,
    post_journal_entry,
    reverse_journal_entry,
    seed_company_chart_of_accounts,
)
from companies.models import Company


# ============================================================
# 🛠️ Test Helpers
# ============================================================

def _choice_value(model, field_name: str, preferred: str, fallback: str = "") -> str:
    try:
        field = model._meta.get_field(field_name)
    except Exception:
        return fallback

    choices = list(getattr(field, "choices", None) or [])
    values = {str(value) for value, _label in choices}

    if preferred in values:
        return preferred

    if fallback and fallback in values:
        return fallback

    if choices:
        return str(choices[0][0])

    return preferred or fallback


def _required_model_defaults(model, *, suffix: str, user=None) -> dict[str, Any]:
    """
    يجهز قيم افتراضية مرنة للحقول المطلوبة في Company
    حتى لا يتأثر الاختبار بتغيرات بسيطة في الموديل.
    """
    data: dict[str, Any] = {}

    for field in model._meta.fields:
        if field.primary_key:
            continue

        if field.auto_created:
            continue

        if getattr(field, "auto_now", False) or getattr(field, "auto_now_add", False):
            continue

        field_name = field.name

        if field_name in {
            "id",
            "created_at",
            "updated_at",
            "suspended_at",
            "trial_ends_at",
        }:
            continue

        has_default = field.default is not NOT_PROVIDED
        is_required = not field.null and not field.blank and not has_default

        # قيم معروفة حتى لو لم تكن مطلوبة لضمان بيانات واضحة.
        if field_name in {"name", "name_ar"}:
            data[field_name] = f"شركة محاسبة اختبار {suffix}"
            continue

        if field_name == "name_en":
            data[field_name] = f"Accounting Test Company {suffix}"
            continue

        if field_name == "company_code":
            data[field_name] = f"ACC-TST-{suffix}"
            continue

        if field_name == "email":
            data[field_name] = f"accounting-{suffix.lower()}@Mhamcloud.test"
            continue

        if field_name in {"phone", "mobile", "whatsapp_number"}:
            data[field_name] = "0500000000"
            continue

        if field_name == "country":
            data[field_name] = "Saudi Arabia"
            continue

        if field_name in {"city", "region"}:
            data[field_name] = "Madinah"
            continue

        if field_name == "district":
            data[field_name] = "Central"
            continue

        if field_name == "street_name":
            data[field_name] = "Test Street"
            continue

        if field_name == "building_number":
            data[field_name] = "1234"
            continue

        if field_name == "postal_code":
            data[field_name] = "42311"
            continue

        if field_name == "short_address":
            data[field_name] = f"TST{suffix}"
            continue

        if field_name == "commercial_registration":
            data[field_name] = f"CR-{suffix}"
            continue

        if field_name == "tax_number":
            data[field_name] = f"3000000000{suffix}"
            continue

        if field_name == "currency_code":
            data[field_name] = "SAR"
            continue

        if field_name == "vat_percentage":
            data[field_name] = Decimal("15.00")
            continue

        if field_name == "status":
            data[field_name] = _choice_value(model, "status", "ACTIVE", "TRIAL")
            continue

        if field_name == "is_active":
            data[field_name] = True
            continue

        if field_name in {"extra_data", "notes", "address"}:
            if field.get_internal_type() == "JSONField":
                data[field_name] = {}
            else:
                data[field_name] = ""
            continue

        if field_name in {"owner", "created_by", "updated_by"} and user is not None:
            data[field_name] = user
            continue

        if is_required:
            internal_type = field.get_internal_type()

            if internal_type in {"CharField", "TextField", "SlugField"}:
                data[field_name] = f"test-{suffix}"
            elif internal_type == "EmailField":
                data[field_name] = f"fallback-{suffix.lower()}@Mhamcloud.test"
            elif internal_type == "BooleanField":
                data[field_name] = True
            elif internal_type in {
                "IntegerField",
                "PositiveIntegerField",
                "SmallIntegerField",
            }:
                data[field_name] = 1
            elif internal_type == "DecimalField":
                data[field_name] = Decimal("0.00")
            elif internal_type == "DateField":
                data[field_name] = timezone.localdate()
            elif internal_type == "DateTimeField":
                data[field_name] = timezone.now()
            elif internal_type == "JSONField":
                data[field_name] = {}
            elif (
                internal_type == "ForeignKey"
                and user is not None
                and field_name in {"owner", "created_by", "updated_by"}
            ):
                data[field_name] = user

    return data


def _create_test_company(*, suffix: str, user) -> Company:
    return Company.objects.create(
        **_required_model_defaults(
            Company,
            suffix=suffix,
            user=user,
        )
    )


def _create_active_membership(
    *,
    user,
    company: Company,
    role: str = CompanyRole.OWNER,
    is_primary: bool = True,
) -> CompanyMembership:
    return CompanyMembership.objects.create(
        user=user,
        company=company,
        role=role,
        status=MembershipStatus.ACTIVE,
        is_primary=is_primary,
        joined_at=timezone.now(),
    )


# ============================================================
# 🧪 Accounting Core Tests
# ============================================================

class AccountingCoreTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.owner_one = User.objects.create_user(
            username="accounting_owner_one",
            email="accounting-owner-one@Mhamcloud.test",
            password="test-pass-12345",
        )
        cls.owner_two = User.objects.create_user(
            username="accounting_owner_two",
            email="accounting-owner-two@Mhamcloud.test",
            password="test-pass-12345",
        )

        cls.company_one = _create_test_company(
            suffix="001",
            user=cls.owner_one,
        )
        cls.company_two = _create_test_company(
            suffix="002",
            user=cls.owner_two,
        )

    def setUp(self):
        seed_company_chart_of_accounts(self.company_one)
        seed_company_chart_of_accounts(self.company_two)

    # ========================================================
    # 🌳 Chart of Accounts
    # ========================================================

    def test_seed_company_chart_of_accounts_creates_expected_records(self):
        self.assertEqual(Account.objects.filter(company=self.company_one).count(), 112)

        self.assertTrue(
            Account.objects.filter(
                company=self.company_one,
                code="110101",
                name="النقدية في الخزينة",
                is_group=False,
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            Account.objects.filter(
                company=self.company_one,
                code="3201",
                name="أرصدة افتتاحية",
                is_group=False,
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            TaxRate.objects.filter(
                company=self.company_one,
                code="VAT15",
                is_default=True,
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            AccountingSettings.objects.filter(
                company=self.company_one,
                default_currency="SAR",
            ).exists()
        )

    def test_seed_company_chart_of_accounts_is_idempotent(self):
        first_result = seed_company_chart_of_accounts(self.company_one)
        second_result = seed_company_chart_of_accounts(self.company_one)

        self.assertEqual(first_result["total_accounts"], 112)
        self.assertEqual(second_result["total_accounts"], 112)
        self.assertEqual(Account.objects.filter(company=self.company_one).count(), 112)

    def test_same_account_code_allowed_between_different_companies(self):
        account_one = get_account_by_code(self.company_one, "110101")
        account_two = get_account_by_code(self.company_two, "110101")

        self.assertNotEqual(account_one.pk, account_two.pk)
        self.assertEqual(account_one.code, account_two.code)
        self.assertEqual(account_one.company_id, self.company_one.pk)
        self.assertEqual(account_two.company_id, self.company_two.pk)

    def test_duplicate_account_code_blocked_inside_same_company(self):
        existing_account = get_account_by_code(self.company_one, "110101")

        with self.assertRaises((IntegrityError, ValidationError)):
            Account.objects.create(
                company=self.company_one,
                code="110101",
                name="حساب مكرر",
                name_en="Duplicate Account",
                account_type=existing_account.account_type,
                nature=existing_account.nature,
                is_group=False,
                is_active=True,
                allow_manual_posting=True,
            )

    def test_company_chart_isolation(self):
        self.assertEqual(Account.objects.filter(company=self.company_one).count(), 112)
        self.assertEqual(Account.objects.filter(company=self.company_two).count(), 112)

        company_one_codes = set(
            Account.objects.filter(company=self.company_one).values_list("code", flat=True)
        )
        company_two_codes = set(
            Account.objects.filter(company=self.company_two).values_list("code", flat=True)
        )

        self.assertIn("110101", company_one_codes)
        self.assertIn("110101", company_two_codes)

    # ========================================================
    # 🧾 Journal Entries
    # ========================================================

    def _build_balanced_lines(self, company):
        cash_account = get_account_by_code(company, "110101")
        opening_equity_account = get_account_by_code(company, "3201")

        return [
            EntryLinePayload(
                account=cash_account,
                description="إثبات رصيد افتتاحي تجريبي",
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
        ]

    def test_create_balanced_manual_journal_entry(self):
        entry = create_manual_journal_entry(
            company=self.company_one,
            entry_date=timezone.localdate(),
            description="قيد اختبار متوازن",
            reference="TEST-BALANCED",
            lines=self._build_balanced_lines(self.company_one),
        )

        self.assertEqual(entry.company_id, self.company_one.pk)
        self.assertEqual(entry.status, JournalEntryStatus.DRAFT)
        self.assertEqual(entry.total_debit, Decimal("100.00"))
        self.assertEqual(entry.total_credit, Decimal("100.00"))
        self.assertTrue(entry.is_balanced)
        self.assertEqual(entry.lines.count(), 2)

    def test_unbalanced_manual_journal_entry_is_blocked(self):
        cash_account = get_account_by_code(self.company_one, "110101")
        opening_equity_account = get_account_by_code(self.company_one, "3201")

        with self.assertRaises(AccountingPostingError):
            create_manual_journal_entry(
                company=self.company_one,
                entry_date=timezone.localdate(),
                description="قيد غير متوازن",
                reference="TEST-UNBALANCED",
                lines=[
                    EntryLinePayload(
                        account=cash_account,
                        debit_amount=Decimal("100.00"),
                        credit_amount=Decimal("0.00"),
                    ),
                    EntryLinePayload(
                        account=opening_equity_account,
                        debit_amount=Decimal("0.00"),
                        credit_amount=Decimal("90.00"),
                    ),
                ],
            )

    def test_post_manual_journal_entry(self):
        entry = create_manual_journal_entry(
            company=self.company_one,
            entry_date=timezone.localdate(),
            description="قيد للترحيل",
            reference="TEST-POST",
            lines=self._build_balanced_lines(self.company_one),
        )

        posted_entry = post_journal_entry(entry)

        self.assertEqual(posted_entry.status, JournalEntryStatus.POSTED)
        self.assertIsNotNone(posted_entry.posted_at)
        self.assertEqual(posted_entry.total_debit, Decimal("100.00"))
        self.assertEqual(posted_entry.total_credit, Decimal("100.00"))

    def test_reverse_posted_journal_entry(self):
        entry = create_manual_journal_entry(
            company=self.company_one,
            entry_date=timezone.localdate(),
            description="قيد للعكس",
            reference="TEST-REVERSE",
            lines=self._build_balanced_lines(self.company_one),
            auto_post=True,
        )

        reversal = reverse_journal_entry(
            entry,
            reversal_date=timezone.localdate(),
            reason="اختبار عكس القيد",
        )

        entry.refresh_from_db()
        reversal.refresh_from_db()

        self.assertEqual(entry.status, JournalEntryStatus.REVERSED)
        self.assertEqual(entry.reversed_entry_id, reversal.pk)

        self.assertEqual(reversal.status, JournalEntryStatus.POSTED)
        self.assertEqual(reversal.reversal_of_id, entry.pk)
        self.assertEqual(reversal.total_debit, Decimal("100.00"))
        self.assertEqual(reversal.total_credit, Decimal("100.00"))

        reversal_lines = list(
            reversal.lines.select_related("account").order_by("sort_order", "id")
        )
        self.assertEqual(len(reversal_lines), 2)

        self.assertEqual(reversal_lines[0].account.code, "110101")
        self.assertEqual(reversal_lines[0].debit_amount, Decimal("0.00"))
        self.assertEqual(reversal_lines[0].credit_amount, Decimal("100.00"))

        self.assertEqual(reversal_lines[1].account.code, "3201")
        self.assertEqual(reversal_lines[1].debit_amount, Decimal("100.00"))
        self.assertEqual(reversal_lines[1].credit_amount, Decimal("0.00"))

    def test_posting_on_group_account_is_blocked(self):
        group_account = Account.objects.get(company=self.company_one, code="1")
        opening_equity_account = get_account_by_code(self.company_one, "3201")

        with self.assertRaises(AccountingConfigurationError):
            create_manual_journal_entry(
                company=self.company_one,
                entry_date=timezone.localdate(),
                description="قيد على حساب تجميعي يجب أن يفشل",
                reference="TEST-GROUP-ACCOUNT",
                lines=[
                    EntryLinePayload(
                        account=group_account,
                        debit_amount=Decimal("100.00"),
                        credit_amount=Decimal("0.00"),
                    ),
                    EntryLinePayload(
                        account=opening_equity_account,
                        debit_amount=Decimal("0.00"),
                        credit_amount=Decimal("100.00"),
                    ),
                ],
            )

    def test_posting_on_inactive_account_is_blocked(self):
        inactive_account = get_account_by_code(self.company_one, "110102")
        inactive_account.is_active = False
        inactive_account.save(
            update_fields=[
                "is_active",
                "allow_manual_posting",
                "updated_at",
            ]
        )

        opening_equity_account = get_account_by_code(self.company_one, "3201")

        with self.assertRaises(AccountingConfigurationError):
            create_manual_journal_entry(
                company=self.company_one,
                entry_date=timezone.localdate(),
                description="قيد على حساب غير نشط يجب أن يفشل",
                reference="TEST-INACTIVE-ACCOUNT",
                lines=[
                    EntryLinePayload(
                        account=inactive_account,
                        debit_amount=Decimal("100.00"),
                        credit_amount=Decimal("0.00"),
                    ),
                    EntryLinePayload(
                        account=opening_equity_account,
                        debit_amount=Decimal("0.00"),
                        credit_amount=Decimal("100.00"),
                    ),
                ],
            )

    def test_cross_company_account_is_blocked_in_journal_entry(self):
        company_one_cash = get_account_by_code(self.company_one, "110101")
        company_two_opening_equity = get_account_by_code(self.company_two, "3201")

        with self.assertRaises(AccountingConfigurationError):
            create_manual_journal_entry(
                company=self.company_one,
                entry_date=timezone.localdate(),
                description="قيد يحتوي حساب من شركة أخرى يجب أن يفشل",
                reference="TEST-CROSS-COMPANY",
                lines=[
                    EntryLinePayload(
                        account=company_one_cash,
                        debit_amount=Decimal("100.00"),
                        credit_amount=Decimal("0.00"),
                    ),
                    EntryLinePayload(
                        account=company_two_opening_equity,
                        debit_amount=Decimal("0.00"),
                        credit_amount=Decimal("100.00"),
                    ),
                ],
            )

    def test_journal_entry_numbers_are_isolated_per_company(self):
        entry_one = create_manual_journal_entry(
            company=self.company_one,
            entry_date=timezone.localdate(),
            description="قيد شركة أولى",
            reference="TEST-NUMBER-COMPANY-ONE",
            lines=self._build_balanced_lines(self.company_one),
        )
        entry_two = create_manual_journal_entry(
            company=self.company_two,
            entry_date=timezone.localdate(),
            description="قيد شركة ثانية",
            reference="TEST-NUMBER-COMPANY-TWO",
            lines=self._build_balanced_lines(self.company_two),
        )

        current_year = timezone.localdate().year

        self.assertEqual(entry_one.entry_number, f"JE-{current_year}-000001")
        self.assertEqual(entry_two.entry_number, f"JE-{current_year}-000001")
        self.assertNotEqual(entry_one.company_id, entry_two.company_id)


# ============================================================
# 🌐 Accounting Company API Tests
# ============================================================

class AccountingCompanyApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()

        cls.user_one = User.objects.create_user(
            username="accounting_api_owner_one",
            email="accounting-api-owner-one@Mhamcloud.test",
            password="test-pass-12345",
        )
        cls.user_two = User.objects.create_user(
            username="accounting_api_owner_two",
            email="accounting-api-owner-two@Mhamcloud.test",
            password="test-pass-12345",
        )

        cls.company_one = _create_test_company(
            suffix="101",
            user=cls.user_one,
        )
        cls.company_two = _create_test_company(
            suffix="102",
            user=cls.user_two,
        )

        _create_active_membership(
            user=cls.user_one,
            company=cls.company_one,
            role=CompanyRole.OWNER,
            is_primary=True,
        )
        _create_active_membership(
            user=cls.user_two,
            company=cls.company_two,
            role=CompanyRole.OWNER,
            is_primary=True,
        )

        seed_company_chart_of_accounts(cls.company_one)
        seed_company_chart_of_accounts(cls.company_two)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user_one)

    def _balanced_api_payload(self) -> dict[str, Any]:
        return {
            "entry_date": timezone.localdate().isoformat(),
            "description": "قيد API تجريبي متوازن",
            "reference": "API-BALANCED",
            "currency": "SAR",
            "auto_post": False,
            "lines": [
                {
                    "account_code": "110101",
                    "description": "مدين API",
                    "debit_amount": "100.00",
                    "credit_amount": "0.00",
                    "currency": "SAR",
                    "sort_order": 1,
                },
                {
                    "account_code": "3201",
                    "description": "دائن API",
                    "debit_amount": "0.00",
                    "credit_amount": "100.00",
                    "currency": "SAR",
                    "sort_order": 2,
                },
            ],
        }

    def _create_entry_via_api(self) -> int:
        response = self.client.post(
            "/api/company/accounting/journal-entries/create/",
            self._balanced_api_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        self.assertTrue(body["success"])

        entry_id = body["entry"]["id"]
        self.assertTrue(entry_id)

        return entry_id

    def test_accounts_list_api_returns_current_company_accounts_only(self):
        response = self.client.get("/api/company/accounting/accounts/")

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company_one.pk)
        self.assertEqual(body["count"], 112)
        self.assertEqual(body["summary"]["total_accounts"], 112)
        self.assertEqual(len(body["results"]), 112)

        for row in body["results"]:
            self.assertEqual(row["company_id"], self.company_one.pk)

    def test_accounts_detail_api_returns_current_company_account(self):
        account = get_account_by_code(self.company_one, "110101")

        response = self.client.get(
            f"/api/company/accounting/accounts/{account.pk}/"
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company_one.pk)
        self.assertEqual(body["account"]["id"], account.pk)
        self.assertEqual(body["account"]["code"], "110101")
        self.assertIn("summary", body["account"])
        self.assertIn("recent_lines", body)

    def test_accounts_detail_api_blocks_other_company_account(self):
        other_account = get_account_by_code(self.company_two, "110101")

        response = self.client.get(
            f"/api/company/accounting/accounts/{other_account.pk}/"
        )

        self.assertEqual(response.status_code, 404, response.content)

        body = response.json()
        self.assertFalse(body["success"])

    def test_journal_entries_list_api_returns_current_company_entries(self):
        create_manual_journal_entry(
            company=self.company_one,
            entry_date=timezone.localdate(),
            description="قيد شركة أولى",
            reference="API-LIST-ONE",
            lines=[
                EntryLinePayload(
                    account=get_account_by_code(self.company_one, "110101"),
                    debit_amount=Decimal("100.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=get_account_by_code(self.company_one, "3201"),
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("100.00"),
                ),
            ],
        )
        create_manual_journal_entry(
            company=self.company_two,
            entry_date=timezone.localdate(),
            description="قيد شركة ثانية",
            reference="API-LIST-TWO",
            lines=[
                EntryLinePayload(
                    account=get_account_by_code(self.company_two, "110101"),
                    debit_amount=Decimal("200.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=get_account_by_code(self.company_two, "3201"),
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("200.00"),
                ),
            ],
        )

        response = self.client.get(
            "/api/company/accounting/journal-entries/"
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company_one.pk)
        self.assertEqual(body["count"], 1)
        self.assertEqual(len(body["results"]), 1)
        self.assertEqual(body["results"][0]["company_id"], self.company_one.pk)
        self.assertEqual(body["results"][0]["reference"], "API-LIST-ONE")

    def test_journal_entry_create_api_creates_draft_entry(self):
        response = self.client.post(
            "/api/company/accounting/journal-entries/create/",
            self._balanced_api_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company_one.pk)
        self.assertEqual(body["entry"]["status"], JournalEntryStatus.DRAFT)
        self.assertEqual(body["entry"]["total_debit"], "100.00")
        self.assertEqual(body["entry"]["total_credit"], "100.00")
        self.assertEqual(len(body["entry"]["lines"]), 2)

        entry_id = body["entry"]["id"]
        self.assertTrue(
            JournalEntry.objects.filter(
                company=self.company_one,
                pk=entry_id,
                status=JournalEntryStatus.DRAFT,
            ).exists()
        )

    def test_journal_entry_create_api_blocks_unbalanced_entry(self):
        payload = self._balanced_api_payload()
        payload["lines"][1]["credit_amount"] = "90.00"

        response = self.client.post(
            "/api/company/accounting/journal-entries/create/",
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400, response.content)

        body = response.json()
        self.assertFalse(body["success"])

    def test_journal_entry_detail_api_returns_entry_lines(self):
        entry_id = self._create_entry_via_api()

        response = self.client.get(
            f"/api/company/accounting/journal-entries/{entry_id}/"
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company_one.pk)
        self.assertEqual(body["entry"]["id"], entry_id)
        self.assertEqual(body["entry"]["status"], JournalEntryStatus.DRAFT)
        self.assertEqual(len(body["entry"]["lines"]), 2)

    def test_journal_entry_detail_api_blocks_other_company_entry(self):
        other_entry = create_manual_journal_entry(
            company=self.company_two,
            entry_date=timezone.localdate(),
            description="قيد شركة ثانية",
            reference="API-OTHER-DETAIL",
            lines=[
                EntryLinePayload(
                    account=get_account_by_code(self.company_two, "110101"),
                    debit_amount=Decimal("100.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=get_account_by_code(self.company_two, "3201"),
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("100.00"),
                ),
            ],
        )

        response = self.client.get(
            f"/api/company/accounting/journal-entries/{other_entry.pk}/"
        )

        self.assertEqual(response.status_code, 404, response.content)

        body = response.json()
        self.assertFalse(body["success"])

    def test_journal_entry_post_api_posts_entry(self):
        entry_id = self._create_entry_via_api()

        response = self.client.post(
            f"/api/company/accounting/journal-entries/{entry_id}/post/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["entry"]["status"], JournalEntryStatus.POSTED)
        self.assertEqual(body["entry"]["total_debit"], "100.00")
        self.assertEqual(body["entry"]["total_credit"], "100.00")
        self.assertIsNotNone(body["entry"]["posted_at"])

        entry = JournalEntry.objects.get(company=self.company_one, pk=entry_id)
        self.assertEqual(entry.status, JournalEntryStatus.POSTED)

    def test_journal_entry_reverse_api_reverses_posted_entry(self):
        entry_id = self._create_entry_via_api()

        post_response = self.client.post(
            f"/api/company/accounting/journal-entries/{entry_id}/post/",
            {},
            format="json",
        )
        self.assertEqual(post_response.status_code, 200, post_response.content)

        reverse_response = self.client.post(
            f"/api/company/accounting/journal-entries/{entry_id}/reverse/",
            {
                "reversal_date": timezone.localdate().isoformat(),
                "reason": "اختبار عكس من API",
            },
            format="json",
        )

        self.assertEqual(reverse_response.status_code, 200, reverse_response.content)

        body = reverse_response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["original_entry"]["status"], JournalEntryStatus.REVERSED)
        self.assertEqual(body["reversal_entry"]["status"], JournalEntryStatus.POSTED)
        self.assertEqual(body["reversal_entry"]["total_debit"], "100.00")
        self.assertEqual(body["reversal_entry"]["total_credit"], "100.00")

        original = JournalEntry.objects.get(company=self.company_one, pk=entry_id)
        self.assertEqual(original.status, JournalEntryStatus.REVERSED)
        self.assertIsNotNone(original.reversed_entry_id)

    def test_journal_entry_post_api_blocks_other_company_entry(self):
        other_entry = create_manual_journal_entry(
            company=self.company_two,
            entry_date=timezone.localdate(),
            description="قيد شركة ثانية للترحيل",
            reference="API-OTHER-POST",
            lines=[
                EntryLinePayload(
                    account=get_account_by_code(self.company_two, "110101"),
                    debit_amount=Decimal("100.00"),
                    credit_amount=Decimal("0.00"),
                ),
                EntryLinePayload(
                    account=get_account_by_code(self.company_two, "3201"),
                    debit_amount=Decimal("0.00"),
                    credit_amount=Decimal("100.00"),
                ),
            ],
        )

        response = self.client.post(
            f"/api/company/accounting/journal-entries/{other_entry.pk}/post/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, 404, response.content)

        body = response.json()
        self.assertFalse(body["success"])

    def test_trial_balance_api_returns_posted_balances_only(self):
        entry_id = self._create_entry_via_api()

        post_response = self.client.post(
            f"/api/company/accounting/journal-entries/{entry_id}/post/",
            {},
            format="json",
        )
        self.assertEqual(post_response.status_code, 200, post_response.content)

        # Create another draft entry that must not affect trial balance.
        draft_response = self.client.post(
            "/api/company/accounting/journal-entries/create/",
            {
                "entry_date": timezone.localdate().isoformat(),
                "description": "قيد مسودة لا يظهر في ميزان المراجعة",
                "reference": "API-TRIAL-BALANCE-DRAFT",
                "currency": "SAR",
                "auto_post": False,
                "lines": [
                    {
                        "account_code": "110101",
                        "description": "مدين مسودة",
                        "debit_amount": "250.00",
                        "credit_amount": "0.00",
                        "currency": "SAR",
                        "sort_order": 1,
                    },
                    {
                        "account_code": "3201",
                        "description": "دائن مسودة",
                        "debit_amount": "0.00",
                        "credit_amount": "250.00",
                        "currency": "SAR",
                        "sort_order": 2,
                    },
                ],
            },
            format="json",
        )
        self.assertEqual(draft_response.status_code, 201, draft_response.content)

        response = self.client.get(
            "/api/company/accounting/reports/trial-balance/",
            {
                "include_zero": "false",
            },
        )

        self.assertEqual(response.status_code, 200, response.content)

        body = response.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["company"]["id"], self.company_one.pk)
        self.assertEqual(body["summary"]["total_debit"], "100.00")
        self.assertEqual(body["summary"]["total_credit"], "100.00")
        self.assertEqual(body["summary"]["difference"], "0.00")
        self.assertTrue(body["summary"]["is_balanced"])

        rows_by_code = {
            row["account"]["code"]: row
            for row in body["results"]
        }

        self.assertIn("110101", rows_by_code)
        self.assertIn("3201", rows_by_code)

        self.assertEqual(rows_by_code["110101"]["total_debit"], "100.00")
        self.assertEqual(rows_by_code["110101"]["total_credit"], "0.00")

        self.assertEqual(rows_by_code["3201"]["total_debit"], "0.00")
        self.assertEqual(rows_by_code["3201"]["total_credit"], "100.00")

    def test_trial_balance_api_validates_date_range(self):
        response = self.client.get(
            "/api/company/accounting/reports/trial-balance/",
            {
                "date_from": "2026-12-31",
                "date_to": "2026-01-01",
            },
        )

        self.assertEqual(response.status_code, 400, response.content)

        body = response.json()
        self.assertFalse(body["success"])