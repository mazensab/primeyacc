/* ============================================================
   📂 primey_frontend/app/system/notifications/list/page.tsx
   🔔 Mhamcloud — System Notifications List Route
   ------------------------------------------------------------
   ✅ عرض قائمة الإشعارات
   ✅ جدول إشعارات النظام مع الفلاتر والتصدير والطباعة
   ✅ Uses shared SystemNotificationsCenter
   ✅ Real API only through shared component
============================================================ */
import { SystemNotificationsCenter } from "@/components/system/notifications/SystemNotificationsCenter";
export default function SystemNotificationsListPage() {
  return <SystemNotificationsCenter mode="list" />;
}
