# ============================================================
# 📂 billing/tests.py
# 🧠 Mhamcloud | Platform Billing Documents Tests V1.2
# ------------------------------------------------------------
# ✅ Tests platform invoice and receipt numbering
# ✅ Tests separate yearly document sequences
# ✅ Tests seller / buyer / plan / subscription snapshots
# ✅ Tests stable invoice and receipt printable payloads
# ✅ Tests subscription invoice creation
# ✅ Tests subscription payment receipt creation
# ✅ Tests invoice paid lifecycle after receipt creation
# ✅ Tests duplicate invoice and receipt protection
# ✅ Tests immutable billing and payment snapshots
# ✅ Tests invalid subscription pricing and payment protection
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - هذه الاختبارات تخص فوترة مالك منصة Mhamcloud فقط
# - لا تستخدم مستندات أو طرق دفع الشركات
# - لكل نوع مستند تسلسل سنوي مستقل
# - كل اشتراك يملك فاتورة منصة واحدة فقط
# - كل اشتراك يملك إيصال دفع منصة واحدًا فقط
# - إيصال الدفع يجب أن يرتبط بفاتورة الاشتراك
# - إنشاء الإيصال يحول الفاتورة إلى PAID
# - الطباعة تعتمد على Snapshot محفوظ وليس البيانات الحية
# ============================================================

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import models
from django.test import TestCase, override_settings
from django.utils import timezone

from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
    PlatformDocumentSequence,
)
from billing.services import (
    PlatformDocumentNumber,
    build_company_buyer_snapshot,
    build_platform_seller_snapshot,
    build_subscription_invoice_printable_payload,
    build_subscription_payment_snapshot,
    build_subscription_plan_snapshot,
    build_subscription_receipt_printable_payload,
    build_subscription_snapshot,
    create_or_get_subscription_invoice,
    create_or_get_subscription_payment_receipt,
    format_platform_document_number,
    generate_platform_document_number,
    get_platform_document_prefix,
    get_subscription_invoice,
    get_subscription_payment_receipt,
)
from companies.models import Company
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.services import create_pending_subscription


User = get_user_model()


