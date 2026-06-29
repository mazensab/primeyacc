# ============================================================
# ًں“‚ api/system/billing_documents/tests.py
# ًں§  Mhamcloud | System Billing Documents API Tests V1.0
# ------------------------------------------------------------
# âœ… Tests authentication and system permissions
# âœ… Tests platform invoice creation and idempotency
# âœ… Tests platform receipt creation and invoice paid lifecycle
# âœ… Tests billing documents list, detail, filters, and statistics
# âœ… Tests immutable snapshots and printable payload responses
# âœ… Tests support role read-only access
# âœ… Tests invalid payment and missing document protection
# ------------------------------------------------------------
# ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط¹طھظ…ط¯ط©:
# - ظ‡ط°ظ‡ ط§ظ„ط§ط®طھط¨ط§ط±ط§طھ طھط®طµ APIs ظپظˆطھط±ط© ظ…ط§ظ„ظƒ ظ…ظ†طµط© Mhamcloud
# - ظ„ط§ طھط³طھط®ط¯ظ… payments ط£ظˆ documents ط§ظ„ط®ط§طµط© ط¨ط§ظ„ط´ط±ظƒط§طھ
# - BILLING_MANAGER ظٹط³طھط·ظٹط¹ ط§ظ„ط¹ط±ط¶ ظˆط¥ظ†ط´ط§ط، ط§ظ„ظپط§طھظˆط±ط© ظˆط§ظ„ط¥ظٹطµط§ظ„
# - SUPPORT ظٹط³طھط·ظٹط¹ ط§ظ„ط¹ط±ط¶ ظپظ‚ط·
# - ظƒظ„ ط§ط´طھط±ط§ظƒ ظٹظ…ظ„ظƒ ظپط§طھظˆط±ط© ظˆط¥ظٹطµط§ظ„ظ‹ط§ ظˆط§ط­ط¯ظ‹ط§ ظƒط­ط¯ ط£ظ‚طµظ‰
# ============================================================

from __future__ import annotations

import json
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import models
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.models import (
    SystemRole,
    UserProfile,
    UserProfileStatus,
    WorkspaceType,
)
from billing.models import (
    PlatformBillingDocument,
    PlatformBillingDocumentStatus,
    PlatformBillingDocumentType,
)
from companies.models import Company
from subscriptions.models import (
    CompanySubscription,
    SubscriptionPlan,
)
from subscriptions.services import create_pending_subscription


User = get_user_model()


