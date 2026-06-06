# ============================================================
# 📂 parties/tests.py
# 🧠 PrimeyAcc | Business Parties Tests V1.1
# ------------------------------------------------------------
# ✅ Guest protection test for /api/company/parties/
# ✅ Company tenant isolation tests
# ✅ Business party create API tests
# ✅ Detail isolation tests
# ✅ Branch ownership validation tests
# ✅ Frontend company_id trust prevention test
# ✅ Status action test
# ✅ Fixed Company.company_code unique test setup
# ------------------------------------------------------------
# القاعدة المعتمدة:
# - لا يتم الاعتماد على company_id القادم من الفرونت
# - الشركة الحالية تؤخذ من CompanyMembership
# - كل طرف تجاري يجب أن يبقى معزولًا داخل شركته
# - أي branch_id يجب أن يكون تابعًا لنفس الشركة الحالية
# ============================================================

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import CompanyMembership, CompanyRole, UserProfile
from companies.models import Branch, Company
from parties.models import (
    BusinessParty,
    BusinessPartyKind,
    BusinessPartyStatus,
    BusinessPartyType,
)


User = get_user_model()


class BusinessPartyAPITests(TestCase):
    """
    Tests for Phase 4 Business Parties foundation.

    These tests focus on the critical tenant isolation rule:
    /company APIs must resolve company from active CompanyMembership,
    not from frontend-provided company_id.
    """

    def setUp(self) -> None:
        self.client = APIClient()

        self.company_a = self._create_company(
            code="COMP-A",
            display_name="Company A",
        )
        self.company_b = self._create_company(
            code="COMP-B",
            display_name="Company B",
        )

        self.branch_a = self._create_branch(
            company=self.company_a,
            code="BR-A",
            name="Main Branch A",
        )
        self.branch_b = self._create_branch(
            company=self.company_b,
            code="BR-B",
            name="Main Branch B",
        )

        self.user_a = User.objects.create_user(
            username="company_a_owner",
            email="owner-a@example.com",
            password="TestPass12345",
        )
        self.user_b = User.objects.create_user(
            username="company_b_owner",
            email="owner-b@example.com",
            password="TestPass12345",
        )

        self.profile_a = self._create_profile(
            user=self.user_a,
            display_name="Owner A",
            default_company=self.company_a,
        )
        self.profile_b = self._create_profile(
            user=self.user_b,
            display_name="Owner B",
            default_company=self.company_b,
        )

        self.membership_a = CompanyMembership.objects.create(
            user=self.user_a,
            company=self.company_a,
            role=CompanyRole.OWNER,
            is_primary=True,
        )
        self.membership_b = CompanyMembership.objects.create(
            user=self.user_b,
            company=self.company_b,
            role=CompanyRole.OWNER,
            is_primary=True,
        )

        self.customer_a = BusinessParty.objects.create(
            company=self.company_a,
            branch=self.branch_a,
            party_type=BusinessPartyType.CUSTOMER,
            party_kind=BusinessPartyKind.INDIVIDUAL,
            status=BusinessPartyStatus.ACTIVE,
            code="CUS-A",
            display_name="Customer A",
            mobile="0500000001",
            city="Jeddah",
            created_by=self.user_a,
            updated_by=self.user_a,
        )
        self.supplier_b = BusinessParty.objects.create(
            company=self.company_b,
            branch=self.branch_b,
            party_type=BusinessPartyType.SUPPLIER,
            party_kind=BusinessPartyKind.ORGANIZATION,
            status=BusinessPartyStatus.ACTIVE,
            code="SUP-B",
            display_name="Supplier B",
            mobile="0500000002",
            city="Riyadh",
            created_by=self.user_b,
            updated_by=self.user_b,
        )

    # ========================================================
    # Flexible factories
    # ========================================================

    def _create_company(
        self,
        *,
        code: str,
        display_name: str,
    ) -> Company:
        """
        Create Company while staying compatible with the current Company model.

        The project uses company_code as the unique company identifier.
        This helper supports both current and possible future naming.
        """
        fields = {
            field.name
            for field in Company._meta.fields
        }

        payload: dict[str, Any] = {}

        if "company_code" in fields:
            payload["company_code"] = code
        if "code" in fields:
            payload["code"] = code
        if "name" in fields:
            payload["name"] = display_name
        if "company_name" in fields:
            payload["company_name"] = display_name
        if "display_name" in fields:
            payload["display_name"] = display_name
        if "legal_name" in fields:
            payload["legal_name"] = display_name
        if "email" in fields:
            payload["email"] = f"{code.lower()}@example.com"
        if "phone" in fields:
            payload["phone"] = "0500000000"
        if "city" in fields:
            payload["city"] = "Jeddah"
        if "country" in fields:
            payload["country"] = "Saudi Arabia"
        if "currency" in fields:
            payload["currency"] = "SAR"
        if "currency_code" in fields:
            payload["currency_code"] = "SAR"
        if "is_active" in fields:
            payload["is_active"] = True

        return Company.objects.create(**payload)

    def _create_branch(
        self,
        *,
        company: Company,
        code: str,
        name: str,
    ) -> Branch:
        """
        Create Branch while staying compatible with the current Branch model.
        """
        fields = {
            field.name
            for field in Branch._meta.fields
        }

        payload: dict[str, Any] = {
            "company": company,
        }

        if "branch_code" in fields:
            payload["branch_code"] = code
        if "code" in fields:
            payload["code"] = code
        if "name" in fields:
            payload["name"] = name
        if "branch_name" in fields:
            payload["branch_name"] = name
        if "display_name" in fields:
            payload["display_name"] = name
        if "city" in fields:
            payload["city"] = "Jeddah"
        if "is_active" in fields:
            payload["is_active"] = True
        if "status" in fields:
            payload["status"] = "ACTIVE"

        return Branch.objects.create(**payload)

    def _create_profile(
        self,
        *,
        user,
        display_name: str,
        default_company: Company,
    ) -> UserProfile:
        """
        Create UserProfile safely for company API access.
        """
        return UserProfile.objects.create(
            user=user,
            display_name=display_name,
            default_company=default_company,
        )

    def _login_as_company_a(self) -> None:
        self.client.force_login(self.user_a)

    def _login_as_company_b(self) -> None:
        self.client.force_login(self.user_b)

    def _party_items_from_list_response(self, response) -> list[dict[str, Any]]:
        """
        Extract nested party items from paginated response.

        Current list API returns:
        {
            count,
            next,
            previous,
            results: {
                success,
                company,
                filters,
                choices,
                results: [...]
            }
        }
        """
        return response.data["results"]["results"]

    # ========================================================
    # Tests
    # ========================================================

    def test_guest_cannot_access_company_parties_list(self) -> None:
        response = self.client.get("/api/company/parties/")

        self.assertIn(response.status_code, [401, 403])

    def test_company_member_sees_only_own_company_parties(self) -> None:
        self._login_as_company_a()

        response = self.client.get("/api/company/parties/")

        self.assertEqual(response.status_code, 200)

        items = self._party_items_from_list_response(response)
        names = {
            item["display_name"]
            for item in items
        }

        self.assertIn("Customer A", names)
        self.assertNotIn("Supplier B", names)

    def test_company_member_cannot_read_other_company_party_detail(self) -> None:
        self._login_as_company_a()

        response = self.client.get(
            f"/api/company/parties/{self.supplier_b.id}/"
        )

        self.assertEqual(response.status_code, 404)

    def test_create_customer_uses_current_membership_company(self) -> None:
        self._login_as_company_a()

        response = self.client.post(
            "/api/company/parties/create/",
            data={
                "company_id": self.company_b.id,
                "branch_id": self.branch_a.id,
                "party_type": BusinessPartyType.CUSTOMER,
                "party_kind": BusinessPartyKind.INDIVIDUAL,
                "code": "CUS-FRONTEND-IGNORED",
                "display_name": "Created Customer A",
                "mobile": "0555555555",
                "city": "Jeddah",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        party = BusinessParty.objects.get(code="CUS-FRONTEND-IGNORED")
        self.assertEqual(party.company_id, self.company_a.id)
        self.assertNotEqual(party.company_id, self.company_b.id)

    def test_create_party_rejects_branch_from_other_company(self) -> None:
        self._login_as_company_a()

        response = self.client.post(
            "/api/company/parties/create/",
            data={
                "branch_id": self.branch_b.id,
                "party_type": BusinessPartyType.CUSTOMER,
                "party_kind": BusinessPartyKind.INDIVIDUAL,
                "code": "CUS-WRONG-BRANCH",
                "display_name": "Wrong Branch Customer",
                "mobile": "0555555556",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(
            BusinessParty.objects.filter(code="CUS-WRONG-BRANCH").exists()
        )

    def test_update_party_keeps_original_company_even_if_company_id_sent(self) -> None:
        self._login_as_company_a()

        response = self.client.patch(
            f"/api/company/parties/{self.customer_a.id}/",
            data={
                "company_id": self.company_b.id,
                "branch_id": self.branch_a.id,
                "display_name": "Updated Customer A",
                "party_type": BusinessPartyType.CUSTOMER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.customer_a.refresh_from_db()
        self.assertEqual(self.customer_a.display_name, "Updated Customer A")
        self.assertEqual(self.customer_a.company_id, self.company_a.id)

    def test_status_action_deactivates_party_inside_current_company(self) -> None:
        self._login_as_company_a()

        response = self.client.post(
            f"/api/company/parties/{self.customer_a.id}/deactivate/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.customer_a.refresh_from_db()
        self.assertEqual(self.customer_a.status, BusinessPartyStatus.INACTIVE)

    def test_status_action_cannot_change_other_company_party(self) -> None:
        self._login_as_company_a()

        response = self.client.post(
            f"/api/company/parties/{self.supplier_b.id}/deactivate/",
            data={},
            format="json",
        )

        self.assertEqual(response.status_code, 404)

        self.supplier_b.refresh_from_db()
        self.assertEqual(self.supplier_b.status, BusinessPartyStatus.ACTIVE)