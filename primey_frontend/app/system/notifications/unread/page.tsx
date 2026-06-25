/* ============================================================
   📂 primey_frontend/app/system/notifications/unread/page.tsx
   🔔 PrimeyAcc — System Unread Notifications Route
   ------------------------------------------------------------
   ✅ الإشعارات غير المقروءة
   ✅ متابعة الإشعارات التي لم يتم التعامل معها بعد
   ✅ Uses shared SystemNotificationsCenter
   ✅ Starts with unread filter
   ✅ Real API only through shared component
============================================================ */
import { SystemNotificationsCenter } from "@/components/system/notifications/SystemNotificationsCenter";
export default function SystemUnreadNotificationsPage() {
  return <SystemNotificationsCenter mode="unread" />;
}
