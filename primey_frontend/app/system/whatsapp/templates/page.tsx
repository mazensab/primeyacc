/* ============================================================
   📂 primey_frontend/app/system/whatsapp/templates/page.tsx
   💬 PrimeyAcc — System WhatsApp Templates Route
   ------------------------------------------------------------
   ✅ قوالب واتساب
   ✅ إدارة حالة القوالب ومراجعة محتواها
   ✅ Uses shared SystemWhatsAppCenter
   ✅ Real API only through shared component
============================================================ */
import { SystemWhatsAppCenter } from "@/components/system/whatsapp/SystemWhatsAppCenter";
export default function SystemWhatsAppTemplatesPage() {
  return <SystemWhatsAppCenter initialView="templates" pageMode="templates" />;
}
