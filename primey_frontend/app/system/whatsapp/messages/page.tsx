/* ============================================================
   📂 primey_frontend/app/system/whatsapp/messages/page.tsx
   💬 PrimeyAcc — System WhatsApp Message Logs Route
   ------------------------------------------------------------
   ✅ سجل الرسائل
   ✅ متابعة رسائل واتساب المسجلة في النظام
   ✅ Uses shared SystemWhatsAppCenter
   ✅ Real API only through shared component
============================================================ */
import { SystemWhatsAppCenter } from "@/components/system/whatsapp/SystemWhatsAppCenter";
export default function SystemWhatsAppMessagesPage() {
  return <SystemWhatsAppCenter initialView="messages" pageMode="messages" />;
}
