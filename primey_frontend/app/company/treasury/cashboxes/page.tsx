"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/cashboxes/page.tsx
   🧠 PrimeyAcc — Company Treasury Cashboxes Page
   ------------------------------------------------------------
   ✅ Approved Premium company operational pattern
   ✅ Real API only
   ✅ Uses /api/company/treasury/accounts/?account_type=CASH
   ✅ Create / edit / activate / deactivate
   ✅ No delete action
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import { TreasuryAccountsPage } from "../_components/treasury-accounts-page";
export default function CompanyTreasuryCashboxesPage() {
  return <TreasuryAccountsPage variant="cashboxes" />;
}
