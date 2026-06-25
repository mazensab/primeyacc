"use client";
/* ============================================================
   📂 primey_frontend/app/system/activity-profiles/[id]/page.tsx
   🧩 PrimeyAcc — System Activity Profile Detail
   ------------------------------------------------------------
   ✅ Real API only via SystemActivityProfileDetail
============================================================ */
import { useParams } from "next/navigation";
import { SystemActivityProfileDetail } from "@/components/system/activity-profiles/SystemActivityProfileDetail";
export default function SystemActivityProfileDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const profileId = Array.isArray(rawId) ? rawId[0] : String(rawId || "");
  return <SystemActivityProfileDetail profileId={profileId} />;
}