class PlatformDocumentNumberingTests(TestCase):
    """
    Tests for platform billing document numbering.

    The test database starts empty, so every sequence must begin at 1.
    """

    def test_subscription_invoice_prefix_is_pinv(self) -> None:
        prefix = get_platform_document_prefix(
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
        )

        self.assertEqual(prefix, "PINV")

    def test_payment_receipt_prefix_is_prec(self) -> None:
        prefix = get_platform_document_prefix(
            PlatformBillingDocumentType.PAYMENT_RECEIPT
        )

        self.assertEqual(prefix, "PREC")

    def test_format_platform_document_number(self) -> None:
        document_number = format_platform_document_number(
            prefix="PINV",
            year=2026,
            sequence_number=1,
        )

        self.assertEqual(document_number, "PINV-2026-000001")

    def test_format_platform_document_number_normalizes_prefix(
        self,
    ) -> None:
        document_number = format_platform_document_number(
            prefix="  pinv  ",
            year=2026,
            sequence_number=25,
        )

        self.assertEqual(document_number, "PINV-2026-000025")

    def test_format_platform_document_number_supports_custom_padding(
        self,
    ) -> None:
        document_number = format_platform_document_number(
            prefix="PINV",
            year=2026,
            sequence_number=25,
            padding=8,
        )

        self.assertEqual(document_number, "PINV-2026-00000025")

    def test_generate_first_subscription_invoice_number(self) -> None:
        generated = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )

        self.assertIsInstance(generated, PlatformDocumentNumber)
        self.assertEqual(
            generated.document_type,
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        )
        self.assertEqual(generated.prefix, "PINV")
        self.assertEqual(generated.year, 2026)
        self.assertEqual(generated.sequence_number, 1)
        self.assertEqual(
            generated.document_number,
            "PINV-2026-000001",
        )

    def test_generate_invoice_numbers_increment_sequentially(
        self,
    ) -> None:
        first = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )
        second = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )
        third = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )

        self.assertEqual(first.sequence_number, 1)
        self.assertEqual(second.sequence_number, 2)
        self.assertEqual(third.sequence_number, 3)

        self.assertEqual(
            first.document_number,
            "PINV-2026-000001",
        )
        self.assertEqual(
            second.document_number,
            "PINV-2026-000002",
        )
        self.assertEqual(
            third.document_number,
            "PINV-2026-000003",
        )

    def test_invoice_and_receipt_have_separate_sequences(
        self,
    ) -> None:
        first_invoice = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )
        second_invoice = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )
        first_receipt = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.PAYMENT_RECEIPT
            ),
            issue_date=date(2026, 6, 12),
        )

        self.assertEqual(first_invoice.sequence_number, 1)
        self.assertEqual(second_invoice.sequence_number, 2)
        self.assertEqual(first_receipt.sequence_number, 1)

        self.assertEqual(
            second_invoice.document_number,
            "PINV-2026-000002",
        )
        self.assertEqual(
            first_receipt.document_number,
            "PREC-2026-000001",
        )

        self.assertEqual(
            PlatformDocumentSequence.objects.count(),
            2,
        )

    def test_sequences_are_isolated_by_year(self) -> None:
        invoice_2026 = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 12, 31),
        )
        invoice_2027 = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2027, 1, 1),
        )

        self.assertEqual(invoice_2026.sequence_number, 1)
        self.assertEqual(invoice_2027.sequence_number, 1)

        self.assertEqual(
            invoice_2026.document_number,
            "PINV-2026-000001",
        )
        self.assertEqual(
            invoice_2027.document_number,
            "PINV-2027-000001",
        )

        self.assertEqual(
            PlatformDocumentSequence.objects.filter(
                document_type=(
                    PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
                )
            ).count(),
            2,
        )

    def test_sequence_last_number_is_persisted(self) -> None:
        generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )
        generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )

        sequence = PlatformDocumentSequence.objects.get(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            year=2026,
        )

        self.assertEqual(sequence.prefix, "PINV")
        self.assertEqual(sequence.last_number, 2)

    def test_existing_wrong_prefix_is_corrected(self) -> None:
        PlatformDocumentSequence.objects.create(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            year=2026,
            prefix="OLD",
            last_number=5,
        )

        generated = generate_platform_document_number(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            issue_date=date(2026, 6, 12),
        )

        sequence = PlatformDocumentSequence.objects.get(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            year=2026,
        )

        self.assertEqual(sequence.prefix, "PINV")
        self.assertEqual(sequence.last_number, 6)
        self.assertEqual(
            generated.document_number,
            "PINV-2026-000006",
        )

    def test_invalid_document_type_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            generate_platform_document_number(
                document_type="COMPANY_INVOICE",
                issue_date=date(2026, 6, 12),
            )

        self.assertEqual(
            PlatformDocumentSequence.objects.count(),
            0,
        )

    def test_invalid_issue_date_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            generate_platform_document_number(
                document_type=(
                    PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
                ),
                issue_date="2026-06-12",  # type: ignore[arg-type]
            )

        self.assertEqual(
            PlatformDocumentSequence.objects.count(),
            0,
        )

    def test_invalid_sequence_number_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="PINV",
                year=2026,
                sequence_number=0,
            )

    def test_negative_sequence_number_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="PINV",
                year=2026,
                sequence_number=-1,
            )

    def test_invalid_year_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="PINV",
                year=1999,
                sequence_number=1,
            )

    def test_invalid_prefix_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="PINV@",
                year=2026,
                sequence_number=1,
            )

    def test_empty_prefix_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="",
                year=2026,
                sequence_number=1,
            )

    def test_invalid_padding_is_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="PINV",
                year=2026,
                sequence_number=1,
                padding=0,
            )

        with self.assertRaises(ValidationError):
            format_platform_document_number(
                prefix="PINV",
                year=2026,
                sequence_number=1,
                padding=13,
            )


