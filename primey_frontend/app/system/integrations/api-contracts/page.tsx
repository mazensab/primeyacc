/* ============================================================
   📂 primey_frontend/app/system/integrations/api-contracts/page.tsx
   🧩 Mhamcloud — System Integrations API Contracts Redirect
   ------------------------------------------------------------
   ✅ Keeps existing /system/api-contracts page as source of truth
   ✅ Adds integrations route without duplicating code
============================================================ */

import { redirect } from "next/navigation";

export default function SystemIntegrationsApiContractsPage() {
  redirect("/system/api-contracts");
}
