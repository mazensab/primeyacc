/* ============================================================
   📂 primey_frontend/app/system/activity-profiles/list/page.tsx
   🧩 PrimeyAcc — System Activity Profiles List
   ------------------------------------------------------------
   ✅ Real API only via SystemActivityProfilesCenter
============================================================ */
import { SystemActivityProfilesCenter } from "@/components/system/activity-profiles/SystemActivityProfilesCenter";
export default function SystemActivityProfilesListPage() {
  return <SystemActivityProfilesCenter mode="list" />;
}
