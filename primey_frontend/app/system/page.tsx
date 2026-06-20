/* ============================================================
   📂 app/system/page.tsx
   🧠 PrimeyAcc | Real System Dashboard — Phase 5.2.2

   ✅ لوحة النظام الحقيقية
   ✅ تعتمد على Release Readiness من الباكند
   ✅ لا تلمس Phase 5.1 layout/guard/auth

   القاعدة المعتمدة:
   - /system يبقى داخل DashboardFrame المحمي.
   - لا يتم إنشاء API جديد.
============================================================ */

import { SystemReadinessView } from "@/components/system/SystemReadinessView";

export default function SystemPage() {
  return <SystemReadinessView mode="dashboard" />;
}