@override_settings(
    Mhamcloud_PLATFORM_BILLING_SELLER={
        "name": "Mhamcloud Platform Company",
        "name_ar": "شركة برايمي أك",
        "name_en": "Mhamcloud Platform Company",
        "commercial_registration": "1010101010",
        "tax_number": "310000000000003",
        "email": "billing@Mhamcloud.test",
        "phone": "0110000000",
        "country": "Saudi Arabia",
        "city": "Riyadh",
        "address": "Riyadh, Saudi Arabia",
        "logo_url": "https://example.test/logo.png",
    }
)
class PlatformSubscriptionInvoiceTests(TestCase):
    """
    Tests snapshots, subscription invoices, and payment receipts.
    """

    def setUp(self) -> None:
        self.user = User.objects.create_user(
            username="billing-admin",
            email="billing-admin@Mhamcloud.test",
            password="StrongPass123!",
        )

        self.company = self.create_company(
            name="Billing Test Company",
            name_ar="شركة اختبار الفوترة",
            name_en="Billing Test Company",
            company_code="BILLING-TEST",
            commercial_registration="4030000001",
            tax_number="310000000000111",
            email="company@Mhamcloud.test",
            phone="0120000000",
            mobile="0500000000",
            country="Saudi Arabia",
            building_number="1234",
            street_name="Test Street",
            district="Test District",
            city="Jeddah",
            region="Makkah",
            postal_code="23456",
            short_address="ABCD1234",
            address="Additional test address",
            currency_code="SAR",
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Professional Plan",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="professional-billing-plan",
            description="Professional billing test plan.",
            monthly_price=Decimal("200.00"),
            yearly_price=Decimal("2000.00"),
            max_users=50,
            max_branches=5,
            max_warehouses=3,
            max_pos=3,
            features=[
                "accounting",
                "sales",
                "inventory",
            ],
            is_active=True,
            is_public=True,
            sort_order=1,
        )

        self.subscription = create_pending_subscription(
            company=self.company,
            plan=self.plan,
            billing_cycle=(
                CompanySubscription.BillingCycle.MONTHLY
            ),
            action=CompanySubscription.SubscriptionAction.NEW,
            start_date=date(2026, 6, 12),
            discount_amount=Decimal("20.00"),
            billing_reference="SUB-BILL-2026-001",
            created_by=self.user,
            notes="Subscription billing test.",
        )

    def create_company(self, **overrides) -> Company:
        """
        Dynamically create a valid Company without coupling tests
        to every field introduced by previous phases.
        """

        data: dict[str, object] = {}

        for field in Company._meta.fields:
            if field.auto_created:
                continue

            if not getattr(field, "editable", True):
                continue

            if field.name == "id":
                continue

            if field.name in overrides:
                data[field.name] = overrides[field.name]
                continue

            if field.has_default() or field.null or field.blank:
                continue

            if isinstance(field, models.ForeignKey):
                if (
                    field.remote_field
                    and field.remote_field.model == User
                ):
                    data[field.name] = self.user
                continue

            field_name = field.name.lower()

            if isinstance(
                field,
                (
                    models.CharField,
                    models.SlugField,
                    models.TextField,
                ),
            ):
                if "email" in field_name:
                    data[field.name] = (
                        f"{field.name}@Mhamcloud.test"
                    )
                elif (
                    "phone" in field_name
                    or "mobile" in field_name
                ):
                    data[field.name] = "0500000000"
                elif "country" in field_name:
                    data[field.name] = "Saudi Arabia"
                elif "currency" in field_name:
                    data[field.name] = "SAR"
                elif (
                    "slug" in field_name
                    or "code" in field_name
                ):
                    data[field.name] = (
                        "billing-test-company"
                    )
                elif (
                    "name" in field_name
                    or "title" in field_name
                ):
                    data[field.name] = overrides.get(
                        "name",
                        "Billing Test Company",
                    )
                else:
                    data[field.name] = f"test-{field.name}"

            elif isinstance(field, models.BooleanField):
                data[field.name] = True

            elif isinstance(field, models.IntegerField):
                data[field.name] = 1

            elif isinstance(field, models.DecimalField):
                data[field.name] = Decimal("0.00")

            elif isinstance(field, models.DateField):
                data[field.name] = timezone.localdate()

            elif isinstance(field, models.DateTimeField):
                data[field.name] = timezone.now()

        data.update(overrides)

        return Company.objects.create(**data)

    def test_build_platform_seller_snapshot(self) -> None:
        snapshot = build_platform_seller_snapshot()

        self.assertEqual(
            snapshot["name"],
            "Mhamcloud Platform Company",
        )
        self.assertEqual(
            snapshot["name_ar"],
            "شركة برايمي أك",
        )
        self.assertEqual(
            snapshot["commercial_registration"],
            "1010101010",
        )
        self.assertEqual(
            snapshot["tax_number"],
            "310000000000003",
        )
        self.assertEqual(
            snapshot["currency_code"]
            if "currency_code" in snapshot
            else "SAR",
            "SAR",
        )

    def test_seller_snapshot_allows_explicit_overrides(
        self,
    ) -> None:
        snapshot = build_platform_seller_snapshot(
            overrides={
                "name": "Override Seller",
                "city": "Jeddah",
            }
        )

        self.assertEqual(snapshot["name"], "Override Seller")
        self.assertEqual(snapshot["city"], "Jeddah")
        self.assertEqual(
            snapshot["tax_number"],
            "310000000000003",
        )

    def test_build_company_buyer_snapshot(self) -> None:
        snapshot = build_company_buyer_snapshot(
            self.company
        )

        self.assertEqual(snapshot["id"], self.company.id)
        self.assertEqual(
            snapshot["display_name"],
            "شركة اختبار الفوترة",
        )
        self.assertEqual(
            snapshot["company_code"],
            "BILLING-TEST",
        )
        self.assertEqual(
            snapshot["commercial_registration"],
            "4030000001",
        )
        self.assertEqual(
            snapshot["tax_number"],
            "310000000000111",
        )
        self.assertEqual(snapshot["city"], "Jeddah")
        self.assertEqual(snapshot["currency_code"], "SAR")

    def test_build_subscription_plan_snapshot(self) -> None:
        snapshot = build_subscription_plan_snapshot(
            self.plan
        )

        self.assertEqual(snapshot["id"], self.plan.id)
        self.assertEqual(
            snapshot["name"],
            "Professional Plan",
        )
        self.assertEqual(
            snapshot["code"],
            SubscriptionPlan.PlanCode.PROFESSIONAL,
        )
        self.assertEqual(
            snapshot["monthly_price"],
            "200.00",
        )
        self.assertEqual(
            snapshot["yearly_price"],
            "2000.00",
        )
        self.assertEqual(
            snapshot["features"],
            [
                "accounting",
                "sales",
                "inventory",
            ],
        )

    def test_build_subscription_snapshot(self) -> None:
        snapshot = build_subscription_snapshot(
            self.subscription
        )

        self.assertEqual(
            snapshot["id"],
            self.subscription.id,
        )
        self.assertEqual(
            snapshot["company_id"],
            self.company.id,
        )
        self.assertEqual(
            snapshot["plan_id"],
            self.plan.id,
        )
        self.assertEqual(
            snapshot["status"],
            CompanySubscription.Status.PENDING_PAYMENT,
        )
        self.assertEqual(
            snapshot["billing_cycle"],
            CompanySubscription.BillingCycle.MONTHLY,
        )
        self.assertEqual(snapshot["price"], "200.00")
        self.assertEqual(
            snapshot["discount_amount"],
            "20.00",
        )
        self.assertEqual(
            snapshot["amount_before_tax"],
            "180.00",
        )
        self.assertEqual(
            snapshot["tax_amount"],
            "27.00",
        )
        self.assertEqual(
            snapshot["total_amount"],
            "207.00",
        )

    def test_build_subscription_invoice_printable_payload(
        self,
    ) -> None:
        seller = build_platform_seller_snapshot()
        buyer = build_company_buyer_snapshot(
            self.company
        )
        plan = build_subscription_plan_snapshot(
            self.plan
        )
        subscription = build_subscription_snapshot(
            self.subscription
        )

        payload = build_subscription_invoice_printable_payload(
            document_number="PINV-2026-000001",
            issue_date=date(2026, 6, 12),
            currency_code="SAR",
            subtotal=Decimal("200.00"),
            discount_amount=Decimal("20.00"),
            taxable_amount=Decimal("180.00"),
            tax_amount=Decimal("27.00"),
            total_amount=Decimal("207.00"),
            balance_amount=Decimal("207.00"),
            seller_snapshot=seller,
            buyer_snapshot=buyer,
            subscription_snapshot=subscription,
            plan_snapshot=plan,
            notes="Printable payload test.",
        )

        self.assertEqual(
            payload["schema"],
            "Mhamcloud.platform_billing_document.v1",
        )
        self.assertEqual(
            payload["document"]["number"],
            "PINV-2026-000001",
        )
        self.assertEqual(
            payload["document"]["type"],
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        )
        self.assertEqual(
            payload["totals"]["subtotal"],
            "200.00",
        )
        self.assertEqual(
            payload["totals"]["discount_amount"],
            "20.00",
        )
        self.assertEqual(
            payload["totals"]["taxable_amount"],
            "180.00",
        )
        self.assertEqual(
            payload["totals"]["tax_amount"],
            "27.00",
        )
        self.assertEqual(
            payload["totals"]["total_amount"],
            "207.00",
        )
        self.assertEqual(
            payload["totals"]["balance_amount"],
            "207.00",
        )
        self.assertEqual(len(payload["items"]), 1)

    def test_create_subscription_invoice(self) -> None:
        invoice, created = create_or_get_subscription_invoice(
            subscription=self.subscription,
            issue_date=date(2026, 6, 12),
            created_by=self.user,
            notes="Issued subscription invoice.",
            metadata={
                "source": "billing-test",
            },
        )

        self.assertTrue(created)
        self.assertIsInstance(
            invoice,
            PlatformBillingDocument,
        )
        self.assertEqual(
            invoice.document_type,
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        )
        self.assertEqual(
            invoice.status,
            PlatformBillingDocumentStatus.ISSUED,
        )
        self.assertEqual(
            invoice.document_number,
            "PINV-2026-000001",
        )
        self.assertEqual(invoice.sequence_prefix, "PINV")
        self.assertEqual(invoice.sequence_year, 2026)
        self.assertEqual(invoice.sequence_number, 1)

        self.assertEqual(
            invoice.subscription,
            self.subscription,
        )
        self.assertEqual(invoice.company, self.company)
        self.assertIsNone(invoice.related_invoice)

        self.assertEqual(
            invoice.subtotal,
            Decimal("200.00"),
        )
        self.assertEqual(
            invoice.discount_amount,
            Decimal("20.00"),
        )
        self.assertEqual(
            invoice.taxable_amount,
            Decimal("180.00"),
        )
        self.assertEqual(
            invoice.tax_amount,
            Decimal("27.00"),
        )
        self.assertEqual(
            invoice.total_amount,
            Decimal("207.00"),
        )
        self.assertEqual(
            invoice.paid_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            invoice.balance_amount,
            Decimal("207.00"),
        )

        self.assertEqual(
            invoice.billing_reference,
            "SUB-BILL-2026-001",
        )
        self.assertEqual(invoice.currency_code, "SAR")
        self.assertEqual(invoice.created_by, self.user)
        self.assertEqual(
            invoice.metadata,
            {
                "source": "billing-test",
            },
        )

    def test_created_invoice_contains_all_snapshots(
        self,
    ) -> None:
        invoice, _ = create_or_get_subscription_invoice(
            subscription=self.subscription,
            issue_date=date(2026, 6, 12),
        )

        self.assertEqual(
            invoice.seller_snapshot["name"],
            "Mhamcloud Platform Company",
        )
        self.assertEqual(
            invoice.buyer_snapshot["company_code"],
            "BILLING-TEST",
        )
        self.assertEqual(
            invoice.plan_snapshot["name"],
            "Professional Plan",
        )
        self.assertEqual(
            invoice.subscription_snapshot["id"],
            self.subscription.id,
        )

        self.assertEqual(
            invoice.printable_payload["document"]["number"],
            invoice.document_number,
        )
        self.assertEqual(
            invoice.printable_payload["seller"],
            invoice.seller_snapshot,
        )
        self.assertEqual(
            invoice.printable_payload["buyer"],
            invoice.buyer_snapshot,
        )
        self.assertEqual(
            invoice.printable_payload["subscription"],
            invoice.subscription_snapshot,
        )
        self.assertEqual(
            invoice.printable_payload["plan"],
            invoice.plan_snapshot,
        )

    def test_create_invoice_is_idempotent(self) -> None:
        first_invoice, first_created = (
            create_or_get_subscription_invoice(
                subscription=self.subscription,
                issue_date=date(2026, 6, 12),
            )
        )

        second_invoice, second_created = (
            create_or_get_subscription_invoice(
                subscription=self.subscription,
                issue_date=date(2026, 6, 12),
            )
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(
            first_invoice.id,
            second_invoice.id,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            1,
        )

        sequence = PlatformDocumentSequence.objects.get(
            document_type=(
                PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
            ),
            year=2026,
        )
        self.assertEqual(sequence.last_number, 1)

    def test_different_subscriptions_receive_different_invoices(
        self,
    ) -> None:
        second_company = self.create_company(
            name="Second Billing Company",
            name_ar="شركة الفوترة الثانية",
            company_code="BILLING-SECOND",
            email="second@Mhamcloud.test",
        )

        second_subscription = create_pending_subscription(
            company=second_company,
            plan=self.plan,
            billing_cycle=(
                CompanySubscription.BillingCycle.MONTHLY
            ),
            action=CompanySubscription.SubscriptionAction.NEW,
            start_date=date(2026, 6, 12),
            discount_amount=Decimal("0.00"),
            billing_reference="SUB-BILL-2026-002",
            created_by=self.user,
        )

        first_invoice, _ = create_or_get_subscription_invoice(
            subscription=self.subscription,
            issue_date=date(2026, 6, 12),
        )
        second_invoice, _ = (
            create_or_get_subscription_invoice(
                subscription=second_subscription,
                issue_date=date(2026, 6, 12),
            )
        )

        self.assertEqual(
            first_invoice.document_number,
            "PINV-2026-000001",
        )
        self.assertEqual(
            second_invoice.document_number,
            "PINV-2026-000002",
        )
        self.assertNotEqual(
            first_invoice.subscription_id,
            second_invoice.subscription_id,
        )
        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            2,
        )

    def test_invoice_snapshots_remain_immutable_after_live_changes(
        self,
    ) -> None:
        invoice, _ = create_or_get_subscription_invoice(
            subscription=self.subscription,
            issue_date=date(2026, 6, 12),
        )

        original_buyer_name = (
            invoice.buyer_snapshot["display_name"]
        )
        original_plan_name = invoice.plan_snapshot["name"]
        original_total = (
            invoice.subscription_snapshot["total_amount"]
        )

        self.company.name_ar = "اسم شركة معدل"
        self.company.save()

        self.plan.name = "Changed Plan Name"
        self.plan.monthly_price = Decimal("999.00")
        self.plan.save()

        self.subscription.notes = "Changed live notes."
        self.subscription.save()

        invoice.refresh_from_db()

        self.assertEqual(
            invoice.buyer_snapshot["display_name"],
            original_buyer_name,
        )
        self.assertEqual(
            invoice.plan_snapshot["name"],
            original_plan_name,
        )
        self.assertEqual(
            invoice.subscription_snapshot["total_amount"],
            original_total,
        )
        self.assertEqual(
            invoice.printable_payload["buyer"][
                "display_name"
            ],
            original_buyer_name,
        )
        self.assertEqual(
            invoice.printable_payload["plan"]["name"],
            original_plan_name,
        )

    def test_get_subscription_invoice_returns_created_invoice(
        self,
    ) -> None:
        created_invoice, _ = (
            create_or_get_subscription_invoice(
                subscription=self.subscription,
                issue_date=date(2026, 6, 12),
            )
        )

        fetched_invoice = get_subscription_invoice(
            subscription=self.subscription
        )

        self.assertIsNotNone(fetched_invoice)
        self.assertEqual(
            fetched_invoice.id,
            created_invoice.id,
        )

    def test_get_subscription_invoice_returns_none_when_missing(
        self,
    ) -> None:
        invoice = get_subscription_invoice(
            subscription=self.subscription
        )

        self.assertIsNone(invoice)

    def test_create_invoice_rejects_invalid_subscription_totals(
        self,
    ) -> None:
        CompanySubscription.objects.filter(
            pk=self.subscription.pk
        ).update(
            total_amount=Decimal("999.00"),
        )

        self.subscription.refresh_from_db()

        with self.assertRaises(ValidationError):
            create_or_get_subscription_invoice(
                subscription=self.subscription,
                issue_date=date(2026, 6, 12),
            )

        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )
        self.assertEqual(
            PlatformDocumentSequence.objects.count(),
            0,
        )

    def test_create_invoice_rejects_non_json_metadata(
        self,
    ) -> None:
        with self.assertRaises(ValidationError):
            create_or_get_subscription_invoice(
                subscription=self.subscription,
                issue_date=date(2026, 6, 12),
                metadata=["invalid"],  # type: ignore[arg-type]
            )

        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )

    def test_create_invoice_rejects_invalid_issue_date(
        self,
    ) -> None:
        with self.assertRaises(ValidationError):
            create_or_get_subscription_invoice(
                subscription=self.subscription,
                issue_date="2026-06-12",  # type: ignore[arg-type]
            )

        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )

    def test_build_subscription_payment_snapshot(self) -> None:
        paid_at = timezone.now()

        snapshot = build_subscription_payment_snapshot(
            payment_method="BANK_TRANSFER",
            transaction_reference="TX-2026-0001",
            billing_reference="SUB-BILL-2026-001",
            paid_at=paid_at,
            paid_amount=Decimal("207.00"),
            currency_code="SAR",
            extra={
                "bank_name": "Test Bank",
            },
        )

        self.assertEqual(
            snapshot["payment_method"],
            "BANK_TRANSFER",
        )
        self.assertEqual(
            snapshot["transaction_reference"],
            "TX-2026-0001",
        )
        self.assertEqual(
            snapshot["billing_reference"],
            "SUB-BILL-2026-001",
        )
        self.assertEqual(
            snapshot["paid_amount"],
            "207.00",
        )
        self.assertEqual(
            snapshot["currency_code"],
            "SAR",
        )
        self.assertEqual(
            snapshot["extra"],
            {
                "bank_name": "Test Bank",
            },
        )
        self.assertEqual(
            snapshot["paid_at"],
            paid_at.isoformat(),
        )

    def test_payment_snapshot_rejects_empty_method(
        self,
    ) -> None:
        with self.assertRaises(ValidationError):
            build_subscription_payment_snapshot(
                payment_method="",
                paid_amount=Decimal("207.00"),
            )

    def test_payment_snapshot_rejects_zero_amount(
        self,
    ) -> None:
        with self.assertRaises(ValidationError):
            build_subscription_payment_snapshot(
                payment_method="BANK_TRANSFER",
                paid_amount=Decimal("0.00"),
            )

    def test_create_subscription_payment_receipt(
        self,
    ) -> None:
        paid_at = timezone.now()

        receipt, created = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="BANK_TRANSFER",
                transaction_reference="TX-2026-0001",
                billing_reference="SUB-BILL-2026-001",
                paid_at=paid_at,
                issue_date=date(2026, 6, 12),
                payment_extra={
                    "bank_name": "Test Bank",
                },
                created_by=self.user,
                notes="Subscription payment received.",
                metadata={
                    "source": "billing-payment-test",
                },
            )
        )

        self.assertTrue(created)
        self.assertIsInstance(
            receipt,
            PlatformBillingDocument,
        )
        self.assertEqual(
            receipt.document_type,
            PlatformBillingDocumentType.PAYMENT_RECEIPT,
        )
        self.assertEqual(
            receipt.status,
            PlatformBillingDocumentStatus.ISSUED,
        )
        self.assertEqual(
            receipt.document_number,
            "PREC-2026-000001",
        )
        self.assertEqual(
            receipt.sequence_prefix,
            "PREC",
        )
        self.assertEqual(
            receipt.sequence_year,
            2026,
        )
        self.assertEqual(
            receipt.sequence_number,
            1,
        )
        self.assertEqual(
            receipt.subscription,
            self.subscription,
        )
        self.assertEqual(
            receipt.company,
            self.company,
        )
        self.assertIsNotNone(
            receipt.related_invoice,
        )
        self.assertEqual(
            receipt.related_invoice.document_number,
            "PINV-2026-000001",
        )
        self.assertEqual(
            receipt.total_amount,
            Decimal("207.00"),
        )
        self.assertEqual(
            receipt.paid_amount,
            Decimal("207.00"),
        )
        self.assertEqual(
            receipt.balance_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            receipt.payment_method,
            "BANK_TRANSFER",
        )
        self.assertEqual(
            receipt.transaction_reference,
            "TX-2026-0001",
        )
        self.assertEqual(
            receipt.billing_reference,
            "SUB-BILL-2026-001",
        )
        self.assertEqual(
            receipt.created_by,
            self.user,
        )
        self.assertEqual(
            receipt.metadata,
            {
                "source": "billing-payment-test",
            },
        )

    def test_receipt_marks_related_invoice_as_paid(
        self,
    ) -> None:
        receipt, _ = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="CASH",
                transaction_reference="TX-CASH-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )
        )

        invoice = receipt.related_invoice
        invoice.refresh_from_db()

        self.assertEqual(
            invoice.status,
            PlatformBillingDocumentStatus.PAID,
        )
        self.assertEqual(
            invoice.paid_amount,
            invoice.total_amount,
        )
        self.assertEqual(
            invoice.balance_amount,
            Decimal("0.00"),
        )
        self.assertIsNotNone(invoice.paid_at)
        self.assertEqual(
            invoice.payment_method,
            "CASH",
        )
        self.assertEqual(
            invoice.transaction_reference,
            "TX-CASH-001",
        )
        self.assertEqual(
            invoice.payment_snapshot["paid_amount"],
            "207.00",
        )

    def test_receipt_contains_payment_snapshot_and_payload(
        self,
    ) -> None:
        receipt, _ = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="CARD",
                transaction_reference="TX-CARD-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
                payment_extra={
                    "gateway": "test-gateway",
                },
            )
        )

        self.assertEqual(
            receipt.payment_snapshot["payment_method"],
            "CARD",
        )
        self.assertEqual(
            receipt.payment_snapshot[
                "transaction_reference"
            ],
            "TX-CARD-001",
        )
        self.assertEqual(
            receipt.payment_snapshot["paid_amount"],
            "207.00",
        )
        self.assertEqual(
            receipt.payment_snapshot["extra"],
            {
                "gateway": "test-gateway",
            },
        )

        payload = receipt.printable_payload

        self.assertEqual(
            payload["schema"],
            "Mhamcloud.platform_billing_document.v1",
        )
        self.assertEqual(
            payload["document"]["type"],
            PlatformBillingDocumentType.PAYMENT_RECEIPT,
        )
        self.assertEqual(
            payload["document"]["number"],
            receipt.document_number,
        )
        self.assertEqual(
            payload["related_invoice"]["document_number"],
            receipt.related_invoice.document_number,
        )
        self.assertEqual(
            payload["payment"],
            receipt.payment_snapshot,
        )
        self.assertEqual(
            payload["totals"]["paid_amount"],
            "207.00",
        )
        self.assertEqual(
            payload["totals"]["balance_amount"],
            "0.00",
        )
        self.assertEqual(
            payload["seller"],
            receipt.seller_snapshot,
        )
        self.assertEqual(
            payload["buyer"],
            receipt.buyer_snapshot,
        )

    def test_build_subscription_receipt_printable_payload(
        self,
    ) -> None:
        invoice, _ = create_or_get_subscription_invoice(
            subscription=self.subscription,
            issue_date=date(2026, 6, 12),
        )

        paid_at = timezone.now()

        payment_snapshot = (
            build_subscription_payment_snapshot(
                payment_method="BANK_TRANSFER",
                transaction_reference="TX-PAYLOAD-001",
                billing_reference="SUB-BILL-2026-001",
                paid_at=paid_at,
                paid_amount=invoice.total_amount,
                currency_code=invoice.currency_code,
            )
        )

        payload = (
            build_subscription_receipt_printable_payload(
                document_number="PREC-2026-000001",
                issue_date=date(2026, 6, 12),
                currency_code="SAR",
                invoice=invoice,
                payment_snapshot=payment_snapshot,
                subscription_snapshot=(
                    build_subscription_snapshot(
                        self.subscription
                    )
                ),
                notes="Receipt printable payload.",
            )
        )

        self.assertEqual(
            payload["document"]["number"],
            "PREC-2026-000001",
        )
        self.assertEqual(
            payload["related_invoice"]["document_number"],
            "PINV-2026-000001",
        )
        self.assertEqual(
            payload["payment"]["payment_method"],
            "BANK_TRANSFER",
        )
        self.assertEqual(
            payload["totals"]["total_amount"],
            "207.00",
        )
        self.assertEqual(
            payload["totals"]["paid_amount"],
            "207.00",
        )
        self.assertEqual(
            payload["totals"]["balance_amount"],
            "0.00",
        )

    def test_create_payment_receipt_is_idempotent(
        self,
    ) -> None:
        first_receipt, first_created = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="BANK_TRANSFER",
                transaction_reference="TX-IDEMPOTENT-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )
        )

        second_receipt, second_created = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="CARD",
                transaction_reference="TX-IDEMPOTENT-002",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )
        )

        self.assertTrue(first_created)
        self.assertFalse(second_created)
        self.assertEqual(
            first_receipt.id,
            second_receipt.id,
        )

        self.assertEqual(
            PlatformBillingDocument.objects.filter(
                subscription=self.subscription,
                document_type=(
                    PlatformBillingDocumentType.PAYMENT_RECEIPT
                ),
            ).count(),
            1,
        )

        receipt_sequence = (
            PlatformDocumentSequence.objects.get(
                document_type=(
                    PlatformBillingDocumentType.PAYMENT_RECEIPT
                ),
                year=2026,
            )
        )
        self.assertEqual(
            receipt_sequence.last_number,
            1,
        )

    def test_invoice_and_receipt_sequences_are_independent(
        self,
    ) -> None:
        receipt, _ = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="BANK_TRANSFER",
                transaction_reference="TX-SEQUENCE-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )
        )

        invoice = receipt.related_invoice

        self.assertEqual(
            invoice.document_number,
            "PINV-2026-000001",
        )
        self.assertEqual(
            receipt.document_number,
            "PREC-2026-000001",
        )

        invoice_sequence = (
            PlatformDocumentSequence.objects.get(
                document_type=(
                    PlatformBillingDocumentType.SUBSCRIPTION_INVOICE
                ),
                year=2026,
            )
        )
        receipt_sequence = (
            PlatformDocumentSequence.objects.get(
                document_type=(
                    PlatformBillingDocumentType.PAYMENT_RECEIPT
                ),
                year=2026,
            )
        )

        self.assertEqual(
            invoice_sequence.last_number,
            1,
        )
        self.assertEqual(
            receipt_sequence.last_number,
            1,
        )

    def test_get_subscription_payment_receipt(
        self,
    ) -> None:
        missing_receipt = get_subscription_payment_receipt(
            subscription=self.subscription
        )

        self.assertIsNone(missing_receipt)

        created_receipt, _ = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="CASH",
                transaction_reference="TX-GET-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )
        )

        fetched_receipt = (
            get_subscription_payment_receipt(
                subscription=self.subscription
            )
        )

        self.assertIsNotNone(fetched_receipt)
        self.assertEqual(
            fetched_receipt.id,
            created_receipt.id,
        )

    def test_create_receipt_rejects_empty_payment_method(
        self,
    ) -> None:
        with self.assertRaises(ValidationError):
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )

        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )
        self.assertEqual(
            PlatformDocumentSequence.objects.count(),
            0,
        )

    def test_create_receipt_rejects_cancelled_invoice(
        self,
    ) -> None:
        invoice, _ = create_or_get_subscription_invoice(
            subscription=self.subscription,
            issue_date=date(2026, 6, 12),
        )

        invoice.cancel(
            reason="Cancelled before payment.",
            cancelled_by=self.user,
        )

        with self.assertRaises(ValidationError):
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="BANK_TRANSFER",
                transaction_reference="TX-CANCELLED-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
            )

        invoice.refresh_from_db()

        self.assertEqual(
            invoice.status,
            PlatformBillingDocumentStatus.CANCELLED,
        )
        self.assertEqual(
            invoice.paid_amount,
            Decimal("0.00"),
        )
        self.assertEqual(
            PlatformBillingDocument.objects.filter(
                document_type=(
                    PlatformBillingDocumentType.PAYMENT_RECEIPT
                )
            ).count(),
            0,
        )

    def test_receipt_snapshots_remain_immutable(
        self,
    ) -> None:
        receipt, _ = (
            create_or_get_subscription_payment_receipt(
                subscription=self.subscription,
                payment_method="BANK_TRANSFER",
                transaction_reference="TX-SNAPSHOT-001",
                paid_at=timezone.now(),
                issue_date=date(2026, 6, 12),
                payment_extra={
                    "bank_name": "Original Bank",
                },
            )
        )

        original_buyer_name = (
            receipt.buyer_snapshot["display_name"]
        )
        original_plan_name = (
            receipt.plan_snapshot["name"]
        )
        original_payment_method = (
            receipt.payment_snapshot["payment_method"]
        )
        original_bank_name = (
            receipt.payment_snapshot["extra"][
                "bank_name"
            ]
        )

        self.company.name_ar = "اسم شركة جديد"
        self.company.save()

        self.plan.name = "New Plan Name"
        self.plan.save()

        self.subscription.billing_reference = (
            "CHANGED-BILLING-REFERENCE"
        )
        self.subscription.save()

        receipt.refresh_from_db()

        self.assertEqual(
            receipt.buyer_snapshot["display_name"],
            original_buyer_name,
        )
        self.assertEqual(
            receipt.plan_snapshot["name"],
            original_plan_name,
        )
        self.assertEqual(
            receipt.payment_snapshot["payment_method"],
            original_payment_method,
        )
        self.assertEqual(
            receipt.payment_snapshot["extra"][
                "bank_name"
            ],
            original_bank_name,
        )
        self.assertEqual(
            receipt.printable_payload["buyer"][
                "display_name"
            ],
            original_buyer_name,
        )
        self.assertEqual(
            receipt.printable_payload["plan"]["name"],
            original_plan_name,
        )
