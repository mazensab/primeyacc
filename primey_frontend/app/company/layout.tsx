import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/useRouteGuard";
export default function CompanyLayout({ children }: { children: ReactNode }) {
  return <RouteGuard role="company">{children}</RouteGuard>;
}
