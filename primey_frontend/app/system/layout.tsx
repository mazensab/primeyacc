import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/useRouteGuard";
import DashboardFrame from "@/components/layout/DashboardFrame";
export default function SystemLayout({ children }: { children: ReactNode }) {
  return (
    <RouteGuard role="system">
      <DashboardFrame sidebarType="system">{children}</DashboardFrame>
    </RouteGuard>
  );
}
