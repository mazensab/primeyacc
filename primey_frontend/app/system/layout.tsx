import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import DashboardFrame from "@/components/layout/DashboardFrame";

export default function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardFrame sidebarType="system">{children}</DashboardFrame>
    </AuthProvider>
  );
}
