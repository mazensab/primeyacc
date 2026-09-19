from django.test import TestCase
from django.urls import resolve
from companies.models import Branch,Company
from documents.models import DocumentSequence,DocumentSequenceScope,DocumentType,PrintProfile
from documents.services import next_document_number,resolve_print_profile

class V225FAPIContractTests(TestCase):
    def setUp(self):
        self.company=Company.objects.create(name="V25F API",company_code="V25F-API")
        self.branch=Branch.objects.create(company=self.company,name="Main",branch_code="MAIN")
    def test_routes_exist(self):
        self.assertEqual(resolve("/api/company/documents/print-profiles/").url_name,"print_profiles")
        self.assertEqual(resolve("/api/company/documents/sequences/").url_name,"sequences")
    def test_branch_profile_resolution(self):
        p=PrintProfile.objects.create(company=self.company,branch=self.branch,name="Branch POS",document_type=DocumentType.POS_RECEIPT,is_default=True)
        self.assertEqual(resolve_print_profile(company=self.company,document_type=DocumentType.POS_RECEIPT,branch=self.branch),p)
    def test_branch_sequence_contract(self):
        v=next_document_number(company=self.company,key="API_TEST",prefix="API-",scope=DocumentSequenceScope.BRANCH,branch=self.branch)
        self.assertEqual(v,"API-000001")
        self.assertEqual(DocumentSequence.objects.get(key="API_TEST").branch_id,self.branch.id)
