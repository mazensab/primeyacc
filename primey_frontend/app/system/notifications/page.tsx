/* ============================================================
   📂 primey_frontend/app/system/notifications/page.tsx
   🔔 Mhamcloud — System Notifications Overview Route
   ------------------------------------------------------------
   ✅ Uses shared SystemNotificationsCenter
   ✅ Overview mode
   ✅ Real API only through shared component
============================================================ */
import { SystemNotificationsCenter } from "@/components/system/notifications/SystemNotificationsCenter";
export default function SystemNotificationsPage() {
  return <SystemNotificationsCenter mode="overview" />;
}
