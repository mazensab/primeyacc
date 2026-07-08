"use client";
/* ============================================================
   📂 primey_frontend/app/company/treasury/payment-vouchers/page.tsx
   🧠 PrimeyAcc — Company Treasury Payment Vouchers Page
   ------------------------------------------------------------
   ✅ Approved Premium company operational pattern
   ✅ Real API only
   ✅ Uses /api/company/treasury/supplier-payments/
   ✅ Create / edit draft / confirm / cancel
   ✅ No delete action
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import { TreasuryPaymentVouchersPage } from "../_components/treasury-payment-vouchers-page";
export default function CompanyTreasuryPaymentVouchersPage() {
  return <TreasuryPaymentVouchersPage variant="payment" />;
}
