// ======================================================
// 🏛 Mhamcloud — DASHBOARD FRAME
// Premium reusable visual frame with sidebar variant
// RTL/LTR ready layout frame
// ======================================================

import type { ReactNode } from "react"

import { SiteHeader } from "@/components/layout/header"
import { AppSidebar } from "@/components/layout/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

type DashboardFrameProps = {
  children: ReactNode
  sidebarType: "system" | "company"
  compact?: boolean
}

export default function DashboardFrame({
  children,
  sidebarType,
  compact = false,
}: DashboardFrameProps) {
  return (
    <div className="min-h-svh bg-white text-foreground dark:bg-slate-950">
      <SidebarProvider>
        <AppSidebar type={sidebarType} />

        <SidebarInset
          className={cn(
            "min-h-svh overflow-x-hidden bg-white text-foreground",
            "dark:bg-slate-950"
          )}
        >
          <div
            className={cn(
              "flex min-h-svh flex-1 flex-col bg-white dark:bg-slate-950",
              compact
                ? "px-2 pb-2 pt-2"
                : "px-2 pb-2 pt-2 md:px-3 md:pb-3 md:pt-3 xl:px-4 xl:pb-4 xl:pt-3"
            )}
          >
            <div
              className={cn(
                "sticky top-2 z-50 isolate overflow-hidden",
                "border border-slate-200/70 bg-white",
                "shadow-[0_12px_32px_rgba(15,23,42,0.045)]",
                "dark:border-white/10 dark:bg-slate-950 dark:shadow-[0_14px_38px_rgba(0,0,0,0.28)]",
                "[&>header]:rounded-[inherit] [&>header]:bg-transparent",
                "[&>header>div]:rounded-[inherit]",
                compact ? "rounded-[1.35rem]" : "rounded-[1.65rem]"
              )}
            >
              <SiteHeader />
            </div>

            <main
              className={cn(
                "mt-3 min-w-0 flex-1 bg-white dark:bg-slate-950",
                compact ? "p-2 md:p-3" : "p-3 md:p-4 xl:p-5"
              )}
            >
              <div className="min-w-0 bg-white dark:bg-slate-950">
                {children}
              </div>
            </main>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}