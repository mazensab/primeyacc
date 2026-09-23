from types import SimpleNamespace
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from accounts.branch_access import BranchAccessDenied, accessible_branches, configure_branch_access, resolve_branch, set_last_active_branch
from accounts.branch_enforcement import BranchEnforcementError, enforce_object_branch_access, resolve_operational_branch, scope_queryset_to_accessible_branches, scope_queryset_to_branch
from accounts.models import BranchAccessMode, CompanyMembership, CompanyMembershipBranchPolicy
from accounting.models import CostCenter, CostCenterStatus
from companies.models import ActivityProfile, Branch, Company
from documents.models import DocumentSequence, DocumentSequenceScope, DocumentType, PrintProfile
from documents.services import next_document_number, resolve_print_profile
from pos.services import generate_pos_order_number, generate_pos_register_code, generate_pos_return_number, generate_pos_session_number

class V225HFinalBranchPlatformIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        U=get_user_model(); cls.user=U.objects.create_user(username="v225h-platform-user")
        cls.company=Company.objects.create(name="Company ABC",company_code="V225H-ABC",status="ACTIVE",is_active=True,activity_profile="GENERAL")
        cls.other_company=Company.objects.create(name="Company XYZ",company_code="V225H-XYZ",status="ACTIVE",is_active=True,activity_profile="GENERAL")
        cls.commerce_profile,_=ActivityProfile.objects.get_or_create(code="COMMERCE",company=None,defaults={"name":"Commerce","name_ar":"Commerce","name_en":"Commerce","is_active":True,"is_system":True})
        cls.services_profile,_=ActivityProfile.objects.get_or_create(code="SERVICES",company=None,defaults={"name":"Services","name_ar":"Services","name_en":"Services","is_active":True,"is_system":True})
        cls.restaurant_profile,_=ActivityProfile.objects.get_or_create(code="RESTAURANT",company=None,defaults={"name":"Restaurant","name_ar":"Restaurant","name_en":"Restaurant","is_active":True,"is_system":True})
        cls.riyadh=Branch.objects.create(company=cls.company,name="Riyadh Branch",branch_code="V225H-RUH",status="ACTIVE",is_active=True,is_default=True,activity_profile=cls.commerce_profile)
        cls.jeddah=Branch.objects.create(company=cls.company,name="Jeddah Workshop",branch_code="V225H-JED",status="ACTIVE",is_active=True,activity_profile=cls.services_profile)
        cls.khobar=Branch.objects.create(company=cls.company,name="Khobar Cafe",branch_code="V225H-KHB",status="ACTIVE",is_active=True,activity_profile=cls.restaurant_profile)
        cls.inactive=Branch.objects.create(company=cls.company,name="Historical Inactive",branch_code="V225H-HIST",status="INACTIVE",is_active=False)
        cls.foreign=Branch.objects.create(company=cls.other_company,name="Foreign Branch",branch_code="V225H-X",status="ACTIVE",is_active=True,is_default=True)
        cls.membership=CompanyMembership.objects.create(user=cls.user,company=cls.company,role="OWNER",status="ACTIVE",is_primary=True)
        configure_branch_access(cls.membership,mode=BranchAccessMode.RESTRICTED,branch_ids=[cls.riyadh.id,cls.jeddah.id],default_branch_id=cls.riyadh.id)

    def test_restricted_switching_and_denials(self):
        self.assertEqual(set(accessible_branches(self.membership).values_list("id",flat=True)),{self.riyadh.id,self.jeddah.id})
        self.assertEqual(resolve_branch(self.membership).id,self.riyadh.id)
        self.assertEqual(set_last_active_branch(self.membership,self.jeddah.id).id,self.jeddah.id)
        self.membership.refresh_from_db(); self.assertEqual(resolve_branch(self.membership).id,self.jeddah.id)
        for branch in (self.khobar,self.foreign,self.inactive):
            with self.assertRaises(BranchAccessDenied): resolve_branch(self.membership,branch.id,required=True)

    def test_all_restricted_legacy_unresolved(self):
        u=get_user_model().objects.create_user(username="v225h-edge")
        m=CompanyMembership.objects.create(user=u,company=self.company,role="OWNER",status="ACTIVE")
        CompanyMembershipBranchPolicy.objects.create(membership=m)
        self.assertEqual(accessible_branches(m).count(),0)
        with self.assertRaises(BranchAccessDenied): resolve_branch(m,self.riyadh.id,required=True)
        configure_branch_access(m,mode=BranchAccessMode.ALL,default_branch_id=self.riyadh.id)
        m.refresh_from_db()
        self.assertEqual(set(accessible_branches(m).values_list("id",flat=True)),{self.riyadh.id,self.jeddah.id,self.khobar.id})
        configure_branch_access(m,mode=BranchAccessMode.RESTRICTED,branch_ids=[self.jeddah.id],default_branch_id=self.jeddah.id)
        m.refresh_from_db()
        self.assertEqual(set(accessible_branches(m).values_list("id",flat=True)),{self.jeddah.id})

    def test_direct_object_and_queryset_isolation(self):
        self.assertEqual(resolve_operational_branch(self.membership,self.riyadh.id).id,self.riyadh.id)
        for obj in (self.khobar,self.foreign):
            with self.assertRaises(BranchEnforcementError): enforce_object_branch_access(obj,self.membership)
        direct=scope_queryset_to_branch(Branch.objects.filter(company=self.company),self.membership,self.jeddah.id,branch_lookup="id")
        self.assertEqual(list(direct.values_list("id",flat=True)),[self.jeddah.id])
        allq=scope_queryset_to_accessible_branches(Branch.objects.filter(company=self.company),self.membership,branch_lookup="id")
        self.assertEqual(set(allq.values_list("id",flat=True)),{self.riyadh.id,self.jeddah.id})

    def test_effective_activity_and_commerce_compatibility(self):
        self.assertEqual(self.riyadh.effective_activity_code,"COMMERCE")
        self.assertEqual(self.jeddah.effective_activity_code,"SERVICES")
        self.assertEqual(self.khobar.effective_activity_code,"RESTAURANT")
        original=self.company.activity_profile
        try:
            for code in ("GENERAL","RETAIL","WHOLESALE"):
                self.company.activity_profile=code; self.company.activity_profile_ref=None; self.company.save(update_fields=["activity_profile","activity_profile_ref","updated_at"]); self.company.refresh_from_db()
                self.assertEqual(self.company.effective_activity_code,"COMMERCE")
        finally:
            self.company.activity_profile=original; self.company.activity_profile_ref=None; self.company.save(update_fields=["activity_profile","activity_profile_ref","updated_at"])

    def test_cost_center_isolation(self):
        ruh=CostCenter.objects.create(company=self.company,branch=self.riyadh,code="V25H-RUH-CC",name="Riyadh CC",status=CostCenterStatus.ACTIVE)
        jed=CostCenter.objects.create(company=self.company,branch=self.jeddah,code="V25H-JED-CC",name="Jeddah CC",status=CostCenterStatus.ACTIVE)
        self.assertNotEqual(ruh.branch_id,jed.branch_id)
        with self.assertRaises(ValidationError):
            CostCenter(company=self.company,branch=self.foreign,code="V25H-BAD",name="Bad",status=CostCenterStatus.ACTIVE).full_clean()

    def test_document_sequence_and_print_profile_isolation(self):
        self.assertEqual(next_document_number(company=self.company,key="V25H_DOC",prefix="RUH-",scope=DocumentSequenceScope.BRANCH,branch=self.riyadh),"RUH-000001")
        self.assertEqual(next_document_number(company=self.company,key="V25H_DOC",prefix="JED-",scope=DocumentSequenceScope.BRANCH,branch=self.jeddah),"JED-000001")
        self.assertEqual(DocumentSequence.objects.filter(company=self.company,key="V25H_DOC",scope=DocumentSequenceScope.BRANCH).count(),2)
        company_profile=PrintProfile.objects.create(company=self.company,name="Company Receipt",document_type=DocumentType.POS_RECEIPT,is_default=True)
        riyadh_profile=PrintProfile.objects.create(company=self.company,branch=self.riyadh,name="Riyadh Receipt",document_type=DocumentType.POS_RECEIPT,is_default=True)
        self.assertEqual(resolve_print_profile(company=self.company,document_type=DocumentType.POS_RECEIPT,branch=self.riyadh),riyadh_profile)
        self.assertEqual(resolve_print_profile(company=self.company,document_type=DocumentType.POS_RECEIPT,branch=self.jeddah),company_profile)

    def test_pos_numbering_must_be_branch_isolated(self):
        generators=(("POS_REGISTER",generate_pos_register_code),("POS_SESSION",generate_pos_session_number),("POS_ORDER",generate_pos_order_number),("POS_RETURN",generate_pos_return_number))
        for key,generator in generators:
            try:
                generator(self.company,branch=self.riyadh); generator(self.company,branch=self.jeddah)
            except TypeError as exc:
                self.fail(f"{key} generator does not accept branch context; 25H isolation missing: {exc}")
            rows=DocumentSequence.objects.filter(company=self.company,key=key)
            self.assertEqual(rows.count(),2,f"{key} must maintain two branch sequences")
            self.assertEqual(set(rows.values_list("branch_id",flat=True)),{self.riyadh.id,self.jeddah.id})

    def test_historical_inactive_relation_preserved_not_operational(self):
        holder=SimpleNamespace(branch_id=self.inactive.id)
        self.assertTrue(Branch.objects.filter(pk=holder.branch_id,is_active=False).exists())
        with self.assertRaises(BranchEnforcementError): enforce_object_branch_access(holder,self.membership)

    def test_cross_company_document_dimension_rejected(self):
        with self.assertRaises(ValidationError):
            next_document_number(company=self.company,key="V25H_FOREIGN",prefix="X-",scope=DocumentSequenceScope.BRANCH,branch=self.foreign)

