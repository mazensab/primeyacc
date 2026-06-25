/* ============================================================
   📂 primey_frontend/app/system/documents/thermal/page.tsx
   🧩 PrimeyAcc — System Thermal Documents
   ------------------------------------------------------------
   ✅ Real API only via SystemDocumentsCenter
============================================================ */
import { SystemDocumentsCenter } from "@/components/system/documents/SystemDocumentsCenter";
export default function SystemThermalDocumentsPage() {
  return <SystemDocumentsCenter mode="thermal" />;
}
