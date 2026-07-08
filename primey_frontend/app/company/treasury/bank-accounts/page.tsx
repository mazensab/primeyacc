"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/bank-accounts/page.tsx
   🧠 PrimeyAcc — Company Treasury Bank Accounts Page
   ------------------------------------------------------------
   ✅ Approved Premium company operational pattern
   ✅ Real API only
   ✅ Uses /api/company/treasury/accounts/?account_type=BANK
   ✅ Create / edit / activate / deactivate
   ✅ No delete action
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import { TreasuryAccountsPage } from "../_components/treasury-accounts-page";
export default function CompanyTreasuryBankAccountsPage() {
  return <TreasuryAccountsPage variant="bankAccounts" />;
}
