from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from accounts.branch_access import BranchAccessDenied, accessible_branches, configure_branch_access, has_branch_permission, resolve_branch, set_last_active_branch
from accounts.models import BranchAccessMode, CompanyMembership, CompanyMembershipBranchPolicy
from companies.models import Branch, Company

class BranchAccessContractTests(TestCase):
    def setUp(self):
        U=get_user_model(); self.u=U.objects.create_user(username="v225c-contract")
        self.c=Company.objects.create(name="C",company_code="V225C-C",status="ACTIVE",is_active=True)
        self.o=Company.objects.create(name="O",company_code="V225C-O",status="ACTIVE",is_active=True)
        self.a=Branch.objects.create(company=self.c,name="A",branch_code="A",status="ACTIVE",is_active=True,is_default=True)
        self.b=Branch.objects.create(company=self.c,name="B",branch_code="B",status="ACTIVE",is_active=True)
        self.x=Branch.objects.create(company=self.o,name="X",branch_code="X",status="ACTIVE",is_active=True,is_default=True)
        self.m=CompanyMembership.objects.create(user=self.u,company=self.c,role="ADMIN",status="ACTIVE")

    def test_unresolved_fail_closed(self):
        CompanyMembershipBranchPolicy.objects.create(membership=self.m)
        self.assertEqual(accessible_branches(self.m).count(),0)
        with self.assertRaises(BranchAccessDenied): resolve_branch(self.m,self.a.id,required=True)

    def test_all_and_cross_company(self):
        configure_branch_access(self.m,mode=BranchAccessMode.ALL,default_branch_id=self.a.id)
        self.assertEqual(set(accessible_branches(self.m).values_list("id",flat=True)),{self.a.id,self.b.id})
        with self.assertRaises(BranchAccessDenied): resolve_branch(self.m,self.x.id,required=True)

    def test_restricted_and_default(self):
        configure_branch_access(self.m,mode=BranchAccessMode.RESTRICTED,branch_ids=[self.a.id],default_branch_id=self.a.id)
        self.assertEqual(resolve_branch(self.m).id,self.a.id)
        with self.assertRaises(BranchAccessDenied): resolve_branch(self.m,self.b.id,required=True)
        with self.assertRaises(ValidationError): configure_branch_access(self.m,mode=BranchAccessMode.RESTRICTED,branch_ids=[self.a.id],default_branch_id=self.b.id)

    def test_inactive_rejected(self):
        self.b.deactivate()
        with self.assertRaises(ValidationError): configure_branch_access(self.m,mode=BranchAccessMode.RESTRICTED,branch_ids=[self.b.id])

    def test_last_active_authorized_only(self):
        configure_branch_access(self.m,mode=BranchAccessMode.RESTRICTED,branch_ids=[self.a.id])
        self.assertEqual(set_last_active_branch(self.m,self.a.id).id,self.a.id)
        with self.assertRaises(BranchAccessDenied): set_last_active_branch(self.m,self.b.id)

    def test_branch_permissions_narrow(self):
        configure_branch_access(self.m,mode=BranchAccessMode.RESTRICTED,branch_ids=[self.a.id],permissions_by_branch={self.a.id:["company.sales.view"]})
        self.assertTrue(has_branch_permission(self.m,"company.sales.view",branch_id=self.a.id))
        self.assertFalse(has_branch_permission(self.m,"company.sales.create",branch_id=self.a.id))
