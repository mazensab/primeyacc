from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.branch_access import configure_branch_access
from accounts.branch_enforcement import (
    BranchEnforcementError,
    enforce_object_branch_access,
    object_branch_id,
    resolve_operational_branch,
    scope_queryset_to_accessible_branches,
    scope_queryset_to_branch,
)
from accounts.models import (
    BranchAccessMode,
    CompanyMembership,
    CompanyMembershipBranchPolicy,
)
from companies.models import Branch, Company


class _Nested:
    pass


class BranchEnforcementTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="v225d-enforcement"
        )
        self.company = Company.objects.create(
            name="V225D Company",
            company_code="V225D-COMPANY",
            status="ACTIVE",
            is_active=True,
        )
        self.other_company = Company.objects.create(
            name="V225D Other",
            company_code="V225D-OTHER",
            status="ACTIVE",
            is_active=True,
        )
        self.a = Branch.objects.create(
            company=self.company,
            name="A",
            branch_code="V225D-A",
            status="ACTIVE",
            is_active=True,
            is_default=True,
        )
        self.b = Branch.objects.create(
            company=self.company,
            name="B",
            branch_code="V225D-B",
            status="ACTIVE",
            is_active=True,
        )
        self.other = Branch.objects.create(
            company=self.other_company,
            name="Other",
            branch_code="V225D-X",
            status="ACTIVE",
            is_active=True,
            is_default=True,
        )
        self.membership = CompanyMembership.objects.create(
            user=self.user,
            company=self.company,
            role="ADMIN",
            status="ACTIVE",
        )

    def test_unresolved_operational_context_fails_closed(self):
        CompanyMembershipBranchPolicy.objects.create(
            membership=self.membership
        )
        with self.assertRaises(BranchEnforcementError):
            resolve_operational_branch(
                self.membership,
                self.a.id,
            )

    def test_restricted_rejects_ungranted_direct_object(self):
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.RESTRICTED,
            branch_ids=[self.a.id],
            default_branch_id=self.a.id,
        )
        with self.assertRaises(BranchEnforcementError):
            enforce_object_branch_access(
                self.b,
                self.membership,
            )

    def test_direct_queryset_is_one_authorized_branch(self):
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.ALL,
            default_branch_id=self.a.id,
        )
        qs = scope_queryset_to_branch(
            Branch.objects.filter(company=self.company),
            self.membership,
            self.b.id,
            branch_lookup="id",
        )
        self.assertEqual(
            list(qs.values_list("id", flat=True)),
            [self.b.id],
        )

    def test_consolidated_read_returns_only_accessible_branches(self):
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.RESTRICTED,
            branch_ids=[self.a.id],
            default_branch_id=self.a.id,
        )
        qs = scope_queryset_to_accessible_branches(
            Branch.objects.all(),
            self.membership,
            branch_lookup="id",
        )
        self.assertEqual(
            set(qs.values_list("id", flat=True)),
            {self.a.id},
        )

    def test_inactive_historical_branch_is_not_operational(self):
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.ALL,
            default_branch_id=self.a.id,
        )
        self.b.deactivate()
        with self.assertRaises(BranchEnforcementError):
            resolve_operational_branch(
                self.membership,
                self.b.id,
            )

    def test_indirect_object_branch_path(self):
        obj = _Nested()
        obj.warehouse = _Nested()
        obj.warehouse.branch_id = self.a.id
        self.assertEqual(
            object_branch_id(
                obj,
                branch_attr="warehouse.branch_id",
            ),
            self.a.id,
        )

    def test_cross_company_branch_rejected(self):
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.ALL,
            default_branch_id=self.a.id,
        )
        with self.assertRaises(BranchEnforcementError):
            resolve_operational_branch(
                self.membership,
                self.other.id,
            )

    def test_branch_permission_cannot_expand_company_permission(self):
        configure_branch_access(
            self.membership,
            mode=BranchAccessMode.RESTRICTED,
            branch_ids=[self.a.id],
            default_branch_id=self.a.id,
            permissions_by_branch={
                self.a.id: ["company.permission.that.admin.does.not.have"],
            },
        )
        with self.assertRaises(BranchEnforcementError):
            resolve_operational_branch(
                self.membership,
                self.a.id,
                permission="company.permission.that.admin.does.not.have",
            )
