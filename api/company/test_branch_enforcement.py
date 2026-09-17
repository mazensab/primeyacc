from django.contrib.auth import get_user_model
from django.test import RequestFactory, TestCase

from accounts.branch_access import configure_branch_access
from accounts.models import BranchAccessMode, CompanyMembership
from companies.models import Branch, Company
from sales.models import SalesInvoice
from api.company.branch_enforcement import (
    require_object_branch,
    require_operational_branch,
    scope_operational_queryset,
)


class CompanyOperationalBranchEnforcementTests(TestCase):
    def setUp(self):
        U = get_user_model()
        self.user = U.objects.create_user(username="v225d-domain")
        self.company = Company.objects.create(
            name="V225D Domain",
            company_code="V225D-DOMAIN",
            status="ACTIVE",
            is_active=True,
        )
        self.a = Branch.objects.create(
            company=self.company,
            name="A",
            branch_code="V225D-DA",
            status="ACTIVE",
            is_active=True,
            is_default=True,
        )
        self.b = Branch.objects.create(
            company=self.company,
            name="B",
            branch_code="V225D-DB",
            status="ACTIVE",
            is_active=True,
        )
        self.membership = CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role="ADMIN",
            status="ACTIVE",
        )
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.RESTRICTED,
            branch_ids=[self.a.id],
            default_branch_id=self.a.id,
        )
        self.rf = RequestFactory()

    def request(self, method="get", data=None):
        req = getattr(self.rf, method.lower())("/", data=data or {})
        req.user = self.user
        req.company = self.company
        req.company_membership = self.membership
        return req

    def test_restricted_selector_rejects_other_branch(self):
        with self.assertRaises(Exception):
            require_operational_branch(
                self.request(),
                branch_id=self.b.id,
            )

    def test_consolidated_queryset_is_accessible_only(self):
        qs = scope_operational_queryset(
            Branch.objects.filter(company=self.company),
            self.request(),
            branch_lookup="id",
        )
        self.assertEqual(
            set(qs.values_list("id", flat=True)),
            {self.a.id},
        )

    def test_direct_object_other_branch_rejected(self):
        obj = type("Obj", (), {"branch_id": self.b.id})()
        with self.assertRaises(Exception):
            require_object_branch(
                self.request(),
                obj,
            )
