/* ============================================================
   📂 app/system/layout.tsx
   🧠 PrimeyAcc | Protected System Layout — Phase 5.1.2

   ✅ يحمي /system بحارس مساحة العمل system
   ✅ يستخدم DashboardFrame الحالي بدون تغيير بنيته
   ✅ يحافظ على Sidebar النظام الحالي

   القاعدة المعتمدة:
   - لا يتم تجاوز AuthProvider.
   - لا يتم كسر DashboardFrame.
   - لا يتم إنشاء ملفات backup.
============================================================ */

import type { ReactNode } from "react";
import DashboardFrame from "@/components/layout/DashboardFrame";
import { WorkspaceRouteGuard } from "@/components/auth/WorkspaceRouteGuard";

export default function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceRouteGuard workspace="system">
      <DashboardFrame sidebarType="system">{children}</DashboardFrame>
    </WorkspaceRouteGuard>
  );
}