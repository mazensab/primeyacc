import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { WorkspaceRouteGuard } from "@/components/auth/WorkspaceRouteGuard";
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar";
import { SiteHeader } from "@/components/layout/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function CompanyLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true" || cookieStore.get("sidebar_state") === undefined;
  return (
    <WorkspaceRouteGuard workspace="company">
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 14)",
          "--content-padding": "calc(var(--spacing) * 6)",
          "--content-margin": "calc(var(--spacing) * 1.5)",
        } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main p-(--content-padding)">{children}</div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceRouteGuard>
  );
}
