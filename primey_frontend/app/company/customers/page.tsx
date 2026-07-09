"use client";
/* ============================================================
   📂 primey_frontend/app/company/customers/page.tsx
   🧠 PrimeyAcc — Company Customers Page
   ------------------------------------------------------------
   ✅ Approved Premium company pattern
   ✅ Real API only
   ✅ Uses /api/company/customers/
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import { CompanyPartiesPage } from "@/app/company/_components/company-parties-page";
export default function CompanyCustomersPage() {
  return <CompanyPartiesPage variant="customers" />;
}
