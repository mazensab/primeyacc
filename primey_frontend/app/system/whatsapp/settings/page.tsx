/* ============================================================
   📂 primey_frontend/app/system/whatsapp/settings/page.tsx
   💬 PrimeyAcc — System WhatsApp Company Settings Route
   ------------------------------------------------------------
   ✅ إعدادات الشركات
   ✅ مراقبة إعدادات واتساب لكل شركة بدون كشف التوكنات
   ✅ Uses shared SystemWhatsAppCenter
   ✅ Real API only through shared component
============================================================ */
import { SystemWhatsAppCenter } from "@/components/system/whatsapp/SystemWhatsAppCenter";
export default function SystemWhatsAppSettingsPage() {
  return <SystemWhatsAppCenter initialView="settings" pageMode="settings" />;
}
