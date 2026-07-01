"use client";
/*
================================================================================
📂 primey_frontend/app/company/whatsapp/page.tsx
🟢 Mhamcloud — Company WhatsApp Main Inbox Route
================================================================================
✅ Approved Premium pattern
✅ Real API only: /api/company/whatsapp/messages/
✅ Main WhatsApp page renders Inbox directly
✅ No company dashboard return card
✅ Arabic-first visual alignment
================================================================================
*/
import CompanyWhatsAppInboxView from "@/components/company/whatsapp/CompanyWhatsAppInboxView";
export default function CompanyWhatsAppPage() {
  return <CompanyWhatsAppInboxView />;
}
