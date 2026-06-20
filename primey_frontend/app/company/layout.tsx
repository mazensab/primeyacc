import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/useRouteGuard";
import DashboardFrame from "@/components/layout/DashboardFrame";
export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard role="company">
      <DashboardFrame sidebarType="company">{children}</DashboardFrame>
    </RouteGuard>
  );
}
