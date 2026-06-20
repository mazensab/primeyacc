import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/useRouteGuard";
export default function SystemLayout({ children }: { children: ReactNode }) {
  return <RouteGuard role="system">{children}</RouteGuard>;
}
