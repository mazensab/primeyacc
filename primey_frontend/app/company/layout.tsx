import type { ReactNode } from "react";
import { AuthProvider } from "@/components/providers/AuthProvider";
import DashboardFrame from "@/components/layout/DashboardFrame";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <DashboardFrame sidebarType="company">{children}</DashboardFrame>
    </AuthProvider>
  );
}
