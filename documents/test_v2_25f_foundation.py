from django.test import TestCase
from companies.models import Branch, Company
from documents.models import DocumentSequence, DocumentSequenceScope
from documents.services import get_branch_operations_config, next_document_number

class V225FFoundationTests(TestCase):
    def setUp(self):
        self.company=Company.objects.create(name="V25F",company_code="V25F")
        self.branch=Branch.objects.create(company=self.company,name="Main",branch_code="MAIN",settings_data={"operations":{"receipt_copies":2}})

    def test_company_sequence(self):
        self.assertEqual(next_document_number(company=self.company,key="POS_REGISTER"),"POS-R-000001")
        self.assertEqual(next_document_number(company=self.company,key="POS_REGISTER"),"POS-R-000002")
        self.assertEqual(DocumentSequence.objects.count(),1)

    def test_branch_sequence(self):
        self.assertEqual(next_document_number(company=self.company,key="CUSTOM",prefix="BR-",scope=DocumentSequenceScope.BRANCH,branch=self.branch),"BR-000001")

    def test_branch_operations_config(self):
        self.assertEqual(get_branch_operations_config(self.branch)["receipt_copies"],2)
