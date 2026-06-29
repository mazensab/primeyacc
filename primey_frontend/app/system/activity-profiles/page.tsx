/* ============================================================
   📂 primey_frontend/app/system/activity-profiles/page.tsx
   🧩 Mhamcloud — System Activity Profiles Overview
   ------------------------------------------------------------
   ✅ Real API only via SystemActivityProfilesCenter
============================================================ */
import { SystemActivityProfilesCenter } from "@/components/system/activity-profiles/SystemActivityProfilesCenter";
export default function SystemActivityProfilesPage() {
  return <SystemActivityProfilesCenter mode="overview" />;
}
