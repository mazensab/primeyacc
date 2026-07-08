"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/receipt-vouchers/page.tsx
   🧠 PrimeyAcc — Company Treasury Receipt Vouchers Page
   ------------------------------------------------------------
   ✅ Approved Premium company operational pattern
   ✅ Real API only
   ✅ Uses /api/company/treasury/customer-payments/
   ✅ Create / edit draft / confirm / cancel
   ✅ No delete action
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import { TreasuryPaymentVouchersPage } from "../_components/treasury-payment-vouchers-page";
export default function CompanyTreasuryReceiptVouchersPage() {
  return <TreasuryPaymentVouchersPage variant="receipt" />;
}
