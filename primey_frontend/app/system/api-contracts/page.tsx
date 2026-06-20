/* ============================================================
   📂 app/system/api-contracts/page.tsx
   🧠 PrimeyAcc | API Contracts Page — Phase 5.2.2

   ✅ صفحة عقود API
   ✅ تعرض registry القادم من الباكند
   ✅ بدون API مكرر في الفرونت

   القاعدة المعتمدة:
   - الفرونت يعرض فقط ما يرجع من الباكند.
============================================================ */

import { SystemReadinessView } from "@/components/system/SystemReadinessView";

export default function ApiContractsPage() {
  return <SystemReadinessView mode="contracts" />;
}