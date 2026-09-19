from django.core.exceptions import ValidationError
from django.test import TestCase
from companies.models import Branch
from treasury.models import PaymentMethod, TreasuryAccount
from treasury.services import create_customer_payment, create_supplier_payment
from treasury.tests import MhamcloudTestFactoryMixin, TreasuryPaymentAllocationServiceTests

class TreasuryBranchContractTests(MhamcloudTestFactoryMixin, TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company_a=cls.create_company(name="B2 Contract A",code="B2-CA",email="b2ca@example.com")
        cls.company_b=cls.create_company(name="B2 Contract B",code="B2-CB",email="b2cb@example.com")
        cls.branch_a=Branch.objects.create(company=cls.company_a,name="B2 A",branch_code="B2-A",is_active=True,is_default=True)
        cls.branch_a2=Branch.objects.create(company=cls.company_a,name="B2 A2",branch_code="B2-A2",is_active=True)
        cls.branch_b=Branch.objects.create(company=cls.company_b,name="B2 B",branch_code="B2-B",is_active=True,is_default=True)
        cls.account=TreasuryAccount.objects.create(company=cls.company_a,name="B2 Cash",code="B2-CASH",account_type=TreasuryAccount.AccountType.CASH,currency="SAR")

    def test_independent_customer_payment_keeps_explicit_branch(self):
        p=create_customer_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,branch=self.branch_a,customer_name="C")
        self.assertEqual(p.branch_id,self.branch_a.id)

    def test_independent_supplier_payment_keeps_explicit_branch(self):
        p=create_supplier_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,branch=self.branch_a,supplier_name="S")
        self.assertEqual(p.branch_id,self.branch_a.id)

    def test_cross_company_explicit_branch_rejected(self):
        with self.assertRaises(ValidationError):
            create_customer_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,branch=self.branch_b,customer_name="C")

    def test_linked_customer_inherits_document_branch(self):
        invoice=TreasuryPaymentAllocationServiceTests.create_sales_invoice(company=self.company_a,branch=self.branch_a,total="100",invoice_number="B2-SI")
        p=create_customer_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,sales_invoice=invoice,customer_name="C")
        self.assertEqual(p.branch_id,self.branch_a.id)

    def test_linked_customer_cross_branch_rejected(self):
        invoice=TreasuryPaymentAllocationServiceTests.create_sales_invoice(company=self.company_a,branch=self.branch_a,total="100",invoice_number="B2-SI-X")
        with self.assertRaises(ValidationError):
            create_customer_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,sales_invoice=invoice,branch=self.branch_a2,customer_name="C")

    def test_linked_supplier_inherits_document_branch(self):
        supplier=TreasuryPaymentAllocationServiceTests.create_business_party(company=self.company_a,name="B2 Supplier",code="B2-SUP",party_type="SUPPLIER")
        bill=TreasuryPaymentAllocationServiceTests.create_purchase_bill(company=self.company_a,branch=self.branch_a,supplier=supplier,total="100",bill_number="B2-PB")
        p=create_supplier_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,purchase_bill=bill,supplier_name="S")
        self.assertEqual(p.branch_id,self.branch_a.id)

    def test_linked_supplier_cross_branch_rejected(self):
        supplier=TreasuryPaymentAllocationServiceTests.create_business_party(company=self.company_a,name="B2 Supplier X",code="B2-SUP-X",party_type="SUPPLIER")
        bill=TreasuryPaymentAllocationServiceTests.create_purchase_bill(company=self.company_a,branch=self.branch_a,supplier=supplier,total="100",bill_number="B2-PB-X")
        with self.assertRaises(ValidationError):
            create_supplier_payment(company=self.company_a,treasury_account=self.account,amount="10",payment_method=PaymentMethod.CASH,purchase_bill=bill,branch=self.branch_a2,supplier_name="S")
