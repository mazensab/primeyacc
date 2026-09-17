from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from accounts.models import BranchAccessMode, CompanyMembership, CompanyMembershipBranchGrant, CompanyMembershipBranchPolicy
from companies.models import Branch, Company

class BranchAccessFoundationTests(TestCase):
    def setUp(self):
        U=get_user_model(); self.user=U.objects.create_user(username="v225c-user")
        self.company=Company.objects.create(name="V225C Company",company_code="V225C-COMPANY",status="ACTIVE",is_active=True)
        self.other_company=Company.objects.create(name="Other",company_code="V225C-OTHER",status="ACTIVE",is_active=True)
        self.a=Branch.objects.create(company=self.company,name="A",branch_code="A",status="ACTIVE",is_active=True,is_default=True)
        self.b=Branch.objects.create(company=self.company,name="B",branch_code="B",status="ACTIVE",is_active=True)
        self.other=Branch.objects.create(company=self.other_company,name="Other",branch_code="OTHER",status="ACTIVE",is_active=True,is_default=True)
        self.m=CompanyMembership.objects.create(user=self.user,company=self.company,role="ADMIN",status="ACTIVE")

    def test_legacy_unresolved_fails_closed(self):
        p=CompanyMembershipBranchPolicy.objects.create(membership=self.m)
        self.assertEqual(p.mode,BranchAccessMode.LEGACY_UNRESOLVED); self.assertFalse(p.branch_is_explicitly_allowed(self.a))

    def test_all_same_company_active_only(self):
        p=CompanyMembershipBranchPolicy.objects.create(membership=self.m,mode=BranchAccessMode.ALL,default_branch=self.a)
        self.assertTrue(p.branch_is_explicitly_allowed(self.a)); self.assertTrue(p.branch_is_explicitly_allowed(self.b)); self.assertFalse(p.branch_is_explicitly_allowed(self.other))

    def test_restricted_requires_grant(self):
        p=CompanyMembershipBranchPolicy.objects.create(membership=self.m,mode=BranchAccessMode.RESTRICTED)
        CompanyMembershipBranchGrant.objects.create(policy=p,branch=self.a,permissions=["company.sales.view"])
        self.assertTrue(p.branch_is_explicitly_allowed(self.a)); self.assertFalse(p.branch_is_explicitly_allowed(self.b))

    def test_cross_company_policy_rejected(self):
        p=CompanyMembershipBranchPolicy(membership=self.m,mode=BranchAccessMode.RESTRICTED,default_branch=self.other)
        with self.assertRaises(ValidationError): p.full_clean()

    def test_cross_company_grant_rejected(self):
        p=CompanyMembershipBranchPolicy.objects.create(membership=self.m,mode=BranchAccessMode.RESTRICTED)
        with self.assertRaises(ValidationError): CompanyMembershipBranchGrant(policy=p,branch=self.other).full_clean()

    def test_permissions_normalized(self):
        p=CompanyMembershipBranchPolicy.objects.create(membership=self.m,mode=BranchAccessMode.RESTRICTED)
        g=CompanyMembershipBranchGrant.objects.create(policy=p,branch=self.a,permissions=["company.sales.view","","company.sales.view"])
        self.assertEqual(g.permissions,["company.sales.view"])
