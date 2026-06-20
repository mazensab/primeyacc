"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
type WorkspaceRoute = "system" | "company" | "agent" | "customer";
type Props = {
  children: React.ReactNode;
  role: WorkspaceRoute;
};
export default function RouteGuard({ children, role }: Props) {
  const router = useRouter();
  const session = useAuth();
  useEffect(() => {
    if (!session?.authenticated) {
      router.replace("/login");
      return;
    }
    const workspace = String(session.workspace || "").toLowerCase();
    const roleName = String(session.role || "").toLowerCase();
    const isSystemUser =
      session?.is_superuser === true ||
      session?.is_system_user === true ||
      workspace === "system" ||
      roleName === "system_admin" ||
      roleName === "super_admin" ||
      roleName === "superuser" ||
      roleName === "admin" ||
      roleName === "staff" ||
      roleName === "accountant" ||
      roleName === "support" ||
      roleName === "viewer";
    const isCompanyUser =
      workspace === "company" ||
      workspace === "provider" ||
      workspace === "center" ||
      roleName === "provider_admin" ||
      roleName === "center_admin" ||
      roleName === "service_provider" ||
      roleName === "company_admin" ||
      roleName === "company_owner" ||
      roleName === "owner";
    const isAgentUser =
      workspace === "agent" ||
      roleName === "agent_user" ||
      roleName === "agent_admin" ||
      roleName === "broker" ||
      roleName === "broker_user" ||
      roleName === "broker_admin";
    if (role === "system" && !isSystemUser) {
      router.replace("/company");
      return;
    }
    if (role === "company" && !isSystemUser && !isCompanyUser) {
      router.replace("/login");
      return;
    }
    if (role === "agent" && !isSystemUser && !isAgentUser) {
      router.replace("/login");
      return;
    }
    if (role === "customer") {
      router.replace("/company");
    }
  }, [router, role, session]);
  return <>{children}</>;
}
