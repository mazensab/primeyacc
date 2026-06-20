import type { ReactNode } from "react";
import RouteGuard from "@/components/auth/useRouteGuard";
export default function AgentLayout({ children }: { children: ReactNode }) {
  return <RouteGuard role="agent">{children}</RouteGuard>;
}
