/* ============================================================
   📂 app/system/api-contracts/page.tsx
   🧩 Mhamcloud — Legacy API Contracts Compatibility Route
   ------------------------------------------------------------
   ✅ Canonical route:
      /system/integrations/api-contracts
   ✅ Keeps old bookmarks compatible
   ✅ No duplicated UI implementation
============================================================ */

import { redirect } from "next/navigation";

export default function LegacySystemApiContractsPage() {
  redirect("/system/integrations/api-contracts");
}