@override_settings(
    Mhamcloud_PLATFORM_BILLING_SELLER={
        "name": "Mhamcloud Platform Company",
        "name_ar": "ط´ط±ظƒط© ط¨ط±ط§ظٹظ…ظٹ ط£ظƒ",
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
class SystemBillingDocumentsAPITests(TestCase):
    """
    Tests system billing documents endpoints.
    """

    def setUp(self) -> None:
        self.billing_user = self.create_system_user(
            username="billing-manager",
            role=SystemRole.BILLING_MANAGER,
        )
        self.support_user = self.create_system_user(
            username="support-user",
            role=SystemRole.SUPPORT,
        )
        self.regular_user = User.objects.create_user(
            username="regular-user",
            email="regular-user@Mhamcloud.test",
            password="StrongPass123!",
        )

        UserProfile.objects.update_or_create(
            user=self.regular_user,
            defaults={
                "display_name": "Regular User",
                "status": UserProfileStatus.ACTIVE,
                "default_workspace": WorkspaceType.COMPANY,
                "system_role": SystemRole.NONE,
                "is_system_user": False,
            },
        )

        self.company = self.create_company(
            name="Billing API Company",
            name_ar="ط´ط±ظƒط© ط§ط®طھط¨ط§ط± API ط§ظ„ظپظˆطھط±ط©",
            name_en="Billing API Company",
            company_code="BILLING-API",
            commercial_registration="4030000001",
            tax_number="310000000000111",
            email="company-api@Mhamcloud.test",
            phone="0120000000",
            mobile="0500000000",
            country="Saudi Arabia",
            building_number="1234",
            street_name="API Street",
            district="API District",
            city="Jeddah",
            region="Makkah",
            postal_code="23456",
            short_address="API12345",
            address="Billing API test address",
            currency_code="SAR",
        )

        self.plan = SubscriptionPlan.objects.create(
            name="Professional API Plan",
            code=SubscriptionPlan.PlanCode.PROFESSIONAL,
            slug="professional-api-plan",
            description="Professional API billing test plan.",
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
            action=(
                CompanySubscription.SubscriptionAction.NEW
            ),
            start_date=date(2026, 6, 13),
            discount_amount=Decimal("20.00"),
            billing_reference="SUB-API-2026-001",
            created_by=self.billing_user,
            notes="System billing API test subscription.",
        )

        self.list_url = "/api/system/billing-documents/"
        self.create_invoice_url = (
            "/api/system/billing-documents/"
            f"subscriptions/{self.subscription.id}/invoice/"
        )
        self.create_receipt_url = (
            "/api/system/billing-documents/"
            f"subscriptions/{self.subscription.id}/receipt/"
        )

    def create_system_user(
        self,
        *,
        username: str,
        role: str,
    ):
        """
        Create an active system user with the requested system role.
        """

        user = User.objects.create_user(
            username=username,
            email=f"{username}@Mhamcloud.test",
            password="StrongPass123!",
        )

        UserProfile.objects.update_or_create(
            user=user,
            defaults={
                "display_name": username,
                "status": UserProfileStatus.ACTIVE,
                "default_workspace": WorkspaceType.SYSTEM,
                "system_role": role,
                "is_system_user": True,
            },
        )

        return user

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
                    data[field.name] = self.billing_user
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
                        "billing-api-company"
                    )
                elif (
                    "name" in field_name
                    or "title" in field_name
                ):
                    data[field.name] = overrides.get(
                        "name",
                        "Billing API Company",
                    )
                else:
                    data[field.name] = (
                        f"test-{field.name}"
                    )

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

    def post_json(
        self,
        url: str,
        payload: dict,
    ):
        """
        Send a JSON POST request.
        """

        return self.client.post(
            url,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def create_invoice(self):
        """
        Create a subscription invoice through the API.
        """

        self.client.force_login(self.billing_user)

        return self.post_json(
            self.create_invoice_url,
            {
                "issue_date": "2026-06-13",
                "notes": "API subscription invoice.",
                "metadata": {
                    "source": "system-api-test",
                },
            },
        )

    def create_receipt(self):
        """
        Create a payment receipt through the API.
        """

        self.client.force_login(self.billing_user)

        return self.post_json(
            self.create_receipt_url,
            {
                "payment_method": "BANK_TRANSFER",
                "transaction_reference": "TX-API-2026-001",
                "billing_reference": "SUB-API-2026-001",
                "paid_at": "2026-06-13T12:00:00+03:00",
                "issue_date": "2026-06-13",
                "payment_extra": {
                    "bank_name": "Primey Test Bank",
                },
                "notes": "API payment receipt.",
                "metadata": {
                    "source": "system-api-payment-test",
                },
            },
        )

    def test_list_requires_authentication(self) -> None:
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 302)

    def test_regular_user_cannot_view_documents(self) -> None:
        self.client.force_login(self.regular_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 403)
        self.assertFalse(response.json()["ok"])

    def test_billing_manager_can_create_invoice(self) -> None:
        response = self.create_invoice()

        self.assertEqual(response.status_code, 201)

        payload = response.json()

        self.assertTrue(payload["ok"])
        self.assertTrue(payload["data"]["created"])

        document = payload["data"]["document"]

        self.assertEqual(
            document["document_type"],
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        )
        self.assertEqual(
            document["status"],
            PlatformBillingDocumentStatus.ISSUED,
        )
        self.assertEqual(
            document["document_number"],
            "PINV-2026-000001",
        )
        self.assertEqual(
            document["total_amount"],
            "207.00",
        )
        self.assertEqual(
            document["balance_amount"],
            "207.00",
        )
        self.assertIn("snapshots", document)
        self.assertIn("printable_payload", document)

    def test_create_invoice_is_idempotent(self) -> None:
        first_response = self.create_invoice()
        second_response = self.create_invoice()

        self.assertEqual(first_response.status_code, 201)
        self.assertEqual(second_response.status_code, 200)

        first_payload = first_response.json()
        second_payload = second_response.json()

        self.assertTrue(
            first_payload["data"]["created"]
        )
        self.assertFalse(
            second_payload["data"]["created"]
        )
        self.assertEqual(
            first_payload["data"]["document"]["id"],
            second_payload["data"]["document"]["id"],
        )
        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            1,
        )

    def test_support_user_cannot_create_invoice(self) -> None:
        self.client.force_login(self.support_user)

        response = self.post_json(
            self.create_invoice_url,
            {
                "issue_date": "2026-06-13",
            },
        )

        self.assertEqual(response.status_code, 403)
        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )

    def test_billing_manager_can_create_receipt(self) -> None:
        response = self.create_receipt()

        self.assertEqual(response.status_code, 201)

        payload = response.json()

        self.assertTrue(payload["ok"])
        self.assertTrue(payload["data"]["created"])

        receipt = payload["data"]["document"]
        invoice = payload["data"]["related_invoice"]

        self.assertEqual(
            receipt["document_type"],
            PlatformBillingDocumentType.PAYMENT_RECEIPT,
        )
        self.assertEqual(
            receipt["status"],
            PlatformBillingDocumentStatus.ISSUED,
        )
        self.assertEqual(
            receipt["document_number"],
            "PREC-2026-000001",
        )
        self.assertEqual(
            receipt["payment_method"],
            "BANK_TRANSFER",
        )
        self.assertEqual(
            receipt["paid_amount"],
            "207.00",
        )
        self.assertEqual(
            receipt["balance_amount"],
            "0.00",
        )

        self.assertEqual(
            invoice["status"],
            PlatformBillingDocumentStatus.PAID,
        )
        self.assertEqual(
            invoice["paid_amount"],
            "207.00",
        )
        self.assertEqual(
            invoice["balance_amount"],
            "0.00",
        )

    def test_create_receipt_requires_payment_method(
        self,
    ) -> None:
        self.client.force_login(self.billing_user)

        response = self.post_json(
            self.create_receipt_url,
            {
                "issue_date": "2026-06-13",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(response.json()["ok"])
        self.assertEqual(
            PlatformBillingDocument.objects.count(),
            0,
        )

    def test_support_user_can_view_document_list(
        self,
    ) -> None:
        self.create_invoice()

        self.client.force_login(self.support_user)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertTrue(payload["ok"])
        self.assertEqual(
            payload["data"]["count"],
            1,
        )
        self.assertEqual(
            payload["data"]["stats"][
                "subscription_invoices"
            ],
            1,
        )

    def test_list_supports_type_and_status_filters(
        self,
    ) -> None:
        self.create_receipt()

        self.client.force_login(self.billing_user)

        invoice_response = self.client.get(
            self.list_url,
            {
                "document_type": (
                    PlatformBillingDocumentType
                    .SUBSCRIPTION_INVOICE
                ),
                "status": (
                    PlatformBillingDocumentStatus
                    .PAID
                ),
            },
        )

        self.assertEqual(
            invoice_response.status_code,
            200,
        )

        invoice_payload = invoice_response.json()

        self.assertEqual(
            invoice_payload["data"]["count"],
            1,
        )
        self.assertEqual(
            invoice_payload["data"]["items"][0][
                "document_type"
            ],
            PlatformBillingDocumentType.SUBSCRIPTION_INVOICE,
        )

        receipt_response = self.client.get(
            self.list_url,
            {
                "document_type": (
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
                "payment_method": "BANK_TRANSFER",
            },
        )

        self.assertEqual(
            receipt_response.status_code,
            200,
        )
        self.assertEqual(
            receipt_response.json()["data"]["count"],
            1,
        )

    def test_list_supports_search(self) -> None:
        self.create_receipt()

        self.client.force_login(self.billing_user)

        response = self.client.get(
            self.list_url,
            {
                "search": "TX-API-2026-001",
                "document_type": (
                    PlatformBillingDocumentType
                    .PAYMENT_RECEIPT
                ),
            },
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()

        self.assertEqual(payload["data"]["count"], 1)
        self.assertEqual(
            payload["data"]["items"][0][
                "transaction_reference"
            ],
            "TX-API-2026-001",
        )

    def test_document_detail_returns_printable_payload(
        self,
    ) -> None:
        create_response = self.create_invoice()

        document_id = (
            create_response.json()["data"]["document"]["id"]
        )

        detail_url = (
            f"/api/system/billing-documents/{document_id}/"
        )

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, 200)

        payload = response.json()
        document = payload["data"]["document"]

        self.assertEqual(document["id"], document_id)
        self.assertIn("snapshots", document)
        self.assertIn("printable_payload", document)
        self.assertEqual(
            document["printable_payload"]["document"][
                "number"
            ],
            document["document_number"],
        )

    def test_invoice_detail_returns_linked_receipt(
        self,
    ) -> None:
        receipt_response = self.create_receipt()

        invoice_id = (
            receipt_response.json()["data"][
                "related_invoice"
            ]["id"]
        )

        response = self.client.get(
            f"/api/system/billing-documents/{invoice_id}/"
        )

        self.assertEqual(response.status_code, 200)

        payload = response.json()["data"]

        self.assertEqual(
            payload["payment_receipts_count"],
            1,
        )
        self.assertEqual(
            payload["payment_receipts"][0][
                "document_type"
            ],
            PlatformBillingDocumentType.PAYMENT_RECEIPT,
        )

    def test_missing_document_returns_404(self) -> None:
        self.client.force_login(self.billing_user)

        response = self.client.get(
            "/api/system/billing-documents/999999/"
        )

        self.assertEqual(response.status_code, 404)
