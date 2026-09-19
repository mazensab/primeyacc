from decimal import Decimal
from django.test import TestCase
from django.utils import timezone
from accounting.models import CostCenter, CostCenterStatus
from accounting.services import AccountingPostingError, EntryLinePayload, create_manual_journal_entry, get_account_by_code, reverse_journal_entry, seed_company_chart_of_accounts
from companies.models import Branch, Company

class V225EB1BranchDimensionContractTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company=Company.objects.create(name="25E Company",company_code="V25E",status="ACTIVE",is_active=True)
        cls.other=Company.objects.create(name="25E Other",company_code="V25EO",status="ACTIVE",is_active=True)
        cls.a=Branch.objects.create(company=cls.company,name="A",branch_code="25EA",status="ACTIVE",is_active=True,is_default=True)
        cls.b=Branch.objects.create(company=cls.company,name="B",branch_code="25EB",status="ACTIVE",is_active=True)
        cls.foreign=Branch.objects.create(company=cls.other,name="F",branch_code="25EF",status="ACTIVE",is_active=True,is_default=True)
        seed_company_chart_of_accounts(cls.company)
        cls.cash=get_account_by_code(cls.company,"110101")
        cls.equity=get_account_by_code(cls.company,"3201")

    def lines(self,cc=None):
        return [EntryLinePayload(account=self.cash,debit_amount=Decimal("100.00"),cost_center=cc),EntryLinePayload(account=self.equity,credit_amount=Decimal("100.00"),cost_center=cc)]

    def test_branch_propagates_header_to_lines(self):
        e=create_manual_journal_entry(company=self.company,branch=self.a,entry_date=timezone.localdate(),lines=self.lines())
        self.assertEqual(e.branch_id,self.a.id)
        self.assertEqual(set(e.lines.values_list('branch_id',flat=True)),{self.a.id})

    def test_cross_company_branch_rejected(self):
        with self.assertRaises(AccountingPostingError):
            create_manual_journal_entry(company=self.company,branch=self.foreign,entry_date=timezone.localdate(),lines=self.lines())

    def test_same_branch_cost_center_allowed(self):
        cc=CostCenter.objects.create(company=self.company,branch=self.a,code="CCA",name="CCA",status=CostCenterStatus.ACTIVE)
        e=create_manual_journal_entry(company=self.company,branch=self.a,entry_date=timezone.localdate(),lines=self.lines(cc))
        self.assertEqual(set(e.lines.values_list('cost_center_id',flat=True)),{cc.id})

    def test_cross_branch_cost_center_rejected(self):
        cc=CostCenter.objects.create(company=self.company,branch=self.b,code="CCB",name="CCB",status=CostCenterStatus.ACTIVE)
        with self.assertRaises(AccountingPostingError):
            create_manual_journal_entry(company=self.company,branch=self.a,entry_date=timezone.localdate(),lines=self.lines(cc))

    def test_company_wide_cost_center_allowed(self):
        cc=CostCenter.objects.create(company=self.company,branch=None,code="CCALL",name="CCALL",status=CostCenterStatus.ACTIVE)
        e=create_manual_journal_entry(company=self.company,branch=self.a,entry_date=timezone.localdate(),lines=self.lines(cc))
        self.assertEqual(set(e.lines.values_list('cost_center_id',flat=True)),{cc.id})

    def test_reversal_preserves_branch(self):
        e=create_manual_journal_entry(company=self.company,branch=self.a,entry_date=timezone.localdate(),lines=self.lines(),auto_post=True)
        r=reverse_journal_entry(e)
        self.assertEqual(r.branch_id,self.a.id)
        self.assertEqual(set(r.lines.values_list('branch_id',flat=True)),{self.a.id})
