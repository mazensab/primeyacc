"use client";
/* ============================================================
   📂 primey_frontend/app/company/suppliers/page.tsx
   🧠 PrimeyAcc — Company Suppliers Page
   ------------------------------------------------------------
   ✅ Approved Premium company pattern
   ✅ Real API only
   ✅ Uses /api/company/suppliers/
   ✅ SAR icon from /currency/sar.svg
============================================================ */
import { CompanyPartiesPage } from "@/app/company/_components/company-parties-page";
export default function CompanySuppliersPage() {
  return <CompanyPartiesPage variant="suppliers" />;
}
